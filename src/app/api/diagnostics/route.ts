import { NextResponse } from 'next/server';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const OBJECT_ID = process.env.GHL_OBJECT_ID;
const OBJECT_KEY = process.env.GHL_OBJECT_KEY;
const OBJECT_FULL_KEY = `custom_objects.${OBJECT_KEY}`;

const headers = () => ({
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  Version: '2021-07-28',
});

export async function GET() {
  if (!API_KEY || !LOCATION_ID || !OBJECT_ID || !OBJECT_KEY) {
    return NextResponse.json({ ok: false, message: 'Missing env vars' }, { status: 500 });
  }

  // 1. Fetch actual custom object field schema
  const fieldsRes = await fetch(
    `${GHL_BASE}/custom-fields/object-key/${OBJECT_FULL_KEY}?locationId=${LOCATION_ID}`,
    { headers: headers() }
  );
  const fieldsText = await fieldsRes.text();
  let schemaFields: Array<{ fieldKey: string; name: string; dataType: string }> = [];
  try {
    const parsed = JSON.parse(fieldsText);
    schemaFields = (parsed.fields || []).map((f: Record<string, unknown>) => ({
      fieldKey: f.fieldKey,
      name: f.name,
      dataType: f.dataType,
    }));
  } catch { /* ignore */ }

  // 2. Fetch one existing record to see its actual property keys
  const searchRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  const searchText = await searchRes.text();
  let sampleRecord: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(searchText);
    const records = parsed.records || parsed.data || [];
    if (records.length > 0) {
      const rec = records[0];
      // Fetch the full record to see its properties
      const recRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rec.id}`, { headers: headers() });
      const recText = await recRes.text();
      const recParsed = JSON.parse(recText);
      sampleRecord = recParsed.record?.properties || recParsed.properties || {};
    }
  } catch { /* ignore */ }

  // 3. Test PUT with minimal body to see exact error
  return NextResponse.json({
    ok: true,
    env: { locationId: LOCATION_ID, objectId: OBJECT_ID, objectKey: OBJECT_KEY },
    schemaFieldCount: schemaFields.length,
    // Suffixes only (strip "custom_objects.imveis." prefix)
    schemaFieldSuffixes: schemaFields.map(f => ({
      suffix: String(f.fieldKey).replace(`${OBJECT_FULL_KEY}.`, ''),
      name: f.name,
      type: f.dataType,
    })),
    sampleRecordKeys: Object.keys(sampleRecord),
  });
}
