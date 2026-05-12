import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { normalizeQuantity } from '@/lib/quantityByUnit';
import type { SplitPayMethod } from '@/lib/posSplitPayment';

export interface Product {
	id: string;
	name: string;
	price: number;
	images: string[];
	barcode: string;
	category: string;
	categories?: CategoryRef[];
	stock?: number;
	/** Tax rate percentage (e.g. 5 for 5%). Used for POS totals and invoice match. */
	taxRate?: number;
	/** Product unit (e.g. pcs, kg, m). Drives whether quantity allows decimals. */
	unit?: string;
}

export interface CategoryRef {
	_id: string;
	name?: string;
}

export interface CartItem extends Product {
	quantity: number;
}

export interface Register {
	_id: string;
	name: string;
	storeId: string;
}

export interface RegisterSession {
	_id: string;
	registerId: string;
	storeId: string;
	status: string;
}

export interface SelectedCustomer {
	_id: string;
	name: string;
	phone?: string;
	email?: string;
}

export interface SplitPaymentLineDraft {
	id: string;
	method: SplitPayMethod;
	amount: string;
}

interface PosState {
	cart: CartItem[];
	register: Register | null;
	session: RegisterSession | null;
	paymentMethod: 'cash' | 'card' | 'credit' | 'split';
	selectedCustomer: SelectedCustomer | null;
	discountType: 'percentage' | 'fixed' | null;
	discountValue: number;
	/** When true, system tax rate is applied; when false, no tax. */
	includeTax: boolean;
	splitPaymentLines: SplitPaymentLineDraft[];
	splitCashTenderedInput: string;
	addItem: (product: Product) => void;
	removeItem: (productId: string) => void;
	updateQuantity: (productId: string, quantity: number) => void;
	clearCart: () => void;
	setRegister: (register: Register | null) => void;
	setSession: (session: RegisterSession | null) => void;
	setPaymentMethod: (method: 'cash' | 'card' | 'credit' | 'split') => void;
	setSelectedCustomer: (customer: SelectedCustomer | null) => void;
	setDiscount: (type: 'percentage' | 'fixed' | null, value: number) => void;
	setIncludeTax: (include: boolean) => void;
	ensureSplitPaymentDraft: () => void;
	setSplitPaymentLine: (
		id: string,
		patch: Partial<Omit<SplitPaymentLineDraft, 'id'>>,
	) => void;
	addSplitPaymentLine: () => void;
	removeSplitPaymentLine: (id: string) => void;
	setSplitCashTenderedInput: (value: string) => void;
}

export const usePosStore = create<PosState>()(
	persist(
		(set, get) => ({
			cart: [],
			register: null,
			session: null,
			paymentMethod: 'cash',
			selectedCustomer: null,
			discountType: null,
			discountValue: 0,
			includeTax: true,
			splitPaymentLines: [],
			splitCashTenderedInput: '',
			addItem: (product) => {
				const { cart } = get();
				const existingItem = cart.find(
					(item) => item.id === product.id,
				);
				if (existingItem) {
					set({
						cart: cart.map((item) =>
							item.id === product.id
								? { ...item, quantity: item.quantity + 1 }
								: item,
						),
					});
				} else {
					set({ cart: [...cart, { ...product, quantity: 1 }] });
				}
			},
			removeItem: (productId) => {
				set({
					cart: get().cart.filter((item) => item.id !== productId),
				});
			},
			updateQuantity: (productId, quantity) => {
				if (quantity <= 0) {
					get().removeItem(productId);
					return;
				}
				const cart = get().cart;
				const item = cart.find((i) => i.id === productId);
				const normalized = item
					? normalizeQuantity(quantity, item.unit)
					: quantity;
				if (normalized <= 0) {
					get().removeItem(productId);
					return;
				}
				set({
					cart: cart.map((i) =>
						i.id === productId ? { ...i, quantity: normalized } : i,
					),
				});
			},
			clearCart: () =>
				set({
					cart: [],
					selectedCustomer: null,
					discountType: null,
					discountValue: 0,
					splitPaymentLines: [],
					splitCashTenderedInput: '',
					paymentMethod: 'cash',
				}),
			setRegister: (register) => set({ register }),
			setSession: (session) => set({ session }),
			setPaymentMethod: (method) => set({ paymentMethod: method }),
			setSelectedCustomer: (customer) =>
				set({ selectedCustomer: customer }),
			setDiscount: (type, value) =>
				set({ discountType: type, discountValue: value }),
			setIncludeTax: (include) => set({ includeTax: include }),
			ensureSplitPaymentDraft: () =>
				set((state) => {
					if (state.splitPaymentLines.length >= 2) return {};
					const line = (method: SplitPayMethod) => ({
						id: crypto.randomUUID(),
						method,
						amount: '',
					});
					return {
						splitPaymentLines: [line('card'), line('cash')],
					};
				}),
			setSplitPaymentLine: (id, patch) =>
				set((state) => ({
					splitPaymentLines: state.splitPaymentLines.map((l) =>
						l.id === id ? { ...l, ...patch } : l,
					),
				})),
			addSplitPaymentLine: () =>
				set((state) => ({
					splitPaymentLines: [
						...state.splitPaymentLines,
						{
							id: crypto.randomUUID(),
							method: 'card' as SplitPayMethod,
							amount: '',
						},
					],
				})),
			removeSplitPaymentLine: (id) =>
				set((state) => ({
					splitPaymentLines: state.splitPaymentLines.filter(
						(l) => l.id !== id,
					),
				})),
			setSplitCashTenderedInput: (value) =>
				set({ splitCashTenderedInput: value }),
		}),
		{
			name: 'pos-cart-storage',
			merge: (persisted, current) => {
				const p = persisted as Partial<PosState> | undefined;
				const rawLines = p?.splitPaymentLines ?? current.splitPaymentLines;
				const splitPaymentLines = rawLines.map((l) => ({
					id: l.id,
					method: l.method,
					amount: l.amount,
				}));
				return {
					...current,
					...p,
					splitPaymentLines,
					splitCashTenderedInput:
						p?.splitCashTenderedInput ??
						current.splitCashTenderedInput,
				};
			},
		},
	),
);
