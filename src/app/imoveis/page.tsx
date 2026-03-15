'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FORM_SECTIONS, FieldDef } from '@/lib/fields';

// ─── Types ───────────────────────────────────────────────
type PropertyData = Record<string, string | string[]>;

type Property = {
  id?: string;          // GHL record id (existing)
  isNew?: boolean;      // unsaved new property
  isOpen: boolean;
  isSaving: boolean;
  isDirty: boolean;
  data: PropertyData;
};

type Toast = { id: number; type: 'success' | 'error'; message: string };

// ─── Helpers ─────────────────────────────────────────────
function emptyProperty(): Property {
  return { isNew: true, isOpen: true, isSaving: false, isDirty: true, data: {} };
}

function normalizeFieldValue(value?: string | string[]) {
  return String(Array.isArray(value) ? value.join(' ') : value || '').trim().toLowerCase();
}

function computeLegacySignature(data: PropertyData) {
  const keys = [
    'referencia',
    'endereco',
    'cidade_endereco',
    'cep',
    'numero',
    'bairro_oficial',
    'bairro_commercial',
  ];
  return keys.map((k) => normalizeFieldValue(data[k])).join('|');
}

function getPropertyLabel(p: Property, index: number): string {
  const addr = [
    p.data['cidade_endereco'],
    p.data['bairro_commercial'],
  ].filter(Boolean).join(', ');
  return addr || `Imóvel ${index + 1}`;
}

function getPropertyMeta(p: Property): string {
  const parts: string[] = [];
  if (p.data['pretensao_do_negocio']) parts.push(String(p.data['pretensao_do_negocio']));
  if (p.data['tipo_do_imovel']) parts.push(String(p.data['tipo_do_imovel']));
  if (p.data['numero_de_dormitorios']) parts.push(`${p.data['numero_de_dormitorios']} dorm.`);
  return parts.join(' · ') || (p.isNew ? 'Novo imóvel' : 'Imóvel cadastrado');
}

function mapCustomFieldsToProperty(customFields: Array<{ id: string; value: string }>): PropertyData {
  const data: PropertyData = {};
  
  // Build a map of ghlId -> field key from FORM_SECTIONS
  const ghlIdToKey: Record<string, string> = {};
  for (const section of FORM_SECTIONS) {
    for (const field of section.fields) {
      ghlIdToKey[field.ghlId] = field.key;
    }
  }
  
  // Map custom fields to property data
  for (const cf of customFields) {
    const key = ghlIdToKey[cf.id];
    if (key && cf.value) {
      data[key] = cf.value;
    }
  }
  
  return data;
}

function mapPropertyToGhlFields(data: PropertyData): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};

  const allowedKeys = new Set<string>();
  for (const section of FORM_SECTIONS) {
    for (const field of section.fields) allowedKeys.add(field.key);
  }

  // For custom-object records, the API expects keys that match the object's field keys
  // (we send plain keys and the server prefixes them as `custom_objects.<objectKey>.<fieldKey>`).
  for (const [key, value] of Object.entries(data)) {
    if (!allowedKeys.has(key) || !value) continue;
    result[key] = Array.isArray(value) ? value : String(value);
  }

  return result;
}

// ─── Field component ─────────────────────────────────────
function FieldInput({ field, value, onChange }: {
  field: FieldDef;
  value: string | string[];
  onChange: (val: string | string[]) => void;
}) {
  const strVal = Array.isArray(value) ? '' : (value || '');
  const arrVal = Array.isArray(value) ? value : [];

  if (field.type === 'RADIO' && field.options) {
    return (
      <div className="radio-group">
        {field.options.map(opt => (
          <label key={opt} className={`radio-option${strVal === opt ? ' selected' : ''}`}>
            <input type="radio" checked={strVal === opt} onChange={() => onChange(opt)} />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'CHECKBOX' && field.options) {
    return (
      <div className="checkbox-group">
        {field.options.map(opt => {
          const checked = arrVal.includes(opt);
          return (
            <label key={opt} className={`checkbox-option${checked ? ' selected' : ''}`}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  if (checked) onChange(arrVal.filter(v => v !== opt));
                  else onChange([...arrVal, opt]);
                }}
              />
              {opt}
            </label>
          );
        })}
      </div>
    );
  }

  if (field.type === 'LARGE_TEXT') {
    return (
      <textarea
        className="field-input textarea"
        value={strVal}
        placeholder={field.label}
        onChange={e => onChange(e.target.value)}
        rows={3}
      />
    );
  }

  if (field.type === 'MONETORY') {
    return (
      <input
        className="field-input"
        type="text"
        value={strVal}
        placeholder="R$ 0,00"
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  if (field.type === 'NUMERICAL') {
    return (
      <input
        className="field-input"
        type="number"
        min="0"
        value={strVal}
        placeholder="0"
        onChange={e => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      className="field-input"
      type="text"
      value={strVal}
      placeholder={field.label}
      onChange={e => onChange(e.target.value)}
    />
  );
}

// ─── Single property form ─────────────────────────────────
function PropertyForm({ property, index, onUpdate, onDelete, onSave }: {
  property: Property;
  index: number;
  onUpdate: (data: PropertyData) => void;
  onDelete: () => void;
  onSave: () => void;
}) {
  const toggle = () => onUpdate({ ...property.data, __open: property.isOpen ? '' : '1' });

  const setField = (key: string, val: string | string[]) => {
    onUpdate({ ...property.data, [key]: val });
  };

  return (
    <div className="property-card">
      <div className="property-card-header" onClick={toggle}>
        <div className="property-card-left">
          <div className="property-number">{index + 1}</div>
          <div>
            <div className="property-card-title">{getPropertyLabel(property, index)}</div>
            <div className="property-card-meta">{getPropertyMeta(property)}</div>
          </div>
        </div>
        <div className="property-card-actions" onClick={e => e.stopPropagation()}>
          {property.isDirty && (
            <button
              className="btn-icon"
              title="Salvar este imóvel"
              onClick={onSave}
              disabled={property.isSaving}
              style={{ color: '#1A6B3C', borderColor: '#A8D5B5' }}
            >
              {property.isSaving ? '⏳' : '💾'}
            </button>
          )}
          <button className="btn-icon delete" title="Remover" onClick={onDelete}>🗑</button>
          <span className={`chevron${property.isOpen ? ' open' : ''}`}>▼</span>
        </div>
      </div>

      {property.isOpen && (
        <div className="property-card-body">
          <div className="section-divider" />
          {FORM_SECTIONS.map(section => (
            <div key={section.id} className="form-section">
              <div className="form-section-title">{section.title}</div>
              <div className={`form-grid${section.fields.some(f => f.type === 'CHECKBOX' || f.type === 'RADIO' || f.type === 'LARGE_TEXT') ? ' full' : ''}`}>
                {section.fields.map(field => (
                  <div key={field.key} className="field-group">
                    <label className="field-label">{field.label}</label>
                    <FieldInput
                      field={field}
                      value={property.data[field.key] || (field.type === 'CHECKBOX' ? [] : '')}
                      onChange={val => setField(field.key, val)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────
export default function ImoveisPage() {
  const searchParams = useSearchParams();
  const contactId = searchParams.get('c') || searchParams.get('contact');

  const [contact, setContact] = useState<{ firstName?: string; lastName?: string; email?: string } | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [legacySignature, setLegacySignature] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Load contact + existing properties ──
  useEffect(() => {
    if (!contactId) { setLoading(false); setError('no-id'); return; }

    fetch(`/api/contact?id=${contactId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setContact(data.contact);
        
        // First try to load from custom object records (properties)
        let loaded: Property[] = (data.properties || []).map((rec: Record<string, unknown>) => ({
          id: rec.id as string,
          isNew: false,
          isOpen: false,
          isSaving: false,
          isDirty: false,
          data: (rec.properties || rec) as PropertyData,
        }));
        
        // Load legacy contact customFields, but avoid duplicating an existing property
        if (data.contact?.customFields?.length > 0) {
          const customFieldsData = mapCustomFieldsToProperty(data.contact.customFields);
          if (Object.keys(customFieldsData).length > 0) {
            const signature = computeLegacySignature(customFieldsData);
            setLegacySignature(signature);

            const hideKey = contactId ? `imoveis:hideLegacy:${contactId}` : '';
            const isHidden = hideKey ? localStorage.getItem(hideKey) === signature : false;

            const hasDuplicate = loaded.some((p) => computeLegacySignature(p.data) === signature);

            if (!isHidden && !hasDuplicate) {
              loaded = [{
                id: undefined,
                isNew: true,
                isOpen: true,
                isSaving: false,
                isDirty: true,
                data: customFieldsData,
              }, ...loaded];
            }
          }
        }
        
        setProperties(loaded.length > 0 ? loaded : [emptyProperty()]);
      })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [contactId]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const addProperty = () => {
    setProperties(ps => [...ps, emptyProperty()]);
  };

  const updateProperty = (index: number, data: PropertyData) => {
    setProperties(ps => ps.map((p, i) => {
      if (i !== index) return p;
      const isOpen = data.__open !== undefined ? data.__open === '1' : p.isOpen;
      const { __open, ...cleanData } = data;
      void __open;
      return { ...p, data: cleanData, isOpen, isDirty: true };
    }));
  };

  const deleteProperty = (index: number) => {
    const prop = properties[index];
    if (legacySignature && contactId && computeLegacySignature(prop.data) === legacySignature) {
      localStorage.setItem(`imoveis:hideLegacy:${contactId}`, legacySignature);
    }
    setProperties(ps => ps.filter((_, i) => i !== index));
  };

  const saveProperty = async (index: number) => {
    const prop = properties[index];
    if (!contactId) return;

    setProperties(ps => ps.map((p, i) => i === index ? { ...p, isSaving: true } : p));

    try {
      const method = prop.isNew ? 'POST' : 'PUT';
      const ghlFields = mapPropertyToGhlFields(prop.data);
      const body = prop.isNew
        ? { contactId, fields: ghlFields }
        : { recordId: prop.id, fields: ghlFields };

      const res = await fetch('/api/properties', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro');

      const newId = data.result?.id || data.result?.record?.id || prop.id;
      setProperties(ps => ps.map((p, i) => i === index
        ? { ...p, id: newId, isNew: false, isSaving: false, isDirty: false }
        : p
      ));
      addToast('success', '✓ Imóvel salvo com sucesso');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro';
      setProperties(ps => ps.map((p, i) => i === index ? { ...p, isSaving: false } : p));
      addToast('error', `Erro ao salvar: ${msg}`);
    }
  };

  const saveAll = async () => {
    const dirtyIndexes = properties.map((p, i) => p.isDirty ? i : -1).filter(i => i >= 0);
    for (const idx of dirtyIndexes) {
      await saveProperty(idx);
    }
    if (dirtyIndexes.length === 0) addToast('success', 'Todos os imóveis já estão salvos');
  };

  // ── Render states ──
  if (loading) return (
    <div className="state-screen">
      <div className="spinner" style={{ borderColor: '#D4C5B0', borderTopColor: '#B8960C', width: 36, height: 36 }} />
      <div className="state-desc">Carregando seus dados...</div>
    </div>
  );

  if (error === 'no-id') return (
    <div className="state-screen">
      <div className="state-icon">🔗</div>
      <div className="state-title">Link inválido</div>
      <div className="state-desc">Acesse esta página através do link enviado no WhatsApp.</div>
    </div>
  );

  if (error) return (
    <div className="state-screen">
      <div className="state-icon">⚠️</div>
      <div className="state-title">Erro ao carregar</div>
      <div className="state-desc">{error}</div>
    </div>
  );

  const dirtyCount = properties.filter(p => p.isDirty).length;

  return (
    <>
      {/* Header */}
      <header className="page-header">
        <div className="container">
          <div className="header-eyebrow">Cadastro de imóveis</div>
          <h1 className="header-title">Seus Imóveis</h1>
          <p className="header-subtitle">Preencha as informações de cada propriedade abaixo</p>
          {contact && (
            <div className="header-contact-badge">
              👤 <span>{contact.firstName} {contact.lastName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Body */}
      <main className="main-content">
        <div className="container">
          <div className="properties-header">
            <h2 className="properties-title">Propriedades</h2>
            <span className="properties-count">{properties.length} imóve{properties.length === 1 ? 'l' : 'is'}</span>
          </div>

          {properties.map((prop, i) => (
            <PropertyForm
              key={prop.id || `new-${i}`}
              property={prop}
              index={i}
              onUpdate={data => updateProperty(i, data)}
              onDelete={() => deleteProperty(i)}
              onSave={() => saveProperty(i)}
            />
          ))}

          <button className="btn-add-property" onClick={addProperty}>
            <span className="icon">+</span>
            Adicionar outro imóvel
          </button>

          <div className="save-bar">
            <button
              className={`btn-save${dirtyCount === 0 ? '' : ' loading'}`}
              onClick={saveAll}
              disabled={properties.some(p => p.isSaving)}
            >
              {properties.some(p => p.isSaving)
                ? <><span className="spinner" /> Salvando...</>
                : dirtyCount > 0
                  ? `💾 Salvar ${dirtyCount} imóve${dirtyCount === 1 ? 'l' : 'is'}`
                  : '✓ Tudo salvo'
              }
            </button>
          </div>
        </div>
      </main>

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </>
  );
}
