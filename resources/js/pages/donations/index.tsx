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
import { fmtMoney, METHOD_LABELS, useCurrency } from '@/lib/finance';

type Donation = {
    id: string;
    member_id: string | null;
    donor_name: string;
    donor_email: string | null;
    donor_phone: string | null;
    is_anonymous: boolean;
    is_recurring: boolean;
    purpose: string | null;
    amount: number;
    currency: string;
    payment_method: string;
    fund_id: string | null;
    fund_name: string;
    reference_number: string | null;
    receipt_number: string | null;
    donation_date: string;
    notes: string | null;
};

type Lists = { funds: Opt[]; methods: string[] };
type Stats = {
    this_month: number;
    donors: number;
    recurring: number;
    filtered_total: number;
};
type Props = Lists & {
    records: Donation[];
    pagination: PageMeta;
    filters: { search: string; recurring: string };
    stats: Stats;
    focus: Donation | null;
    can: Can;
};

export default function Donations({
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
    const [editing, setEditing] = useState<Donation | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const total = stats.filtered_total;

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Donations" />
            <FinancePageHeader
                title="Donations"
                subtitle="Manage one-time and recurring donations from members and external donors"
                action="Record Donation"
                onAction={() => setEditing('new')}
                canCreate={can.create}
            />
            <MoneyKpis
                items={[
                    {
                        label: 'This Month',
                        value: fmtMoney(stats.this_month, c),
                        icon: 'CalendarDaysIcon',
                        color: 'text-info',
                        bg: 'bg-info/10',
                    },
                    {
                        label: 'Total Donors',
                        value: stats.donors,
                        icon: 'UsersIcon',
                        color: 'text-primary',
                        bg: 'bg-primary/10',
                    },
                    {
                        label: 'Recurring',
                        value: stats.recurring,
                        icon: 'ArrowPathIcon',
                        color: 'text-success',
                        bg: 'bg-success/10',
                    },
                    {
                        label: 'Filtered Total',
                        value: fmtMoney(total, c),
                        icon: 'BanknotesIcon',
                        color: 'text-accent',
                        bg: 'bg-accent/10',
                    },
                ]}
            />
            <FilterBar total={total}>
                <SearchInput
                    value={values.search}
                    onChange={(v) => set('search', v)}
                    placeholder="Search donor, purpose..."
                />
                <select
                    value={values.recurring}
                    onChange={(e) => set('recurring', e.target.value)}
                    className={selectCls}
                >
                    <option value="All">All Donations</option>
                    <option value="Recurring">Recurring Only</option>
                    <option value="One-time">One-time Only</option>
                </select>
            </FilterBar>
            <RecordsTable
                rows={records}
                pagination={pagination}
                headers={[
                    'Donor',
                    'Date',
                    'Amount',
                    'Purpose',
                    'Method',
                    'Fund',
                    'Type',
                    'Receipt',
                    '',
                ]}
                emptyIcon="GiftIcon"
                emptyText="No donations found"
                render={(d) => (
                    <tr key={d.id} className="group table-row">
                        <td className="table-cell">
                            {d.is_anonymous ? (
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                        <Icon
                                            name="UserIcon"
                                            size={14}
                                            className="text-muted-foreground"
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-foreground">
                                        {d.donor_name}
                                    </span>
                                </div>
                            ) : (
                                <MemberCell
                                    name={d.donor_name}
                                    sub={d.donor_email}
                                />
                            )}
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {fmtD(d.donation_date)}
                        </td>
                        <AmountCell amount={d.amount} currency={d.currency} />
                        <td
                            className="table-cell max-w-[160px] truncate text-sm text-muted-foreground"
                            title={d.purpose ?? ''}
                        >
                            {d.purpose || '—'}
                        </td>
                        <td className="table-cell">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                {METHOD_LABELS[d.payment_method] ??
                                    d.payment_method}
                            </span>
                        </td>
                        <td className="table-cell text-sm text-muted-foreground">
                            {d.fund_name}
                        </td>
                        <td className="table-cell">
                            {d.is_recurring ? (
                                <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                                    Recurring
                                </span>
                            ) : (
                                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    One-time
                                </span>
                            )}
                        </td>
                        <td className="table-cell font-mono text-xs text-accent">
                            {d.receipt_number || '—'}
                        </td>
                        <td className="table-cell text-right">
                            <RowActions
                                can={can}
                                receiptId={`donation:${d.id}`}
                                onEdit={() => setEditing(d)}
                                onDelete={() =>
                                    setDeleteUrl(`/donations/${d.id}`)
                                }
                            />
                        </td>
                    </tr>
                )}
            />
            {editing && (
                <DonationModal
                    record={editing === 'new' ? null : editing}
                    lists={lists}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Donation Record"
                message="This action cannot be undone."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function DonationModal({
    record,
    lists,
    onClose,
}: {
    record: Donation | null;
    lists: Lists;
    onClose: () => void;
}) {
    const base = useCurrency();
    const form = useForm({
        is_anonymous: record?.is_anonymous ?? false,
        member_id: record?.member_id ?? '',
        donor_name: record?.is_anonymous ? '' : (record?.donor_name ?? ''),
        donor_email: record?.donor_email ?? '',
        donor_phone: record?.donor_phone ?? '',
        amount: record ? String(record.amount) : '',
        currency: record?.currency ?? base,
        donation_date: record?.donation_date ?? today(),
        purpose: record?.purpose ?? '',
        payment_method: record?.payment_method ?? 'cash',
        fund_id: record?.fund_id ?? '',
        reference_number: record?.reference_number ?? '',
        receipt_number: record?.receipt_number ?? '',
        is_recurring: record?.is_recurring ?? false,
        notes: record?.notes ?? '',
    });
    const save = () =>
        record
            ? form.patch(`/donations/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/donations', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });

    return (
        <Modal
            wide={false}
            title={record ? 'Edit Donation' : 'Record Donation'}
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
                            (!form.data.is_anonymous && !form.data.donor_name)
                        }
                        label={record ? 'Save Changes' : 'Record Donation'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <input
                        type="checkbox"
                        checked={form.data.is_anonymous}
                        onChange={(e) =>
                            form.setData('is_anonymous', e.target.checked)
                        }
                        className="rounded border-border"
                    />
                    <span className="text-sm font-medium text-foreground">
                        Anonymous Donation
                    </span>
                </label>
                {!form.data.is_anonymous && (
                    <>
                        <Field label="Link to Member">
                            <MemberPicker
                                value={form.data.member_id}
                                label={form.data.donor_name}
                                noneLabel="External donor (not a member)"
                                onChange={(m) =>
                                    form.setData((d) => ({
                                        ...d,
                                        member_id: m?.id ?? '',
                                        donor_name: m ? m.name : d.donor_name,
                                    }))
                                }
                            />
                        </Field>
                        <Field
                            label="Donor Name *"
                            error={form.errors.donor_name}
                        >
                            <input
                                className={inputCls}
                                value={form.data.donor_name}
                                onChange={(e) =>
                                    form.setData('donor_name', e.target.value)
                                }
                                placeholder="Full name"
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field
                                label="Email"
                                error={form.errors.donor_email}
                            >
                                <input
                                    type="email"
                                    className={inputCls}
                                    value={form.data.donor_email}
                                    onChange={(e) =>
                                        form.setData(
                                            'donor_email',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="email@example.com"
                                />
                            </Field>
                            <Field label="Phone">
                                <input
                                    className={inputCls}
                                    value={form.data.donor_phone}
                                    onChange={(e) =>
                                        form.setData(
                                            'donor_phone',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="+250 788 000 000"
                                />
                            </Field>
                        </div>
                    </>
                )}
                <Field label="Purpose">
                    <input
                        className={inputCls}
                        value={form.data.purpose}
                        onChange={(e) =>
                            form.setData('purpose', e.target.value)
                        }
                        placeholder="e.g. Building fund, Community outreach..."
                    />
                </Field>
                <MoneyFields
                    form={form}
                    dateKey="donation_date"
                    methods={lists.methods}
                    funds={lists.funds}
                />
                <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-muted/50 p-3">
                    <input
                        type="checkbox"
                        checked={form.data.is_recurring}
                        onChange={(e) =>
                            form.setData('is_recurring', e.target.checked)
                        }
                        className="rounded border-border"
                    />
                    <span className="text-sm font-medium text-foreground">
                        Recurring Donation
                    </span>
                </label>
            </div>
        </Modal>
    );
}
