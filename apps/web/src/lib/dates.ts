export const formatDateOnlyUtc = (value: string | Date) =>
  new Date(value).toLocaleDateString(undefined, { timeZone: "UTC" });

export const toDateInputValue = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};
