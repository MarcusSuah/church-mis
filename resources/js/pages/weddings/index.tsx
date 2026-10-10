import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import MemberPicker from '@/components/ssbcms/MemberPicker';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import {
    DeleteConfirm,
    EmptyState,
    Field,
    fmtDate,
    fmtTime,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    SearchBox,
    Toggle,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type Wedding = {
    id: string;
    groom_name: string;
    bride_name: string;
    groom_member_id: string | null;
    bride_member_id: string | null;
    wedding_date: string;
    wedding_time: string | null;
    location: string | null;
    officiant: string | null;
    witnesses: string | null;
    reception_venue: string | null;
    certificate_number: string | null;
    certificate_issued: boolean;
    certificate_date: string | null;
    banner_image: string | null;
    status: string;
    notes: string | null;
};

type Stats = {
    total: number;
    scheduled: number;
    completed: number;
    issued: number;
};
type Props = {
    records: Wedding[];
    pagination: PageMeta;
    filters: { search: string; status: string; certificate: string };
    stats: Stats;
    focus: Wedding | null;
    statuses: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
    postponed: 'Postponed',
};
const STATUS_COLORS: Record<string, string> = {
    scheduled: 'bg-info/10 text-info',
    completed: 'bg-success/10 text-success',
    cancelled: 'bg-danger/10 text-danger',
    postponed: 'bg-warning/10 text-warning',
};

function StatusPill({
    status,
    onPhoto = false,
}: {
    status: string;
    onPhoto?: boolean;
}) {
    return (
        <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${onPhoto ? 'bg-white/90 ' : ''}${STATUS_COLORS[status] ?? 'bg-muted text-muted-foreground'}`}
        >
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}

function WeddingBanner({ r }: { r: Wedding }) {
    const [failed, setFailed] = useState(false);
    if (!r.banner_image || failed) return null;
    return (
        <div className="relative h-36 overflow-hidden">
            <img
                src={r.banner_image}
                alt={`Wedding banner for ${r.groom_name} and ${r.bride_name}`}
                className="h-full w-full object-cover"
                onError={() => setFailed(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute right-3 bottom-2 left-3 flex items-end justify-between gap-2">
                <p className="text-sm font-bold text-white drop-shadow">
                    {r.groom_name} & {r.bride_name}
                </p>
                <StatusPill status={r.status} onPhoto />
            </div>
        </div>
    );
}

export default function Weddings({
    records,
    pagination,
    filters,
    stats,
    focus,
    statuses,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Wedding | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const filtered = records;

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Wedding Records" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Wedding Records</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage wedding ceremonies and marriage certificates
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        Add Wedding Record
                    </button>
                )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    label="Total Weddings"
                    value={stats.total}
                    icon="HeartIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    label="Scheduled"
                    value={stats.scheduled}
                    icon="CalendarDaysIcon"
                    color="text-info"
                    bg="bg-info/10"
                />
                <Kpi
                    label="Completed"
                    value={stats.completed}
                    icon="CheckCircleIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    label="Certificates Issued"
                    value={stats.issued}
                    icon="DocumentCheckIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
            </div>

            <div className="card mb-4 p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <SearchBox
                        value={values.search}
                        onChange={(v) => set('search', v)}
                        placeholder="Search names, certificate..."
                    />
                    <select
                        value={values.status}
                        onChange={(e) => set('status', e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                        <option value="All">All Statuses</option>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABELS[s] ?? s}
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

            {filtered.length === 0 ? (
                <EmptyState
                    icon="HeartIcon"
                    title="No wedding records found"
                    text="Add the first wedding record to get started."
                />
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((r) => (
                        <div
                            key={r.id}
                            className="card overflow-hidden transition-shadow hover:shadow-lg"
                        >
                            <WeddingBanner r={r} />
                            <div className="p-4">
                                {!r.banner_image && (
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <h3 className="text-sm font-semibold text-foreground">
                                            {r.groom_name} & {r.bride_name}
                                        </h3>
                                        <StatusPill status={r.status} />
                                    </div>
                                )}
                                <div className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Icon
                                            name="CalendarDaysIcon"
                                            size={13}
                                            className="shrink-0 text-primary"
                                        />
                                        <span>
                                            {fmtDate(r.wedding_date, 'long')}
                                            {r.wedding_time
                                                ? ` at ${fmtTime(r.wedding_time)}`
                                                : ''}
                                        </span>
                                    </div>
                                    {r.location && (
                                        <div className="flex items-center gap-1.5">
                                            <Icon
                                                name="MapPinIcon"
                                                size={13}
                                                className="shrink-0 text-primary"
                                            />
                                            <span>{r.location}</span>
                                        </div>
                                    )}
                                    {r.officiant && (
                                        <div className="flex items-center gap-1.5">
                                            <Icon
                                                name="UserIcon"
                                                size={13}
                                                className="shrink-0 text-primary"
                                            />
                                            <span>{r.officiant}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <Icon
                                            name={
                                                r.certificate_issued
                                                    ? 'DocumentCheckIcon'
                                                    : 'ClockIcon'
                                            }
                                            size={13}
                                            className={
                                                r.certificate_issued
                                                    ? 'text-success'
                                                    : 'text-warning'
                                            }
                                        />
                                        <span
                                            className={`text-xs font-medium ${r.certificate_issued ? 'text-success' : 'text-warning'}`}
                                        >
                                            {r.certificate_issued
                                                ? 'Certificate Issued'
                                                : 'Certificate Pending'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {r.certificate_issued && (
                                            <PdfButton
                                                url={`/certificates/weddings/${r.id}/pdf`}
                                                title="Marriage certificate"
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success"
                                            >
                                                <Icon
                                                    name="DocumentArrowDownIcon"
                                                    size={13}
                                                />
                                            </PdfButton>
                                        )}
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(r)}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                aria-label="Edit"
                                            >
                                                <Icon
                                                    name="PencilIcon"
                                                    size={13}
                                                />
                                            </button>
                                        )}
                                        {can.delete && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDeleteUrl(
                                                        `/weddings/${r.id}`,
                                                    )
                                                }
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                aria-label="Delete"
                                            >
                                                <Icon
                                                    name="TrashIcon"
                                                    size={13}
                                                />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ServerPaginatorCard meta={pagination} />
            {editing && (
                <WeddingModal
                    record={editing === 'new' ? null : editing}
                    statuses={statuses}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Wedding Record?"
                message="This wedding record will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function WeddingModal({
    record,
    statuses,
    onClose,
}: {
    record: Wedding | null;
    statuses: string[];
    onClose: () => void;
}) {
    const form = useForm({
        groom_name: record?.groom_name ?? '',
        bride_name: record?.bride_name ?? '',
        groom_member_id: record?.groom_member_id ?? '',
        bride_member_id: record?.bride_member_id ?? '',
        wedding_date:
            record?.wedding_date ?? new Date().toISOString().slice(0, 10),
        wedding_time: record?.wedding_time ?? '',
        location: record?.location ?? '',
        officiant: record?.officiant ?? '',
        witnesses: record?.witnesses ?? '',
        reception_venue: record?.reception_venue ?? '',
        certificate_number: record?.certificate_number ?? '',
        certificate_issued: record?.certificate_issued ?? false,
        certificate_date: record?.certificate_date ?? '',
        banner_image: record?.banner_image ?? '',
        status: record?.status ?? 'scheduled',
        notes: record?.notes ?? '',
    });

    const save = () => {
        const o = { preserveScroll: true, onSuccess: onClose };
        if (record) form.patch(`/weddings/${record.id}`, o);
        else form.post('/weddings', o);
    };

    const memberSelect = (
        k: 'groom_member_id' | 'bride_member_id',
        nameKey: 'groom_name' | 'bride_name',
    ) => (
        <MemberPicker
            value={form.data[k]}
            label={form.data[nameKey]}
            noneLabel="— Not a member —"
            onChange={(m) =>
                form.setData((d) => ({
                    ...d,
                    [k]: m?.id ?? '',
                    [nameKey]: m ? m.name : d[nameKey],
                }))
            }
        />
    );

    return (
        <Modal
            title={record ? 'Edit Wedding Record' : 'Add Wedding Record'}
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
                            !form.data.groom_name ||
                            !form.data.bride_name ||
                            !form.data.wedding_date
                        }
                        label={record ? 'Update Record' : 'Add Record'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Groom Name *" error={form.errors.groom_name}>
                    <input
                        className={inputCls}
                        value={form.data.groom_name}
                        onChange={(e) =>
                            form.setData('groom_name', e.target.value)
                        }
                        placeholder="Full name"
                    />
                </Field>
                <Field label="Bride Name *" error={form.errors.bride_name}>
                    <input
                        className={inputCls}
                        value={form.data.bride_name}
                        onChange={(e) =>
                            form.setData('bride_name', e.target.value)
                        }
                        placeholder="Full name"
                    />
                </Field>
                <Field label="Groom (Member)">
                    {memberSelect('groom_member_id', 'groom_name')}
                </Field>
                <Field label="Bride (Member)">
                    {memberSelect('bride_member_id', 'bride_name')}
                </Field>
                <Field label="Wedding Date *" error={form.errors.wedding_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.wedding_date}
                        onChange={(e) =>
                            form.setData('wedding_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="Wedding Time" error={form.errors.wedding_time}>
                    <input
                        type="time"
                        className={inputCls}
                        value={form.data.wedding_time}
                        onChange={(e) =>
                            form.setData('wedding_time', e.target.value)
                        }
                    />
                </Field>
                <Field label="Status">
                    <select
                        className={inputCls}
                        value={form.data.status}
                        onChange={(e) => form.setData('status', e.target.value)}
                    >
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {STATUS_LABELS[s] ?? s}
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
                <Field label="Ceremony Location">
                    <input
                        className={inputCls}
                        value={form.data.location}
                        onChange={(e) =>
                            form.setData('location', e.target.value)
                        }
                        placeholder="Main Sanctuary..."
                    />
                </Field>
                <Field label="Reception Venue">
                    <input
                        className={inputCls}
                        value={form.data.reception_venue}
                        onChange={(e) =>
                            form.setData('reception_venue', e.target.value)
                        }
                        placeholder="Reception hall..."
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
                        label="Banner Image"
                        value={form.data.banner_image}
                        onChange={(url) => form.setData('banner_image', url)}
                        variant="banner"
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
