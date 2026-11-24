import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { Can, Opt } from '@/components/finance/shared';
import {
    AmountCell,
    FilterBar,
    FinancePageHeader,
    fmtD,
    MemberCell,
    MoneyFields,
    MoneyKpis,
    RecordsTable,
    RowActions,
    SearchInput,
    selectCls,
    today,
} from '@/components/finance/shared';
import { TitheCharts } from '@/components/finance/dashboard-charts';
import type { TitheChartData } from '@/components/finance/dashboard-charts';
import MemberPicker from '@/components/ssbcms/MemberPicker';
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
import { fmtMoney, METHOD_LABELS, useCurrency } from '@/lib/finance';

type Tithe = {
    id: string;
    member_id: string | null;
    member_name: string;
    member_photo: string | null;
    amount: number;
    currency: string;
    payment_method: string;
    fund_id: string | null;
    fund_name: string;
    reference_number: string | null;
    receipt_number: string | null;
    tithe_date: string;
    notes: string | null;
    recorded_by: string | null;
};

type Stats = {
    this_month: number;
    total: number;
    average: number;
    filtered_total: number;
    charts?: TitheChartData;
};
type Props = {
    records: Tithe[];
    pagination: PageMeta;
    filters: { search: string; method: string };
    stats: Stats;
    focus: Tithe | null;
    funds: Opt[];
    methods: string[];
    can: Can;
};

/** One page at a time: search, filters, totals and paging all come from the server (Phase 3). */
export default function Tithes({
    records,
    pagination,
    filters,
    stats,
    focus,
    funds,
    methods,
    can,
}: Props) {
    const c = useCurrency();
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Tithe | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const total = stats.filtered_total;

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Tithes" />
            <FinancePageHeader
                title="Tithes"
                subtitle="Record and manage tithe contributions from members"
                action="Record Tithe"
                onAction={() => setEditing('new')}
                canCreate={can.create}
            />
            <MoneyKpis
                items={[
                    {
                        label: 'This Month',
                        value: fmtMoney(stats.this_month, c),
                        icon: 'CalendarDaysIcon',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                    },
                    {
                        label: 'Total Records',
                        value: stats.total,
                        icon: 'DocumentTextIcon',
                        color: 'text-success',
                        bg: 'bg-success/10',
                    },
                    {
                        label: 'Avg Tithe',
                        value: fmtMoney(stats.average, c, 0),
                        icon: 'ChartBarIcon',
                        color: 'text-accent',
                        bg: 'bg-accent/10',
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
            <TitheCharts charts={stats.charts} currency={c} />
            <FilterBar total={total}>
                <SearchInput
                    value={values.search}
                    onChange={(v) => set('search', v)}
                    placeholder="Search member, receipt..."
                />
                <select
                    value={values.method}
                    onChange={(e) => set('method', e.target.value)}
                    className={selectCls}
                >
                    <option value="All">All Methods</option>
                    {methods.map((m) => (
                        <option key={m} value={m}>
                            {METHOD_LABELS[m] ?? m}
                        </option>
                    ))}
                </select>
            </FilterBar>
            <RecordsTable
                rows={records}
                pagination={pagination}
                headers={[
                    'Member',
                    'Date',
                    'Amount',
                    'Method',
                    'Fund',
                    'Receipt',
                    '',
                ]}
                minWidth={800}
                emptyIcon="BanknotesIcon"
                emptyText="No tithes found"
                render={(t) => (
                    <tr key={t.id} className="group table-row">
                        <td className="table-cell">
                            <MemberCell
                                name={t.member_name}
                                photo={t.member_photo}
                            />
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {fmtD(t.tithe_date)}
                        </td>
                        <AmountCell amount={t.amount} currency={t.currency} />
                        <td className="table-cell">
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {METHOD_LABELS[t.payment_method] ??
                                    t.payment_method}
                            </span>
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {t.fund_name}
                        </td>
                        <td className="table-cell font-mono text-xs text-accent">
                            {t.receipt_number || '—'}
                        </td>
                        <td className="table-cell text-right">
                            <RowActions
                                can={can}
                                receiptId={`tithe:${t.id}`}
                                onEdit={() => setEditing(t)}
                                onDelete={() => setDeleteUrl(`/tithes/${t.id}`)}
                            />
                        </td>
                    </tr>
                )}
            />
            {editing && (
                <TitheModal
                    record={editing === 'new' ? null : editing}
                    funds={funds}
                    methods={methods}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Tithe Record"
                message="This action cannot be undone."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function TitheModal({
    record,
    funds,
    methods,
    onClose,
}: {
    record: Tithe | null;
    funds: Opt[];
    methods: string[];
    onClose: () => void;
}) {
    const base = useCurrency();
    const form = useForm({
        member_id: record?.member_id ?? '',
        member_name: record?.member_name ?? '',
        amount: record ? String(record.amount) : '',
        currency: record?.currency ?? base,
        payment_method: record?.payment_method ?? 'cash',
        fund_id: record?.fund_id ?? '',
        reference_number: record?.reference_number ?? '',
        receipt_number: record?.receipt_number ?? '',
        tithe_date: record?.tithe_date ?? today(),
        notes: record?.notes ?? '',
    });
    const save = () =>
        record
            ? form.patch(`/tithes/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/tithes', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });

    return (
        <Modal
            wide={false}
            title={record ? 'Edit Tithe' : 'Record Tithe'}
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
                        disabled={
                            !form.data.amount ||
                            (!form.data.member_id && !form.data.member_name)
                        }
                        label={record ? 'Save Changes' : 'Record Tithe'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <Field label="Member" error={form.errors.member_id}>
                    <MemberPicker
                        value={form.data.member_id}
                        label={form.data.member_name}
                        noneLabel="Not in the list (type the name below)"
                        onChange={(m) =>
                            form.setData((d) => ({
                                ...d,
                                member_id: m?.id ?? '',
                                member_name: m?.name ?? '',
                            }))
                        }
                    />
                </Field>
                {!form.data.member_id && (
                    <Field
                        label="Member Name (if not in list)"
                        error={form.errors.member_name}
                    >
                        <input
                            className={inputCls}
                            value={form.data.member_name}
                            onChange={(e) =>
                                form.setData('member_name', e.target.value)
                            }
                            placeholder="Full name"
                        />
                    </Field>
                )}
                <MoneyFields
                    form={form}
                    dateKey="tithe_date"
                    methods={methods}
                    funds={funds}
                />
            </div>
        </Modal>
    );
}
