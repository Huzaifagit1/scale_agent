import { NextRequest, NextResponse } from 'next/server';
import { createProperty, updateProperty, deleteProperty, getPropertiesForContact } from '@/lib/ghl';
import { FORM_SECTIONS } from '@/lib/fields';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, fields } = body;
    if (!contactId || !fields) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const normalizedFields = normalizeIncomingFields(fields);
    if (Object.keys(normalizedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const result = await createProperty(contactId, normalizedFields);
    return NextResponse.json({ success: true, result });
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

    const normalizedFields = normalizeIncomingFields(fields);
    if (Object.keys(normalizedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    try {
      const result = await updateProperty(recordId, normalizedFields);
      return NextResponse.json({ success: true, result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      if (msg.includes('(404)') && contactId) {
        const candidates = await getPropertiesForContact(contactId);
        const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase();
        const pick = (obj: any, keys: string[]) => {
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

        const match = candidates.find((rec: any) => {
          const props = rec?.properties ?? rec ?? {};
          const refMatch = targetRef && pick(props, ['referencia', 'referncia']) === targetRef;
          if (refMatch) return true;
          const addrMatch =
            targetAddress &&
            targetCity &&
            pick(props, ['endereco', 'endereco_do_imovel']) === targetAddress &&
            pick(props, ['cidade_endereco']) === targetCity;
          if (addrMatch) return true;
          const cepMatch = targetCep && pick(props, ['cep']) === targetCep;
          return cepMatch && targetCity && pick(props, ['cidade_endereco']) === targetCity;
        });

        if (match?.id) {
          const result = await updateProperty(match.id, normalizedFields);
          return NextResponse.json({ success: true, result, matchedId: match.id });
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

    const result = await deleteProperty(recordId);
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
