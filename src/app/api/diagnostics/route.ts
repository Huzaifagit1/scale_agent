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

  // Just verify env + confirm record count. No destructive tests.
  const searchRes = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST', headers: headers(),
    body: JSON.stringify({ locationId: LOCATION_ID, page: 1, pageLimit: 1 }),
  });
  const searchData = await searchRes.json();

  return NextResponse.json({
    ok: true,
    env: { locationId: LOCATION_ID, objectId: OBJECT_ID, objectKey: OBJECT_KEY },
    totalRecords: searchData?.total ?? 0,
    confirmedWorkingFormats: {
      PUT: 'objects/{OBJECT_ID}/records/{id}?locationId=... — body: { properties: { key: val } }',
      DELETE: 'objects/{OBJECT_ID}/records/{id} — no locationId anywhere',
      POST: 'objects/{OBJECT_ID}/records — body: { locationId, properties: { key: val } }',
    }
  });
}
