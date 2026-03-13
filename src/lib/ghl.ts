const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN!;
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'xWbTcKk2acWXn4MbANTk';
const OBJECT_KEY = process.env.GHL_OBJECT_KEY || 'imveis'; // internal key: custom_objects.imveis.*

const headers = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28',
});

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

function log(label: string, status: number, body: string) {
  console.log(`[GHL:${label}] ${status}`, body.slice(0, 500));
}

export async function getContact(contactId: string) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, { headers: headers() });
  if (!res.ok) throw new Error(`Contact not found: ${res.status}`);
  const data = await res.json();
  return data.contact;
}

export async function getPropertiesForContact(contactId: string) {
  const url = `${GHL_BASE}/objects/${OBJECT_KEY}/records?locationId=${LOCATION_ID}&associatedContactId=${contactId}&limit=50`;
  const res = await fetch(url, { headers: headers() });
  const text = await res.text();
  log('getProperties', res.status, text);
  if (!res.ok) return [];
  try {
    const data = JSON.parse(text);
    return data.records || data.data || data || [];
  } catch { return []; }
}

// GHL custom objects expect properties as an array of { key, value } pairs
// key format: custom_objects.<objectKey>.<fieldKey>
function toPropertiesArray(fields: Record<string, unknown>, objectKey: string) {
  const aliases: Record<string, string> =
    objectKey === 'imveis'
      ? {
          // Custom Object "Imóveis" schema keys differ from our UI keys.
          pretensao_do_negocio: 'escolha_a_pretensao_do_negocio',
          tipo_do_imovel: 'tipo_de_imovel',
          categoria: 'categoria_do_imovel',
          endereco: 'endereco_do_imovel',
        }
      : {};

  return Object.entries(fields)
    .filter(([, v]) => v !== '' && v !== null && v !== undefined)
    .map(([key, value]) => ({
      key: `custom_objects.${objectKey}.${(aliases[key] ?? key)}`,
      value: Array.isArray(value) ? value.join(', ') : String(value),
    }));
}

export async function createProperty(contactId: string, fields: Record<string, unknown>) {
  const fieldKeys = Object.keys(fields);
  const properties = toPropertiesArray(fields, OBJECT_KEY);
  const sentKeys = properties.map((p) => p.key);
  const body = {
    locationId: LOCATION_ID,
    properties,
    associations: [
      { objectType: 'contact', objectId: contactId }
    ],
  };

  console.log('[GHL:createProperty] sending:', JSON.stringify(body).slice(0, 600));

  const res = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  log('createProperty', res.status, text);
  if (!res.ok) {
    throw new Error(
      `Failed to create (${res.status}) keys=${JSON.stringify(fieldKeys)} sentKeys=${JSON.stringify(sentKeys)}: ${text}`
    );
  }

  let created: Record<string, unknown> = {};
  try { created = JSON.parse(text); } catch { /* empty */ }

  // Attempt explicit association as fallback
  const recordId =
    getStringField(created, 'id') ??
    (isObject(created['record']) ? getStringField(created['record'], 'id') : undefined);
  if (recordId) {
    await associateToContact(recordId, contactId);
  }

  return created;
}

export async function updateProperty(recordId: string, fields: Record<string, unknown>) {
  const fieldKeys = Object.keys(fields);
  const properties = toPropertiesArray(fields, OBJECT_KEY);
  const sentKeys = properties.map((p) => p.key);
  const body = {
    properties,
  };

  const res = await fetch(`${GHL_BASE}/objects/${OBJECT_KEY}/records/${recordId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  log('updateProperty', res.status, text);
  if (!res.ok) {
    throw new Error(
      `Failed to update (${res.status}) keys=${JSON.stringify(fieldKeys)} sentKeys=${JSON.stringify(sentKeys)}: ${text}`
    );
  }
  try { return JSON.parse(text); } catch { return {}; }
}

async function associateToContact(recordId: string, contactId: string) {
  // Try both known association body formats GHL uses
  const body = {
    firstObjectKey: OBJECT_KEY,
    firstRecordId: recordId,
    secondObjectKey: 'contact',
    secondRecordId: contactId,
  };

  const res = await fetch(
    `${GHL_BASE}/objects/${OBJECT_KEY}/records/${recordId}/associations`,
    { method: 'POST', headers: headers(), body: JSON.stringify(body) }
  );
  const text = await res.text();
  log('associate', res.status, text);
}
