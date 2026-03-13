import { NextRequest, NextResponse } from 'next/server';
import { createProperty, updateProperty } from '@/lib/ghl';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactId, fields } = body;
    if (!contactId || !fields) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const result = await createProperty(contactId, fields);
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

    const result = await updateProperty(recordId, fields);
    return NextResponse.json({ success: true, result });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
