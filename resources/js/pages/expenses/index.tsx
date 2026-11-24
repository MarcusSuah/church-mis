import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { Can, Opt } from '@/components/finance/shared';
import {
    AmountCell,
    FilterBar,
    FinancePageHeader,
    fmtD,
    MoneyFields,
    MoneyKpis,
    RecordsTable,
    RowActions,
    SearchInput,
    selectCls,
    today,
} from '@/components/finance/shared';
import { ExpenseCharts } from '@/components/finance/dashboard-charts';
import type { ExpenseChartData } from '@/components/finance/dashboard-charts';
import Icon from '@/components/ssbcms/AppIcon';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import {
    DeleteConfirm,
    Field,
    inputCls,
    Modal,
    SaveButton,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';
import { CAT_LABELS, fmtMoney, useCurrency } from '@/lib/finance';

type Expense = {
    id: string;
    title: string;
    description: string | null;
    category: string;
    amount: number;
    currency: string;
    payment_method: string;
    fund_id: string | null;
    fund_name: string;
    vendor_name: string | null;
    reference_number: string | null;
    receipt_url: string | null;
    expense_date: string;
    approved_by: string | null;
    paid_by: string | null;
    status: string;
    notes: string | null;
};

type Lists = {
    funds: Opt[];
    methods: string[];
    categories: string[];
    statuses: string[];
};
type Stats = {
    this_month: number;
    total: number;
    pending: number;
    filtered_total: number;
    charts?: ExpenseChartData;
};
type Props = Lists & {
    records: Expense[];
    pagination: PageMeta;
    filters: { search: string; category: string; status: string };
    stats: Stats;
    focus: Expense | null;
    can: Can;
};

const CAT_COLORS: Record<string, string> = {
    staff_salaries: 'bg-primary/10 text-primary',
    utilities: 'bg-info/10 text-info',
    maintenance: 'bg-warning/10 text-warning',
    outreach: 'bg-success/10 text-success',
    youth_programs: 'bg-purple-500/10 text-purple-600',
    music_worship: 'bg-accent/10 text-accent',
    events: 'bg-orange-500/10 text-orange-600',
    missions: 'bg-teal-500/10 text-teal-600',
};
const STATUS_COLORS: Record<string, string> = {
    Paid: 'bg-success/10 text-success',
    Pending: 'bg-warning/10 text-warning',
    Approved: 'bg-info/10 text-info',
    Rejected: 'bg-danger/10 text-danger',
};

export default function Expenses({
    records,
    pagination,
    filters,
    stats,
    focus,
    can,
    ...lists
}: Props) {
    const c = useCurrency();
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Expense | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const total = stats.filtered_total;
    const setExpenseStatus = (e: Expense, s: string) =>
        router.patch(
            `/expenses/${e.id}/status`,
            { status: s },
            { preserveScroll: true },
        );

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Expenses" />
            <FinancePageHeader
                title="Expenses"
                subtitle="Track and manage all church expenditures by category"
                action="Add Expense"
                onAction={() => setEditing('new')}
                canCreate={can.create}
            />
            <MoneyKpis
                items={[
                    {
                        label: 'This Month',
                        value: fmtMoney(stats.this_month, c),
                        icon: 'ArrowTrendingDownIcon',
                        color: 'text-danger',
                        bg: 'bg-danger/10',
                    },
                    {
                        label: 'Total Records',
                        value: stats.total,
                        icon: 'DocumentTextIcon',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                    },
                    {
                        label: 'Pending Approval',
                        value: stats.pending,
                        icon: 'ClockIcon',
                        color: 'text-warning',
                        bg: 'bg-warning/10',
                    },
                    {
                        label: 'Filtered Total',
                        value: fmtMoney(total, c),
                        icon: 'BanknotesIcon',
                        color: 'text-info',
                        bg: 'bg-info/10',
                    },
                ]}
            />
            <ExpenseCharts charts={stats.charts} currency={c} />
            <FilterBar total={total} danger>
                <SearchInput
                    value={values.search}
                    onChange={(v) => set('search', v)}
                    placeholder="Search title, vendor..."
                />
                <select
                    value={values.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={selectCls}
                >
                    <option value="All">All Categories</option>
                    {lists.categories.map((x) => (
                        <option key={x} value={x}>
                            {CAT_LABELS[x] ?? x}
                        </option>
                    ))}
                </select>
                <select
                    value={values.status}
                    onChange={(e) => set('status', e.target.value)}
                    className={selectCls}
                >
                    <option value="All">All Statuses</option>
                    {lists.statuses.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </FilterBar>
            <RecordsTable
                rows={records}
                pagination={pagination}
                headers={[
                    'Title',
                    'Category',
                    'Date',
                    'Amount',
                    'Vendor',
                    'Fund',
                    'Status',
                    '',
                ]}
                emptyIcon="ArrowTrendingDownIcon"
                emptyText="No expenses found"
                render={(e) => (
                    <tr key={e.id} className="group table-row">
                        <td className="table-cell">
                            <p className="text-sm font-medium text-foreground">
                                {e.title}
                            </p>
                            {e.description && (
                                <p
                                    className="max-w-[220px] truncate text-xs text-muted-foreground"
                                    title={e.description}
                                >
                                    {e.description}
                                </p>
                            )}
                        </td>
                        <td className="table-cell">
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${CAT_COLORS[e.category] ?? 'bg-muted text-muted-foreground'}`}
                            >
                                {CAT_LABELS[e.category] ?? e.category}
                            </span>
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {fmtD(e.expense_date)}
                        </td>
                        <AmountCell
                            amount={e.amount}
                            currency={e.currency}
                            danger
                        />
                        <td className="table-cell text-sm text-muted-foreground">
                            {e.vendor_name || '—'}
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {e.fund_name}
                        </td>
                        <td className="table-cell">
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[e.status] ?? 'bg-muted text-muted-foreground'}`}
                            >
                                {e.status}
                            </span>
                        </td>
                        <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1">
                                {can.update && e.status === 'Pending' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpenseStatus(e, 'Approved')
                                            }
                                            title="Approve"
                                            className="rounded p-1.5 text-success transition-colors hover:bg-success/10"
                                        >
                                            <Icon
                                                name="CheckCircleIcon"
                                                size={15}
                                            />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpenseStatus(e, 'Rejected')
                                            }
                                            title="Reject"
                                            className="rounded p-1.5 text-danger transition-colors hover:bg-danger/10"
                                        >
                                            <Icon
                                                name="XCircleIcon"
                                                size={15}
                                            />
                                        </button>
                                    </>
                                )}
                                {can.update && e.status === 'Approved' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setExpenseStatus(e, 'Paid')
                                        }
                                        title="Mark paid"
                                        className="rounded px-2 py-1 text-xs font-medium text-success hover:bg-success/10"
                                    >
                                        Mark Paid
                                    </button>
                                )}
                                <RowActions
                                    can={can}
                                    onEdit={() => setEditing(e)}
                                    onDelete={() =>
                                        setDeleteUrl(`/expenses/${e.id}`)
                                    }
                                />
                            </div>
                        </td>
                    </tr>
                )}
            />
            {editing && (
                <ExpenseModal
                    record={editing === 'new' ? null : editing}
                    lists={lists}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Expense"
                message="This action cannot be undone."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function ExpenseModal({
    record,
    lists,
    onClose,
}: {
    record: Expense | null;
    lists: Lists;
    onClose: () => void;
}) {
    const base = useCurrency();
    const form = useForm({
        title: record?.title ?? '',
        description: record?.description ?? '',
        category: record?.category ?? 'other',
        status: record?.status ?? 'Pending',
        amount: record ? String(record.amount) : '',
        currency: record?.currency ?? base,
        expense_date: record?.expense_date ?? today(),
        payment_method: record?.payment_method ?? 'bank_transfer',
        fund_id: record?.fund_id ?? '',
        vendor_name: record?.vendor_name ?? '',
        reference_number: record?.reference_number ?? '',
        approved_by: record?.approved_by ?? '',
        paid_by: record?.paid_by ?? '',
        notes: record?.notes ?? '',
    });
    const save = () =>
        record
            ? form.patch(`/expenses/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/expenses', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });

    return (
        <Modal
            wide={false}
            title={record ? 'Edit Expense' : 'Add Expense'}
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
                        disabled={!form.data.title || !form.data.amount}
                        label={record ? 'Save Changes' : 'Add Expense'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <Field label="Title *" error={form.errors.title}>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        placeholder="Expense title"
                    />
                </Field>
                <Field label="Description">
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        placeholder="Brief description..."
                    />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Category">
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
                    <Field label="Status">
                        <select
                            className={inputCls}
                            value={form.data.status}
                            onChange={(e) =>
                                form.setData('status', e.target.value)
                            }
                        >
                            {lists.statuses.map((s) => (
                                <option key={s}>{s}</option>
                            ))}
                        </select>
                    </Field>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Vendor">
                        <input
                            className={inputCls}
                            value={form.data.vendor_name}
                            onChange={(e) =>
                                form.setData('vendor_name', e.target.value)
                            }
                            placeholder="Vendor name"
                        />
                    </Field>
                    <Field label="Approved By">
                        <input
                            className={inputCls}
                            value={form.data.approved_by}
                            onChange={(e) =>
                                form.setData('approved_by', e.target.value)
                            }
                            placeholder="Approver name"
                        />
                    </Field>
                </div>
                <Field label="Paid By">
                    <input
                        className={inputCls}
                        value={form.data.paid_by}
                        onChange={(e) =>
                            form.setData('paid_by', e.target.value)
                        }
                        placeholder="Payer name"
                    />
                </Field>
                <MoneyFields
                    form={form}
                    dateKey="expense_date"
                    methods={lists.methods}
                    funds={lists.funds}
                    receipt={false}
                />
            </div>
        </Modal>
    );
}
