import { NextRequest, NextResponse } from 'next/server';
import { updateProperty, addTagToContact } from '@/lib/ghl';
import { FORM_SECTIONS } from '@/lib/fields';

function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function normalizeIncomingFields(fields: unknown): Record<string, unknown> {
  if (!fields || typeof fields !== 'object') return {};

  const ghlIdToKey: Record<string, string> = {};
  const allowedKeys = new Set<string>();
  for (const section of FORM_SECTIONS) {
    for (const field of section.fields) {
      ghlIdToKey[field.ghlId] = field.key;
      allowedKeys.add(field.key);
    }
  }

  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of Object.entries(fields as Record<string, unknown>)) {
    const normalizedKey = ghlIdToKey[rawKey] ?? rawKey;
    if (!allowedKeys.has(normalizedKey)) continue;
    out[normalizedKey] = value;
  }

  return out;
}

type ConfirmExitProperty = {
  recordId?: string;
  fields?: unknown;
};

function isConfirmExitProperty(value: unknown): value is ConfirmExitProperty {
  return typeof value === 'object' && value !== null;
}

async function parseBody(req: NextRequest) {
  const text = await req.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as { properties?: unknown; contactId?: string };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await parseBody(req);
  const properties = Array.isArray(body?.properties) ? body.properties : [];
  const contactId = typeof body?.contactId === 'string' ? body.contactId : undefined;

  if (properties.length === 0) {
    return NextResponse.json({ error: 'No properties provided' }, { status: 400 });
  }

  const dateStr = formatLocalDate(new Date());

  const results = await Promise.allSettled(
    properties.map(async (entry) => {
      if (!isConfirmExitProperty(entry) || !entry.recordId) {
        throw new Error('Invalid property payload');
      }

      const normalizedFields = normalizeIncomingFields(entry.fields);
      normalizedFields['data_da_ultima_atualizacao'] = dateStr;
      await updateProperty(entry.recordId, normalizedFields);
      return entry.recordId;
    })
  );

  const updatedIds = results
    .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
    .map(result => result.value);

  const failures = results
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map(result => result.reason instanceof Error ? result.reason.message : 'Unknown error');

  // Tag the contact after any successful saves — fire-and-forget, non-blocking
  if (contactId && updatedIds.length > 0) {
    addTagToContact(contactId, 'whatsapp_link_updated').catch((err) =>
      console.error('[confirm-exit] addTag failed:', err)
    );
  }

  return NextResponse.json({
    success: failures.length === 0,
    updatedIds,
    failures,
  });
}
