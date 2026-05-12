'use client';

import { usePosStore } from '@/app/pos/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import {
	clampSplitAmountInput,
	maxAmountForSplitLine,
	parseMoneyInput,
	roundMoney,
	sumCashInSplitLines,
	sumSplitLines,
	validateSplitPayment,
} from '@/lib/posSplitPayment';
import { cn } from '@/lib/utils';

type Props = {
	total: number;
	cartEmpty: boolean;
	/** Suffix for stable input ids (panel vs drawer). */
	idSuffix: string;
};

const METHOD_OPTIONS = [
	{ value: 'cash', label: 'Cash' },
	{ value: 'card', label: 'Card' },
	{ value: 'qr', label: 'QR' },
] as const;

export function SplitPaymentSection({ total, cartEmpty, idSuffix }: Props) {
	const splitPaymentLines = usePosStore((s) => s.splitPaymentLines);
	const splitCashTenderedInput = usePosStore((s) => s.splitCashTenderedInput);
	const ensureSplitPaymentDraft = usePosStore((s) => s.ensureSplitPaymentDraft);
	const setSplitPaymentLine = usePosStore((s) => s.setSplitPaymentLine);
	const addSplitPaymentLine = usePosStore((s) => s.addSplitPaymentLine);
	const removeSplitPaymentLine = usePosStore((s) => s.removeSplitPaymentLine);
	const setSplitCashTenderedInput = usePosStore(
		(s) => s.setSplitCashTenderedInput,
	);

	const allocated = sumSplitLines(splitPaymentLines);
	const cashPortion = sumCashInSplitLines(splitPaymentLines);

	useEffect(() => {
		ensureSplitPaymentDraft();
	}, [ensureSplitPaymentDraft]);

	// Whenever the sum of line amounts would exceed the order total, trim from
	// the last non-zero line (runs on total changes and on any amount edit).
	useEffect(() => {
		if (cartEmpty || total <= 0) return;
		let guard = 0;
		while (guard++ < splitPaymentLines.length + 8) {
			const lines = usePosStore.getState().splitPaymentLines;
			const sum = sumSplitLines(lines);
			if (sum <= total + 0.015) break;
			const excess = roundMoney(sum - total);
			const withAmount = [...lines]
				.map((l, i) => ({ l, i }))
				.reverse()
				.find(({ l }) => parseMoneyInput(l.amount) > 1e-9);
			if (!withAmount) break;
			const a = parseMoneyInput(withAmount.l.amount);
			const newA = roundMoney(Math.max(0, a - excess));
			usePosStore.getState().setSplitPaymentLine(withAmount.l.id, {
				amount: newA <= 1e-9 ? '' : newA.toFixed(2),
			});
		}
	}, [total, cartEmpty, allocated, splitPaymentLines.length]);
	const remaining = roundMoney(total - allocated);
	const validation = validateSplitPayment(
		total,
		splitPaymentLines,
		splitCashTenderedInput,
	);
	const splitReady = validation.ok && total > 0;

	useEffect(() => {
		if (cashPortion <= 1e-9) return;
		const prev = usePosStore.getState().splitCashTenderedInput;
		const n = parseMoneyInput(prev);
		if (
			String(prev).trim() === '' ||
			!Number.isFinite(n) ||
			n < cashPortion - 1e-9
		) {
			usePosStore.getState().setSplitCashTenderedInput(
				cashPortion.toFixed(2),
			);
		}
	}, [cashPortion]);

	const tenderParsed = parseMoneyInput(splitCashTenderedInput);
	const cashCoversPortion =
		cashPortion <= 1e-9 ||
		(Number.isFinite(tenderParsed) && tenderParsed + 1e-9 >= cashPortion);
	const changeOnCash =
		cashPortion > 1e-9 &&
		Number.isFinite(tenderParsed) &&
		tenderParsed + 1e-9 >= cashPortion
			? roundMoney(tenderParsed - cashPortion)
			: 0;

	return (
		<div className='space-y-3 rounded-lg border border-border bg-muted/20 p-3'>
			<div className='flex items-center justify-between gap-2'>
				<span className='text-xs font-medium text-muted-foreground'>
					Split payments
				</span>
				<Button
					type='button'
					variant='outline'
					size='sm'
					className='h-8 gap-1'
					disabled={cartEmpty}
					onClick={() => addSplitPaymentLine()}
				>
					<Plus className='h-3.5 w-3.5' />
					Add line
				</Button>
			</div>

			<div className='space-y-2'>
				{splitPaymentLines.map((line, index) => {
					const lineMax = maxAmountForSplitLine(
						total,
						splitPaymentLines,
						line.id,
					);
					return (
						<div
							key={line.id}
							className='flex flex-wrap items-end gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0'
						>
							<div className='grid flex-1 min-w-[140px] gap-1'>
								<label
									className='text-[10px] font-medium text-muted-foreground'
									htmlFor={`split-m-${idSuffix}-${line.id}`}
								>
									Method
								</label>
								<select
									id={`split-m-${idSuffix}-${line.id}`}
									className={cn(
										'flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm',
										'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
										'disabled:cursor-not-allowed disabled:opacity-50',
									)}
									value={line.method}
									disabled={cartEmpty}
									onChange={(e) =>
										setSplitPaymentLine(line.id, {
											method: e.target
												.value as (typeof METHOD_OPTIONS)[number]['value'],
										})
									}
								>
									{METHOD_OPTIONS.map((opt) => (
										<option
											key={opt.value}
											value={opt.value}
										>
											{opt.label}
										</option>
									))}
								</select>
							</div>
							<div className='grid flex-1 min-w-[100px] gap-1'>
								<label
									className='text-[10px] font-medium text-muted-foreground'
									htmlFor={`split-a-${idSuffix}-${line.id}`}
								>
									Amount (max රු{lineMax.toFixed(2)})
								</label>
								<Input
									id={`split-a-${idSuffix}-${line.id}`}
									type='number'
									inputMode='decimal'
									min={0}
									max={lineMax}
									step='0.01'
									value={line.amount}
									disabled={cartEmpty || total <= 0}
									onChange={(e) => {
										const next = clampSplitAmountInput(
											e.target.value,
											line.id,
											total,
											splitPaymentLines,
										);
										setSplitPaymentLine(line.id, {
											amount: next,
										});
									}}
									className='h-10'
								/>
							</div>
							<Button
								type='button'
								variant='ghost'
								size='icon'
								className='h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive'
								disabled={
									cartEmpty || splitPaymentLines.length <= 2
								}
								onClick={() => removeSplitPaymentLine(line.id)}
								aria-label={`Remove payment line ${index + 1}`}
							>
								<Trash2 className='h-4 w-4' />
							</Button>
						</div>
					);
				})}
			</div>

			<div className='space-y-1 text-xs text-muted-foreground'>
				<div className='flex justify-between font-medium'>
					<span>Allocated</span>
					<span>රු{allocated.toFixed(2)}</span>
				</div>
				<div
					className={cn(
						'flex justify-between',
						Math.abs(remaining) > 0.02 &&
							'text-amber-600 dark:text-amber-500',
					)}
				>
					<span>Remaining</span>
					<span>රු{remaining.toFixed(2)}</span>
				</div>
			</div>

			{cashPortion > 1e-9 && (
				<div className='space-y-2 rounded-md border border-border/60 bg-background/50 p-2'>
					<label
						className='text-xs font-medium text-muted-foreground'
						htmlFor={`split-cash-tendered-${idSuffix}`}
					>
						Cash tendered (cash portions: රු{cashPortion.toFixed(2)})
					</label>
					<Input
						id={`split-cash-tendered-${idSuffix}`}
						type='number'
						inputMode='decimal'
						min={0}
						step='0.01'
						value={splitCashTenderedInput}
						disabled={cartEmpty}
						onChange={(e) =>
							setSplitCashTenderedInput(e.target.value)
						}
						className='h-10'
					/>
					{cashCoversPortion && cashPortion > 0 && (
						<div className='flex justify-between text-sm font-medium text-muted-foreground'>
							<span>Change (cash)</span>
							<span>රු{changeOnCash.toFixed(2)}</span>
						</div>
					)}
				</div>
			)}

			{!validation.ok && !cartEmpty && total > 0 && (
				<p className='text-xs text-destructive'>{validation.message}</p>
			)}
			{splitReady && (
				<p className='text-xs font-medium text-green-600 dark:text-green-500'>
					Split total matches order.
				</p>
			)}
		</div>
	);
}

export function useSplitCheckoutReady(
	total: number,
	paymentMethod: string,
): boolean {
	const splitPaymentLines = usePosStore((s) => s.splitPaymentLines);
	const splitCashTenderedInput = usePosStore((s) => s.splitCashTenderedInput);
	if (paymentMethod !== 'split') return true;
	if (total <= 0) return false;
	return validateSplitPayment(
		total,
		splitPaymentLines,
		splitCashTenderedInput,
	).ok;
}
