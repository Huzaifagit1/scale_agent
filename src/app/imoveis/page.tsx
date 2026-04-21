'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FORM_SECTIONS, FieldDef } from '@/lib/fields';
import { PROPERTY_STATUS_KEY } from '@/lib/property-status';

// ─── Types ───────────────────────────────────────────────
type PropertyData = Record<string, string | string[]>;

type Property = {
  id?: string;          // GHL record id (existing)
  isNew?: boolean;      // unsaved new property
  isOpen: boolean;
  isSaving: boolean;
  isDirty: boolean;
  hasConfirmedDetails: boolean;
  data: PropertyData;
};

type Toast = { id: number; type: 'success' | 'error'; message: string };

// ─── Helpers ─────────────────────────────────────────────
function formatLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getPropertyLabel(p: Property, index: number): string {
  const reference = String(p.data['referencia_do_imovel'] || '').trim();
  if (reference) return reference;

  const addr = [
    p.data['cidade_endereco'],
    p.data['bairro_commercial'],
  ].filter(Boolean).join(', ');
  return addr || `Imóvel ${index + 1}`;
}

function getPropertyMeta(p: Property): string {
  const parts: string[] = [];
  if (p.data['escolha_a_pretensao_do_negocio']) parts.push(String(p.data['escolha_a_pretensao_do_negocio']));
  if (p.data['tipo_de_imovel']) parts.push(String(p.data['tipo_de_imovel']));
  if (p.data['numero_de_dormitorios']) parts.push(`${p.data['numero_de_dormitorios']} dorm.`);
  return parts.join(' · ') || (p.isNew ? 'Novo imóvel' : 'Imóvel cadastrado');
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

function getFinalConfirmationLabel(count: number): string {
  return `Confirmar detalhes d${count === 1 ? 'o' : 'os'} ${count} imóve${count === 1 ? 'l' : 'is'}`;
}

// ─── Field component ─────────────────────────────────────
function FieldInput({ field, value, onChange }: {
  field: FieldDef;
  value: string | string[];
  onChange: (val: string | string[]) => void;
}) {
  const strVal = Array.isArray(value) ? '' : (value || '');
  const arrVal = Array.isArray(value) ? value : [];

  if ((field as FieldDef & { readOnly?: boolean }).readOnly) {
    const displayValue =
      field.type === 'DATE' && strVal
        ? (() => {
            const date = new Date(strVal);
            if (!Number.isNaN(date.getTime())) {
              return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }
            return strVal;
          })()
        : strVal;
    return (
      <input
        className="field-input"
        type="text"
        value={displayValue}
        placeholder={field.label}
        readOnly
      />
    );
  }

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

  if (field.type === 'DATE') {
    return (
      <input
        className="field-input"
        type="date"
        value={strVal}
        placeholder={field.label}
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
  onSave: (options?: { nextData?: PropertyData; markConfirmed?: boolean }) => void;
}) {
  const toggle = () => onUpdate({ ...property.data, __open: property.isOpen ? '' : '1' });

  const setField = (key: string, val: string | string[]) => {
    const nextData = { ...property.data, [key]: val };
    onUpdate(nextData);
    if (key === PROPERTY_STATUS_KEY) {
      onSave({ nextData, markConfirmed: false });
    }
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
          <button
            className="btn-icon"
            title={property.hasConfirmedDetails ? 'Detalhes confirmados' : 'Salvar e confirmar este imóvel'}
            onClick={() => onSave({ markConfirmed: true })}
            disabled={property.isSaving}
            style={property.hasConfirmedDetails
              ? { color: '#1A6B3C', borderColor: '#A8D5B5', background: '#F4FBF6' }
              : { color: '#1A6B3C', borderColor: '#A8D5B5' }}
          >
            {property.isSaving ? '⏳' : property.hasConfirmedDetails ? '✓' : '💾'}
          </button>
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isConfirmingProperties, setIsConfirmingProperties] = useState(false);

  // ── Load contact + existing properties ──
  useEffect(() => {
    if (!contactId) { setLoading(false); setError('no-id'); return; }

    fetch(`/api/contact?id=${contactId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return; }
        setContact(data.contact);
        
        // First try to load from custom object records (properties)
        let loaded: Property[] = (data.properties || [])
          .map((rec: Record<string, unknown>) => ({
            id: rec.id as string,
            isNew: false,
            isOpen: false,
            isSaving: false,
            isDirty: false,
            hasConfirmedDetails: false,
            data: (rec.properties || rec) as PropertyData,
          }));

        setProperties(loaded);
      })
      .catch(() => setError('Erro ao carregar dados.'))
      .finally(() => setLoading(false));
  }, [contactId]);

  const addToast = useCallback((type: 'success' | 'error', message: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const updateProperty = (index: number, data: PropertyData) => {
    setProperties(ps => ps.map((p, i) => {
      if (i !== index) return p;
      const isOpen = data.__open !== undefined ? data.__open === '1' : p.isOpen;
      const { __open, ...cleanData } = data;
      void __open;
      return { ...p, data: cleanData, isOpen, isDirty: true, hasConfirmedDetails: false };
    }));
  };

  const deleteProperty = (index: number) => {
    const prop = properties[index];
    // Remove from UI immediately
    setProperties(ps => ps.filter((_, i) => i !== index));

    // If it's a new unsaved property, nothing to delete from GHL
    if (!prop.id || prop.isNew) {
      return;
    }

    // Delete from GHL
    fetch(`/api/properties?recordId=${prop.id}`, { method: 'DELETE' })
      .then(r => r.json())
      .then(data => {
        if (data?.error) throw new Error(data.error);
        addToast('success', 'Imóvel removido');
      })
      .catch(() => addToast('error', 'Erro ao remover imóvel'));
  };

  const saveProperty = async (
    index: number,
    options?: { nextData?: PropertyData; markConfirmed?: boolean }
  ) => {
    const prop = properties[index];
    if (!contactId) return;
    if (!prop) return;

    setProperties(ps => ps.map((p, i) => i === index ? { ...p, isSaving: true } : p));

    try {
      const sourceData = options?.nextData ?? prop.data;
      const markConfirmed = options?.markConfirmed === true;
      const method = prop.isNew || !prop.id ? 'POST' : 'PUT';
      const ghlFields = mapPropertyToGhlFields(sourceData);
      const body = method === 'POST'
        ? { contactId, fields: ghlFields }
        : { recordId: prop.id, contactId, fields: ghlFields };
      console.log('[saveProperty] method:', method, 'recordId:', prop.id);

      const res = await fetch('/api/properties', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro');

      // data.id is set by our API route; fall back to digging into the GHL result shape
      const newId: string | undefined =
        data.id ||
        data.matchedId ||
        data.result?.id ||
        data.result?.record?.id ||
        data.result?.data?.id ||
        prop.id;
      console.log('[saveProperty] stored newId:', newId, 'from data.id:', data.id, 'result keys:', Object.keys(data.result || {}));

      setProperties(ps => ps.map((p, i) => i === index
        ? {
            ...p,
            id: newId,
            isNew: false,
            isSaving: false,
            isDirty: false,
            hasConfirmedDetails: markConfirmed ? true : p.hasConfirmedDetails,
            data: sourceData,
          }
        : p
      ));
      addToast('success', markConfirmed ? 'Detalhes do imóvel confirmados' : '✓ Imóvel salvo com sucesso');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro';
      setProperties(ps => ps.map((p, i) => i === index ? { ...p, isSaving: false } : p));
      addToast('error', `Erro ao salvar: ${msg}`);
    }
  };

  const confirmProperties = async () => {
    const unconfirmedCount = properties.filter(property => !property.hasConfirmedDetails).length;
    if (unconfirmedCount > 0) {
      addToast('error', 'Clique primeiro no ícone de salvar de cada imóvel para confirmar os detalhes antes de concluir.');
      return;
    }

    const payloadProperties = properties
      .filter((property): property is Property & { id: string } => Boolean(property.id))
      .map(property => ({
        recordId: property.id,
        fields: mapPropertyToGhlFields(property.data),
      }));

    if (payloadProperties.length === 0) {
      addToast('error', 'Nenhum imóvel salvo foi encontrado para confirmar');
      return;
    }

    setIsConfirmingProperties(true);

    try {
      const res = await fetch('/api/properties/confirm-exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: payloadProperties, contactId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Erro ao confirmar');

      const dateStr = formatLocalDate(new Date());
      const updatedIds = Array.isArray(data.updatedIds) ? new Set<string>(data.updatedIds) : new Set<string>();

      setProperties(ps => ps.map(property => {
        if (!property.id || !updatedIds.has(property.id)) return property;
        return {
          ...property,
          isDirty: false,
          isSaving: false,
          data: {
            ...property.data,
            data_da_ultima_atualizacao: dateStr,
          },
        };
      }));

      if (Array.isArray(data.failures) && data.failures.length > 0) {
        addToast('error', 'Alguns imóveis não puderam ser confirmados');
      } else {
        addToast('success', 'Informações confirmadas! Redirecionando para o WhatsApp...');
        setTimeout(() => {
          window.location.href = 'https://wa.me/5554933007087';
        }, 1500);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro';
      addToast('error', `Erro ao confirmar: ${msg}`);
    } finally {
      setIsConfirmingProperties(false);
    }
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

  const isSavingAny = properties.some(p => p.isSaving);
  const confirmButtonLabel = getFinalConfirmationLabel(properties.length);
  const saveButtonClass = isConfirmingProperties ? 'btn-save loading' : 'btn-save dirty';

  return (
    <>
      {/* WhatsApp redirect notice */}
      <div style={{
        backgroundColor: '#DC2626',
        color: '#ffffff',
        padding: '16px 20px',
        borderRadius: '8px',
        margin: '16px',
        boxShadow: '0 2px 8px rgba(220,38,38,0.25)',
      }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '6px' }}>
          ⚠️ Aviso Importante
        </div>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
          Após salvar seus registros, você será redirecionado automaticamente para o WhatsApp para confirmar sua atualização. Por favor, conclua a confirmação para finalizar o processo.
        </div>
      </div>

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

          {properties.length === 0 ? (
            <div className="properties-empty">Nenhum imóvel encontrado.</div>
          ) : (
            properties.map((prop, i) => (
              <PropertyForm
                key={prop.id || `new-${i}`}
                property={prop}
                index={i}
                onUpdate={data => updateProperty(i, data)}
                onDelete={() => deleteProperty(i)}
                onSave={options => saveProperty(i, options)}
              />
            ))
          )}

          {properties.length > 0 && (
            <div className="save-bar">
              <button
                className={saveButtonClass}
                onClick={confirmProperties}
                disabled={isSavingAny || isConfirmingProperties}
              >
                {isConfirmingProperties
                  ? <><span className="spinner" /> Confirmando...</>
                  : confirmButtonLabel
                }
              </button>
            </div>
          )}
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
