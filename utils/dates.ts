export function formatDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
  });
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function isOverdue(promisedDate: string): boolean {
  return promisedDate < todayISO();
}

export function isDueToday(promisedDate: string): boolean {
  return promisedDate === todayISO();
}

export function isDueTomorrow(promisedDate: string): boolean {
  return promisedDate === tomorrowISO();
}
