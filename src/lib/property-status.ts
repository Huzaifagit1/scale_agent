export const PROPERTY_STATUS_KEY = 'situacao_da_disponibilidade_atualizacao';

function toStatusString(value: unknown): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : '';
  }

  return typeof value === 'string' ? value : '';
}

export function normalizePropertyStatus(value: unknown): string {
  return toStatusString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function isActivePropertyStatus(value: unknown): boolean {
  return normalizePropertyStatus(value) === 'ativo';
}

export function hasActivePropertyStatus(properties?: Record<string, unknown> | null): boolean {
  if (!properties) return false;
  return isActivePropertyStatus(properties[PROPERTY_STATUS_KEY]);
}
