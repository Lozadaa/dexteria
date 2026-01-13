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

/**
 * Filter tool JSON blocks from streaming content and replace with friendly indicators.
 * Handles both complete and incomplete (partial) JSON blocks during streaming.
 */
export function filterToolJsonFromContent(content: string): string {
    if (!content) return content;

    let filtered = content;

    // 1. Replace complete JSON code blocks with tool calls
    // Match: ```json\n{"tool": "create_task", "arguments": {...}}\n```
    filtered = filtered.replace(
        /```json\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[^]*?\}\s*\}\s*\n?```/g,
        (_match, toolName) => {
            return getToolIndicator(toolName, 'complete');
        }
    );

    // 2. Replace inline tool JSON (not in code blocks)
    filtered = filtered.replace(
        /\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*\{[^}]*\}\s*\}/g,
        (_match, toolName) => {
            return getToolIndicator(toolName, 'complete');
        }
    );

    // 3. Handle partial/incomplete JSON blocks during streaming
    // Match opening of a JSON code block with tool pattern that hasn't closed yet
    filtered = filtered.replace(
        /```json\s*\n?\s*\{\s*"tool"\s*:\s*"([^"]+)"[^`]*$/,
        (_match, toolName) => {
            return getToolIndicator(toolName, 'pending');
        }
    );

    // 4. Handle partial inline tool JSON
    filtered = filtered.replace(
        /\{\s*"tool"\s*:\s*"([^"]+)"[^}]*$/,
        (_match, toolName) => {
            return getToolIndicator(toolName, 'pending');
        }
    );

    return filtered;
}

/**
 * Get a friendly indicator for a tool action.
 */
function getToolIndicator(toolName: string, status: 'pending' | 'complete'): string {
    const icon = status === 'pending' ? '⏳' : '✅';

    switch (toolName) {
        case 'create_task':
            return `\n${icon} ${status === 'pending' ? 'Creando tarea...' : 'Tarea creada'}\n`;
        case 'update_task':
            return `\n${icon} ${status === 'pending' ? 'Actualizando tarea...' : 'Tarea actualizada'}\n`;
        case 'list_tasks':
            return `\n${icon} ${status === 'pending' ? 'Listando tareas...' : 'Tareas listadas'}\n`;
        case 'save_progress':
            return `\n${icon} ${status === 'pending' ? 'Guardando progreso...' : 'Progreso guardado'}\n`;
        default:
            return `\n${icon} ${status === 'pending' ? `Ejecutando ${toolName}...` : `${toolName} completado`}\n`;
    }
}
