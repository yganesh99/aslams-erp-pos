import type { Order, OrderItem } from '@/lib/orderApi';

function roundMoney(n: number): number {
	if (!Number.isFinite(n)) return 0;
	return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Match backend `orderRefund.util.js` — refund for returned qty (tax + order discount share). */
export function refundForLineQuantity(
	order: Pick<Order, 'subtotal' | 'taxAmount' | 'totalAmount'>,
	orderItem: Pick<OrderItem, 'quantity' | 'lineTotal'>,
	returnQty: number,
): number {
	const qty = Number(returnQty);
	const lineQty = Number(orderItem.quantity);
	if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(lineQty) || lineQty <= 0) {
		return 0;
	}

	const lineTotal = Number(orderItem.lineTotal ?? 0);
	const orderGross =
		Number(order.subtotal ?? 0) + Number(order.taxAmount ?? 0);
	const totalPaid = Number(order.totalAmount ?? 0);
	const paidScale = orderGross > 0 ? totalPaid / orderGross : 1;

	const perUnit = lineTotal / lineQty;
	return roundMoney(perUnit * qty * paidScale);
}
