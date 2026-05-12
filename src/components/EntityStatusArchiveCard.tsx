'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/** Table / full-width contexts: archive trigger */
export const entityArchiveTriggerClassName =
	'border-red-200 text-red-700 hover:bg-red-50 w-full min-h-9 justify-center sm:w-auto sm:min-w-[11rem]';

/** Square icon-only archive control (e.g. table rows). */
export const entityArchiveIconButtonClassName =
	'h-9 w-9 shrink-0 border-red-200 text-red-700 hover:bg-red-50';

/** Outline toggle in table / wide layouts */
export const entityStatusToggleClassName =
	'w-full min-h-9 justify-center sm:w-auto sm:min-w-[11rem]';

/** Page header: horizontal action buttons (no forced full width). */
export const entityHeaderActionClassName = 'min-h-9 shrink-0';

export const entityHeaderArchiveButtonClassName =
	'min-h-9 shrink-0 border-red-200 text-red-700 hover:bg-red-50';

const statusBadgeVariants = {
	active: 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200/60',
	inactive: 'bg-zinc-100 text-zinc-700 ring-1 ring-inset ring-zinc-200/60',
	suspended: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200/60',
} as const;

export type EntityStatusBadgeVariant = keyof typeof statusBadgeVariants;

export function EntityStatusBadge({
	children,
	variant,
	className,
}: {
	children: React.ReactNode;
	variant: EntityStatusBadgeVariant;
	className?: string;
}) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
				statusBadgeVariants[variant],
				className,
			)}
		>
			{children}
		</span>
	);
}

/**
 * Title block (left) and actions (right, horizontal). Aligns with title row using items-start.
 */
export function EntityDetailPageHeader({
	leading,
	actions,
	className,
}: {
	leading: React.ReactNode;
	actions?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
				className,
			)}
		>
			<div className='min-w-0 flex-1'>{leading}</div>
			{actions != null && actions !== false ? (
				<div className='flex shrink-0 flex-row flex-wrap items-center gap-2 sm:justify-end'>
					{actions}
				</div>
			) : null}
		</div>
	);
}
