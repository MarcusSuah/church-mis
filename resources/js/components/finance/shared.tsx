import type { ReactNode } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import {
    Paginator,
    ServerPaginator,
    usePagination,
} from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import { Avatar, Field, inputCls } from '@/components/ssbcms/records-ui';
import { CURRENCIES, fmtMoney, METHOD_LABELS, useMoney } from '@/lib/finance';

export type Opt = { id: string; name: string; photo_url?: string | null };
export type Can = { create: boolean; update: boolean; delete: boolean };

export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);
export const fmtD = (d: string | null | undefined) =>
    d
        ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '—';

/** Header + 4 KPI cards used by the giving and expense pages. */
export function FinancePageHeader({
    title,
    subtitle,
    action,
    onAction,
    canCreate,
}: {
    title: string;
    subtitle: string;
    action: string;
    onAction: () => void;
    canCreate: boolean;
}) {
    return (
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
                <h1 className="page-title">{title}</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    {subtitle}
                </p>
            </div>
            {canCreate && (
                <button
                    type="button"
                    onClick={onAction}
                    className="btn-primary text-sm"
                >
                    <Icon name="PlusIcon" size={16} />
                    {action}
                </button>
            )}
        </div>
    );
}

export function MoneyKpis({
    items,
}: {
    items: {
        label: string;
        value: ReactNode;
        icon: string;
        color: string;
        bg: string;
    }[];
}) {
    return (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {items.map((k) => (
                <div key={k.label} className="card flex items-center gap-3 p-4">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.bg}`}
                    >
                        <Icon name={k.icon} size={18} className={k.color} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">
                            {k.label}
                        </p>
                        <p className="truncate text-lg font-bold text-foreground tabular-nums">
                            {k.value}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Search + selects + total, in a card. */
export function FilterBar({
    children,
    total,
    danger = false,
}: {
    children: ReactNode;
    total: number;
    danger?: boolean;
}) {
    const { base: c, equiv } = useMoney();
    return (
        <div className="card mb-4 p-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                    {children}
                </div>
                <span className="text-sm font-semibold text-foreground">
                    Total:{' '}
                    <span className={danger ? 'text-danger' : 'text-success'}>
                        {fmtMoney(total, c)}
                    </span>
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {equiv(total)}
                    </span>
                </span>
            </div>
        </div>
    );
}

export function SearchInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <Icon
                name="MagnifyingGlassIcon"
                size={15}
                className="text-muted-foreground"
            />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
        </div>
    );
}

export const selectCls =
    'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring';

/** Table shell with header row, empty state and pagination footer. */
export function RecordsTable<T>({
    rows,
    headers,
    minWidth = 900,
    emptyIcon,
    emptyText,
    render,
    pageSize = 15,
    pagination,
}: {
    rows: T[];
    headers: string[];
    minWidth?: number;
    emptyIcon: string;
    emptyText: string;
    render: (row: T) => ReactNode;
    pageSize?: number;
    /** Server-side pagination (Phase 3): rows are already one page; show the server's page links. */
    pagination?: PageMeta;
}) {
    const clientPager = usePagination(rows, pageSize);
    const pager = pagination
        ? { ...clientPager, pageItems: rows }
        : clientPager;
    return (
        <div className="card overflow-hidden">
            <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full" style={{ minWidth }}>
                    <thead>
                        <tr>
                            {headers.map((h, i) => (
                                <th
                                    key={i}
                                    className={`table-header ${i === headers.length - 1 && h === '' ? 'text-right' : 'text-left'}`}
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {pager.pageItems.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={headers.length}
                                    className="py-12 text-center"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Icon
                                            name={emptyIcon}
                                            size={28}
                                            className="text-muted-foreground"
                                        />
                                        <p className="text-sm font-medium text-foreground">
                                            {emptyText}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pager.pageItems.map(render)
                        )}
                    </tbody>
                </table>
            </div>
            {pagination ? (
                <ServerPaginator meta={pagination} />
            ) : (
                <Paginator {...clientPager} />
            )}
        </div>
    );
}

export function RowActions({
    can,
    onEdit,
    onDelete,
    receiptId,
}: {
    can: Can;
    onEdit: () => void;
    onDelete: () => void;
    receiptId?: string;
}) {
    return (
        <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
            {receiptId && (
                <PdfButton
                    url={`/finance-management/receipts?ids=${receiptId}`}
                    title="Receipt"
                    ariaLabel="Print receipt"
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <Icon name="PrinterIcon" size={14} />
                </PdfButton>
            )}
            {can.update && (
                <button
                    type="button"
                    onClick={onEdit}
                    title="Edit"
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <Icon name="PencilIcon" size={14} />
                </button>
            )}
            {can.delete && (
                <button
                    type="button"
                    onClick={onDelete}
                    title="Delete"
                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                >
                    <Icon name="TrashIcon" size={14} />
                </button>
            )}
        </div>
    );
}

export function MemberCell({
    name,
    photo,
    sub,
}: {
    name: string;
    photo?: string | null;
    sub?: string | null;
}) {
    return (
        <div className="flex items-center gap-3">
            {photo ? (
                <Avatar src={photo} size={32} muted />
            ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {name.charAt(0)}
                </div>
            )}
            <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{name}</p>
                {sub && (
                    <p className="truncate text-xs text-muted-foreground">
                        {sub}
                    </p>
                )}
            </div>
        </div>
    );
}

/** Amount / date / method / fund / reference / receipt / notes — shared form fields. */
/** Amount in the record's own currency, with the default-currency equivalent underneath when different. */
export function AmountCell({
    amount,
    currency,
    danger = false,
}: {
    amount: number;
    currency?: string | null;
    danger?: boolean;
}) {
    const { base, toBase } = useMoney();
    const cur = currency || base;
    return (
        <td
            className={`table-cell font-bold tabular-nums ${danger ? 'text-danger' : 'text-foreground'}`}
        >
            {fmtMoney(amount, cur)}
            {cur !== base && (
                <span className="block text-[11px] font-normal text-muted-foreground">
                    ≈ {fmtMoney(toBase(amount, cur), base)}
                </span>
            )}
        </td>
    );
}

/** Sum of records converted to the default currency. */
export function useBaseTotal() {
    const { toBase } = useMoney();
    return <T extends { amount: number; currency?: string | null }>(
        rows: T[],
    ) => rows.reduce((s, r) => s + toBase(r.amount, r.currency), 0);
}

export function MoneyFields<
    D extends {
        amount: string;
        currency: string;
        payment_method: string;
        fund_id: string;
        reference_number: string;
        receipt_number?: string;
        notes: string;
    },
>({
    form,
    dateKey,
    methods,
    funds,
    receipt = true,
}: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: {
        data: D & Record<string, any>;
        setData: (k: any, v: any) => void;
        errors: Record<string, string | undefined>;
    };
    dateKey: string;
    methods: string[];
    funds: Opt[];
    receipt?: boolean;
}) {
    const { convert, other, base } = useMoney();
    const amt = Number(form.data.amount) || 0;
    const cur = form.data.currency || base;
    const otherCur = cur === 'USD' ? 'LRD' : 'USD';
    return (
        <>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Amount *" error={form.errors.amount}>
                    <div className="flex">
                        <select
                            className="rounded-l-lg border border-r-0 border-border bg-muted px-2 text-sm font-semibold text-foreground outline-none"
                            value={cur}
                            onChange={(e) =>
                                form.setData('currency', e.target.value)
                            }
                            aria-label="Currency"
                        >
                            {CURRENCIES.map((x) => (
                                <option key={x} value={x}>
                                    {x}
                                </option>
                            ))}
                        </select>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            className={`${inputCls} rounded-l-none`}
                            value={form.data.amount}
                            onChange={(e) =>
                                form.setData('amount', e.target.value)
                            }
                            placeholder="0.00"
                        />
                    </div>
                    {amt > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            ≈ {fmtMoney(convert(amt, cur, otherCur), otherCur)}
                            {otherCur === other ? '' : ''}
                        </p>
                    )}
                </Field>
                <Field label="Date *" error={form.errors[dateKey]}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data[dateKey]}
                        onChange={(e) => form.setData(dateKey, e.target.value)}
                    />
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Payment Method">
                    <select
                        className={inputCls}
                        value={form.data.payment_method}
                        onChange={(e) =>
                            form.setData('payment_method', e.target.value)
                        }
                    >
                        {methods.map((m) => (
                            <option key={m} value={m}>
                                {METHOD_LABELS[m] ?? m}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Fund">
                    <select
                        className={inputCls}
                        value={form.data.fund_id}
                        onChange={(e) =>
                            form.setData('fund_id', e.target.value)
                        }
                    >
                        <option value="">General Fund</option>
                        {funds
                            .filter((f) => f.name !== 'General Fund')
                            .map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                    </select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Reference #" error={form.errors.reference_number}>
                    <input
                        className={inputCls}
                        value={form.data.reference_number}
                        onChange={(e) =>
                            form.setData('reference_number', e.target.value)
                        }
                        placeholder="CHK-… / MoMo ID"
                    />
                </Field>
                {receipt && (
                    <Field label="Receipt #" error={form.errors.receipt_number}>
                        <input
                            className={inputCls}
                            value={form.data.receipt_number ?? ''}
                            onChange={(e) =>
                                form.setData('receipt_number', e.target.value)
                            }
                            placeholder="Auto: REC-…"
                        />
                    </Field>
                )}
            </div>
            <Field label="Notes">
                <textarea
                    rows={2}
                    className={`${inputCls} resize-none`}
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                    placeholder="Optional notes..."
                />
            </Field>
        </>
    );
}
