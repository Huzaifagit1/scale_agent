import { FORM_SECTIONS } from './fields';
import { readFile } from 'fs/promises';
import path from 'path';
import { normalizePropertyStatus, PROPERTY_STATUS_KEY } from './property-status';

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
  customNameToSuffix: Record<string, string>;
  customTypeBySuffix: Record<string, string>;
  optionLabelToKeyBySuffix: Record<string, Record<string, string>>;
  optionKeyToLabelBySuffix: Record<string, Record<string, string>>;
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
    return {
      uiToSuffix: {},
      suffixToUi: {},
      optionLabelToKeyByUi: {},
      customNameToSuffix: {},
      customTypeBySuffix: {},
      optionLabelToKeyBySuffix: {},
      optionKeyToLabelBySuffix: {},
    };
  }

      let fields: Array<{ fieldKey?: string; name?: string }> = [];
      try {
        const data = JSON.parse(text);
        fields = Array.isArray(data?.fields) ? data.fields : [];
  } catch {
    return {
      uiToSuffix: {},
      suffixToUi: {},
      optionLabelToKeyByUi: {},
      customNameToSuffix: {},
      customTypeBySuffix: {},
      optionLabelToKeyBySuffix: {},
      optionKeyToLabelBySuffix: {},
    };
  }

      const uiToSuffix: Record<string, string> = {};
      const suffixToUi: Record<string, string> = {};
      const optionLabelToKeyByUi: Record<string, Record<string, string>> = {};
      const customNameToSuffix: Record<string, string> = {};
      const customTypeBySuffix: Record<string, string> = {};
      const optionLabelToKeyBySuffix: Record<string, Record<string, string>> = {};
      const optionKeyToLabelBySuffix: Record<string, Record<string, string>> = {};

      for (const field of fields) {
        if (!field?.fieldKey) continue;
        const suffix = field.fieldKey.replace(`${OBJECT_OBJECT_KEY}.`, '');
        if (field.name) {
          customNameToSuffix[normalizeLabel(field.name)] = suffix;
        }
        if ((field as any).dataType) {
          customTypeBySuffix[suffix] = String((field as any).dataType);
        }
        if (UI_KEYS.has(suffix)) {
          uiToSuffix[suffix] = suffix;
          suffixToUi[suffix] = suffix;
          if (Array.isArray((field as any).options)) {
            const options = (field as any).options as Array<{ key?: string; label?: string }>;
            const map: Record<string, string> = {};
            const reverse: Record<string, string> = {};
            for (const opt of options) {
              if (!opt?.key || !opt?.label) continue;
              map[normalizeLabel(opt.label)] = opt.key;
              reverse[String(opt.key)] = String(opt.label);
            }
            optionLabelToKeyByUi[suffix] = map;
            optionLabelToKeyBySuffix[suffix] = map;
            optionKeyToLabelBySuffix[suffix] = reverse;
          }
          continue;
        }

        if (field.name) {
          const normalizedName = normalizeLabel(field.name);
          const contactUiKey = contactNameToUi.get(normalizedName);
          const uiKey =
            contactUiKey &&
            isTypeCompatible(FIELD_TYPE_BY_KEY[contactUiKey], (field as any).dataType) &&
            !uiToSuffix[contactUiKey]
              ? contactUiKey
              : undefined;
          if (uiKey) {
            uiToSuffix[uiKey] = suffix;
            suffixToUi[suffix] = uiKey;
          } else {
            const candidates = uiLabelToKeys.get(normalizedName) ?? [];
            const match = candidates.find(
              (c) => isTypeCompatible(c.type, (field as any).dataType) && !uiToSuffix[c.key]
            );
            if (match) {
              uiToSuffix[match.key] = suffix;
              suffixToUi[suffix] = match.key;
            }
          }

          if (Array.isArray((field as any).options)) {
            const options = (field as any).options as Array<{ key?: string; label?: string }>;
            const map: Record<string, string> = {};
            const reverse: Record<string, string> = {};
            for (const opt of options) {
              if (!opt?.key || !opt?.label) continue;
              map[normalizeLabel(opt.label)] = opt.key;
              reverse[String(opt.key)] = String(opt.label);
            }
            const uiKeyForOptions = suffixToUi[suffix];
            if (uiKeyForOptions) optionLabelToKeyByUi[uiKeyForOptions] = map;
            optionLabelToKeyBySuffix[suffix] = map;
            optionKeyToLabelBySuffix[suffix] = reverse;
          }
        }
      }

      return {
        uiToSuffix,
        suffixToUi,
        optionLabelToKeyByUi,
        customNameToSuffix,
        customTypeBySuffix,
        optionLabelToKeyBySuffix,
        optionKeyToLabelBySuffix,
      };
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
          record.properties = mapCustomObjectToUi(
            record.properties,
            fieldMap.suffixToUi,
            fieldMap.optionKeyToLabelBySuffix
          );
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
  suffixToUi: Record<string, string>,
  optionKeyToLabelBySuffix: Record<string, Record<string, string>>
) {
  const out: Record<string, unknown> = {};
  for (const [suffix, rawValue] of Object.entries(properties)) {
    const uiKey = SUFFIX_TO_UI_HARDCODED[suffix] ?? suffixToUi[suffix] ?? suffix;
    if (!UI_KEYS.has(uiKey)) continue;

    if (isObject(rawValue) && typeof rawValue.value === 'number') {
      out[uiKey] = String(rawValue.value);
      continue;
    }

    if (Array.isArray(rawValue)) {
      const map = optionKeyToLabelBySuffix[suffix];
      if (map) {
        out[uiKey] = rawValue.map((v) => map[String(v)] ?? String(v));
      } else {
        out[uiKey] = rawValue;
      }
      continue;
    }

    if (typeof rawValue === 'string') {
      const map = optionKeyToLabelBySuffix[suffix];
      if (map && map[rawValue]) {
        out[uiKey] = map[rawValue];
        continue;
      }
    }

    out[uiKey] = rawValue as unknown;
  }
  if (Object.prototype.hasOwnProperty.call(properties, PROPERTY_STATUS_KEY)) {
    const rawStatus = properties[PROPERTY_STATUS_KEY];
    const statusMap = optionKeyToLabelBySuffix[PROPERTY_STATUS_KEY];
    if (typeof rawStatus === 'string' && statusMap?.[rawStatus]) {
      out[PROPERTY_STATUS_KEY] = statusMap[rawStatus];
    } else {
      out[PROPERTY_STATUS_KEY] = rawStatus as unknown;
    }
  }
  // Prefer PL/TEXT fields to derive checkbox UI for Pretensão do negócio,
  // because updates skip the checkbox field in GHL (it can become stale).
  const readString = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (isObject(value)) {
      const key = getStringField(value, 'key');
      if (key) return key;
      const val = getStringField(value, 'value');
      if (val) return val;
      const label = getStringField(value, 'label');
      if (label) return label;
    }
    return undefined;
  };
  const pl = readString(properties['escolha_a_pretensao_do_negocio_pl']);
  const text = readString(properties['escolha_a_pretensao_do_negocio_text']);
  if (pl || text) {
    let values: string[] = [];
    const plNorm = pl ? normalizeLabel(pl) : '';
    if (plNorm === 'venda e aluguel' || plNorm === 'venda_e_aluguel') values = ['Venda', 'Aluguel'];
    else if (plNorm === 'venda') values = ['Venda'];
    else if (plNorm === 'aluguel') values = ['Aluguel'];
    else if (text) {
      values = text
        .split(/[,;|]/g)
        .map((v) => v.trim())
        .filter(Boolean)
        .map((v) => {
          const norm = normalizeLabel(v);
          if (norm === 'venda') return 'Venda';
          if (norm === 'aluguel') return 'Aluguel';
          return v;
        });
    }
    if (values.length > 0) {
      out['escolha_a_pretensao_do_negocio'] = values;
    }
  }
  const permutaPl = readString(properties['permuta_pl']);
  if (permutaPl) {
    const norm = normalizeLabel(permutaPl);
    out['permuta'] = norm === 'sim' ? 'Sim' : norm === 'nao' ? 'Não' : permutaPl;
  }
  const temporadaPl = readString(properties['temporada_pl']);
  if (temporadaPl) {
    const norm = normalizeLabel(temporadaPl);
    out['temporada'] = norm === 'sim' ? 'Sim' : norm === 'nao' ? 'Não' : temporadaPl;
  }
  return out;
}

// UI key → GHL custom object field suffix for location oT5ygTOd3WJdNY45bN5q
const HARDCODED: Record<string, string> = {
  referencia_do_imovel:                  'nome_do_imvel',
  situacao_da_disponibilidade_atualizacao: 'disponibilidade_do_imvel',
  permuta:                               'o_proprietrio_aceita_permuta_do_imvel',
  tipo_de_imovel:                        'tipo_do_imvel',
  finalidade:                            'finalidade_do_imvel',
  endereco_do_imovel:                    'endereo_do_imvel',
  numero_do_endereco_do_imovel:          'nmero_do_endereo_do_imvel',
  bairro_commercial:                     'bairro_do_imvel',
  bairro_oficial_endereco:               'bairro_do_imvel',
  cep:                                   'cep_do_imvel',
  cidade_endereco:                       'cidade_do_imvel',
  uf_endereco:                           'estado_do_imvel',
  numero_de_dormitorios:                 'nmero_de_dormitrios',
  numero_de_suites:                      'nmero_de_sutes',
  numero_de_banheiros:                   'nmero_de_banheiros',
  numero_de_salas:                       'nmero_de_salas',
  numero_de_vagas_garagens_cobertas:     'nmero_de_vagas',
  area_privativa:                        'rea_em_m',
  data_da_ultima_atualizacao:            'ltima_atualizao_da_disponibilidade_do_imvel',
  valor_de_venda:                        'valor_de_venda',
  valor_de_locacao:                      'valor_de_locao',
  valor_do_condominio:                   'valor_de_condominio',
  valor_do_iptu:                         'valor_de_iptu',
  descricao_do_imovel:                   'descrio_completa_do_imvel',
};

// GHL custom object field suffix → UI key (inverse of HARDCODED, for reading records)
const SUFFIX_TO_UI_HARDCODED: Record<string, string> = {
  nome_do_imvel:                                  'referencia_do_imovel',
  disponibilidade_do_imvel:                       'situacao_da_disponibilidade_atualizacao',
  tipo_do_imvel:                                  'tipo_de_imovel',
  finalidade_do_imvel:                            'finalidade',
  endereo_do_imvel:                               'endereco_do_imovel',
  nmero_do_endereo_do_imvel:                     'numero_do_endereco_do_imovel',
  bairro_do_imvel:                                'bairro_commercial',
  cep_do_imvel:                                   'cep',
  cidade_do_imvel:                                'cidade_endereco',
  estado_do_imvel:                                'uf_endereco',
  nmero_de_dormitrios:                           'numero_de_dormitorios',
  nmero_de_sutes:                                 'numero_de_suites',
  nmero_de_banheiros:                             'numero_de_banheiros',
  nmero_de_salas:                                 'numero_de_salas',
  nmero_de_vagas:                                 'numero_de_vagas_garagens_cobertas',
  rea_em_m:                                      'area_privativa',
  ltima_atualizao_da_disponibilidade_do_imvel:  'data_da_ultima_atualizacao',
  valor_de_locao:                                 'valor_de_locacao',
  valor_de_condominio:                            'valor_do_condominio',
  valor_de_iptu:                                  'valor_do_iptu',
  o_proprietrio_aceita_permuta_do_imvel:          'permuta',
  descrio_completa_do_imvel:                     'descricao_do_imovel',
};

async function toPropertiesObject(fields: Record<string, unknown>) {
  const fieldMap = await getFieldMap();
  const fallbackAliases: Record<string, string> = {};

  const out: Record<string, unknown> = {};
  for (const [uiKey, rawValue] of Object.entries(fields)) {
    if (rawValue === '' || rawValue === null || rawValue === undefined) continue;

    const normalizedUi = normalizeLabel(uiKey);
    const schemaSuffix =
      HARDCODED[uiKey] ??
      fallbackAliases[uiKey] ??
      fieldMap.uiToSuffix[uiKey] ??
      fieldMap.customNameToSuffix[normalizedUi] ??
      uiKey;

    // Skip fields that don't exist in this location's custom object schema
    if (!(schemaSuffix in fieldMap.customTypeBySuffix)) continue;

    const type = FIELD_TYPE_BY_KEY[uiKey] ?? fieldMap.customTypeBySuffix[schemaSuffix] ?? 'TEXT';
    const optionMap =
      fieldMap.optionLabelToKeyByUi[uiKey] ??
      fieldMap.optionLabelToKeyBySuffix[schemaSuffix];

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

    if (type === 'CHECKBOX') {
      const toArray = (value: unknown) => {
        if (Array.isArray(value)) return value.map(String);
        const str = String(value ?? '').trim();
        if (!str) return [];
        if (str.includes(',') || str.includes(';') || str.includes('|')) {
          return str.split(/[,;|]/g).map((s) => s.trim()).filter(Boolean);
        }
        return [str];
      };

      const values = toArray(rawValue);
      if (optionMap) {
        const mapped = values
          .map((v) => {
            const labelKey = normalizeLabel(String(v));
            return optionMap[labelKey] ?? v;
          })
          .map(String)
          .filter((v) => v.trim() !== '');
        if (mapped.length === 0) continue;
        out[schemaSuffix] = mapped;

        if (schemaSuffix === 'escolha_a_pretensao_do_negocio') {
          const unique = Array.from(new Set(mapped.map((v) => v.toLowerCase())));
          let plValue = unique[0];
          if (unique.includes('venda') && unique.includes('aluguel')) plValue = 'venda_e_aluguel';
          if (plValue) out['escolha_a_pretensao_do_negocio_pl'] = plValue;
          out['escolha_a_pretensao_do_negocio_text'] = unique.join(', ');
        }
      } else {
        const mapped = values.map(String).filter((v) => v.trim() !== '');
        if (mapped.length === 0) continue;
        out[schemaSuffix] = mapped;

        if (schemaSuffix === 'escolha_a_pretensao_do_negocio') {
          const unique = Array.from(new Set(mapped.map((v) => v.toLowerCase())));
          let plValue = unique[0];
          if (unique.includes('venda') && unique.includes('aluguel')) plValue = 'venda_e_aluguel';
          if (plValue) out['escolha_a_pretensao_do_negocio_pl'] = plValue;
          out['escolha_a_pretensao_do_negocio_text'] = unique.join(', ');
        }
      }
      continue;
    }

    if (
      (schemaSuffix === 'temporada_pl' || schemaSuffix === 'permuta_pl') &&
      typeof rawValue === 'string'
    ) {
      const norm = normalizeLabel(rawValue);
      if (norm === 'sim') {
        out[schemaSuffix] = 'sim';
        continue;
      }
      if (norm === 'nao') {
        out[schemaSuffix] = 'nao';
        continue;
      }
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
  // Use the UI key here — HARDCODED map will convert it to 'referncia' for GHL
  if (safeFields['referencia_do_imovel'] === undefined || safeFields['referencia_do_imovel'] === '') {
    safeFields['referencia_do_imovel'] = `IMOVEL-${Date.now()}`;
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
  // Ensure PL and text fields are populated when checkbox is present in UI
  const rawPretensao = (fields as Record<string, unknown>)['escolha_a_pretensao_do_negocio'];
  if (rawPretensao !== undefined) {
    const toArray = (value: unknown) => {
      if (Array.isArray(value)) return value.map(String);
      const str = String(value ?? '').trim();
      if (!str) return [];
      if (str.includes(',') || str.includes(';') || str.includes('|')) {
        return str.split(/[,;|]/g).map((s) => s.trim()).filter(Boolean);
      }
      return [str];
    };
    const values = toArray(rawPretensao)
      .map((v) => normalizeLabel(String(v)))
      .filter(Boolean);
    if (values.length > 0) {
      const unique = Array.from(new Set(values));
      let plValue = unique[0];
      if (unique.includes('venda') && unique.includes('aluguel')) plValue = 'venda_e_aluguel';
      properties['escolha_a_pretensao_do_negocio_pl'] = plValue;
      properties['escolha_a_pretensao_do_negocio_text'] = unique.join(', ');
    }
  }
  // GHL rejects updates for this checkbox field even with correct format.
  // Skip it on UPDATE to allow other fields to save.
  if (Object.prototype.hasOwnProperty.call(properties, 'escolha_a_pretensao_do_negocio')) {
    delete (properties as Record<string, unknown>)['escolha_a_pretensao_do_negocio'];
  }
  const sentKeys = Object.keys(properties);
  const debugPretensao = properties['escolha_a_pretensao_do_negocio'];
  // GHL PUT (confirmed working format):
  // - Object ID in URL (not key)
  // - locationId as QUERY PARAM (NOT in body — GHL rejects it if in body)
  // - Properties as flat object with short keys (no custom_objects.imveis. prefix)
  const objectId = getObjectId();
  const url = `${GHL_BASE}/objects/${objectId}/records/${recordId}?locationId=${LOCATION_ID}`;
  console.log('[GHL:updateProperty] PUT', url, 'sentKeys:', sentKeys);

  const res = await fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ properties }),
  });

  const text = await res.text();
  log('updateProperty', res.status, text);
  if (!res.ok) {
    if (
      res.status === 422 &&
      text.includes('Escolha a pretensão do negócio') &&
      Object.prototype.hasOwnProperty.call(properties, 'escolha_a_pretensao_do_negocio')
    ) {
      const retryProps = { ...properties } as Record<string, unknown>;
      const rawValue = retryProps['escolha_a_pretensao_do_negocio'];
      delete retryProps['escolha_a_pretensao_do_negocio'];

      const toArray = (value: unknown) => {
        if (Array.isArray(value)) return value.map(String);
        const str = String(value ?? '').trim();
        if (!str) return [];
        if (str.includes(',') || str.includes(';') || str.includes('|')) {
          return str.split(/[,;|]/g).map((s) => s.trim()).filter(Boolean);
        }
        return [str];
      };

      const values = toArray(rawValue).map((v) => v.toLowerCase());
      let plValue = values[0];
      if (values.includes('venda') && values.includes('aluguel')) plValue = 'venda_e_aluguel';

      // Retry using SINGLE_OPTIONS field if checkbox update is rejected
      if (plValue) retryProps['escolha_a_pretensao_do_negocio_pl'] = plValue;

      const retryRes = await fetch(url, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ properties: retryProps }),
      });
      const retryText = await retryRes.text();
      log('updateProperty-retry', retryRes.status, retryText);
      if (retryRes.ok) {
        try { return JSON.parse(retryText); } catch { return {}; }
      }

      // Final fallback: use TEXT field only
      const retryPropsText = { ...retryProps } as Record<string, unknown>;
      delete retryPropsText['escolha_a_pretensao_do_negocio_pl'];
      const textValue = values.join(', ');
      if (textValue) retryPropsText['escolha_a_pretensao_do_negocio_text'] = textValue;
      const retryResText = await fetch(url, {
        method: 'PUT',
        headers: headers(),
        body: JSON.stringify({ properties: retryPropsText }),
      });
      const retryTextText = await retryResText.text();
      log('updateProperty-retry-text', retryResText.status, retryTextText);
      if (retryResText.ok) {
        try { return JSON.parse(retryTextText); } catch { return {}; }
      }
    }

    if (res.status === 422) {
      const match = text.match(/updates to (.+?) due to/i);
      if (match?.[1]) {
        const fieldName = normalizeLabel(match[1]);
        const fieldMap = await getFieldMap();
        const suffix = fieldMap.customNameToSuffix[fieldName];
        if (suffix && Object.prototype.hasOwnProperty.call(properties, suffix)) {
          const retryProps = { ...properties } as Record<string, unknown>;
          delete retryProps[suffix];
          const retryRes = await fetch(url, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({ properties: retryProps }),
          });
          const retryText = await retryRes.text();
          log('updateProperty-retry-skip', retryRes.status, retryText);
          if (retryRes.ok) {
            try { return JSON.parse(retryText); } catch { return {}; }
          }
        }
      }
    }

    throw new Error(
      `Failed to update (${res.status}) keys=${JSON.stringify(fieldKeys)} sentKeys=${JSON.stringify(sentKeys)} escolha_a_pretensao_do_negocio=${JSON.stringify(debugPretensao)}: ${text}`
    );
  }
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(text); } catch { /* empty */ }

  if (Object.prototype.hasOwnProperty.call(fields, PROPERTY_STATUS_KEY)) {
    const verifyRes = await fetch(`${GHL_BASE}/objects/${getObjectId()}/records/${recordId}`, {
      headers: headers(),
    });
    const verifyText = await verifyRes.text();
    log('verifyUpdatedRecord', verifyRes.status, verifyText);

    if (!verifyRes.ok) {
      throw new Error(`Updated record could not be reloaded for verification (${verifyRes.status}).`);
    }

    try {
      const verifyData = JSON.parse(verifyText);
      const verifyRecord = verifyData.record || verifyData;
      const rawProperties = isObject(verifyRecord?.properties) ? verifyRecord.properties : null;
      if (!rawProperties) {
        throw new Error('Updated record verification returned no properties.');
      }

      const fieldMap = await getFieldMap();
      const uiProperties = mapCustomObjectToUi(
        rawProperties,
        fieldMap.suffixToUi,
        fieldMap.optionKeyToLabelBySuffix
      );

      const expectedStatus = normalizePropertyStatus(fields[PROPERTY_STATUS_KEY]);
      const actualStatus = normalizePropertyStatus(uiProperties[PROPERTY_STATUS_KEY]);

      if (expectedStatus && actualStatus !== expectedStatus) {
        throw new Error(
          `Status update did not persist. Expected "${String(fields[PROPERTY_STATUS_KEY])}", but GHL returned "${String(uiProperties[PROPERTY_STATUS_KEY] ?? '')}".`
        );
      }
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Updated record verification failed.');
    }
  }

  return parsed;
}

export async function addTagToContact(contactId: string, tag: string) {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ tags: [tag] }),
  });
  const text = await res.text();
  log('addTag', res.status, text);
  // intentionally non-throwing — tag failure must not block the main response
}

export async function deleteProperty(recordId: string) {
  // DELETE: object ID in URL, NO locationId (GHL rejects it if present)
  const res = await fetch(
    `${GHL_BASE}/objects/${getObjectId()}/records/${recordId}`,
    { method: 'DELETE', headers: headers() }
  );
  const text = await res.text();
  log('deleteProperty', res.status, text);
  if (!res.ok) {
    throw new Error(`Failed to delete (${res.status}): ${text}`);
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
