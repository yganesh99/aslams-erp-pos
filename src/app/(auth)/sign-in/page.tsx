'use client';

import { Suspense, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { BrandLogo } from '@/components/BrandLogo';

function SignInForm() {
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const { error: signInError } = await authClient.signIn.email({
				email,
				password,
			});

			if (signInError) {
				setError(signInError.message || 'Failed to sign in.');
			} else {
				// Full navigation so the Set-Cookie from sign-in is applied before
				// middleware runs and so useSession refetches a single consistent state.
				window.location.assign('/');
			}
		} catch {
			setError('Failed to sign in. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='flex min-h-screen w-full font-sans bg-white text-zinc-900'>
			<div className='hidden lg:flex flex-col flex-1 items-center justify-center bg-[#D9D9D9] px-8'>
				<BrandLogo
					className='h-14 w-auto max-w-[min(100%,280px)]'
					priority
				/>
			</div>

			<div className='flex-1 flex flex-col justify-center items-center px-6 lg:px-8'>
				<div className='w-full max-w-sm space-y-8'>
					<div className='text-center'>
						<h1 className='text-[32px] font-bold tracking-tight text-neutral-900'>
							Welcome back!
						</h1>
						<p className='mt-2 text-[15px] font-medium text-neutral-500'>
							Please enter your details.
						</p>
					</div>

					<form
						className='mt-8 space-y-5'
						onSubmit={handleSubmit}
					>
						{error && (
							<div className='bg-red-50 text-red-600 p-3 rounded-lg text-sm'>
								{error}
							</div>
						)}
						<div className='space-y-1.5'>
							<label
								htmlFor='email'
								className='block text-sm font-semibold text-neutral-800'
							>
								Email
							</label>
							<div className='relative'>
								<input
									id='email'
									name='email'
									type='email'
									autoComplete='email'
									required
									value={email}
									onChange={(e) =>
										setEmail(e.target.value)
									}
									className='block w-full rounded-lg border border-neutral-300 py-[10px] px-3.5 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 sm:text-sm transition-all'
									placeholder='Enter your email'
								/>
							</div>
						</div>

						<div className='space-y-1.5'>
							<label
								htmlFor='password'
								className='block text-sm font-semibold text-neutral-800'
							>
								Password
							</label>
							<div className='relative'>
								<input
									id='password'
									name='password'
									type={
										showPassword ? 'text' : 'password'
									}
									autoComplete='current-password'
									required
									value={password}
									onChange={(e) =>
										setPassword(e.target.value)
									}
									className='block w-full rounded-lg border border-neutral-300 py-[10px] pl-3.5 pr-10 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 sm:text-sm transition-all'
									placeholder='Enter your password'
								/>
								<button
									type='button'
									onClick={() =>
										setShowPassword(!showPassword)
									}
									className='absolute inset-y-0 right-0 flex items-center pr-3.5 text-neutral-500 hover:text-neutral-700 focus:outline-none'
								>
									{showPassword ? (
										<EyeOff
											className='h-4 w-4'
											aria-hidden='true'
										/>
									) : (
										<Eye
											className='h-4 w-4'
											aria-hidden='true'
										/>
									)}
								</button>
							</div>
						</div>

						<div className='flex items-center justify-between'>
							<div className='flex items-center'>
								<input
									id='remember-me'
									name='remember-me'
									type='checkbox'
									className='h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-400'
								/>
								<label
									htmlFor='remember-me'
									className='ml-2 block text-xs font-medium text-neutral-800'
								>
									Remember me
								</label>
							</div>
						</div>

						<div className='pt-2'>
							<button
								type='submit'
								disabled={loading}
								className={`flex w-full justify-center rounded-lg bg-[#222222] px-4 py-[11px] text-sm font-semibold text-white shadow-sm hover:bg-black focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 transition-all active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
							>
								{loading ? 'Signing in...' : 'Sign in'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}

function SignInFallback() {
	return (
		<div className='flex min-h-screen w-full items-center justify-center bg-white font-sans text-zinc-500 text-sm'>
			Loading…
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense fallback={<SignInFallback />}>
			<SignInForm />
		</Suspense>
	);
}
