export type SplitPayMethod = 'cash' | 'card' | 'qr';

export interface SplitLineInput {
	method: string;
	amount: string;
}

export function roundMoney(n: number): number {
	const x = Number(n);
	if (!Number.isFinite(x)) return NaN;
	return Math.round((x + Number.EPSILON) * 100) / 100;
}

export function parseMoneyInput(s: string): number {
	const x = parseFloat(String(s).replace(',', '.'));
	return Number.isFinite(x) ? x : NaN;
}

export function sumCashInSplitLines(
	lines: { method: string; amount: string }[],
): number {
	return roundMoney(
		lines.reduce((sum, line) => {
			if (line.method !== 'cash') return sum;
			const a = parseMoneyInput(line.amount);
			return sum + (Number.isFinite(a) ? a : 0);
		}, 0),
	);
}

export function sumSplitLines(lines: { amount: string }[]): number {
	return roundMoney(
		lines.reduce((sum, line) => {
			const a = parseMoneyInput(line.amount);
			return sum + (Number.isFinite(a) ? a : 0);
		}, 0),
	);
}

/**
 * Per-line ceiling so that (sum of all other lines + this line) ≤ `orderTotal`.
 * Together with {@link clampSplitAmountInput}, the aggregate never exceeds the total.
 */
export function maxAmountForSplitLine(
	orderTotal: number,
	lines: { id: string; amount: string }[],
	lineId: string,
): number {
	const others = lines.filter((l) => l.id !== lineId);
	const otherSum = sumSplitLines(others);
	return Math.max(0, roundMoney(orderTotal - otherSum));
}

/**
 * Keeps a natural string while typing; clamps when value exceeds the line max.
 */
export function clampSplitAmountInput(
	raw: string,
	lineId: string,
	orderTotal: number,
	lines: { id: string; amount: string }[],
): string {
	const trimmed = raw.trim();
	if (trimmed === '') return '';
	const n = parseMoneyInput(raw);
	if (!Number.isFinite(n)) return raw;
	if (n < 0) return '0';
	const maxA = maxAmountForSplitLine(orderTotal, lines, lineId);
	const clamped = roundMoney(Math.min(n, maxA));
	if (n > maxA + 1e-9) {
		return clamped <= 0 ? '' : clamped.toFixed(2);
	}
	return raw;
}

export type SplitValidation =
	| { ok: true }
	| { ok: false; message: string };

export function validateSplitPayment(
	orderTotal: number,
	lines: { method: string; amount: string }[],
	cashTenderedStr: string,
): SplitValidation {
	if (lines.length < 2) {
		return {
			ok: false,
			message: 'Add at least two payment lines for a split.',
		};
	}
	const amounts = lines.map((l) => parseMoneyInput(l.amount));
	if (amounts.some((a) => !Number.isFinite(a) || a < 0)) {
		return {
			ok: false,
			message: 'Each split amount must be a valid non-negative number.',
		};
	}
	const positiveCount = amounts.filter((a) => a > 1e-9).length;
	if (positiveCount < 2) {
		return {
			ok: false,
			message: 'At least two payments must be greater than zero.',
		};
	}
	const sum = roundMoney(amounts.reduce((s, a) => s + a, 0));
	const t = roundMoney(orderTotal);
	if (sum > t + 0.015) {
		return {
			ok: false,
			message: `Split amounts (රු${sum.toFixed(2)}) cannot exceed the order total (රු${t.toFixed(2)}).`,
		};
	}
	if (sum + 0.015 < t) {
		const short = roundMoney(t - sum);
		return {
			ok: false,
			message: `Split amounts are රු${short.toFixed(2)} short of the total (රු${t.toFixed(2)}).`,
		};
	}
	const cashDue = sumCashInSplitLines(lines);
	if (cashDue > 1e-9) {
		const tender = roundMoney(parseMoneyInput(cashTenderedStr));
		if (!Number.isFinite(tender) || tender + 1e-9 < cashDue) {
			return {
				ok: false,
				message: 'Cash tendered must cover all cash portions.',
			};
		}
	}
	return { ok: true };
}
