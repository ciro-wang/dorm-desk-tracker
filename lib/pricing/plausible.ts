/** Guards against mis-parsed prices (an accessory price, a $0 placeholder, a bundle total). */
export function isPlausible(cents: number, msrpCents: number): boolean {
  return cents >= 0.2 * msrpCents && cents <= 3 * msrpCents;
}
