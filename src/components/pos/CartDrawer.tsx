'use client';

import api from '@/lib/api';

import { usePosStore } from '@/app/pos/store';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Search, X, User, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CartItemCard } from './CartItemCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
	SplitPaymentSection,
	useSplitCheckoutReady,
} from '@/components/pos/SplitPaymentSection';
import {
	parseMoneyInput,
	roundMoney,
	sumCashInSplitLines,
	validateSplitPayment,
} from '@/lib/posSplitPayment';

interface CustomerSearchResult {
	_id: string;
	name: string;
	phone?: string;
	email?: string;
}

export function CartDrawer() {
	const [mounted, setMounted] = useState(false);
	const [loading, setLoading] = useState(false);
	const [quoteLoading, setQuoteLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [customerSearch, setCustomerSearch] = useState('');
	const [customerResults, setCustomerResults] = useState<
		CustomerSearchResult[]
	>([]);
	const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
	const customerDebounceRef = useRef<NodeJS.Timeout | null>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const {
		cart,
		session,
		clearCart,
		paymentMethod,
		setPaymentMethod,
		selectedCustomer,
		setSelectedCustomer,
		discountType,
		discountValue,
		setDiscount,
		includeTax,
		setIncludeTax,
	} = usePosStore();

	useEffect(() => {
		setMounted(true);
	}, []);

	// Close dropdown on outside click
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setShowCustomerDropdown(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () =>
			document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Debounced customer search
	const searchCustomers = useCallback(async (query: string) => {
		if (!query.trim()) {
			setCustomerResults([]);
			setShowCustomerDropdown(false);
			return;
		}
		try {
			const res = await api.get('/customers', {
				params: { search: query.trim(), limit: 10 },
			});
			const data = res.data.items || res.data.data || res.data || [];
			setCustomerResults(
				Array.isArray(data)
					? (data as CustomerSearchResult[])
					: [],
			);
			setShowCustomerDropdown(true);
		} catch (err) {
			console.error('Failed to search customers:', err);
		}
	}, []);

	useEffect(() => {
		if (customerDebounceRef.current) {
			clearTimeout(customerDebounceRef.current);
		}
		customerDebounceRef.current = setTimeout(() => {
			searchCustomers(customerSearch);
		}, 300);
		return () => {
			if (customerDebounceRef.current) {
				clearTimeout(customerDebounceRef.current);
			}
		};
	}, [customerSearch, searchCustomers]);

	// Subtotal (excl. tax) — matches backend/invoice
	const subtotal = cart.reduce(
		(sum, item) => sum + item.price * item.quantity,
		0,
	);
	const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

	// Tax: only when includeTax is on (matches backend at order time)
	const taxByRate = includeTax
		? cart.reduce<Record<number, number>>((acc, item) => {
				const rate = item.taxRate ?? 0;
				const lineTax = item.price * item.quantity * (rate / 100);
				acc[rate] = (acc[rate] ?? 0) + lineTax;
				return acc;
			}, {})
		: {};
	const taxBreakdown = Object.entries(taxByRate)
		.filter(([, amount]) => amount > 0)
		.sort(([a], [b]) => Number(a) - Number(b));
	const taxAmount = taxBreakdown.reduce((sum, [, amt]) => sum + amt, 0);

	let discountAmount = 0;
	if (discountType === 'percentage' && discountValue > 0) {
		discountAmount = (subtotal * discountValue) / 100;
	} else if (discountType === 'fixed' && discountValue > 0) {
		discountAmount = discountValue;
	}
	discountAmount = Math.min(discountAmount, subtotal);

	// Total = Subtotal + Tax - Discount (matches invoice)
	const total = subtotal + taxAmount - discountAmount;

	const splitReady = useSplitCheckoutReady(total, paymentMethod);

	const [cashTenderedInput, setCashTenderedInput] = useState('');

	useEffect(() => {
		if (paymentMethod !== 'cash') return;
		setCashTenderedInput((prev) => {
			const n = parseFloat(String(prev).replace(',', '.'));
			if (
				String(prev).trim() === '' ||
				Number.isNaN(n) ||
				n < total - 1e-9
			) {
				return total.toFixed(2);
			}
			return prev;
		});
	}, [paymentMethod, total]);

	const tenderParsed = parseFloat(
		String(cashTenderedInput).replace(',', '.'),
	);
	const cashCoversTotal =
		paymentMethod !== 'cash' ||
		(Number.isFinite(tenderParsed) && tenderParsed + 1e-9 >= total);

	const canCharge =
		!!session &&
		cart.length > 0 &&
		(paymentMethod === 'cash'
			? cashCoversTotal
			: paymentMethod === 'split'
				? splitReady
				: paymentMethod === 'credit'
					? !!selectedCustomer
					: true);

	const changeDue =
		paymentMethod === 'cash' &&
		Number.isFinite(tenderParsed) &&
		tenderParsed + 1e-9 >= total
			? Math.round((tenderParsed - total + Number.EPSILON) * 100) / 100
			: 0;

	const handleSelectCustomer = (customer: CustomerSearchResult) => {
		setSelectedCustomer({
			_id: customer._id,
			name: customer.name,
			phone: customer.phone,
			email: customer.email,
		});
		setCustomerSearch('');
		setShowCustomerDropdown(false);
	};

	if (!mounted) return null;

	const handleCheckout = async () => {
		if (!session) {
			toast.error('No active register session!');
			return;
		}

		if (paymentMethod === 'cash') {
			const tender = parseFloat(String(cashTenderedInput).replace(',', '.'));
			if (!Number.isFinite(tender) || tender + 1e-9 < total) {
				toast.error('Cash tendered must be at least the order total.');
				return;
			}
		}

		if (paymentMethod === 'split') {
			const lines = usePosStore.getState().splitPaymentLines;
			const cashStr = usePosStore.getState().splitCashTenderedInput;
			const v = validateSplitPayment(total, lines, cashStr);
			if (!v.ok) {
				toast.error(v.message);
				return;
			}
		}

		if (paymentMethod === 'credit' && !selectedCustomer) {
			toast.error('Select a customer for credit sales.');
			return;
		}

		setLoading(true);
		try {
			const formattedItems = cart.map((item) => ({
				productId: item.id,
				quantity: item.quantity,
			}));

			const payload: {
				storeId: string;
				sessionId: string;
				items: { productId: string; quantity: number }[];
				paymentMethod: typeof paymentMethod;
				payments?: { method: string; amount: number }[];
				customerId?: string;
				discountType?: typeof discountType;
				discountValue?: number;
				includeTax?: boolean;
				cashTendered?: number;
			} = {
				storeId: session.storeId,
				sessionId: session._id,
				items: formattedItems,
				paymentMethod,
			};

			if (selectedCustomer) {
				payload.customerId = selectedCustomer._id;
			}
			if (discountType && discountValue > 0) {
				payload.discountType = discountType;
				payload.discountValue = discountValue;
			}
			payload.includeTax = includeTax;

			if (paymentMethod === 'cash') {
				const tender = parseFloat(
					String(cashTenderedInput).replace(',', '.'),
				);
				payload.cashTendered =
					Math.round((tender + Number.EPSILON) * 100) / 100;
			}

			if (paymentMethod === 'split') {
				const lines = usePosStore.getState().splitPaymentLines;
				const cashStr = usePosStore.getState().splitCashTenderedInput;
				payload.payments = lines.map(({ method, amount }) => ({
					method,
					amount: roundMoney(parseMoneyInput(amount)),
				}));
				const cashDue = sumCashInSplitLines(lines);
				if (cashDue > 1e-9) {
					payload.cashTendered = roundMoney(parseMoneyInput(cashStr));
				}
			}

			const res = await api.post('/pos/order', payload);

			toast.success('Order successfully placed!');
			clearCart();
			setIsOpen(false);

			// Try to automatically open invoice PDF
			try {
				const orderId = res.data?._id || res.data?.data?._id;
				if (orderId) {
					const invoiceRes = await api.get(
						`/orders/${orderId}/invoice`,
						{
							responseType: 'blob',
						},
					);
					const blob = new Blob([invoiceRes.data], {
						type: 'application/pdf',
					});
					const url = window.URL.createObjectURL(blob);
					window.open(url, '_blank');
				}
			} catch (pdfErr) {
				console.error('Failed to generate PDF invoice', pdfErr);
				toast.error('Failed to load invoice PDF');
			}
		} catch (err: unknown) {
			console.error(err);
			const apiError = err as {
				response?: { data?: { message?: string } };
			};
			toast.error(
				apiError.response?.data?.message ||
					'Failed to complete order',
			);
		} finally {
			setLoading(false);
		}
	};

	const handleGenerateQuote = async () => {
		if (!session) {
			toast.error('No active register session!');
			return;
		}

		if (cart.length === 0) {
			toast.error('Cart is empty');
			return;
		}

		setQuoteLoading(true);
		try {
			const formattedItems = cart.map((item) => ({
				productId: item.id,
				quantity: item.quantity,
			}));

			const payload: {
				storeId: string;
				items: { productId: string; quantity: number }[];
				customerId?: string;
				discountType?: typeof discountType;
				discountValue?: number;
				includeTax?: boolean;
			} = {
				storeId: session.storeId,
				items: formattedItems,
			};

			if (selectedCustomer) {
				payload.customerId = selectedCustomer._id;
			}
			if (discountType && discountValue > 0) {
				payload.discountType = discountType;
				payload.discountValue = discountValue;
			}
			payload.includeTax = includeTax;

			const quoteRes = await api.post('/pos/quote', payload, {
				responseType: 'blob',
			});

			toast.success('Quote generated');

			const blob = new Blob([quoteRes.data], {
				type: 'application/pdf',
			});
			const url = window.URL.createObjectURL(blob);
			window.open(url, '_blank');
		} catch (err: unknown) {
			console.error(err);
			const apiError = err as {
				response?: { data?: { message?: string } };
			};
			toast.error(
				apiError.response?.data?.message ||
					'Failed to generate quote',
			);
		} finally {
			setQuoteLoading(false);
		}
	};

	const handleClearOrder = () => {
		clearCart();
		setCashTenderedInput('');
		setCustomerSearch('');
		setShowCustomerDropdown(false);
	};

	return (
		<Sheet
			open={isOpen}
			onOpenChange={setIsOpen}
		>
			<SheetTrigger asChild>
				<Button
					className='fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg lg:hidden touch-manipulation z-40'
					size='icon'
				>
					<div className='relative'>
						<ShoppingCart className='h-6 w-6' />
						{itemCount > 0 && (
							<Badge
								variant='destructive'
								className='absolute -top-3 -right-3 px-1.5 min-w-[20px] h-5 flex items-center justify-center'
							>
								{itemCount}
							</Badge>
						)}
					</div>
				</Button>
			</SheetTrigger>
			<SheetContent
				side='bottom'
				className='h-[85vh] min-h-0 flex flex-col overflow-hidden p-0 sm:max-w-none'
			>
				<SheetHeader className='shrink-0 p-4 border-b text-left space-y-0'>
					<div className='flex items-center justify-between gap-2 pr-8'>
						<SheetTitle className='flex items-center gap-2 text-left'>
							<ShoppingCart className='h-5 w-5 shrink-0' />{' '}
							Current Order
						</SheetTitle>
						<Button
							type='button'
							variant='outline'
							size='sm'
							className='h-9 shrink-0 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive'
							disabled={cart.length === 0 || loading}
							onClick={handleClearOrder}
						>
							<Trash2 className='h-3.5 w-3.5' />
							Clear
						</Button>
					</div>
				</SheetHeader>

				{/* Customer Selection */}
				<div
					className='shrink-0 p-3 border-b border-border'
					ref={dropdownRef}
				>
					{selectedCustomer ? (
						<div className='flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2'>
							<div className='flex items-center gap-2 min-w-0'>
								<User className='h-4 w-4 text-zinc-500 shrink-0' />
								<div className='min-w-0'>
									<p className='text-sm font-medium truncate'>
										{selectedCustomer.name}
									</p>
									{selectedCustomer.phone && (
										<p className='text-xs text-muted-foreground'>
											{selectedCustomer.phone}
										</p>
									)}
								</div>
							</div>
							<Button
								variant='ghost'
								size='icon'
								className='h-6 w-6 shrink-0'
								onClick={() => setSelectedCustomer(null)}
							>
								<X className='h-3 w-3' />
							</Button>
						</div>
					) : (
						<div className='relative'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
							<Input
								type='text'
								placeholder='Search customer (optional)...'
								value={customerSearch}
								onChange={(e) =>
									setCustomerSearch(e.target.value)
								}
								className='pl-9 h-9 text-sm bg-zinc-50 border-zinc-200'
							/>
							{showCustomerDropdown &&
								customerResults.length > 0 && (
									<div className='absolute z-50 top-full left-0 right-0 bg-white border border-zinc-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto'>
										{customerResults.map((c) => (
											<button
												key={c._id}
												className='w-full text-left px-3 py-2 hover:bg-zinc-50 transition-colors text-sm border-b border-zinc-100 last:border-b-0'
												onClick={() =>
													handleSelectCustomer(c)
												}
											>
												<p className='font-medium'>
													{c.name}
												</p>
												{c.phone && (
													<p className='text-xs text-muted-foreground'>
														{c.phone}
													</p>
												)}
											</button>
										))}
									</div>
								)}
						</div>
					)}
				</div>

				<div className='flex flex-1 min-h-0 flex-col overflow-hidden border-t border-border'>
					<ScrollArea className='flex-1 min-h-0'>
						<div>
							{cart.length === 0 ? (
								<div className='p-8 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[100px] gap-2'>
									<ShoppingCart className='h-10 w-10 opacity-20' />
									<p>Cart is empty</p>
								</div>
							) : (
								<div className='flex flex-col'>
									{cart.map((item) => (
										<CartItemCard
											key={item.id}
											item={item}
										/>
									))}
								</div>
							)}

							<div className='p-4 space-y-4 border-t border-border/60'>
					{/* Include tax toggle */}
					<div className='flex items-center justify-between gap-2'>
						<label
							htmlFor='include-tax-drawer'
							className='text-sm font-medium cursor-pointer'
						>
							Include tax
						</label>
						<input
							id='include-tax-drawer'
							type='checkbox'
							checked={includeTax}
							onChange={(e) => setIncludeTax(e.target.checked)}
							className='w-4 h-4 rounded border-zinc-300 text-black focus:ring-black'
						/>
					</div>
					{/* Discount Controls */}
					<div className='flex items-center gap-2'>
						<Button
							variant={
								discountType === 'percentage'
									? 'default'
									: 'outline'
							}
							size='sm'
							className='w-12 h-9 px-0 disabled:opacity-50'
							disabled={cart.length === 0}
							onClick={() =>
								setDiscount(
									discountType === 'percentage'
										? null
										: 'percentage',
									discountType === 'percentage'
										? 0
										: discountValue,
								)
							}
						>
							%
						</Button>
						<Button
							variant={
								discountType === 'fixed' ? 'default' : 'outline'
							}
							size='sm'
							className='w-12 h-9 px-0 disabled:opacity-50'
							disabled={cart.length === 0}
							onClick={() =>
								setDiscount(
									discountType === 'fixed' ? null : 'fixed',
									discountType === 'fixed'
										? 0
										: discountValue,
								)
							}
						>
							Rs
						</Button>
						<Input
							type='number'
							min='0'
							placeholder='Discount value'
							value={discountValue || ''}
							onChange={(e) =>
								setDiscount(
									discountType || 'percentage',
									Number(e.target.value),
								)
							}
							disabled={cart.length === 0 || !discountType}
							className='h-9 disabled:opacity-50'
						/>
					</div>

					<div className='space-y-1.5'>
						<div className='flex justify-between items-center text-sm text-muted-foreground'>
							<span>Subtotal</span>
							<span>රු{subtotal.toFixed(2)}</span>
						</div>
						{discountAmount > 0 && (
							<div className='flex justify-between items-center text-sm text-green-600 font-medium'>
								<span>Discount</span>
								<span>-රු{discountAmount.toFixed(2)}</span>
							</div>
						)}
						{taxBreakdown.length > 0 ? (
							taxBreakdown.map(([rate, amount]) => (
								<div
									key={rate}
									className='flex justify-between items-center text-sm text-muted-foreground'
								>
									<span>Tax ({rate}%)</span>
									<span>රු{amount.toFixed(2)}</span>
								</div>
							))
						) : taxAmount > 0 ? (
							<div className='flex justify-between items-center text-sm text-muted-foreground'>
								<span>Tax</span>
								<span>රු{taxAmount.toFixed(2)}</span>
							</div>
						) : null}
						<div className='flex justify-between items-center text-lg font-bold pt-2 border-t border-border/50'>
							<span>Total</span>
							<span>රු{total.toFixed(2)}</span>
						</div>
					</div>

					<div className='grid grid-cols-2 gap-2'>
						<Button
							variant={
								paymentMethod === 'cash' ? 'default' : 'outline'
							}
							className='h-10 touch-manipulation'
							onClick={() => setPaymentMethod('cash')}
						>
							Cash
						</Button>
						<Button
							variant={
								paymentMethod === 'card' ? 'default' : 'outline'
							}
							className='h-10 touch-manipulation'
							onClick={() => setPaymentMethod('card')}
						>
							Card
						</Button>
						<Button
							variant={
								paymentMethod === 'credit'
									? 'default'
									: 'outline'
							}
							className='h-10 touch-manipulation'
							onClick={() => setPaymentMethod('credit')}
						>
							Credit
						</Button>
						<Button
							variant={
								paymentMethod === 'split' ? 'default' : 'outline'
							}
							className='h-10 touch-manipulation'
							onClick={() => setPaymentMethod('split')}
						>
							Split
						</Button>
					</div>

					{paymentMethod === 'split' && (
						<SplitPaymentSection
							total={total}
							cartEmpty={cart.length === 0}
							idSuffix='drawer'
						/>
					)}

					{paymentMethod === 'cash' && (
						<div className='space-y-2 rounded-lg border border-border bg-muted/20 p-3'>
							<label
								htmlFor='pos-cash-tendered-drawer'
								className='text-xs font-medium text-muted-foreground'
							>
								Cash tendered
							</label>
							<Input
								id='pos-cash-tendered-drawer'
								type='number'
								inputMode='decimal'
								min={0}
								step='0.01'
								value={cashTenderedInput}
								onChange={(e) =>
									setCashTenderedInput(e.target.value)
								}
								disabled={cart.length === 0}
								className='h-10'
							/>
							{cashCoversTotal && total > 0 && (
								<div className='flex justify-between text-sm font-medium text-muted-foreground'>
									<span>Change</span>
									<span>රු{changeDue.toFixed(2)}</span>
								</div>
							)}
						</div>
					)}
							</div>
						</div>
					</ScrollArea>

					<div className='shrink-0 border-t border-border bg-background p-4 space-y-2 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.06)]'>
						<Button
							className='w-full min-h-[48px] text-lg font-bold touch-manipulation'
							size='lg'
							disabled={!canCharge || loading}
							onClick={handleCheckout}
						>
							{loading
								? 'Processing...'
								: `Charge රු${total.toFixed(2)}`}
						</Button>
						<Button
							variant='outline'
							className='w-full h-10 touch-manipulation'
							disabled={
								cart.length === 0 || quoteLoading || !session
							}
							onClick={handleGenerateQuote}
						>
							{quoteLoading
								? 'Generating quote...'
								: 'Generate Quote'}
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
