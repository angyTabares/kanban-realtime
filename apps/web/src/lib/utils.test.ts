import { describe, expect, it } from 'vitest';
import {
  canEditBoard,
  countActiveLabels,
  formatDate,
  normalizeEmail,
} from './utils';

describe('canEditBoard', () => {
  it('permite editar a OWNER, ADMIN y MEMBER', () => {
    expect(canEditBoard('OWNER')).toBe(true);
    expect(canEditBoard('ADMIN')).toBe(true);
    expect(canEditBoard('MEMBER')).toBe(true);
  });

  it('niega la edición a VIEWER y roles desconocidos', () => {
    expect(canEditBoard('VIEWER')).toBe(false);
    expect(canEditBoard(undefined)).toBe(false);
    expect(canEditBoard(null)).toBe(false);
  });
});

describe('normalizeEmail', () => {
  it('normaliza a minúsculas sin espacios', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });
});

describe('formatDate', () => {
  it('formatea fechas válidas y devuelve vacío para nulas', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate('2026-08-12T00:00:00.000Z')).not.toBe('');
  });
});

describe('countActiveLabels', () => {
  it('cuenta etiquetas seleccionadas', () => {
    const labels = ['green', 'sky', 'blue'];
    expect(countActiveLabels(labels, ['green', 'blue'])).toBe(2);
    expect(countActiveLabels(labels, [])).toBe(0);
  });
});