export type UnitSystem = "metric" | "imperial";

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

/** Round to 1 decimal place, drop trailing .0 */
function r1(n: number): string {
  const fixed = n.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

export function cmToIn(cm: number): string {
  return r1(cm / CM_PER_INCH);
}

export function kgToLb(kg: number): string {
  return r1(kg / KG_PER_LB);
}

export function formatLength(cm: number, unit: UnitSystem): string {
  return unit === "metric" ? `${r1(cm)} cm` : `${cmToIn(cm)} in`;
}

export function formatWeight(kg: number, unit: UnitSystem): string {
  return unit === "metric" ? `${r1(kg)} kg` : `${kgToLb(kg)} lb`;
}

export function formatHeight(cm: number, unit: UnitSystem): string {
  if (unit === "metric") return r1(cm);
  const totalIn = cm / CM_PER_INCH;
  const feet = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  if (inches === 12) {
    return `${feet + 1}'0"`;
  }
  return `${feet}'${inches}"`;
}

export function formatLengthValue(cm: number, unit: UnitSystem): string {
  return unit === "metric" ? r1(cm) : cmToIn(cm);
}

export function lengthUnit(unit: UnitSystem): string {
  return unit === "metric" ? "cm" : "in";
}

export function weightUnit(unit: UnitSystem): string {
  return unit === "metric" ? "kg" : "lb";
}

export function formatWeightValue(kg: number, unit: UnitSystem): string {
  return unit === "metric" ? r1(kg) : kgToLb(kg);
}
