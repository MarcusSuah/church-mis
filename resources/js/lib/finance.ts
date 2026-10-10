import { usePage } from '@inertiajs/react';

export const METHOD_LABELS: Record<string, string> = {
    cash: 'Cash',
    check: 'Check',
    momo: 'Mobile Money',
    bank_transfer: 'Bank Transfer',
    card: 'Card',
    other: 'Other',
};

export const CAT_LABELS: Record<string, string> = {
    staff_salaries: 'Staff Salaries',
    utilities: 'Utilities',
    maintenance: 'Maintenance',
    outreach: 'Outreach',
    youth_programs: 'Youth Programs',
    music_worship: 'Music & Worship',
    administration: 'Administration',
    events: 'Events',
    missions: 'Missions',
    other: 'Other',
};

export const CURRENCIES = ['USD', 'LRD'] as const;
export const CURRENCY_LABELS: Record<string, string> = {
    USD: 'US Dollar ($)',
    LRD: 'Liberian Dollar (L$)',
};
const SYMBOL: Record<string, string> = { USD: '$', LRD: 'L$' };

type ChurchMoney = {
    currency?: string;
    secondary_currency?: string;
    exchange_rate?: number;
};

/** Default (base) currency from Church Settings. */
export function useCurrency(): string {
    const { props } = usePage<{ church?: ChurchMoney }>();
    return props.church?.currency || 'USD';
}

/**
 * Both currencies: base (default), other, the LRD-per-USD rate, and helpers to
 * convert and to show an amount with its equivalent in the other currency.
 */
export function useMoney() {
    const { props } = usePage<{ church?: ChurchMoney }>();
    const base = props.church?.currency || 'USD';
    const other =
        props.church?.secondary_currency || (base === 'USD' ? 'LRD' : 'USD');
    const rate = Number(props.church?.exchange_rate) || 190;
    const convert = (amount: number, from: string, to: string = base) =>
        from === to ? amount : from === 'USD' ? amount * rate : amount / rate;
    return {
        base,
        other,
        rate,
        convert,
        toBase: (amount: number, from?: string | null) =>
            convert(amount, from || base, base),
        /** Equivalent of a base-currency amount in the other currency, e.g. "≈ L$190,000". */
        equiv: (baseAmount: number, decimals = 0) =>
            `≈ ${fmtMoney(convert(baseAmount, base, other), other, decimals)}`,
    };
}

export function fmtMoney(
    amount: number,
    currency: string,
    decimals = 2,
): string {
    const n = Number(amount) || 0;
    const sym = SYMBOL[currency] ?? `${currency} `;
    return `${n < 0 ? '-' : ''}${sym}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Compact axis label: $12k / L$2.4M */
export function fmtCompact(amount: number, currency: string): string {
    const n = Number(amount) || 0;
    const sym = SYMBOL[currency] ?? '';
    const body = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Math.abs(n));
    return `${n < 0 ? '-' : ''}${sym}${body}`;
}

export function pctChange(now: number, prev: number): string {
    if (!prev) return now ? 'New this period' : 'No change';
    const p = ((now - prev) / prev) * 100;
    return `${p >= 0 ? '+' : ''}${p.toFixed(1)}% vs previous period`;
}

/** Download rows as CSV in the browser. */
export function downloadCsv(
    filename: string,
    headers: string[],
    rows: (string | number | null | undefined)[][],
) {
    const esc = (v: string | number | null | undefined) =>
        `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
