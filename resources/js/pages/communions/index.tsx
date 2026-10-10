import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import {
    Banner,
    DeleteConfirm,
    EmptyState,
    Field,
    fmtDate,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    SearchBox,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type Communion = {
    id: string;
    service_date: string;
    service_name: string;
    officiant: string | null;
    location: string | null;
    attendance_count: number;
    elements_used: string | null;
    scripture_reference: string | null;
    notes: string | null;
    banner_image: string | null;
};

type Stats = {
    total: number;
    this_year: number;
    participants: number;
    average: number;
};
type Props = {
    records: Communion[];
    pagination: PageMeta;
    filters: { search: string };
    stats: Stats;
    focus: Communion | null;
    can: { create: boolean; update: boolean; delete: boolean };
};

export default function Communions({
    records,
    pagination,
    filters,
    stats,
    focus,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Communion | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const filtered = records;
    const thisYear = String(new Date().getFullYear());

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Communion Services" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Communion Services</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Record and manage Holy Communion observances
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        Add Communion Service
                    </button>
                )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    label="Total Services"
                    value={stats.total}
                    icon="BookOpenIcon"
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
                    label="Total Attendance"
                    value={stats.participants.toLocaleString()}
                    icon="UsersIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    label="Avg Attendance"
                    value={stats.average}
                    icon="ChartBarIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
            </div>

            <div className="card mb-4 p-4">
                <SearchBox
                    value={values.search}
                    onChange={(v) => set('search', v)}
                    placeholder="Search service, officiant, scripture..."
                    className="max-w-sm"
                />
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon="BookOpenIcon"
                    title="No communion services found"
                    text="Add the first communion service record."
                />
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((r) => (
                        <div
                            key={r.id}
                            className="card overflow-hidden transition-shadow hover:shadow-lg"
                        >
                            <Banner
                                src={r.banner_image}
                                alt={`Banner for ${r.service_name} communion service`}
                            />
                            <div className="p-4">
                                <div className="mb-2 flex items-start justify-between gap-2">
                                    <h3 className="text-sm leading-snug font-semibold text-foreground">
                                        {r.service_name}
                                    </h3>
                                    <div className="flex shrink-0 items-center gap-1">
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
                                                        `/communions/${r.id}`,
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
                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <Icon
                                            name="CalendarDaysIcon"
                                            size={13}
                                            className="shrink-0 text-primary"
                                        />
                                        <span>
                                            {fmtDate(r.service_date, 'long')}
                                        </span>
                                    </div>
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
                                    {r.scripture_reference && (
                                        <div className="flex items-center gap-1.5">
                                            <Icon
                                                name="BookOpenIcon"
                                                size={13}
                                                className="shrink-0 text-primary"
                                            />
                                            <span className="italic">
                                                {r.scripture_reference}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                                    <div className="flex items-center gap-1.5">
                                        <Icon
                                            name="UsersIcon"
                                            size={14}
                                            className="text-success"
                                        />
                                        <span className="text-sm font-semibold text-foreground">
                                            {r.attendance_count.toLocaleString()}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            participants
                                        </span>
                                    </div>
                                    {r.elements_used && (
                                        <span className="max-w-[120px] truncate text-xs text-muted-foreground">
                                            {r.elements_used}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ServerPaginatorCard meta={pagination} />
            {editing && (
                <CommunionModal
                    record={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Service?"
                message="This communion service record will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function CommunionModal({
    record,
    onClose,
}: {
    record: Communion | null;
    onClose: () => void;
}) {
    const form = useForm({
        service_date:
            record?.service_date ?? new Date().toISOString().slice(0, 10),
        service_name: record?.service_name ?? '',
        officiant: record?.officiant ?? '',
        location: record?.location ?? '',
        attendance_count: record ? String(record.attendance_count) : '',
        elements_used: record?.elements_used ?? 'Bread and Grape Juice',
        scripture_reference: record?.scripture_reference ?? '',
        notes: record?.notes ?? '',
        banner_image: record?.banner_image ?? '',
    });

    const save = () => {
        const o = { preserveScroll: true, onSuccess: onClose };
        if (record) form.patch(`/communions/${record.id}`, o);
        else form.post('/communions', o);
    };

    return (
        <Modal
            title={record ? 'Edit Communion Service' : 'Add Communion Service'}
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
                            !form.data.service_name || !form.data.service_date
                        }
                        label={record ? 'Update Service' : 'Add Service'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                    label="Service Name *"
                    error={form.errors.service_name}
                    span
                >
                    <input
                        className={inputCls}
                        value={form.data.service_name}
                        onChange={(e) =>
                            form.setData('service_name', e.target.value)
                        }
                        placeholder="e.g. First Sunday Communion"
                    />
                </Field>
                <Field label="Service Date *" error={form.errors.service_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.service_date}
                        onChange={(e) =>
                            form.setData('service_date', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Attendance Count"
                    error={form.errors.attendance_count}
                >
                    <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={form.data.attendance_count}
                        onChange={(e) =>
                            form.setData('attendance_count', e.target.value)
                        }
                        placeholder="0"
                    />
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
                        placeholder="Main Sanctuary..."
                    />
                </Field>
                <Field label="Elements Used">
                    <input
                        className={inputCls}
                        value={form.data.elements_used}
                        onChange={(e) =>
                            form.setData('elements_used', e.target.value)
                        }
                        placeholder="Bread and Grape Juice"
                    />
                </Field>
                <Field label="Scripture Reference">
                    <input
                        className={inputCls}
                        value={form.data.scripture_reference}
                        onChange={(e) =>
                            form.setData('scripture_reference', e.target.value)
                        }
                        placeholder="1 Corinthians 11:23-26"
                    />
                </Field>
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
