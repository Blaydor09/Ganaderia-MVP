export const formatDateOnlyUtc = (value: string | Date, locale = "es-ES") =>
  new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

export const toDateInputValue = (date: Date | string) =>
  new Date(date).toISOString().slice(0, 10);

export const parseDateInputToUtcIso = (value: string) =>
  new Date(`${value}T00:00:00Z`).toISOString();

export const parseDateTimeInputToIso = (value: string) =>
  new Date(value).toISOString();
