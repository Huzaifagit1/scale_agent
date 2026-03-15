import { NextResponse } from 'next/server';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const OBJECT_KEY = process.env.GHL_OBJECT_KEY || 'imveis';
const OBJECT_OBJECT_KEY = `custom_objects.${OBJECT_KEY}`;

const headers = () => ({
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  Version: '2021-07-28',
});

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function GET() {
  if (!API_KEY || !LOCATION_ID) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Missing env vars',
        env: {
          hasToken: Boolean(API_KEY),
          locationId: LOCATION_ID ?? null,
          objectKey: OBJECT_KEY ?? null,
        },
      },
      { status: 500 }
    );
  }

  const res = await fetch(
    `${GHL_BASE}/custom-fields/object-key/${OBJECT_OBJECT_KEY}?locationId=${LOCATION_ID}`,
    { headers: headers() }
  );
  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json({ ok: false, status: res.status, response: text.slice(0, 2000) }, { status: res.status });
  }

  let fields: Array<any> = [];
  try {
    const data = JSON.parse(text);
    fields = Array.isArray(data?.fields) ? data.fields : [];
  } catch {
    return NextResponse.json({ ok: false, message: 'Invalid JSON from GHL' }, { status: 500 });
  }

  const simplified = fields.map((f) => ({
    fieldKey: f.fieldKey,
    name: f.name,
    dataType: f.dataType,
    options: Array.isArray(f.options)
      ? f.options.map((o: any) => ({
          key: o.key,
          label: o.label,
          normalized: normalizeLabel(String(o.label ?? '')),
        }))
      : null,
  }));

  return NextResponse.json({
    ok: true,
    objectKey: OBJECT_OBJECT_KEY,
    count: simplified.length,
    fields: simplified,
  });
}
