import { NextRequest, NextResponse } from 'next/server';
import { getContact, getPropertiesForContact } from '@/lib/ghl';

export async function GET(req: NextRequest) {
  const contactId = req.nextUrl.searchParams.get('id');
  if (!contactId) return NextResponse.json({ error: 'Missing contact id' }, { status: 400 });

  try {
    const [contact, properties] = await Promise.all([
      getContact(contactId),
      getPropertiesForContact(contactId),
    ]);
    console.log('Contact response:', JSON.stringify(contact, null, 2));
    console.log('Properties response:', JSON.stringify(properties, null, 2));
    return NextResponse.json({ contact, properties });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
