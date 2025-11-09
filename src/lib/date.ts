// Central date helpers to avoid timezone off-by-one issues
// Always use local calendar date when persisting date-only fields

export function toDateOnlyString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function fromDateOnlyString(s: string): Date {
  // Expects 'YYYY-MM-DD'
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
