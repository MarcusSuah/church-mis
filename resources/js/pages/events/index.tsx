import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import type { Can } from '@/components/finance/shared';
import Icon from '@/components/ssbcms/AppIcon';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import ReadMore from '@/components/ssbcms/ReadMore';
import {
    DeleteConfirm,
    Field,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type ChurchEvent = {
    id: string;
    title: string;
    description: string | null;
    event_type: string;
    start_date: string;
    end_date: string | null;
    location: string | null;
    address: string | null;
    banner_url: string | null;
    organizer_name: string | null;
    max_attendees: number | null;
    registered_count: number;
    is_public: boolean;
    status: string;
    notes: string | null;
};
type Stats = {
    total: number;
    upcoming: number;
    this_month: number;
    completed: number;
};
type Props = {
    records: ChurchEvent[];
    pagination: PageMeta;
    filters: { search: string; type: string; status: string };
    stats: Stats;
    focus: ChurchEvent | null;
    types: string[];
    statuses: string[];
    can: Can;
};

const STATUS_CONFIG: Record<
    string,
    { color: string; bg: string; dot: string }
> = {
    Upcoming: { color: 'text-info', bg: 'bg-info/10', dot: 'bg-info' },
    'In Progress': {
        color: 'text-accent',
        bg: 'bg-accent/10',
        dot: 'bg-accent',
    },
    Completed: {
        color: 'text-success',
        bg: 'bg-success/10',
        dot: 'bg-success',
    },
    Cancelled: { color: 'text-danger', bg: 'bg-danger/10', dot: 'bg-danger' },
};
const fmtDT = (d: string | null) =>
    d
        ? new Date(d).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
          })
        : '—';

function Status({ s, solid = false }: { s: string; solid?: boolean }) {
    const sc = STATUS_CONFIG[s] ?? STATUS_CONFIG.Upcoming;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${solid ? 'bg-white/90' : sc.bg} ${sc.color}`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
            {s}
        </span>
    );
}

function BannerOrIcon({
    src,
    alt,
    className,
}: {
    src: string | null;
    alt: string;
    className: string;
}) {
    const [failed, setFailed] = useState(false);
    return src && !failed ? (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setFailed(true)}
        />
    ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <Icon name="CalendarIcon" size={40} className="text-primary/40" />
        </div>
    );
}

function Registrations({ e, big = false }: { e: ChurchEvent; big?: boolean }) {
    if (!e.max_attendees) return null;
    return (
        <div>
            <div
                className={`mb-1 flex justify-between ${big ? 'text-sm' : 'text-xs'}`}
            >
                <span
                    className={
                        big
                            ? 'font-semibold text-foreground'
                            : 'text-muted-foreground'
                    }
                >
                    Registrations
                </span>
                <span className="font-medium text-foreground">
                    {e.registered_count}/{e.max_attendees}
                </span>
            </div>
            <div
                className={`${big ? 'h-2' : 'h-1.5'} overflow-hidden rounded-full bg-muted`}
            >
                <div
                    className="h-full rounded-full bg-primary"
                    style={{
                        width: `${Math.min((e.registered_count / e.max_attendees) * 100, 100)}%`,
                    }}
                />
            </div>
        </div>
    );
}

export default function Events({
    records,
    pagination,
    filters,
    stats,
    focus,
    types,
    statuses,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<ChurchEvent | 'new' | null>(null);
    const [selected, setSelected] = useState<ChurchEvent | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);

    // The server filters, sorts (soonest first) and paginates.
    const filtered = records;
    const pager = { pageItems: records };
    const selCls =
        'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none';

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Events" />
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Events
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage church events, services, and gatherings
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        New Event
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    flip
                    label="Total Events"
                    value={stats.total}
                    icon="CalendarIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    flip
                    label="Upcoming"
                    value={stats.upcoming}
                    icon="ClockIcon"
                    color="text-info"
                    bg="bg-info/10"
                />
                <Kpi
                    flip
                    label="This Month"
                    value={stats.this_month}
                    icon="CalendarDaysIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
                <Kpi
                    flip
                    label="Completed"
                    value={stats.completed}
                    icon="CheckCircleIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Icon
                        name="MagnifyingGlassIcon"
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={values.search}
                        onChange={(e) => set('search', e.target.value)}
                        placeholder="Search events..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={values.type}
                    onChange={(e) => set('type', e.target.value)}
                    className={selCls}
                >
                    <option value="All">All Types</option>
                    {types.map((t) => (
                        <option key={t}>{t}</option>
                    ))}
                </select>
                <select
                    value={values.status}
                    onChange={(e) => set('status', e.target.value)}
                    className={selCls}
                >
                    <option value="All">All Statuses</option>
                    {statuses.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Icon
                        name="CalendarIcon"
                        size={40}
                        className="mx-auto mb-3 opacity-30"
                    />
                    <p className="font-medium">No events found</p>
                    <p className="mt-1 text-sm">
                        Try adjusting your filters or create a new event
                    </p>
                </div>
            ) : (
                <div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {pager.pageItems.map((e) => (
                            <div
                                key={e.id}
                                className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                            >
                                <div
                                    className="relative h-44 cursor-pointer overflow-hidden bg-muted"
                                    onClick={() => setSelected(e)}
                                >
                                    <BannerOrIcon
                                        src={e.banner_url}
                                        alt={`Banner for ${e.title}`}
                                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute top-3 left-3">
                                        <Status s={e.status} solid />
                                    </div>
                                    {!e.is_public && (
                                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white">
                                            <Icon
                                                name="LockClosedIcon"
                                                size={10}
                                            />
                                            Private
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <h3
                                            className="line-clamp-2 cursor-pointer text-sm leading-snug font-semibold text-foreground hover:text-primary"
                                            onClick={() => setSelected(e)}
                                        >
                                            {e.title}
                                        </h3>
                                        <div className="flex shrink-0 gap-1">
                                            {can.update && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditing(e)
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                                                            `/events/${e.id}`,
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
                                                size={12}
                                                className="shrink-0"
                                            />
                                            {fmtDT(e.start_date)}
                                        </div>
                                        {e.location && (
                                            <div className="flex items-center gap-1.5">
                                                <Icon
                                                    name="MapPinIcon"
                                                    size={12}
                                                    className="shrink-0"
                                                />
                                                <span className="truncate">
                                                    {e.location}
                                                </span>
                                            </div>
                                        )}
                                        {e.organizer_name && (
                                            <div className="flex items-center gap-1.5">
                                                <Icon
                                                    name="UserIcon"
                                                    size={12}
                                                    className="shrink-0"
                                                />
                                                <span className="truncate">
                                                    {e.organizer_name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {e.description && (
                                        <div className="mt-2">
                                            <ReadMore
                                                text={e.description}
                                                limit={90}
                                            />
                                        </div>
                                    )}
                                    <div className="mt-3">
                                        <Registrations e={e} />
                                    </div>
                                    <div className="mt-3">
                                        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                            {e.event_type}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ServerPaginatorCard meta={pagination} />
                </div>
            )}

            {selected && (
                <div
                    className="fixed inset-0 z-50 flex"
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="flex-1 bg-black/40 fade-in"
                        onClick={() => setSelected(null)}
                    />
                    <div className="slide-up w-full max-w-lg overflow-y-auto border-l border-border bg-background">
                        <div className="relative h-56">
                            <BannerOrIcon
                                src={selected.banner_url}
                                alt={`Banner for ${selected.title}`}
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                                aria-label="Close"
                            >
                                <Icon name="XMarkIcon" size={18} />
                            </button>
                            <div className="absolute right-4 bottom-4 left-4">
                                <div className="mb-2">
                                    <Status s={selected.status} solid />
                                </div>
                                <h2 className="text-lg leading-tight font-bold text-white">
                                    {selected.title}
                                </h2>
                            </div>
                        </div>
                        <div className="space-y-4 p-5">
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {
                                        icon: 'CalendarDaysIcon',
                                        label: 'Start',
                                        value: fmtDT(selected.start_date),
                                    },
                                    {
                                        icon: 'ClockIcon',
                                        label: 'End',
                                        value: fmtDT(selected.end_date),
                                    },
                                    {
                                        icon: 'MapPinIcon',
                                        label: 'Location',
                                        value: selected.location || '—',
                                    },
                                    {
                                        icon: 'UserIcon',
                                        label: 'Organizer',
                                        value: selected.organizer_name || '—',
                                    },
                                ].map((i) => (
                                    <div
                                        key={i.label}
                                        className="rounded-lg bg-muted/50 p-3"
                                    >
                                        <div className="mb-1 flex items-center gap-1.5">
                                            <Icon
                                                name={i.icon}
                                                size={13}
                                                className="text-muted-foreground"
                                            />
                                            <span className="text-xs text-muted-foreground">
                                                {i.label}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-foreground">
                                            {i.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {selected.description && (
                                <div>
                                    <h4 className="mb-1.5 text-sm font-semibold text-foreground">
                                        Description
                                    </h4>
                                    <ReadMore
                                        text={selected.description}
                                        limit={400}
                                        className="text-sm leading-relaxed text-muted-foreground"
                                    />
                                </div>
                            )}
                            {selected.address && (
                                <div>
                                    <h4 className="mb-1 text-sm font-semibold text-foreground">
                                        Address
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                        {selected.address}
                                    </p>
                                </div>
                            )}
                            <Registrations e={selected} big />
                            {selected.notes && (
                                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                                    <h4 className="mb-1 text-xs font-semibold text-accent">
                                        Notes
                                    </h4>
                                    <ReadMore
                                        text={selected.notes}
                                        className="text-sm text-muted-foreground"
                                    />
                                </div>
                            )}
                            {(can.update || can.delete) && (
                                <div className="flex gap-2 pt-2">
                                    {can.update && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditing(selected);
                                                setSelected(null);
                                            }}
                                            className="btn-primary flex-1 justify-center py-2.5 text-sm"
                                        >
                                            <Icon name="PencilIcon" size={14} />
                                            Edit Event
                                        </button>
                                    )}
                                    {can.delete && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDeleteUrl(
                                                    `/events/${selected.id}`,
                                                );
                                                setSelected(null);
                                            }}
                                            className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-medium text-danger hover:bg-danger/10"
                                            aria-label="Delete event"
                                        >
                                            <Icon name="TrashIcon" size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <EventModal
                    record={editing === 'new' ? null : editing}
                    types={types}
                    statuses={statuses}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Event?"
                message="This event will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function EventModal({
    record,
    types,
    statuses,
    onClose,
}: {
    record: ChurchEvent | null;
    types: string[];
    statuses: string[];
    onClose: () => void;
}) {
    const form = useForm({
        title: record?.title ?? '',
        description: record?.description ?? '',
        event_type: record?.event_type ?? 'General',
        status: record?.status ?? 'Upcoming',
        start_date: record?.start_date ?? '',
        end_date: record?.end_date ?? '',
        location: record?.location ?? '',
        organizer_name: record?.organizer_name ?? '',
        address: record?.address ?? '',
        banner_url: record?.banner_url ?? '',
        max_attendees: record?.max_attendees
            ? String(record.max_attendees)
            : '',
        registered_count: String(record?.registered_count ?? 0),
        is_public: record?.is_public ?? true,
        notes: record?.notes ?? '',
    });
    const save = () =>
        record
            ? form.patch(`/events/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/events', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });

    return (
        <Modal
            title={record ? 'Edit Event' : 'New Event'}
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
                        disabled={!form.data.title || !form.data.start_date}
                        label={record ? 'Save Changes' : 'Create Event'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Event Title *" error={form.errors.title} span>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        placeholder="Enter event title"
                    />
                </Field>
                <Field label="Event Type">
                    <select
                        className={inputCls}
                        value={form.data.event_type}
                        onChange={(e) =>
                            form.setData('event_type', e.target.value)
                        }
                    >
                        {types.map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Status">
                    <select
                        className={inputCls}
                        value={form.data.status}
                        onChange={(e) => form.setData('status', e.target.value)}
                    >
                        {statuses.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>
                </Field>
                <Field
                    label="Start Date & Time *"
                    error={form.errors.start_date}
                >
                    <input
                        type="datetime-local"
                        className={inputCls}
                        value={form.data.start_date}
                        onChange={(e) =>
                            form.setData('start_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="End Date & Time" error={form.errors.end_date}>
                    <input
                        type="datetime-local"
                        className={inputCls}
                        value={form.data.end_date}
                        onChange={(e) =>
                            form.setData('end_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="Location">
                    <input
                        className={inputCls}
                        value={form.data.location}
                        onChange={(e) =>
                            form.setData('location', e.target.value)
                        }
                        placeholder="Venue name"
                    />
                </Field>
                <Field label="Organizer">
                    <input
                        className={inputCls}
                        value={form.data.organizer_name}
                        onChange={(e) =>
                            form.setData('organizer_name', e.target.value)
                        }
                        placeholder="Organizer name"
                    />
                </Field>
                <Field label="Address" span>
                    <input
                        className={inputCls}
                        value={form.data.address}
                        onChange={(e) =>
                            form.setData('address', e.target.value)
                        }
                        placeholder="Full address"
                    />
                </Field>
                <div className="sm:col-span-2">
                    <ImageUploadField
                        label="Banner Image"
                        value={form.data.banner_url}
                        onChange={(url) => form.setData('banner_url', url)}
                        variant="banner"
                    />
                </div>
                <Field label="Max Attendees" error={form.errors.max_attendees}>
                    <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={form.data.max_attendees}
                        onChange={(e) =>
                            form.setData('max_attendees', e.target.value)
                        }
                        placeholder="Leave blank for unlimited"
                    />
                </Field>
                <Field label="Registered">
                    <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={form.data.registered_count}
                        onChange={(e) =>
                            form.setData('registered_count', e.target.value)
                        }
                    />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <input
                        type="checkbox"
                        checked={form.data.is_public}
                        onChange={(e) =>
                            form.setData('is_public', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">
                        Public Event (shown in the Member Portal)
                    </span>
                </label>
                <Field label="Description" span>
                    <textarea
                        rows={3}
                        className={`${inputCls} resize-none`}
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        placeholder="Event description..."
                    />
                </Field>
                <Field label="Notes" span>
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        placeholder="Internal notes..."
                    />
                </Field>
            </div>
        </Modal>
    );
}
