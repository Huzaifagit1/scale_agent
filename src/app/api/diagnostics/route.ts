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

  const results: Record<string, unknown> = {
    env: { locationId: LOCATION_ID, objectId: OBJECT_ID, objectKey: OBJECT_KEY }
  };

  // 1. Custom object fields via object-key endpoint
  const r1 = await fetch(
    `${GHL_BASE}/custom-fields/object-key/${OBJECT_FULL_KEY}?locationId=${LOCATION_ID}`,
    { headers: headers() }
  );
  const t1 = await r1.text();
  results.customObjectFields_byKey = { status: r1.status, body: t1.slice(0, 3000) };

  // 2. Custom object fields via object ID
  const r2 = await fetch(
    `${GHL_BASE}/custom-fields/${OBJECT_ID}?locationId=${LOCATION_ID}`,
    { headers: headers() }
  );
  const t2 = await r2.text();
  results.customObjectFields_byId = { status: r2.status, body: t2.slice(0, 3000) };

  // 3. Fetch a real record and show its raw properties
  const r3 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  const t3 = await r3.text();
  results.searchRecords = { status: r3.status, body: t3.slice(0, 2000) };

  // 4. Try fetching one record in full
  try {
    const parsed = JSON.parse(t3);
    const records = parsed.records || parsed.data || [];
    if (records[0]?.id) {
      const r4 = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${records[0].id}`, { headers: headers() });
      const t4 = await r4.text();
      results.sampleRecord = { status: r4.status, body: t4.slice(0, 3000) };
    }
  } catch { /* ignore */ }

  // 5. Try a minimal PUT with just one simple text field to isolate the issue
  // We'll try with full key prefix vs without
  const testRecordRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  try {
    const parsed = JSON.parse(await testRecordRes.text());
    const records = parsed.records || parsed.data || [];
    if (records[0]?.id) {
      const rid = records[0].id;

      // Test A: full prefixed key + locationId
      const rA = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ locationId: LOCATION_ID, properties: { [`custom_objects.${OBJECT_KEY}.referncia`]: 'TEST-A' } }),
      });
      results.testA_fullPrefixedKey = { status: rA.status, body: (await rA.text()).slice(0, 500) };

      // Test B: flat key + locationId (simple)
      const rB = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ locationId: LOCATION_ID, properties: { referncia: 'TEST-B' } }),
      });
      results.testB_flatKey = { status: rB.status, body: (await rB.text()).slice(0, 500) };

      // Test C: PATCH instead of PUT
      const rC = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ locationId: LOCATION_ID, properties: { referncia: 'TEST-C' } }),
      });
      results.testC_PATCH = { status: rC.status, body: (await rC.text()).slice(0, 500) };

      // Test D: PUT using object ID instead of key
      const rD = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ locationId: LOCATION_ID, properties: { referncia: 'TEST-D' } }),
      });
      results.testD_objectId = { status: rD.status, body: (await rD.text()).slice(0, 500) };

      // Test E: array format with full key
      const rE = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({
          locationId: LOCATION_ID,
          properties: [{ key: `custom_objects.${OBJECT_KEY}.referncia`, value: 'TEST-E' }]
        }),
      });
      results.testE_arrayFullKey = { status: rE.status, body: (await rE.text()).slice(0, 500) };

      // Test F: array format with flat key
      const rF = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({
          locationId: LOCATION_ID,
          properties: [{ key: 'referncia', value: 'TEST-F' }]
        }),
      });
      results.testF_arrayFlatKey = { status: rF.status, body: (await rF.text()).slice(0, 500) };

      // Test G: use 'name' field (the display field) only
      const rG = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}`, {
        method: 'PUT', headers: headers(),
        body: JSON.stringify({ locationId: LOCATION_ID, name: 'TEST-G' }),
      });
      results.testG_nameOnly = { status: rG.status, body: (await rG.text()).slice(0, 500) };
    }
  } catch (e) {
    results.testPUT_error = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}
