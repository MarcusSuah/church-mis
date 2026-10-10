import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import {
    Field,
    inputCls,
    Modal,
    SaveButton,
} from '@/components/ssbcms/records-ui';
import {
    CURRENCIES,
    CURRENCY_LABELS,
    fmtMoney,
    useCurrency,
    useMoney,
} from '@/lib/finance';
import type { BudgetRow } from './components/BudgetProgress';
import BudgetProgress from './components/BudgetProgress';
import ExpenseBreakdownChart from './components/ExpenseBreakdownChart';
import type { FinanceKpis } from './components/FinanceKPICards';
import FinanceKPICards from './components/FinanceKPICards';
import type { GivingPoint } from './components/FinanceGivingChart';
import FinanceGivingChart from './components/FinanceGivingChart';
import type { FundRow } from './components/FundSummary';
import FundSummary from './components/FundSummary';
import type { Transaction } from './components/TransactionsTable';
import TransactionsTable from './components/TransactionsTable';

type Props = {
    period: 'month' | 'quarter' | 'year';
    periodLabel: string;
    kpis: FinanceKpis;
    givingChart: GivingPoint[];
    expenseChart: { category: string; amount: number }[];
    funds: FundRow[];
    budgets: BudgetRow[];
    transactions: Transaction[];
    currencyTotals: Record<string, number>;
    quick: { audit_entries: number; budgets: number };
    access: { role: string; can_create: boolean };
};

const RECORD_LINKS = [
    { href: '/tithes?new=1', label: 'Tithe', icon: 'CurrencyDollarIcon' },
    { href: '/offerings?new=1', label: 'Offering', icon: 'HeartIcon' },
    { href: '/donations?new=1', label: 'Donation', icon: 'GiftIcon' },
    {
        href: '/expenses?new=1',
        label: 'Expense',
        icon: 'ArrowTrendingDownIcon',
    },
];

export default function FinanceManagement(props: Props) {
    const {
        period,
        periodLabel,
        kpis,
        givingChart,
        expenseChart,
        funds,
        budgets,
        transactions,
        quick,
        access,
        currencyTotals,
    } = props;
    const c = useCurrency();
    const [recordMenu, setRecordMenu] = useState(false);
    const [fundModal, setFundModal] = useState<FundRow | 'new' | null>(null);
    const year = new Date().getFullYear();
    const givingYtd = givingChart.reduce(
        (s, m) => s + m.tithes + m.offerings + m.donations,
        0,
    );

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Finance Management" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Finance Management</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Tithes, offerings, donations, expenses, and budgets —{' '}
                        {periodLabel}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
                        {(['month', 'quarter', 'year'] as const).map((p) => (
                            <button
                                key={p}
                                type="button"
                                onClick={() =>
                                    router.get(
                                        '/finance-management',
                                        { period: p },
                                        {
                                            preserveScroll: true,
                                            preserveState: true,
                                        },
                                    )
                                }
                                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${p === period ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                    <a
                        href={`/finance-management/export?period=${period}`}
                        className="btn-outline text-sm"
                    >
                        <Icon name="ArrowDownTrayIcon" size={16} />
                        Export Report
                    </a>
                    {access.can_create && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setRecordMenu(!recordMenu)}
                                className="btn-primary text-sm"
                            >
                                <Icon name="PlusIcon" size={16} />
                                Record Transaction
                            </button>
                            {recordMenu && (
                                <div className="scale-in absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border bg-card py-1 shadow-elevated">
                                    {RECORD_LINKS.map((l) => (
                                        <Link
                                            key={l.href}
                                            href={l.href}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                                        >
                                            <Icon
                                                name={l.icon}
                                                size={14}
                                                className="text-muted-foreground"
                                            />
                                            {l.label}
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-5 flex items-start gap-3 rounded-xl border border-info/20 bg-info/5 px-4 py-3">
                <Icon
                    name="ShieldCheckIcon"
                    size={18}
                    className="mt-0.5 shrink-0 text-info"
                />
                <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                        Access Level: {access.role}
                    </span>{' '}
                    — You are viewing all financial data, including member
                    giving details. Every change is recorded in the{' '}
                    <Link
                        href="/audit-logs?module=Finance"
                        className="font-medium text-accent hover:underline"
                    >
                        audit log
                    </Link>
                    .
                </p>
            </div>

            <section className="mb-4">
                <FinanceKPICards kpis={kpis} periodLabel={periodLabel} />
            </section>

            <CurrencyStrip totals={currencyTotals} periodLabel={periodLabel} />

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 className="section-header">
                                Giving by Category
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Monthly tithes, offerings & donations — last 12
                                months
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">
                            12 mo: {fmtMoney(givingYtd, c, 0)}
                        </span>
                    </div>
                    <FinanceGivingChart data={givingChart} />
                </div>
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 className="section-header">
                                Expense Breakdown
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Expenses by category — {periodLabel}
                            </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-danger/10 px-2 py-1 text-xs font-semibold text-danger">
                            Total: {fmtMoney(kpis.expenses, c, 0)}
                        </span>
                    </div>
                    <ExpenseBreakdownChart data={expenseChart} />
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="section-header">Fund Balances</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Balance (all income − expenses) vs target per
                                fund
                            </p>
                        </div>
                        {access.can_create && (
                            <button
                                type="button"
                                onClick={() => setFundModal('new')}
                                className="btn-ghost px-2.5 py-1.5 text-xs"
                            >
                                <Icon name="PlusIcon" size={13} />
                                Add Fund
                            </button>
                        )}
                    </div>
                    <FundSummary
                        funds={funds}
                        onEdit={
                            access.can_create
                                ? (f) => setFundModal(f)
                                : undefined
                        }
                    />
                </div>
                <div className="card p-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="section-header">Budget vs Actual</h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Expense categories — {year} spending vs annual
                                budget
                            </p>
                        </div>
                        <Link
                            href="/budgets"
                            className="text-xs font-medium text-accent hover:underline"
                        >
                            Full Budget →
                        </Link>
                    </div>
                    <BudgetProgress items={budgets} />
                </div>
            </div>

            <div className="card p-5" id="transactions">
                <div className="mb-5">
                    <h2 className="section-header">Recent Transactions</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        All giving records — last 12 months. Select rows to
                        print receipts.
                    </p>
                </div>
                <TransactionsTable
                    transactions={transactions}
                    canCreate={access.can_create}
                />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                    {
                        id: 'ql-budgets',
                        label: 'Manage Budgets',
                        icon: 'ChartBarIcon',
                        count: `${quick.budgets} for ${year}`,
                        href: '/budgets',
                    },
                    {
                        id: 'ql-receipts',
                        label: 'Issue Receipts',
                        icon: 'ReceiptRefundIcon',
                        count: 'Select transactions above',
                        href: '#transactions',
                    },
                    {
                        id: 'ql-reports',
                        label: 'Financial Report',
                        icon: 'DocumentArrowDownIcon',
                        count: `CSV — ${periodLabel}`,
                        href: `/finance-management/export?period=${period}`,
                        external: true,
                    },
                    {
                        id: 'ql-audit',
                        label: 'Finance Audit Log',
                        icon: 'ClipboardDocumentListIcon',
                        count: `${quick.audit_entries} entries`,
                        href: '/audit-logs?module=Finance',
                    },
                ].map((q) => {
                    const inner = (
                        <>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                <Icon
                                    name={q.icon}
                                    size={18}
                                    className="text-muted-foreground"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    {q.label}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {q.count}
                                </p>
                            </div>
                        </>
                    );
                    const cls =
                        'card flex items-center gap-3 p-4 text-left transition-shadow hover:shadow-elevated';
                    return q.external || q.href.startsWith('#') ? (
                        <a key={q.id} href={q.href} className={cls}>
                            {inner}
                        </a>
                    ) : (
                        <Link key={q.id} href={q.href} className={cls}>
                            {inner}
                        </Link>
                    );
                })}
            </div>

            {fundModal && (
                <FundModal
                    fund={fundModal === 'new' ? null : fundModal}
                    onClose={() => setFundModal(null)}
                />
            )}
        </div>
    );
}

/** Giving received in each currency (as paid) + the exchange rate in use. */
function CurrencyStrip({
    totals,
    periodLabel,
}: {
    totals: Record<string, number>;
    periodLabel: string;
}) {
    const { base, rate } = useMoney();
    return (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CURRENCIES.map((cur) => (
                <div
                    key={cur}
                    className="card flex items-center justify-between p-4"
                >
                    <div>
                        <p className="text-xs text-muted-foreground">
                            Received in {CURRENCY_LABELS[cur]} — {periodLabel}
                        </p>
                        <p className="text-lg font-bold text-foreground tabular-nums">
                            {fmtMoney(totals[cur] ?? 0, cur)}
                        </p>
                    </div>
                    {cur === base && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                            Default
                        </span>
                    )}
                </div>
            ))}
            <div className="card flex items-center justify-between p-4">
                <div>
                    <p className="text-xs text-muted-foreground">
                        Exchange rate
                    </p>
                    <p className="text-lg font-bold text-foreground tabular-nums">
                        $1 = L$
                        {rate.toLocaleString('en-US', {
                            maximumFractionDigits: 2,
                        })}
                    </p>
                </div>
                <Link
                    href="/church-settings"
                    className="text-xs font-medium text-accent hover:underline"
                >
                    Change →
                </Link>
            </div>
        </div>
    );
}

function FundModal({
    fund,
    onClose,
}: {
    fund: FundRow | null;
    onClose: () => void;
}) {
    const base = useCurrency();
    const form = useForm({
        name: fund?.name ?? '',
        description: fund?.description ?? '',
        target_amount:
            fund && fund.target_amount ? String(fund.target_amount) : '',
        currency: fund?.currency ?? base,
        is_active: true,
    });
    // The built-in General Fund has no record until its target is first saved.
    const save = () =>
        fund?.editable
            ? form.patch(`/funds/${fund.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/funds', { preserveScroll: true, onSuccess: onClose });
    return (
        <Modal
            wide={false}
            title={fund ? `Edit ${fund.name}` : 'Add Fund'}
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
                        disabled={!form.data.name}
                        label={fund ? 'Save Changes' : 'Create Fund'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <Field label="Fund Name *" error={form.errors.name}>
                    <input
                        className={inputCls}
                        value={form.data.name}
                        disabled={fund !== null && !fund.editable}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="e.g. Building Fund"
                    />
                </Field>
                <Field
                    label="Annual Target (set or change)"
                    error={form.errors.target_amount}
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
                            value={form.data.target_amount}
                            onChange={(e) =>
                                form.setData('target_amount', e.target.value)
                            }
                            placeholder="0.00"
                        />
                    </div>
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
            </div>
        </Modal>
    );
}
