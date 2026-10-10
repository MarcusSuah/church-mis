import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import MemberPicker from '@/components/ssbcms/MemberPicker';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import {
    Avatar,
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
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type Funeral = {
    id: string;
    member_id: string | null;
    deceased_name: string;
    deceased_photo: string | null;
    date_of_death: string | null;
    funeral_date: string;
    funeral_time: string | null;
    location: string | null;
    burial_location: string | null;
    officiant: string | null;
    eulogy_by: string | null;
    family_contact: string | null;
    family_phone: string | null;
    banner_image: string | null;
    notes: string | null;
};

type Stats = {
    total: number;
    this_year: number;
    with_contact: number;
    with_burial: number;
};
type Props = {
    records: Funeral[];
    pagination: PageMeta;
    filters: { search: string };
    stats: Stats;
    focus: Funeral | null;
    can: { create: boolean; update: boolean; delete: boolean };
};

export default function Funerals({
    records,
    pagination,
    filters,
    stats,
    focus,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Funeral | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const filtered = records;
    const thisYear = String(new Date().getFullYear());

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Funeral Records" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Funeral Records</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage funeral services and bereavement records
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        Add Funeral Record
                    </button>
                )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    label="Total Records"
                    value={stats.total}
                    icon="DocumentTextIcon"
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
                    label="With Family Contact"
                    value={stats.with_contact}
                    icon="PhoneIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    label="With Burial Location"
                    value={stats.with_burial}
                    icon="MapPinIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
            </div>

            <div className="card mb-4 p-4">
                <SearchBox
                    value={values.search}
                    onChange={(v) => set('search', v)}
                    placeholder="Search name, family, officiant..."
                    className="max-w-sm"
                />
            </div>

            <div className="card overflow-hidden">
                {filtered.length === 0 ? (
                    <EmptyState
                        card={false}
                        icon="DocumentTextIcon"
                        title="No funeral records found"
                        text="Add the first funeral record to get started."
                    />
                ) : (
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {[
                                        'Deceased',
                                        'Date of Death',
                                        'Funeral Date',
                                        'Officiant',
                                        'Location',
                                        'Family Contact',
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
                                                    src={r.deceased_photo}
                                                    muted
                                                />
                                                <span className="text-sm font-medium text-foreground">
                                                    {r.deceased_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-muted-foreground">
                                            {fmtDate(r.date_of_death)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {fmtDate(r.funeral_date)}
                                            {r.funeral_time && (
                                                <span className="ml-1 text-xs text-muted-foreground">
                                                    {fmtTime(r.funeral_time)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {r.officiant || '—'}
                                        </td>
                                        <td className="max-w-[140px] truncate px-4 py-3 text-sm text-muted-foreground">
                                            {r.location || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {r.family_contact ? (
                                                <div>
                                                    <p className="text-sm text-foreground">
                                                        {r.family_contact}
                                                    </p>
                                                    {r.family_phone && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {r.family_phone}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
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
                                                                `/funerals/${r.id}`,
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
                <FuneralModal
                    record={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Funeral Record?"
                message="This funeral record will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function FuneralModal({
    record,
    onClose,
}: {
    record: Funeral | null;
    onClose: () => void;
}) {
    const form = useForm({
        member_id: record?.member_id ?? '',
        deceased_name: record?.deceased_name ?? '',
        deceased_photo: record?.deceased_photo ?? '',
        date_of_death: record?.date_of_death ?? '',
        funeral_date:
            record?.funeral_date ?? new Date().toISOString().slice(0, 10),
        funeral_time: record?.funeral_time ?? '',
        location: record?.location ?? '',
        burial_location: record?.burial_location ?? '',
        officiant: record?.officiant ?? '',
        eulogy_by: record?.eulogy_by ?? '',
        family_contact: record?.family_contact ?? '',
        family_phone: record?.family_phone ?? '',
        banner_image: record?.banner_image ?? '',
        notes: record?.notes ?? '',
    });

    const save = () => {
        const o = { preserveScroll: true, onSuccess: onClose };
        if (record) form.patch(`/funerals/${record.id}`, o);
        else form.post('/funerals', o);
    };

    const text = (
        k:
            | 'officiant'
            | 'location'
            | 'burial_location'
            | 'eulogy_by'
            | 'family_contact'
            | 'family_phone',
        label: string,
        placeholder: string,
    ) => (
        <Field label={label} error={form.errors[k]}>
            <input
                className={inputCls}
                value={form.data[k]}
                onChange={(e) => form.setData(k, e.target.value)}
                placeholder={placeholder}
            />
        </Field>
    );

    return (
        <Modal
            title={record ? 'Edit Funeral Record' : 'Add Funeral Record'}
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
                            !form.data.deceased_name || !form.data.funeral_date
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
                        label={form.data.deceased_name}
                        noneLabel="— Not a member / External —"
                        onChange={(m) =>
                            form.setData((d) => ({
                                ...d,
                                member_id: m?.id ?? '',
                                deceased_name: m ? m.name : d.deceased_name,
                                deceased_photo:
                                    m?.photo_url || d.deceased_photo,
                            }))
                        }
                    />
                </Field>
                <Field
                    label="Deceased Name *"
                    error={form.errors.deceased_name}
                >
                    <input
                        className={inputCls}
                        value={form.data.deceased_name}
                        onChange={(e) =>
                            form.setData('deceased_name', e.target.value)
                        }
                        placeholder="Full name"
                    />
                </Field>
                <Field label="Date of Death" error={form.errors.date_of_death}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.date_of_death}
                        onChange={(e) =>
                            form.setData('date_of_death', e.target.value)
                        }
                    />
                </Field>
                <Field label="Funeral Date *" error={form.errors.funeral_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.funeral_date}
                        onChange={(e) =>
                            form.setData('funeral_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="Funeral Time" error={form.errors.funeral_time}>
                    <input
                        type="time"
                        className={inputCls}
                        value={form.data.funeral_time}
                        onChange={(e) =>
                            form.setData('funeral_time', e.target.value)
                        }
                    />
                </Field>
                {text('officiant', 'Officiant', 'Pastor / Minister name')}
                {text('location', 'Service Location', 'Main Sanctuary...')}
                {text('burial_location', 'Burial Location', 'Cemetery name...')}
                {text('eulogy_by', 'Eulogy By', 'Name of eulogist')}
                {text(
                    'family_contact',
                    'Family Contact',
                    'Contact person name',
                )}
                {text('family_phone', 'Family Phone', '+250 788 000 000')}
                <div className="sm:col-span-2">
                    <ImageUploadField
                        label="Photo"
                        value={form.data.deceased_photo}
                        onChange={(url) => form.setData('deceased_photo', url)}
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
                {form.data.member_id && !record && (
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                        The linked member's record will be set to Inactive.
                    </p>
                )}
            </div>
        </Modal>
    );
}
