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
    env: { locationId: LOCATION_ID, objectId: OBJECT_ID, objectKey: OBJECT_KEY },
    locationIdType: typeof LOCATION_ID,
    locationIdValue: JSON.stringify(LOCATION_ID),
  };

  const searchRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  const searchData = await searchRes.json();
  const rid = searchData?.records?.[0]?.id;
  results.testRecordId = rid ?? 'none';
  if (!rid) return NextResponse.json({ ...results, error: 'No records found' });

  // Test 1: locationId as QUERY PARAM (not in body)
  const r1 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}?locationId=${LOCATION_ID}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ properties: { cep: '11111111' } }),
  });
  results.test1_locationId_queryParam = { status: r1.status, body: (await r1.text()).slice(0, 500) };

  // Test 2: locationId in query param + body
  const r2 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}?locationId=${LOCATION_ID}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, properties: { cep: '22222222' } }),
  });
  results.test2_locationId_both = { status: r2.status, body: (await r2.text()).slice(0, 500) };

  // Test 3: Version header 2021-04-15 instead
  const r3 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}?locationId=${LOCATION_ID}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Version: '2021-04-15' },
    body: JSON.stringify({ properties: { cep: '33333333' } }),
  });
  results.test3_version_2021_04_15 = { status: r3.status, body: (await r3.text()).slice(0, 500) };

  // Test 4: Version header 2021-07-28 + query param + full prefixed key
  const r4 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}?locationId=${LOCATION_ID}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ properties: { [`custom_objects.${OBJECT_KEY}.cep`]: '44444444' } }),
  });
  results.test4_queryParam_fullKey = { status: r4.status, body: (await r4.text()).slice(0, 500) };

  // Test 5: no locationId anywhere, just properties
  const r5 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT', headers: headers(),
    body: JSON.stringify({ properties: { cep: '55555555' } }),
  });
  results.test5_noLocationId = { status: r5.status, body: (await r5.text()).slice(0, 500) };

  // Test 6: use the newer API version
  const r6 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json', Version: '2023-01-01' },
    body: JSON.stringify({ locationId: LOCATION_ID, properties: { cep: '66666666' } }),
  });
  results.test6_version_2023 = { status: r6.status, body: (await r6.text()).slice(0, 500) };

  return NextResponse.json(results);
}
