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
    return NextResponse.json(
      {
        ok: false,
        message: 'Missing env vars',
        env: {
          hasToken: Boolean(API_KEY),
          locationId: LOCATION_ID ?? null,
          objectId: OBJECT_ID ?? null,
          objectKey: OBJECT_KEY ?? null,
        },
      },
      { status: 500 }
    );
  }

  const body = { locationId: LOCATION_ID, page: 1, pageLimit: 1 };
  const res = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/search`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();

  return NextResponse.json({
    ok: res.ok,
    status: res.status,
    env: {
      hasToken: true,
      locationId: LOCATION_ID,
      objectId: OBJECT_ID,
      objectKey: OBJECT_KEY,
    },
    response: text.slice(0, 1000),
  });
}
