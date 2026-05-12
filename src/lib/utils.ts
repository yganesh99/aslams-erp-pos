import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// deployment-test-2
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
