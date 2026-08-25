/**
 * Utilidades puras y testables.
 */

/** Suma contadores: dado el texto, cuenta etiquetas activas. */
export function countActiveLabels(labels: string[], selected: string[]): number {
  return labels.filter((l) => selected.includes(l)).length;
}

/** Normaliza un email para su almacenamiento. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Formatea una fecha ISO a dd/mm/aaaa o '' si no existe. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Determina permisos de edición según el rol del board. */
export function canEditBoard(role: string | undefined | null): boolean {
  return ['OWNER', 'ADMIN', 'MEMBER'].includes(role ?? '');
}