export function formatNumber(value) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatCoordinate(value) {
  if (value == null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(4) : "";
}

export function validEmails(value) {
  if (!value) return false;
  const emails = value.trim().split(/[,; ]+/).filter(Boolean);
  if (!emails.length) return false;
  return emails.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}
