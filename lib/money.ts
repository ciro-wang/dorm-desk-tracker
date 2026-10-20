const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

export function formatCad(cents: number): string {
  return cad.format(cents / 100);
}

export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}
