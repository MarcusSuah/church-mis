/** "2026-08-15" or ISO → "08/15/2026". */
export function formatShortDate(value: string | null | undefined): string {
    const d = parseDate(value);
    if (!d) return value || '—';
    return d.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/** → "Aug 15, 2026" */
export function formatLongDate(value: string | null | undefined): string {
    const d = parseDate(value);
    if (!d) return value || '—';
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/** → "Aug 15, 2026 at 2:34 PM" (local time — for timestamps, not plain dates) */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const date = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
    const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
    return `${date} at ${time}`;
}

function parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    // Plain dates are treated as UTC so they never shift a day across time zones.
    const d = /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00Z`)
        : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Turn a filled-in value into a display string, "—" when empty. */
export function display(value: string | number | null | undefined): string {
    return value === null || value === undefined || value === ''
        ? '—'
        : String(value);
}

/** Money in the church's currency, e.g. "RWF 50,000" or "$1,000.00". */
export function formatMoney(amount: number | string, currency: string): string {
    const value = typeof amount === 'string' ? Number(amount) : amount;
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: ['RWF', 'UGX', 'JPY', 'KRW', 'BIF'].includes(
                currency,
            )
                ? 0
                : 2,
        }).format(value || 0);
    } catch {
        return `${currency} ${(value || 0).toLocaleString()}`;
    }
}

/** "19:00:00" → "7:00 PM" */
export function formatTime(value: string | null | undefined): string {
    if (!value) return '—';
    const [h, m] = value.split(':').map(Number);
    if (Number.isNaN(h)) return value;
    const d = new Date(2000, 0, 1, h, m || 0);
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
}
