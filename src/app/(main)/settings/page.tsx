'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'react-toastify';

type CompanyDetails = {
	companyName: string;
	registrationNumber: string;
	taxVatId: string;
	supportEmail: string;
};

const emptyCompany: CompanyDetails = {
	companyName: '',
	registrationNumber: '',
	taxVatId: '',
	supportEmail: '',
};

export default function SettingsPage() {
	const [taxRate, setTaxRate] = useState<number>(0);
	const [taxRateInput, setTaxRateInput] = useState<string>('0');
	const [isTaxLoading, setIsTaxLoading] = useState(true);
	const [isTaxSaving, setIsTaxSaving] = useState(false);

	const [ecomShipping, setEcomShipping] = useState<number>(0);
	const [ecomShippingInput, setEcomShippingInput] = useState<string>('0');
	const [isEcomShipLoading, setIsEcomShipLoading] = useState(true);
	const [isEcomShipSaving, setIsEcomShipSaving] = useState(false);

	const [company, setCompany] = useState<CompanyDetails>(emptyCompany);
	const [isCompanyLoading, setIsCompanyLoading] = useState(true);
	const [isCompanySaving, setIsCompanySaving] = useState(false);

	const fetchSettings = async () => {
		try {
			setIsTaxLoading(true);
			setIsCompanyLoading(true);
			setIsEcomShipLoading(true);
			const [taxRes, companyRes, shipRes] = await Promise.all([
				api.get<{ taxRate: number }>('/settings/tax-rate'),
				api.get<CompanyDetails>('/settings/company-details'),
				api.get<{ shippingCost: number }>(
					'/settings/ecommerce-shipping-cost',
				),
			]);
			const rate = taxRes.data?.taxRate ?? 0;
			setTaxRate(rate);
			setTaxRateInput(String(rate));
			const ship = shipRes.data?.shippingCost ?? 0;
			setEcomShipping(ship);
			setEcomShippingInput(String(ship));
			setCompany({
				companyName: companyRes.data.companyName ?? '',
				registrationNumber: companyRes.data.registrationNumber ?? '',
				taxVatId: companyRes.data.taxVatId ?? '',
				supportEmail: companyRes.data.supportEmail ?? '',
			});
		} catch (error) {
			console.error('Failed to load settings:', error);
			toast.error('Failed to load settings.');
		} finally {
			setIsTaxLoading(false);
			setIsCompanyLoading(false);
			setIsEcomShipLoading(false);
		}
	};

	useEffect(() => {
		fetchSettings();
	}, []);

	const handleSaveCompany = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			setIsCompanySaving(true);
			await api.put('/settings/company-details', company);
			toast.success('Company details saved.');
		} catch (error) {
			console.error('Failed to save company details:', error);
			toast.error('Failed to save company details.');
		} finally {
			setIsCompanySaving(false);
		}
	};

	const handleSaveEcomShipping = async (e: React.FormEvent) => {
		e.preventDefault();
		const value = parseFloat(ecomShippingInput);
		if (!Number.isFinite(value) || value < 0) {
			toast.error('Please enter a valid shipping amount (0 or greater).');
			return;
		}
		try {
			setIsEcomShipSaving(true);
			await api.put('/settings/ecommerce-shipping-cost', {
				shippingCost: value,
			});
			setEcomShipping(value);
			toast.success('E-commerce shipping saved. New checkouts will use this amount.');
		} catch (error) {
			console.error('Failed to save ecommerce shipping:', error);
			toast.error('Failed to save ecommerce shipping.');
		} finally {
			setIsEcomShipSaving(false);
		}
	};

	const handleSaveTaxRate = async (e: React.FormEvent) => {
		e.preventDefault();
		const value = parseFloat(taxRateInput);
		if (!Number.isFinite(value) || value < 0) {
			toast.error('Please enter a valid tax rate (0 or greater).');
			return;
		}
		try {
			setIsTaxSaving(true);
			await api.put('/settings/tax-rate', { taxRate: value });
			setTaxRate(value);
			toast.success('Tax rate saved. It will apply to all new orders.');
		} catch (error) {
			console.error('Failed to save tax rate:', error);
			toast.error('Failed to save tax rate.');
		} finally {
			setIsTaxSaving(false);
		}
	};

	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle>Company Details</CardTitle>
					<p className='text-sm text-zinc-500'>
						Basic information about your business.
					</p>
				</CardHeader>
				<CardContent>
					{isCompanyLoading ? (
						<p className='text-center text-zinc-500 py-8'>
							Loading...
						</p>
					) : (
						<form
							onSubmit={handleSaveCompany}
							className='space-y-4'
						>
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Company Name
									</label>
									<Input
										value={company.companyName}
										onChange={(e) =>
											setCompany((c) => ({
												...c,
												companyName: e.target.value,
											}))
										}
										required
										maxLength={200}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Registration Number
									</label>
									<Input
										value={company.registrationNumber}
										onChange={(e) =>
											setCompany((c) => ({
												...c,
												registrationNumber:
													e.target.value,
											}))
										}
										required
										maxLength={100}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Tax / VAT ID
									</label>
									<Input
										value={company.taxVatId}
										onChange={(e) =>
											setCompany((c) => ({
												...c,
												taxVatId: e.target.value,
											}))
										}
										required
										maxLength={100}
									/>
								</div>
								<div className='space-y-2'>
									<label className='text-sm font-medium'>
										Support Email
									</label>
									<Input
										type='email'
										value={company.supportEmail}
										onChange={(e) =>
											setCompany((c) => ({
												...c,
												supportEmail: e.target.value,
											}))
										}
										required
										maxLength={320}
									/>
								</div>
							</div>
							<div className='pt-4 flex justify-end'>
								<Button
									type='submit'
									disabled={isCompanySaving}
									className='flex items-center space-x-2'
								>
									<Save className='w-4 h-4' />
									<span>
										{isCompanySaving
											? 'Saving...'
											: 'Save Changes'}
									</span>
								</Button>
							</div>
						</form>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Tax Rate</CardTitle>
					<p className='text-sm text-zinc-500 mt-1'>
						One tax rate for the whole system. It is applied to all
						POS and ecommerce orders when they are placed.
					</p>
				</CardHeader>
				<CardContent>
					{isTaxLoading ? (
						<p className='text-center text-zinc-500 py-8'>
							Loading...
						</p>
					) : (
						<form
							onSubmit={handleSaveTaxRate}
							className='flex flex-wrap items-end gap-4'
						>
							<div className='space-y-2 min-w-[140px]'>
								<label className='text-sm font-medium'>
									Default tax rate (%)
								</label>
								<Input
									type='number'
									min={0}
									step={0.01}
									value={taxRateInput}
									onChange={(e) =>
										setTaxRateInput(e.target.value)
									}
									placeholder='0'
								/>
							</div>
							<Button
								type='submit'
								disabled={isTaxSaving}
								className='flex items-center space-x-2'
							>
								<Save className='w-4 h-4' />
								<span>
									{isTaxSaving ? 'Saving...' : 'Save tax rate'}
								</span>
							</Button>
							{taxRate > 0 && (
								<span className='text-sm text-zinc-500'>
									Current: {taxRate}%
								</span>
							)}
						</form>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>E-commerce shipping</CardTitle>
					<p className='text-sm text-zinc-500 mt-1'>
						Flat delivery charge added to each new web order (before
						payment). POS orders are unchanged.
					</p>
				</CardHeader>
				<CardContent>
					{isEcomShipLoading ? (
						<p className='text-center text-zinc-500 py-8'>
							Loading...
						</p>
					) : (
						<form
							onSubmit={handleSaveEcomShipping}
							className='flex flex-wrap items-end gap-4'
						>
							<div className='space-y-2 min-w-[180px]'>
								<label className='text-sm font-medium'>
									Shipping charge (same currency as orders)
								</label>
								<Input
									type='number'
									min={0}
									step={0.01}
									value={ecomShippingInput}
									onChange={(e) =>
										setEcomShippingInput(e.target.value)
									}
									placeholder='0'
								/>
							</div>
							<Button
								type='submit'
								disabled={isEcomShipSaving}
								className='flex items-center space-x-2'
							>
								<Save className='w-4 h-4' />
								<span>
									{isEcomShipSaving
										? 'Saving...'
										: 'Save shipping'}
								</span>
							</Button>
							{ecomShipping > 0 && (
								<span className='text-sm text-zinc-500'>
									Current: රු{ecomShipping.toFixed(2)}
								</span>
							)}
						</form>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
