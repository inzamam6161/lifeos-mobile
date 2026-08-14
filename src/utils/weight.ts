export function formatWeight(weightGrams: number) {
  const kg = weightGrams / 1000;
  if (Number.isInteger(kg)) return `${kg} kg`;
  return `${kg.toFixed(1).replace(/\.0$/, '')} kg`;
}

export function parseKgToGrams(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return 0;
  if (!/^\d+(\.\d{0,3})?$/.test(normalized)) return null;
  const kg = Number(normalized);
  if (!Number.isFinite(kg) || kg < 0 || kg > 1000) return null;
  return Math.round(kg * 1000);
}
