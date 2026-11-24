import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { BudgetCharts } from '@/components/finance/dashboard-charts';
import type { Can, Opt } from '@/components/finance/shared';
import {
    FinancePageHeader,
    MoneyKpis,
    selectCls,
} from '@/components/finance/shared';
import Icon from '@/components/ssbcms/AppIcon';
import { Paginator, usePagination } from '@/components/ssbcms/Pagination';
import {
    DeleteConfirm,
    Field,
    inputCls,
    Modal,
    SaveButton,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';
import {
    CAT_LABELS,
    CURRENCIES,
    fmtMoney,
    useCurrency,
    useMoney,
} from '@/lib/finance';

type Budget = {
    id: string;
    category: string;
    description: string | null;
    period: string;
    fiscal_year: number;
    allocated_amount: number;
    allocated_base: number;
    currency: string;
    spent_amount: number;
    fund_id: string | null;
    fund_name: string;
    icon: string;
    notes: string | null;
    is_active: boolean;
};
type Lists = {
    funds: Opt[];
    categories: string[];
    periods: string[];
    years: number[];
};
type Props = Lists & {
    records: Budget[];
    filters: { search: string; year: string };
    focus: Budget | null;
    can: Can;
};

/** The server sends one fiscal year's budget lines at a time (Phase 3). */
export default function Budgets({
    records,
    filters,
    focus,
    can,
    ...lists
}: Props) {
    const c = useCurrency();
    const { equiv } = useMoney();
    const years = lists.years;
    const { values, set } = useListFilters(filters);
    const year = Number(values.year) || years[0];
    const [editing, setEditing] = useState<Budget | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);

    const rows = records;
    // Totals use active budget lines only; each line's allocation is converted to a yearly amount.
    const active = rows.filter((b) => b.is_active);
    const allocated = active.reduce((s, b) => s + b.allocated_base, 0);
    const spent = active.reduce((s, b) => s + b.spent_amount, 0);
    const overspend = active.reduce(
        (s, b) => s + Math.max(0, b.spent_amount - b.allocated_base),
        0,
    );
    const pager = usePagination(rows, 12);

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Budgets" />
            <FinancePageHeader
                title="Budgets"
                subtitle="Annual budgets per expense category — spending is calculated from approved and paid expenses"
                action="Add Budget"
                onAction={() => setEditing('new')}
                canCreate={can.create}
            />
            <MoneyKpis
                items={[
                    {
                        label: `Allocated (${year})`,
                        value: (
                            <>
                                {fmtMoney(allocated, c, 0)}
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {equiv(allocated)}
                                </span>
                            </>
                        ),
                        icon: 'ChartBarIcon',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                    },
                    {
                        label: 'Spent',
                        value: (
                            <>
                                {fmtMoney(spent, c, 0)}
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {equiv(spent)}
                                </span>
                            </>
                        ),
                        icon: 'ArrowTrendingDownIcon',
                        color: 'text-danger',
                        bg: 'bg-danger/10',
                    },
                    {
                        label: 'Remaining',
                        value: (
                            <>
                                {fmtMoney(Math.max(0, allocated - spent), c, 0)}
                                {overspend > 0 && (
                                    <span className="block text-xs font-normal text-danger">
                                        {fmtMoney(overspend, c, 0)} overspent
                                    </span>
                                )}
                            </>
                        ),
                        icon: 'BanknotesIcon',
                        color: 'text-success',
                        bg: 'bg-success/10',
                    },
                    {
                        label: 'Over Budget',
                        value: active.filter(
                            (b) => b.spent_amount > b.allocated_base,
                        ).length,
                        icon: 'ExclamationTriangleIcon',
                        color: 'text-warning',
                        bg: 'bg-warning/10',
                    },
                ]}
            />
            <BudgetCharts budgets={rows} currency={c} year={year} />
            <div className="card mb-4 flex items-center gap-3 p-4">
                <label className="text-sm text-muted-foreground">
                    Fiscal year
                </label>
                <select
                    value={year}
                    onChange={(e) => set('year', e.target.value)}
                    className={selectCls}
                >
                    {years.map((y) => (
                        <option key={y}>{y}</option>
                    ))}
                </select>
                <span className="ml-auto text-sm text-muted-foreground">
                    {rows.length} budgets
                </span>
            </div>

            {rows.length === 0 ? (
                <div className="card p-12 text-center text-sm text-muted-foreground">
                    No budgets for {year} yet.
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="divide-y divide-border">
                        {pager.pageItems.map((b) => {
                            const pct =
                                b.allocated_base > 0
                                    ? Math.round(
                                          (b.spent_amount / b.allocated_base) *
                                              100,
                                      )
                                    : 0;
                            const over = pct > 100;
                            const warn = pct > 80 && !over;
                            const left = b.allocated_base - b.spent_amount;
                            return (
                                <div
                                    key={b.id}
                                    className="group flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                                        <Icon
                                            name={b.icon || 'BanknotesIcon'}
                                            size={18}
                                            className="text-muted-foreground"
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {CAT_LABELS[b.category] ??
                                                    b.category}
                                                <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
                                                    {b.period} · {b.fund_name}
                                                </span>
                                                {!b.is_active && (
                                                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                        Inactive
                                                    </span>
                                                )}
                                            </p>
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {fmtMoney(b.spent_amount, c, 0)}{' '}
                                                /{' '}
                                                {fmtMoney(
                                                    b.allocated_base,
                                                    c,
                                                    0,
                                                )}
                                                /yr
                                                {b.period !== 'annual' ||
                                                b.currency !== c
                                                    ? ` (${fmtMoney(b.allocated_amount, b.currency, 0)} ${b.period === 'monthly' ? 'per month' : b.period === 'quarterly' ? 'per quarter' : 'per year'})`
                                                    : ''}{' '}
                                                ·{' '}
                                                <span
                                                    className={
                                                        over
                                                            ? 'text-danger'
                                                            : warn
                                                              ? 'text-warning'
                                                              : ''
                                                    }
                                                >
                                                    {pct}%
                                                </span>
                                            </span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-muted">
                                            <div
                                                className={`h-2 rounded-full ${over ? 'bg-danger' : warn ? 'bg-warning' : 'bg-primary'}`}
                                                style={{
                                                    width: `${Math.min(100, pct)}%`,
                                                }}
                                            />
                                        </div>
                                        {b.description && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {b.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span
                                            className={`text-xs font-semibold tabular-nums ${left >= 0 ? 'text-success' : 'text-danger'}`}
                                        >
                                            {left >= 0
                                                ? `${fmtMoney(left, c, 0)} left`
                                                : `-${fmtMoney(Math.abs(left), c, 0)} over`}
                                        </span>
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(b)}
                                                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                                aria-label="Edit"
                                            >
                                                <Icon
                                                    name="PencilIcon"
                                                    size={14}
                                                />
                                            </button>
                                        )}
                                        {can.delete && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDeleteUrl(
                                                        `/budgets/${b.id}`,
                                                    )
                                                }
                                                className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                                aria-label="Delete"
                                            >
                                                <Icon
                                                    name="TrashIcon"
                                                    size={14}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <Paginator {...pager} />
                </div>
            )}

            {editing && (
                <BudgetModal
                    record={editing === 'new' ? null : editing}
                    year={year}
                    lists={lists}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Budget"
                message="This budget line will be removed. Expenses are not affected."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function BudgetModal({
    record,
    year,
    lists,
    onClose,
}: {
    record: Budget | null;
    year: number;
    lists: Lists;
    onClose: () => void;
}) {
    const c = useCurrency();
    const form = useForm({
        category: record?.category ?? 'other',
        description: record?.description ?? '',
        period: record?.period ?? 'annual',
        fiscal_year: String(record?.fiscal_year ?? year),
        allocated_amount: record ? String(record.allocated_amount) : '',
        currency: record?.currency ?? c,
        fund_id: record?.fund_id ?? '',
        notes: record?.notes ?? '',
        is_active: record?.is_active ?? true,
    });
    const save = () =>
        record
            ? form.patch(`/budgets/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/budgets', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });

    return (
        <Modal
            wide={false}
            title={record ? 'Edit Budget' : 'Add Budget'}
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline text-sm"
                    >
                        Cancel
                    </button>
                    <SaveButton
                        saving={form.processing}
                        disabled={!form.data.allocated_amount}
                        label={record ? 'Save Changes' : 'Add Budget'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Category" error={form.errors.category}>
                        <select
                            className={inputCls}
                            value={form.data.category}
                            onChange={(e) =>
                                form.setData('category', e.target.value)
                            }
                        >
                            {lists.categories.map((x) => (
                                <option key={x} value={x}>
                                    {CAT_LABELS[x] ?? x}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Fiscal Year" error={form.errors.fiscal_year}>
                        <input
                            type="number"
                            className={inputCls}
                            value={form.data.fiscal_year}
                            onChange={(e) =>
                                form.setData('fiscal_year', e.target.value)
                            }
                        />
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field
                        label="Allocated *"
                        error={form.errors.allocated_amount}
                    >
                        <div className="flex">
                            <select
                                className="rounded-l-lg border border-r-0 border-border bg-muted px-2 text-sm font-semibold"
                                value={form.data.currency}
                                onChange={(e) =>
                                    form.setData('currency', e.target.value)
                                }
                                aria-label="Currency"
                            >
                                {CURRENCIES.map((x) => (
                                    <option key={x}>{x}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                min={0}
                                step="0.01"
                                className={`${inputCls} rounded-l-none`}
                                value={form.data.allocated_amount}
                                onChange={(e) =>
                                    form.setData(
                                        'allocated_amount',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                    </Field>
                    <Field label="Period">
                        <select
                            className={inputCls}
                            value={form.data.period}
                            onChange={(e) =>
                                form.setData('period', e.target.value)
                            }
                        >
                            {lists.periods.map((p) => (
                                <option
                                    key={p}
                                    value={p}
                                    className="capitalize"
                                >
                                    {p}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <Field label="Fund">
                    <select
                        className={inputCls}
                        value={form.data.fund_id}
                        onChange={(e) =>
                            form.setData('fund_id', e.target.value)
                        }
                    >
                        <option value="">General Fund</option>
                        {lists.funds
                            .filter((f) => f.name !== 'General Fund')
                            .map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.name}
                                </option>
                            ))}
                    </select>
                </Field>
                <Field label="Description">
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                    />
                </Field>
                <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(e) =>
                            form.setData('is_active', e.target.checked)
                        }
                        className="rounded border-border"
                    />
                    Active
                </label>
            </div>
        </Modal>
    );
}
