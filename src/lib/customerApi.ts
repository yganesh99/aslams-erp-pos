import api from './api';

export interface CustomerAddress {
	street?: string;
	city?: string;
	state?: string;
	zip?: string;
	country?: string;
}

export interface Customer {
	_id: string;
	name: string;
	email?: string;
	phone?: string;
	address?: CustomerAddress;
	creditLimit: number;
	currentBalance: number;
	availableCredit: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface CustomerListResponse {
	items: Customer[];
	total: number;
	page: number;
	limit: number;
}

export interface CreateCustomerPayload {
	name: string;
	email?: string;
	phone?: string;
	address?: CustomerAddress;
	creditLimit?: number;
}

export interface UpdateCustomerPayload {
	name?: string;
	email?: string;
	phone?: string;
	address?: CustomerAddress;
	creditLimit?: number;
}

export async function getCustomers(
	search?: string,
	page = 1,
	limit = 50,
): Promise<CustomerListResponse> {
	const params: Record<string, string | number> = { page, limit };
	if (search && search.trim()) params.search = search.trim();
	const res = await api.get<CustomerListResponse>('/customers', { params });
	return res.data;
}

export async function createCustomer(
	data: CreateCustomerPayload,
): Promise<Customer> {
	const res = await api.post<Customer>('/customers', data);
	return res.data;
}

export async function updateCustomer(
	id: string,
	data: UpdateCustomerPayload,
): Promise<Customer> {
	const res = await api.put<Customer>(`/customers/${id}`, data);
	return res.data;
}
