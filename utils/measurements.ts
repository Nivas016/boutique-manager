export function convertMeasurements(
  values: Record<string, string>,
  fromUnit: 'in' | 'cm',
  toUnit: 'in' | 'cm'
): Record<string, string> {
  if (fromUnit === toUnit) return values;
  const factor = toUnit === 'cm' ? 2.54 : 1 / 2.54;
  const converted: Record<string, string> = {};
  for (const [key, val] of Object.entries(values)) {
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      converted[key] = (Math.round(num * factor * 10) / 10).toString();
    } else {
      converted[key] = val;
    }
  }
  return converted;
}
