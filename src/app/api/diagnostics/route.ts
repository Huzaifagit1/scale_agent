import { NextResponse } from 'next/server';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN;
const LOCATION_ID = process.env.GHL_LOCATION_ID;
const OBJECT_ID = process.env.GHL_OBJECT_ID;
const OBJECT_KEY = process.env.GHL_OBJECT_KEY;

const headers = () => ({
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  Version: '2021-07-28',
});

export async function GET() {
  if (!API_KEY || !LOCATION_ID || !OBJECT_ID || !OBJECT_KEY) {
    return NextResponse.json({ ok: false, message: 'Missing env vars' }, { status: 500 });
  }

  const results: Record<string, unknown> = {
    env: { locationId: LOCATION_ID, objectId: OBJECT_ID, objectKey: OBJECT_KEY }
  };

  // Get a real record ID to test against
  const searchRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  const searchData = await searchRes.json();
  const rid = searchData?.records?.[0]?.id;
  results.testRecordId = rid ?? 'none found';

  if (!rid) {
    return NextResponse.json({ ...results, error: 'No records to test with' });
  }

  // Test 1: PUT with object ID in URL + flat key + locationId in body
  const r1 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, properties: { referncia: 'TEST-1' } }),
  });
  results.test1_objectId_flatKey = { status: r1.status, body: (await r1.text()).slice(0, 500) };

  // Test 2: PUT with object ID + full prefixed key
  const r2 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, properties: { [`custom_objects.${OBJECT_KEY}.referncia`]: 'TEST-2' } }),
  });
  results.test2_objectId_fullKey = { status: r2.status, body: (await r2.text()).slice(0, 500) };

  // Test 3: PUT with object ID + cep (simplest text field)
  const r3 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, properties: { cep: '99999999' } }),
  });
  results.test3_objectId_cep = { status: r3.status, body: (await r3.text()).slice(0, 500) };

  // Test 4: PUT with object ID + array format
  const r4 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({
      locationId: LOCATION_ID,
      properties: [{ key: `custom_objects.${OBJECT_KEY}.cep`, value: '99999999' }]
    }),
  });
  results.test4_objectId_array = { status: r4.status, body: (await r4.text()).slice(0, 500) };

  // Test 5: PUT with object ID, no properties at all — just name
  const r5 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, properties: {} }),
  });
  results.test5_emptyProperties = { status: r5.status, body: (await r5.text()).slice(0, 500) };

  return NextResponse.json(results);
}
