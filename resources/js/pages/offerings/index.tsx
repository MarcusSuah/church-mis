import { Head, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import type { Can, Opt } from '@/components/finance/shared';
import {
    AmountCell,
    FilterBar,
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
import Icon from '@/components/ssbcms/AppIcon';
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
import {
    fmtCompact,
    fmtMoney,
    METHOD_LABELS,
    useCurrency,
    useMoney,
} from '@/lib/finance';

type Offering = {
    id: string;
    member_id: string | null;
    member_name: string;
    member_photo: string | null;
    offering_type: string;
    service_type: string;
    amount: number;
    currency: string;
    payment_method: string;
    fund_id: string | null;
    fund_name: string;
    reference_number: string | null;
    receipt_number: string | null;
    offering_date: string;
    notes: string | null;
    is_collection: boolean;
    counted_by: string | null;
    verified_by: string | null;
};

type Lists = {
    funds: Opt[];
    methods: string[];
    types: string[];
    services: string[];
    cashiers: string[];
};
type Stats = {
    this_month: number;
    collections_this_month: number;
    average_collection: number;
    filtered_total: number;
    chart: { date: string; total: number; services: string[] }[];
};
type Props = Lists & {
    records: Offering[];
    pagination: PageMeta;
    filters: { search: string; type: string; kind: string };
    stats: Stats;
    focus: Offering | null;
    can: Can;
};

const TYPE_COLORS: Record<string, string> = {
    'Regular Offering': 'bg-success/10 text-success',
    'Building Fund Offering': 'bg-primary/10 text-primary',
    'Special Offering': 'bg-accent/10 text-accent',
    'Welfare Offering': 'bg-info/10 text-info',
    'Missions Offering': 'bg-warning/10 text-warning',
    'Youth Offering': 'bg-purple-500/10 text-purple-600',
};

type Editing = { record: Offering | null; collection: boolean } | null;

export default function Offerings({
    records,
    pagination,
    filters,
    stats,
    focus,
    can,
    ...lists
}: Props) {
    const c = useCurrency();
    const { equiv } = useMoney();
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Editing>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(
        records,
        (r) =>
            setEditing(
                r === 'new'
                    ? { record: null, collection: true }
                    : { record: r, collection: r.is_collection },
            ),
        focus,
    );

    const total = stats.filtered_total;
    // Basket collections on the last 10 service days — aggregated by the server.
    const chart = useMemo(
        () =>
            stats.chart.map((r) => ({
                ...r,
                label: new Date(`${r.date}T00:00:00`).toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric' },
                ),
            })),
        [stats.chart],
    );

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Offerings" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Offerings</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Record each service's basket collection, plus any
                        offering given by a named member
                    </p>
                </div>
                {can.create && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setEditing({ record: null, collection: false })
                            }
                            className="btn-outline text-sm"
                        >
                            <Icon name="UserIcon" size={16} />
                            Individual Offering
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setEditing({ record: null, collection: true })
                            }
                            className="btn-primary text-sm"
                        >
                            <Icon name="PlusIcon" size={16} />
                            Record Service Collection
                        </button>
                    </div>
                )}
            </div>
            <MoneyKpis
                items={[
                    {
                        label: 'This Month',
                        value: (
                            <>
                                {fmtMoney(stats.this_month, c)}
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {equiv(stats.this_month)}
                                </span>
                            </>
                        ),
                        icon: 'CalendarDaysIcon',
                        color: 'text-success',
                        bg: 'bg-success/10',
                    },
                    {
                        label: 'Collections This Month',
                        value: fmtMoney(stats.collections_this_month, c),
                        icon: 'InboxStackIcon',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                    },
                    {
                        label: 'Avg per Collection',
                        value: fmtMoney(stats.average_collection, c, 0),
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

            {chart.length > 0 && (
                <div className="card mb-4 p-5">
                    <div className="mb-3 flex items-center justify-between">
                        <div>
                            <h2 className="section-header">
                                Service Collections
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Basket totals per service day ({c}) — last{' '}
                                {chart.length}
                            </p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart
                            data={chart}
                            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                            barSize={22}
                        >
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="var(--color-border)"
                                vertical={false}
                            />
                            <XAxis
                                dataKey="label"
                                tick={{
                                    fontSize: 11,
                                    fill: 'var(--color-muted-foreground)',
                                }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                width={56}
                                tickFormatter={(v: number) => fmtCompact(v, c)}
                                tick={{
                                    fontSize: 11,
                                    fill: 'var(--color-muted-foreground)',
                                }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length)
                                        return null;
                                    const r = payload[0]
                                        .payload as (typeof chart)[number];
                                    return (
                                        <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-elevated">
                                            <p className="font-semibold text-foreground">
                                                {fmtD(r.date)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {r.services.join(', ')}
                                            </p>
                                            <p className="font-semibold tabular-nums">
                                                {fmtMoney(r.total, c)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {equiv(r.total)}
                                            </p>
                                        </div>
                                    );
                                }}
                            />
                            <Bar
                                dataKey="total"
                                fill="var(--color-primary)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <FilterBar total={total}>
                <SearchInput
                    value={values.search}
                    onChange={(v) => set('search', v)}
                    placeholder="Search name, receipt, cashier..."
                />
                <select
                    value={values.kind}
                    onChange={(e) => set('kind', e.target.value)}
                    className={selectCls}
                >
                    <option value="All">All Offerings</option>
                    <option value="Collections">Service Collections</option>
                    <option value="Individual">Individual</option>
                </select>
                <select
                    value={values.type}
                    onChange={(e) => set('type', e.target.value)}
                    className={selectCls}
                >
                    <option value="All">All Types</option>
                    {lists.types.map((t) => (
                        <option key={t}>{t}</option>
                    ))}
                </select>
            </FilterBar>
            <RecordsTable
                rows={records}
                pagination={pagination}
                headers={[
                    'Given by',
                    'Type',
                    'Date',
                    'Service',
                    'Amount',
                    'Method',
                    'Fund',
                    'Receipt',
                    '',
                ]}
                emptyIcon="HeartIcon"
                emptyText="No offerings found"
                render={(o) => (
                    <tr key={o.id} className="group table-row">
                        <td className="table-cell">
                            {o.is_collection ? (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                        <Icon
                                            name="InboxStackIcon"
                                            size={15}
                                            className="text-primary"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-foreground">
                                            Basket collection
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Counted by {o.counted_by || '—'}
                                            {o.verified_by
                                                ? ` · verified by ${o.verified_by}`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <MemberCell
                                    name={o.member_name}
                                    photo={o.member_photo}
                                />
                            )}
                        </td>
                        <td className="table-cell">
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_COLORS[o.offering_type] ?? 'bg-muted text-muted-foreground'}`}
                            >
                                {o.offering_type}
                            </span>
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {fmtD(o.offering_date)}
                        </td>
                        <td className="table-cell text-xs text-muted-foreground">
                            {o.service_type}
                        </td>
                        <AmountCell amount={o.amount} currency={o.currency} />
                        <td className="table-cell">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {METHOD_LABELS[o.payment_method] ??
                                    o.payment_method}
                            </span>
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {o.fund_name}
                        </td>
                        <td className="table-cell font-mono text-xs text-accent">
                            {o.receipt_number || '—'}
                        </td>
                        <td className="table-cell text-right">
                            <RowActions
                                can={can}
                                receiptId={
                                    o.is_collection
                                        ? undefined
                                        : `offering:${o.id}`
                                }
                                onEdit={() =>
                                    setEditing({
                                        record: o,
                                        collection: o.is_collection,
                                    })
                                }
                                onDelete={() =>
                                    setDeleteUrl(`/offerings/${o.id}`)
                                }
                            />
                        </td>
                    </tr>
                )}
            />
            {editing && (
                <OfferingModal
                    record={editing.record}
                    collection={editing.collection}
                    lists={lists}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Offering Record"
                message="This action cannot be undone."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function OfferingModal({
    record,
    collection,
    lists,
    onClose,
}: {
    record: Offering | null;
    collection: boolean;
    lists: Lists;
    onClose: () => void;
}) {
    const base = useCurrency();
    const form = useForm({
        is_collection: collection,
        member_id: record?.member_id ?? '',
        member_name: collection ? '' : (record?.member_name ?? ''),
        offering_type: record?.offering_type ?? 'Regular Offering',
        service_type: record?.service_type ?? 'Sunday Worship',
        amount: record ? String(record.amount) : '',
        currency: record?.currency ?? base,
        payment_method: record?.payment_method ?? 'cash',
        fund_id: record?.fund_id ?? '',
        reference_number: record?.reference_number ?? '',
        receipt_number: record?.receipt_number ?? '',
        offering_date: record?.offering_date ?? today(),
        notes: record?.notes ?? '',
        counted_by: record?.counted_by ?? '',
        verified_by: record?.verified_by ?? '',
    });
    const save = () =>
        record
            ? form.patch(`/offerings/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/offerings', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });
    const isCol = form.data.is_collection;

    return (
        <Modal
            wide={false}
            title={
                record
                    ? 'Edit Offering'
                    : isCol
                      ? 'Record Service Collection'
                      : 'Record Individual Offering'
            }
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
                            (isCol && !form.data.counted_by)
                        }
                        label={
                            record
                                ? 'Save Changes'
                                : isCol
                                  ? 'Save Collection'
                                  : 'Record Offering'
                        }
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-1">
                    {[
                        [true, 'Basket collection', 'InboxStackIcon'],
                        [false, 'Named member', 'UserIcon'],
                    ].map(([v, l, icon]) => (
                        <button
                            key={String(v)}
                            type="button"
                            onClick={() =>
                                form.setData('is_collection', v as boolean)
                            }
                            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isCol === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                            <Icon name={icon as string} size={15} />
                            {l as string}
                        </button>
                    ))}
                </div>

                {isCol ? (
                    <p className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-3 text-xs text-info">
                        <Icon
                            name="InformationCircleIcon"
                            size={14}
                            className="mt-0.5 shrink-0"
                        />
                        Enter the total counted from the basket after the
                        service. It is counted in giving totals and charts, but
                        not linked to any one member.
                    </p>
                ) : (
                    <>
                        <Field label="Member">
                            <MemberPicker
                                value={form.data.member_id}
                                label={form.data.member_name}
                                noneLabel="Not a member (type the name below)"
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
                            <Field label="Name (if not a member)">
                                <input
                                    className={inputCls}
                                    value={form.data.member_name}
                                    onChange={(e) =>
                                        form.setData(
                                            'member_name',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Full name"
                                />
                            </Field>
                        )}
                    </>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Field label="Service" error={form.errors.service_type}>
                        <select
                            className={inputCls}
                            value={form.data.service_type}
                            onChange={(e) =>
                                form.setData('service_type', e.target.value)
                            }
                        >
                            {lists.services.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Offering Type">
                        <select
                            className={inputCls}
                            value={form.data.offering_type}
                            onChange={(e) =>
                                form.setData('offering_type', e.target.value)
                            }
                        >
                            {lists.types.map((t) => (
                                <option key={t}>{t}</option>
                            ))}
                        </select>
                    </Field>
                </div>

                {isCol && (
                    <div className="grid grid-cols-2 gap-4">
                        <Field
                            label="Counted by (cashier) *"
                            error={form.errors.counted_by}
                        >
                            <input
                                list="cashiers"
                                className={inputCls}
                                value={form.data.counted_by}
                                onChange={(e) =>
                                    form.setData('counted_by', e.target.value)
                                }
                                placeholder="Name"
                            />
                        </Field>
                        <Field
                            label="Verified by"
                            error={form.errors.verified_by}
                        >
                            <input
                                list="cashiers"
                                className={inputCls}
                                value={form.data.verified_by}
                                onChange={(e) =>
                                    form.setData('verified_by', e.target.value)
                                }
                                placeholder="Second counter"
                            />
                        </Field>
                        <datalist id="cashiers">
                            {lists.cashiers.map((n) => (
                                <option key={n} value={n} />
                            ))}
                        </datalist>
                    </div>
                )}

                <MoneyFields
                    form={form}
                    dateKey="offering_date"
                    methods={lists.methods}
                    funds={lists.funds}
                    receipt={!isCol}
                />
            </div>
        </Modal>
    );
}
