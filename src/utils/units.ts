export type UnitSystem = "metric" | "imperial";

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.453592;

export function cmToIn(cm: number): string {
  return (cm / CM_PER_INCH).toFixed(1);
}

export function kgToLb(kg: number): string {
  return (kg / KG_PER_LB).toFixed(1);
}

export function formatLength(cm: number, unit: UnitSystem): string {
  return unit === "metric" ? `${cm} cm` : `${cmToIn(cm)} in`;
}

export function formatWeight(kg: number, unit: UnitSystem): string {
  return unit === "metric" ? `${kg} kg` : `${kgToLb(kg)} lb`;
}

export function formatHeight(cm: number, unit: UnitSystem): string {
  if (unit === "metric") return `${cm}`;
  const totalIn = cm / CM_PER_INCH;
  const feet = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  // Handle rounding to 12 inches (e.g. 5'12" → 6'0")
  if (inches === 12) {
    return `${feet + 1}'0"`;
  }
  return `${feet}'${inches}"`;
}

export function formatLengthValue(cm: number, unit: UnitSystem): string {
  return unit === "metric" ? `${cm}` : cmToIn(cm);
}

export function lengthUnit(unit: UnitSystem): string {
  return unit === "metric" ? "cm" : "in";
}

export function weightUnit(unit: UnitSystem): string {
  return unit === "metric" ? "kg" : "lb";
}

export function formatWeightValue(kg: number, unit: UnitSystem): string {
  return unit === "metric" ? `${kg}` : kgToLb(kg);
}
