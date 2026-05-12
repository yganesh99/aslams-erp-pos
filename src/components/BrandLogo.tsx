import Image from 'next/image';

interface BrandLogoProps {
	className?: string;
	priority?: boolean;
	/** Light pad behind logo so black artwork stays visible on dark backgrounds */
	onDark?: boolean;
}

export function BrandLogo({
	className = 'h-16 w-auto max-w-full',
	priority,
	onDark,
}: BrandLogoProps) {
	const img = (
		<Image
			src='/logo-1.png'
			alt='Aslams'
			width={1197}
			height={277}
			className={className}
			priority={priority}
			unoptimized
		/>
	);

	if (onDark) {
		return (
			<span className='inline-flex items-center justify-center rounded-md bg-white px-3 py-2 shadow-sm'>
				{img}
			</span>
		);
	}

	return img;
}
