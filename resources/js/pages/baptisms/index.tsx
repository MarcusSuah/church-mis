import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import MemberPicker from '@/components/ssbcms/MemberPicker';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import {
    Avatar,
    DeleteConfirm,
    EmptyState,
    Field,
    fmtDate,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    SearchBox,
    Toggle,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type Baptism = {
    id: string;
    member_id: string | null;
    candidate_name: string;
    candidate_photo: string | null;
    baptism_date: string;
    baptism_type: string;
    officiant: string | null;
    location: string | null;
    witnesses: string | null;
    certificate_number: string | null;
    certificate_issued: boolean;
    certificate_date: string | null;
    notes: string | null;
};

type Stats = {
    total: number;
    this_year: number;
    issued: number;
    pending: number;
};
type Props = {
    records: Baptism[];
    pagination: PageMeta;
    filters: { search: string; type: string; certificate: string };
    stats: Stats;
    focus: Baptism | null;
    types: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const TYPE_LABELS: Record<string, string> = {
    immersion: 'Immersion',
    sprinkling: 'Sprinkling',
    pouring: 'Pouring',
};
const TYPE_COLORS: Record<string, string> = {
    immersion: 'bg-primary/10 text-primary',
    sprinkling: 'bg-info/10 text-info',
    pouring: 'bg-accent/10 text-accent',
};

export default function Baptisms({
    records,
    pagination,
    filters,
    stats,
    focus,
    types,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Baptism | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const filtered = records;
    const thisYear = String(new Date().getFullYear());

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Baptism Records" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Baptism Records</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track baptism ceremonies and certificate issuance
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        Add Baptism Record
                    </button>
                )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    label="Total Baptisms"
                    value={stats.total}
                    icon="SparklesIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    label={`This Year (${thisYear})`}
                    value={stats.this_year}
                    icon="CalendarDaysIcon"
                    color="text-info"
                    bg="bg-info/10"
                />
                <Kpi
                    label="Certificates Issued"
                    value={stats.issued}
                    icon="DocumentCheckIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    label="Pending Certificates"
                    value={stats.pending}
                    icon="ClockIcon"
                    color="text-warning"
                    bg="bg-warning/10"
                />
            </div>

            <div className="card mb-4 p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <SearchBox
                        value={values.search}
                        onChange={(v) => set('search', v)}
                        placeholder="Search name, certificate..."
                    />
                    <select
                        value={values.type}
                        onChange={(e) => set('type', e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                        <option value="All">All Types</option>
                        {types.map((t) => (
                            <option key={t} value={t}>
                                {TYPE_LABELS[t] ?? t}
                            </option>
                        ))}
                    </select>
                    <select
                        value={values.certificate}
                        onChange={(e) => set('certificate', e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                        <option value="All">All Certificates</option>
                        <option value="Issued">Issued</option>
                        <option value="Pending">Pending</option>
                    </select>
                    <span className="ml-auto text-sm text-muted-foreground">
                        {pagination.total} record
                        {pagination.total !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="card overflow-hidden">
                {filtered.length === 0 ? (
                    <EmptyState
                        card={false}
                        icon="SparklesIcon"
                        title="No baptism records found"
                        text="Add the first baptism record to get started."
                    />
                ) : (
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {[
                                        'Candidate',
                                        'Date',
                                        'Type',
                                        'Officiant',
                                        'Location',
                                        'Certificate',
                                        'Actions',
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="transition-colors hover:bg-muted/20"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={r.candidate_photo}
                                                />
                                                <span className="text-sm font-medium text-foreground">
                                                    {r.candidate_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {fmtDate(r.baptism_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[r.baptism_type] ?? 'bg-muted text-muted-foreground'}`}
                                            >
                                                {TYPE_LABELS[r.baptism_type] ??
                                                    r.baptism_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {r.officiant || '—'}
                                        </td>
                                        <td className="max-w-[160px] truncate px-4 py-3 text-sm text-muted-foreground">
                                            {r.location || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-xs font-medium ${r.certificate_issued ? 'text-success' : 'text-warning'}`}
                                                >
                                                    <Icon
                                                        name={
                                                            r.certificate_issued
                                                                ? 'CheckCircleIcon'
                                                                : 'ClockIcon'
                                                        }
                                                        size={13}
                                                    />
                                                    {r.certificate_issued
                                                        ? 'Issued'
                                                        : 'Pending'}
                                                </span>
                                                {r.certificate_number && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {r.certificate_number}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {r.certificate_issued && (
                                                    <PdfButton
                                                        url={`/certificates/baptisms/${r.id}/pdf`}
                                                        title="Baptism certificate"
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success"
                                                    >
                                                        <Icon
                                                            name="DocumentArrowDownIcon"
                                                            size={14}
                                                        />
                                                    </PdfButton>
                                                )}
                                                {can.update && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditing(r)
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                        title="Edit"
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
                                                                `/baptisms/${r.id}`,
                                                            )
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                        title="Delete"
                                                    >
                                                        <Icon
                                                            name="TrashIcon"
                                                            size={14}
                                                        />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ServerPaginatorCard meta={pagination} />
            {editing && (
                <BaptismModal
                    record={editing === 'new' ? null : editing}
                    types={types}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Record?"
                message="This baptism record will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function BaptismModal({
    record,
    types,
    onClose,
}: {
    record: Baptism | null;
    types: string[];
    onClose: () => void;
}) {
    const form = useForm({
        member_id: record?.member_id ?? '',
        candidate_name: record?.candidate_name ?? '',
        candidate_photo: record?.candidate_photo ?? '',
        baptism_date:
            record?.baptism_date ?? new Date().toISOString().slice(0, 10),
        baptism_type: record?.baptism_type ?? 'immersion',
        officiant: record?.officiant ?? '',
        location: record?.location ?? '',
        witnesses: record?.witnesses ?? '',
        certificate_number: record?.certificate_number ?? '',
        certificate_issued: record?.certificate_issued ?? false,
        certificate_date: record?.certificate_date ?? '',
        notes: record?.notes ?? '',
    });

    const save = () => {
        const o = { preserveScroll: true, onSuccess: onClose };
        if (record) form.patch(`/baptisms/${record.id}`, o);
        else form.post('/baptisms', o);
    };

    return (
        <Modal
            title={record ? 'Edit Baptism Record' : 'Add Baptism Record'}
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
                            !form.data.candidate_name || !form.data.baptism_date
                        }
                        label={record ? 'Update Record' : 'Add Record'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Link to Member">
                    <MemberPicker
                        value={form.data.member_id}
                        label={form.data.candidate_name}
                        noneLabel="— Not a member / Guest —"
                        onChange={(m) =>
                            form.setData((d) => ({
                                ...d,
                                member_id: m?.id ?? '',
                                candidate_name: m ? m.name : d.candidate_name,
                                candidate_photo:
                                    m?.photo_url || d.candidate_photo,
                            }))
                        }
                    />
                </Field>
                <Field
                    label="Candidate Name *"
                    error={form.errors.candidate_name}
                >
                    <input
                        className={inputCls}
                        value={form.data.candidate_name}
                        onChange={(e) =>
                            form.setData('candidate_name', e.target.value)
                        }
                        placeholder="Full name"
                    />
                </Field>
                <Field label="Baptism Date *" error={form.errors.baptism_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.baptism_date}
                        onChange={(e) =>
                            form.setData('baptism_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="Baptism Type">
                    <select
                        className={inputCls}
                        value={form.data.baptism_type}
                        onChange={(e) =>
                            form.setData('baptism_type', e.target.value)
                        }
                    >
                        {types.map((t) => (
                            <option key={t} value={t}>
                                {TYPE_LABELS[t] ?? t}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Officiant">
                    <input
                        className={inputCls}
                        value={form.data.officiant}
                        onChange={(e) =>
                            form.setData('officiant', e.target.value)
                        }
                        placeholder="Pastor / Minister name"
                    />
                </Field>
                <Field label="Location">
                    <input
                        className={inputCls}
                        value={form.data.location}
                        onChange={(e) =>
                            form.setData('location', e.target.value)
                        }
                        placeholder="Baptismal pool, chapel..."
                    />
                </Field>
                <Field label="Witnesses" span>
                    <input
                        className={inputCls}
                        value={form.data.witnesses}
                        onChange={(e) =>
                            form.setData('witnesses', e.target.value)
                        }
                        placeholder="Names of witnesses"
                    />
                </Field>
                <Field label="Certificate Number">
                    <input
                        className={inputCls}
                        value={form.data.certificate_number}
                        onChange={(e) =>
                            form.setData('certificate_number', e.target.value)
                        }
                        placeholder="Left blank → numbered when issued"
                    />
                </Field>
                <Field label="Certificate Issued">
                    <Toggle
                        value={form.data.certificate_issued}
                        onChange={(v) => form.setData('certificate_issued', v)}
                    />
                </Field>
                {form.data.certificate_issued && (
                    <Field label="Certificate Date">
                        <input
                            type="date"
                            className={inputCls}
                            value={form.data.certificate_date}
                            onChange={(e) =>
                                form.setData('certificate_date', e.target.value)
                            }
                        />
                    </Field>
                )}
                <div className="sm:col-span-2">
                    <ImageUploadField
                        label="Photo"
                        value={form.data.candidate_photo}
                        onChange={(url) => form.setData('candidate_photo', url)}
                        variant="avatar"
                    />
                </div>
                <Field label="Notes" span>
                    <textarea
                        rows={3}
                        className={`${inputCls} resize-none`}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        placeholder="Additional notes..."
                    />
                </Field>
            </div>
        </Modal>
    );
}
