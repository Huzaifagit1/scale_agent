import { NextRequest, NextResponse } from 'next/server';
import { createProperty, updateProperty, deleteProperty, getPropertiesForContact } from '@/lib/ghl';
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

// Extract record ID from any shape GHL might return
function extractRecordId(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined;
  const r = result as Record<string, unknown>;
  // Direct id
  if (typeof r.id === 'string' && r.id) return r.id;
  // Nested under record
  if (r.record && typeof r.record === 'object') {
    const rec = r.record as Record<string, unknown>;
    if (typeof rec.id === 'string' && rec.id) return rec.id;
  }
  // Nested under data
  if (r.data && typeof r.data === 'object') {
    const d = r.data as Record<string, unknown>;
    if (typeof d.id === 'string' && d.id) return d.id;
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, fields } = body;
    if (!contactId || !fields) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const normalizedFields = normalizeIncomingFields(fields);
    if (Object.keys(normalizedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }
    normalizedFields['data_da_ultima_atualizacao'] = formatLocalDate(new Date());

    const result = await createProperty(contactId, normalizedFields);
    const recordId = extractRecordId(result);
    console.log('[POST /api/properties] GHL result keys:', Object.keys(result || {}), 'recordId:', recordId);
    // Always return id at the top level so the UI can reliably read it
    return NextResponse.json({ success: true, result, id: recordId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, fields, contactId } = body;
    if (!recordId || !fields) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    console.log('[PUT /api/properties] recordId:', recordId);

    const normalizedFields = normalizeIncomingFields(fields);
    if (Object.keys(normalizedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }
    normalizedFields['data_da_ultima_atualizacao'] = formatLocalDate(new Date());

    try {
      const result = await updateProperty(recordId, normalizedFields);
      return NextResponse.json({ success: true, result, id: recordId });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';

      // 404 fallback: try to match by reference/address among contact's existing records
      if (msg.includes('(404)') && contactId) {
        console.log('[PUT fallback] 404 on recordId', recordId, '— searching by field match');
        const candidates = await getPropertiesForContact(contactId);
        const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();
        const pick = (obj: Record<string, unknown>, keys: string[]) => {
          for (const key of keys) {
            const val = obj?.[key];
            if (val !== undefined && val !== null && String(val).trim() !== '') return normalize(val);
          }
          return '';
        };

        const targetRef = pick(normalizedFields, ['referencia', 'referncia']);
        const targetAddress = pick(normalizedFields, ['endereco', 'endereco_do_imovel']);
        const targetCity = pick(normalizedFields, ['cidade_endereco']);
        const targetCep = pick(normalizedFields, ['cep']);

        const match = candidates.find((rec: Record<string, unknown>) => {
          const props = (rec?.properties ?? rec ?? {}) as Record<string, unknown>;
          if (targetRef && pick(props, ['referencia', 'referncia']) === targetRef) return true;
          if (targetAddress && targetCity &&
            pick(props, ['endereco', 'endereco_do_imovel']) === targetAddress &&
            pick(props, ['cidade_endereco']) === targetCity) return true;
          return targetCep &&
            pick(props, ['cep']) === targetCep &&
            targetCity &&
            pick(props, ['cidade_endereco']) === targetCity;
        }) as (Record<string, unknown> & { id?: string }) | undefined;

        if (match?.id) {
          console.log('[PUT fallback] matched record:', match.id);
          const result = await updateProperty(match.id, normalizedFields);
          return NextResponse.json({ success: true, result, id: match.id, matchedId: match.id });
        }
      }
      throw e;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const recordId = req.nextUrl.searchParams.get('recordId');
    if (!recordId) return NextResponse.json({ error: 'Missing recordId' }, { status: 400 });

    console.log('[DELETE /api/properties] recordId:', recordId);
    const result = await deleteProperty(recordId);
    console.log('[DELETE /api/properties] success');
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    console.error('[DELETE /api/properties] error:', msg);
    // If record not found, treat as already deleted — success from UI perspective
    if (msg.includes('404') || msg.includes('not found')) {
      return NextResponse.json({ success: true, alreadyDeleted: true });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
