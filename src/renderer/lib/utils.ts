import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Format a date as relative time (e.g., "hace 5 min", "ayer", "12 ene")
 */
export function formatRelativeTime(date: Date | string | number): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    // Less than a minute
    if (diffSec < 60) {
        return 'ahora';
    }

    // Less than an hour
    if (diffMin < 60) {
        return `hace ${diffMin} min`;
    }

    // Less than a day
    if (diffHour < 24) {
        return `hace ${diffHour}h`;
    }

    // Yesterday
    if (diffDay === 1) {
        return 'ayer';
    }

    // Less than a week
    if (diffDay < 7) {
        return `hace ${diffDay} días`;
    }

    // Otherwise show date
    return formatDate(d);
}

/**
 * Format a date as short date (e.g., "12 ene 2024")
 */
export function formatDate(date: Date | string | number): string {
    const d = new Date(date);
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const currentYear = new Date().getFullYear();

    // Only show year if different from current
    if (year !== currentYear) {
        return `${day} ${month} ${year}`;
    }
    return `${day} ${month}`;
}

/**
 * Format a date with time (e.g., "12 ene 14:30")
 */
export function formatDateTime(date: Date | string | number): string {
    const d = new Date(date);
    const dateStr = formatDate(d);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
}
