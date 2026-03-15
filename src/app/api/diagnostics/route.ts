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

  // Get a real record ID
  const searchRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  const searchData = await searchRes.json();
  const rid = searchData?.records?.[0]?.id;
  results.testRecordId = rid ?? 'none';
  if (!rid) return NextResponse.json({ ...results, error: 'No records to test with' });

  // Test DELETE with locationId as query param
  const r1 = await fetch(
    `${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}?locationId=${LOCATION_ID}`,
    { method: 'DELETE', headers: headers() }
  );
  results.testDELETE_objectId_queryParam = { status: r1.status, body: (await r1.text()).slice(0, 500) };

  // Test DELETE with object KEY + query param
  const r2 = await fetch(
    `${GHL_BASE}/objects/${OBJECT_KEY}/records/${rid}?locationId=${LOCATION_ID}`,
    { method: 'DELETE', headers: headers() }
  );
  results.testDELETE_objectKey_queryParam = { status: r2.status, body: (await r2.text()).slice(0, 500) };

  // Test DELETE with no locationId
  const r3 = await fetch(
    `${GHL_BASE}/objects/${OBJECT_ID}/records/${rid}`,
    { method: 'DELETE', headers: headers() }
  );
  results.testDELETE_noLocationId = { status: r3.status, body: (await r3.text()).slice(0, 500) };

  return NextResponse.json(results);
}
