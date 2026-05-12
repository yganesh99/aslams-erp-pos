import type { CSSProperties } from 'react';

interface BrandLogoProps {
	className?: string;
	priority?: boolean;
	onDark?: boolean;
}

export function BrandLogo({ className = 'h-16 w-auto max-w-full', onDark }: BrandLogoProps) {
	const text = (
		<span
			style={
				{
					fontFamily: "'Georgia', serif",
					fontSize: '2rem',
					fontWeight: 700,
					letterSpacing: '0.15em',
					textTransform: 'uppercase',
					color: '#1a1a1a',
				} as CSSProperties
			}
		>
			Aslams
		</span>
	);

	if (onDark) {
		return (
			<span className='inline-flex items-center justify-center rounded-md bg-white px-3 py-2 shadow-sm'>
				{text}
			</span>
		);
	}

	return <span className={className}>{text}</span>;
}
