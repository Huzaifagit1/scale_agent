import { NextRequest, NextResponse } from 'next/server';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN!;
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'xWbTcKk2acWXn4MbANTk';

const headers = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, fields } = body;
    if (!contactId || !fields) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    // Save as contact custom fields
    const customFields = Object.entries(fields).map(([key, value]) => ({
      id: key,
      value: String(value || ''),
    }));

    const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ customFields }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to save: ${err}`);
    }

    const result = await res.json();
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { recordId, fields } = body;
    if (!recordId || !fields) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    // Update contact custom fields
    const customFields = Object.entries(fields).map(([key, value]) => ({
      id: key,
      value: String(value || ''),
    }));

    const res = await fetch(`${GHL_BASE}/contacts/${recordId}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify({ customFields }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update: ${err}`);
    }

    const result = await res.json();
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
