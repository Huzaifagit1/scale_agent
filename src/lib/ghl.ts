const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN!;
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'xWbTcKk2acWXn4MbANTk';
const OBJECT_ID = process.env.GHL_OBJECT_KEY || 'imveis';

const headers = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28',
});

export async function getContact(contactId: string) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Contact not found: ${res.status}`);
  const data = await res.json();
  return data.contact;
}

export async function getPropertiesForContact(contactId: string) {
  // Get all custom object records associated to this contact
  const res = await fetch(
    `${GHL_BASE}/objects/${OBJECT_ID}/records?locationId=${LOCATION_ID}&associatedContactId=${contactId}&limit=50`,
    { headers: headers() }
  );
  if (!res.ok) {
    console.error('Error fetching properties:', await res.text());
    return [];
  }
  const data = await res.json();
  return data.records || data.data || [];
}

export async function createProperty(contactId: string, fields: Record<string, unknown>) {
  // Create a new custom object record
  const body = {
    locationId: LOCATION_ID,
    properties: fields,
  };
  const res = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create property: ${err}`);
  }
  const created = await res.json();
  const recordId = created.id || created.record?.id;

  // Associate the record to the contact
  if (recordId) {
    await associatePropertyToContact(recordId, contactId);
  }
  return created;
}

export async function updateProperty(recordId: string, fields: Record<string, unknown>) {
  const body = { properties: fields };
  const res = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${recordId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to update property: ${err}`);
  }
  return res.json();
}

async function associatePropertyToContact(recordId: string, contactId: string) {
  const body = {
    objectKey: OBJECT_ID,
    recordId,
    associatedObjectType: 'contact',
    associatedObjectId: contactId,
  };
  const res = await fetch(`${GHL_BASE}/objects/${OBJECT_ID}/records/${recordId}/associations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error('Association error:', await res.text());
  }
}
