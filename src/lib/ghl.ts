import { FORM_SECTIONS } from './fields';
import { readFile } from 'fs/promises';
import path from 'path';

const GHL_BASE = 'https://services.leadconnectorhq.com';
const API_KEY = process.env.GHL_API_TOKEN!;
const LOCATION_ID = process.env.GHL_LOCATION_ID || 'xWbTcKk2acWXn4MbANTk';
const OBJECT_KEY = process.env.GHL_OBJECT_KEY || 'imveis'; // internal key: custom_objects.imveis.*
const OBJECT_OBJECT_KEY = `custom_objects.${OBJECT_KEY}`;

const headers = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
  'Version': '2021-07-28',
});

const FIELD_TYPE_BY_KEY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const section of FORM_SECTIONS) {
    for (const field of section.fields) map[field.key] = field.type;
  }
  return map;
})();

const UI_KEYS = new Set<string>(
  FORM_SECTIONS.flatMap((section) => section.fields.map((field) => field.key))
);

type FieldMap = {
  uiToSuffix: Record<string, string>;
  suffixToUi: Record<string, string>;
  optionLabelToKeyByUi: Record<string, Record<string, string>>;
};

let fieldMapPromise: Promise<FieldMap> | null = null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringField(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

function getObjectId(): string {
  const objectId = process.env.GHL_OBJECT_ID;
  if (!objectId) {
    throw new Error(
      'Missing env var: GHL_OBJECT_ID (set it in .env.local / deployment env vars and restart the server)'
    );
  }
  return objectId;
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function loadContactFieldsMap() {
  const raw = await readFile(path.join(process.cwd(), 'fields.json'), 'utf-8');
  const parsed = JSON.parse(raw) as { customFields?: Array<{ name?: string; fieldKey?: string }> };
  const map = new Map<string, string>();
  for (const field of parsed.customFields ?? []) {
    if (!field?.name || !field?.fieldKey) continue;
    const suffix = field.fieldKey.replace(/^contact\./, '');
    if (!UI_KEYS.has(suffix)) continue;
    map.set(normalizeLabel(field.name), suffix);
  }
  return map;
}

function normalizeFieldType(type: string | undefined) {
  switch (type) {
    case 'RADIO':
      return 'SINGLE_OPTIONS';
    case 'CHECKBOX':
      return 'CHECKBOX';
    case 'LARGE_TEXT':
      return 'TEXT';
    default:
      return type ?? '';
  }
}

function isTypeCompatible(uiType: string | undefined, customType: string | undefined) {
  const ui = normalizeFieldType(uiType);
  const custom = customType ?? '';
  if (ui === custom) return true;
  if (ui === 'TEXT' && custom === 'TEXT') return true;
  return false;
}

async function getFieldMap(): Promise<FieldMap> {
  if (!fieldMapPromise) {
    fieldMapPromise = (async () => {
      const contactNameToUi = await loadContactFieldsMap();
      const uiLabelToKeys = new Map<string, Array<{ key: string; type: string }>>();
      for (const section of FORM_SECTIONS) {
        for (const field of section.fields) {
          const labelKey = normalizeLabel(field.label);
          const list = uiLabelToKeys.get(labelKey) ?? [];
          list.push({ key: field.key, type: field.type });
          uiLabelToKeys.set(labelKey, list);
        }
      }

      const res = await fetch(
        `${GHL_BASE}/custom-fields/object-key/${OBJECT_OBJECT_KEY}?locationId=${LOCATION_ID}`,
        { headers: headers() }
      );
      const text = await res.text();
      log('getCustomObjectFields', res.status, text);
      if (!res.ok) {
        return { uiToSuffix: {}, suffixToUi: {}, optionLabelToKeyByUi: {} };
      }

      let fields: Array<{ fieldKey?: string; name?: string }> = [];
      try {
        const data = JSON.parse(text);
        fields = Array.isArray(data?.fields) ? data.fields : [];
      } catch {
        return { uiToSuffix: {}, suffixToUi: {}, optionLabelToKeyByUi: {} };
      }

      const uiToSuffix: Record<string, string> = {};
      const suffixToUi: Record<string, string> = {};
      const optionLabelToKeyByUi: Record<string, Record<string, string>> = {};

      for (const field of fields) {
        if (!field?.fieldKey) continue;
        const suffix = field.fieldKey.replace(`${OBJECT_OBJECT_KEY}.`, '');
        if (UI_KEYS.has(suffix)) {
          uiToSuffix[suffix] = suffix;
          suffixToUi[suffix] = suffix;
          if (Array.isArray((field as any).options)) {
            const options = (field as any).options as Array<{ key?: string; label?: string }>;
            const map: Record<string, string> = {};
            for (const opt of options) {
              if (!opt?.key || !opt?.label) continue;
              map[normalizeLabel(opt.label)] = opt.key;
            }
            optionLabelToKeyByUi[suffix] = map;
          }
          continue;
        }

        if (field.name) {
          const normalizedName = normalizeLabel(field.name);
          const uiKey = contactNameToUi.get(normalizedName);
          if (uiKey) {
            uiToSuffix[uiKey] = suffix;
            suffixToUi[suffix] = uiKey;
          } else {
            const candidates = uiLabelToKeys.get(normalizedName) ?? [];
            const match = candidates.find((c) => isTypeCompatible(c.type, (field as any).dataType));
            if (match) {
              uiToSuffix[match.key] = suffix;
              suffixToUi[suffix] = match.key;
            }
          }

          if (Array.isArray((field as any).options)) {
            const options = (field as any).options as Array<{ key?: string; label?: string }>;
            const map: Record<string, string> = {};
            for (const opt of options) {
              if (!opt?.key || !opt?.label) continue;
              map[normalizeLabel(opt.label)] = opt.key;
            }
            const uiKeyForOptions = suffixToUi[suffix];
            if (uiKeyForOptions) optionLabelToKeyByUi[uiKeyForOptions] = map;
          }
        }
      }

      return { uiToSuffix, suffixToUi, optionLabelToKeyByUi };
    })();
  }
  return fieldMapPromise;
}

function parseLooseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .trim()
    .replace(/\s/g, '')
    .replace(/[^\d.,-]/g, '');
  if (!cleaned) return undefined;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma && !hasDot) {
    normalized = cleaned.replace(',', '.');
  }

  const num = Number(normalized);
  return Number.isFinite(num) ? num : undefined;
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
  const relRes = await fetch(
    `${GHL_BASE}/associations/relations/${contactId}?locationId=${LOCATION_ID}`,
    { headers: headers() }
  );
  const relText = await relRes.text();
  log('getRelations', relRes.status, relText);
  if (!relRes.ok) return [];

  let relations: Array<Record<string, unknown>> = [];
  try {
    const parsed = JSON.parse(relText);
    relations = Array.isArray(parsed?.relations) ? parsed.relations : [];
  } catch {
    return [];
  }

  const recordIds = relations
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const firstObjectKey = r['firstObjectKey'];
      const secondObjectKey = r['secondObjectKey'];
      const firstRecordId = r['firstRecordId'];
      const secondRecordId = r['secondRecordId'];

      if (firstObjectKey === 'contact' && secondObjectKey === OBJECT_OBJECT_KEY && typeof secondRecordId === 'string') {
        return secondRecordId;
      }
      if (secondObjectKey === 'contact' && firstObjectKey === OBJECT_OBJECT_KEY && typeof firstRecordId === 'string') {
        return firstRecordId;
      }
      return undefined;
    })
    .filter((id): id is string => Boolean(id));

  const objectId = getObjectId();
  const fieldMap = await getFieldMap();
  const records = await Promise.all(
    recordIds.map(async (recordId) => {
      const res = await fetch(`${GHL_BASE}/objects/${objectId}/records/${recordId}`, { headers: headers() });
      const text = await res.text();
      log('getRecord', res.status, text);
      if (!res.ok) return null;
      try {
        const data = JSON.parse(text);
        const record = data.record || data;
        if (record?.properties && typeof record.properties === 'object') {
          record.properties = mapCustomObjectToUi(record.properties, fieldMap.suffixToUi);
        }
        return record;
      } catch {
        return null;
      }
    })
  );

  return records.filter(Boolean);
}

function mapCustomObjectToUi(
  properties: Record<string, unknown>,
  suffixToUi: Record<string, string>
) {
  const out: Record<string, unknown> = {};
  for (const [suffix, rawValue] of Object.entries(properties)) {
    const uiKey = suffixToUi[suffix] ?? suffix;
    if (!UI_KEYS.has(uiKey)) continue;

    if (isObject(rawValue) && typeof rawValue.value === 'number') {
      out[uiKey] = String(rawValue.value);
      continue;
    }

    out[uiKey] = rawValue as unknown;
  }
  return out;
}

async function toPropertiesObject(fields: Record<string, unknown>) {
  const fieldMap = await getFieldMap();
  const fallbackAliases: Record<string, string> =
    OBJECT_KEY === 'imveis'
      ? {
          referencia: 'referncia',
          endereco: 'endereco_do_imovel',
          categoria: 'categoria_do_imovel',
          tipo_do_imovel: 'tipo_de_imovel',
          pretensao_do_negocio: 'escolha_a_pretensao_do_negocio',
          situacao: 'situacao_text',
        }
      : {};

  const out: Record<string, unknown> = {};
  for (const [uiKey, rawValue] of Object.entries(fields)) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) continue;

    const schemaSuffix = fieldMap.uiToSuffix[uiKey] ?? fallbackAliases[uiKey] ?? uiKey;
    const type = FIELD_TYPE_BY_KEY[uiKey];
    const optionMap = fieldMap.optionLabelToKeyByUi[uiKey];

    if (type === 'MONETORY') {
      const num = parseLooseNumber(rawValue);
      if (num === undefined) continue;
      out[schemaSuffix] = { currency: 'default', value: num };
      continue;
    }

    if (type === 'NUMERICAL') {
      const num = parseLooseNumber(rawValue);
      if (num === undefined) continue;
      out[schemaSuffix] = num;
      continue;
    }

    if (Array.isArray(rawValue)) {
      if (optionMap) {
        out[schemaSuffix] = rawValue
          .map((v) => {
            const labelKey = normalizeLabel(String(v));
            return optionMap[labelKey] ?? v;
          })
          .map(String);
      } else {
        out[schemaSuffix] = rawValue.map(String);
      }
      continue;
    }

    if (optionMap) {
      const labelKey = normalizeLabel(String(rawValue));
      out[schemaSuffix] = optionMap[labelKey] ?? String(rawValue);
    } else {
      out[schemaSuffix] = String(rawValue);
    }
  }

  return out;
}

export async function createProperty(contactId: string, fields: Record<string, unknown>) {
  const safeFields: Record<string, unknown> = { ...fields };
  if (safeFields['referencia'] === undefined || safeFields['referencia'] === '') {
    safeFields['referencia'] = `IMOVEL-${Date.now()}`;
  }

  const fieldKeys = Object.keys(safeFields);
  const properties = await toPropertiesObject(safeFields);
  const sentKeys = Object.keys(properties);
  const body = {
    locationId: LOCATION_ID,
    properties,
  };

  console.log('[GHL:createProperty] sending:', JSON.stringify(body).slice(0, 600));

  const res = await fetch(`${GHL_BASE}/objects/${getObjectId()}/records`, {
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
  const properties = await toPropertiesObject(fields);
  const sentKeys = Object.keys(properties);
  const body = {
    properties,
  };

  const res = await fetch(`${GHL_BASE}/objects/${getObjectId()}/records/${recordId}`, {
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
  const assocRes = await fetch(
    `${GHL_BASE}/associations/objectKey/${OBJECT_OBJECT_KEY}?locationId=${LOCATION_ID}`,
    { headers: headers() }
  );
  const assocText = await assocRes.text();
  log('getAssociation', assocRes.status, assocText);
  if (!assocRes.ok) return;

  let associationId: string | undefined;
  let firstObjectKey: string | undefined;
  let secondObjectKey: string | undefined;

  try {
    const parsed = JSON.parse(assocText);
    const associations = Array.isArray(parsed?.associations) ? parsed.associations : [];
    const match = associations.find(
      (a: any) =>
        a &&
        typeof a === 'object' &&
        ((a.firstObjectKey === 'contact' && a.secondObjectKey === OBJECT_OBJECT_KEY) ||
          (a.secondObjectKey === 'contact' && a.firstObjectKey === OBJECT_OBJECT_KEY))
    );
    associationId = typeof match?.id === 'string' ? match.id : undefined;
    firstObjectKey = typeof match?.firstObjectKey === 'string' ? match.firstObjectKey : undefined;
    secondObjectKey = typeof match?.secondObjectKey === 'string' ? match.secondObjectKey : undefined;
  } catch {
    return;
  }

  if (!associationId || !firstObjectKey || !secondObjectKey) return;

  const body =
    firstObjectKey === 'contact' && secondObjectKey === OBJECT_OBJECT_KEY
      ? { locationId: LOCATION_ID, associationId, firstRecordId: contactId, secondRecordId: recordId }
      : { locationId: LOCATION_ID, associationId, firstRecordId: recordId, secondRecordId: contactId };

  const res = await fetch(`${GHL_BASE}/associations/relations`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  log('associate', res.status, text);
}
