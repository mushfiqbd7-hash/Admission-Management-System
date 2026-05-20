// src/utils/dateFormat.ts

const EMPTY = String.fromCharCode(8212);

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }

  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: unknown): string {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : EMPTY;
}

export function formatDateOrNull(value: unknown): string | null {
  const date = parseDate(value);
  return date ? dateFormatter.format(date) : null;
}

export function formatDateTime(value: unknown): string {
  const date = parseDate(value);
  return date ? dateTimeFormatter.format(date) : EMPTY;
}