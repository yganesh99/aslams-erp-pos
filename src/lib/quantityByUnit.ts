/**
 * Units that allow decimal quantities (e.g. weight, length, volume).
 * All other units (pcs, bales, cartons, box, etc.) require whole numbers.
 */
const DECIMAL_QUANTITY_UNITS = new Set([
	'kg',
	'kgs',
	'g',
	'gm',
	'gms',
	'gram',
	'grams',
	'm',
	'meter',
	'meters',
	'metre',
	'metres',
	'cm',
	'km',
	'l',
	'litre',
	'litres',
	'liter',
	'liters',
	'ml',
	'lb',
	'lbs',
	'oz',
]);

const normalized = (u: string) => (u || '').toLowerCase().trim();

/**
 * Returns true if the product unit allows decimal quantities (e.g. kg, m, litres).
 */
export function allowsDecimalQuantity(unit: string | undefined): boolean {
	return DECIMAL_QUANTITY_UNITS.has(normalized(unit || ''));
}

/**
 * Step value for quantity input: use 0.01 for decimal units, 1 for whole numbers.
 */
export function quantityStep(unit: string | undefined): number {
	return allowsDecimalQuantity(unit) ? 0.01 : 1;
}

/**
 * Normalize quantity for the given unit: round to integer for whole-number units,
 * otherwise round to 2 decimal places. Ensures minimum 0.01 for decimals and 1 for whole.
 */
export function normalizeQuantity(
	quantity: number,
	unit: string | undefined,
): number {
	const raw = Number(quantity);
	if (!Number.isFinite(raw) || raw <= 0) return allowsDecimalQuantity(unit) ? 0.01 : 1;
	if (allowsDecimalQuantity(unit)) {
		const rounded = Math.round(raw * 100) / 100;
		return Math.max(0.01, rounded);
	}
	return Math.max(1, Math.round(raw));
}

/**
 * Format quantity for display: decimals for decimal units, integer otherwise.
 */
export function formatQuantityDisplay(
	quantity: number,
	unit: string | undefined,
): string {
	const n = Number(quantity);
	if (!Number.isFinite(n)) return '0';
	return allowsDecimalQuantity(unit)
		? String(parseFloat(n.toFixed(2)))
		: String(Math.round(n));
}
