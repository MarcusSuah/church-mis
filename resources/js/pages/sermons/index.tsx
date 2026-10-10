import { Head, router, useForm } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    CheckCircle2,
    Clock,
    Eye,
    FileText,
    Loader2,
    Mic,
    Music,
    Pencil,
    Plus,
    Search,
    Trash2,
    User,
    Video,
    X,
} from 'lucide-react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import {
    destroy,
    index,
    store,
    update,
    view as viewRoute,
} from '@/routes/sermons';

type Sermon = {
    id: string;
    title: string;
    speaker_name: string;
    speaker_photo: string | null;
    series_name: string | null;
    scripture_reference: string | null;
    description: string | null;
    sermon_date: string;
    service_type: string;
    audio_url: string | null;
    video_url: string | null;
    notes_url: string | null;
    thumbnail_url: string | null;
    duration_minutes: number | null;
    tags: string[];
    is_published: boolean;
    view_count: number;
};

type Props = {
    sermons: Sermon[];
    stats: { total: number; published: number; views: number; series: number };
    seriesOptions: string[];
    speakerOptions: string[];
    serviceTypes: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const formatDate = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

/** Image that falls back to an icon tile when the URL is missing or broken. */
function Img({
    src,
    className,
    fallback,
}: {
    src: string | null;
    className: string;
    fallback: ReactNode;
}) {
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);
    if (!src || failed) return <>{fallback}</>;
    return (
        <img
            src={src}
            alt=""
            className={className}
            onError={() => setFailed(true)}
        />
    );
}

function SpeakerAvatar({ src, size }: { src: string | null; size: string }) {
    return (
        <Img
            src={src}
            className={`${size} shrink-0 rounded-full object-cover`}
            fallback={
                <span
                    className={`${size} flex shrink-0 items-center justify-center rounded-full bg-primary/20`}
                >
                    <User className="size-1/2 text-primary" />
                </span>
            }
        />
    );
}

const dot = <span className="text-border">·</span>;

/** POST the view to the server (counted once per browser session). */
function recordView(id: string) {
    const xsrf = decodeURIComponent(
        document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ?? '',
    );
    return fetch(viewRoute.url(id), {
        method: 'POST',
        headers: {
            'X-XSRF-TOKEN': xsrf,
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
    })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null) as Promise<{ view_count: number } | null>;
}

export default function Sermons({
    sermons,
    stats,
    seriesOptions,
    speakerOptions,
    serviceTypes,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    const [serviceFilter, setServiceFilter] = useState('All');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Sermon | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Sermon | null>(null);
    const [busy, setBusy] = useState(false);
    const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

    const views = (s: Sermon) => viewCounts[s.id] ?? s.view_count;
    const selected = sermons.find((s) => s.id === selectedId) ?? null;

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return sermons.filter((s) => {
            const matchService =
                serviceFilter === 'All' || s.service_type === serviceFilter;
            const matchSearch =
                !q ||
                s.title.toLowerCase().includes(q) ||
                s.speaker_name.toLowerCase().includes(q) ||
                s.series_name?.toLowerCase().includes(q) ||
                s.scripture_reference?.toLowerCase().includes(q) ||
                s.tags.some((t) => t.includes(q));
            return matchService && matchSearch;
        });
    }, [sermons, search, serviceFilter]);

    const open = (s: Sermon) => {
        setSelectedId(s.id);
        recordView(s.id).then(
            (r) => r && setViewCounts((v) => ({ ...v, [s.id]: r.view_count })),
        );
    };

    const confirmDelete = () => {
        if (!deleting) return;
        setBusy(true);
        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedId === deleting.id) setSelectedId(null);
                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };

    const totalViews =
        stats.views +
        Object.entries(viewCounts).reduce(
            (n, [id, c]) =>
                n + c - (sermons.find((s) => s.id === id)?.view_count ?? c),
            0,
        );

    const kpis = [
        {
            label: 'Total Sermons',
            value: stats.total.toLocaleString(),
            Icon: Mic,
            color: 'text-primary',
        },
        {
            label: 'Published',
            value: stats.published.toLocaleString(),
            Icon: CheckCircle2,
            color: 'text-success',
        },
        {
            label: 'Total Views',
            value: totalViews.toLocaleString(),
            Icon: Eye,
            color: 'text-info',
        },
        {
            label: 'Series',
            value: stats.series.toLocaleString(),
            Icon: BookOpen,
            color: 'text-accent',
        },
    ];

    return (
        <div className="flex-1 space-y-6 p-4 md:p-6">
            <Head title="Sermons" />

            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Sermons
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage sermon recordings, notes, and archives
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus size={16} />
                        Add Sermon
                    </button>
                )}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {kpis.map((k) => (
                    <div
                        key={k.label}
                        className="card flex items-center gap-4 p-5"
                    >
                        <k.Icon className={`size-5 shrink-0 ${k.color}`} />
                        <div>
                            <p className="text-2xl font-bold text-foreground tabular-nums">
                                {k.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {k.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search sermons, speakers, series..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                    className="min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                    aria-label="Filter by service type"
                >
                    {['All', ...serviceTypes].map((t) => (
                        <option key={t}>{t}</option>
                    ))}
                </select>
            </div>

            {/* List */}
            {filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Mic size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No sermons found</p>
                    {can.create && sermons.length === 0 && (
                        <button
                            type="button"
                            onClick={() => setEditing('new')}
                            className="btn-primary mt-4 text-sm"
                        >
                            <Plus size={16} /> Add Sermon
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((s) => (
                        <div
                            key={s.id}
                            className="card flex gap-4 p-4 transition-shadow hover:shadow-sm"
                        >
                            <button
                                type="button"
                                onClick={() => open(s)}
                                className="relative h-[72px] w-28 shrink-0 overflow-hidden rounded-lg bg-muted"
                                aria-label={`Open ${s.title}`}
                            >
                                <Img
                                    src={s.thumbnail_url}
                                    className="h-full w-full object-cover"
                                    fallback={
                                        <span className="flex h-full w-full items-center justify-center bg-primary/10">
                                            <Mic
                                                size={24}
                                                className="text-primary/40"
                                            />
                                        </span>
                                    }
                                />
                                {!s.is_published && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white">
                                        Draft
                                    </span>
                                )}
                            </button>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <h3
                                            className="line-clamp-1 cursor-pointer text-sm leading-snug font-semibold text-foreground hover:text-primary"
                                            onClick={() => open(s)}
                                        >
                                            {s.title}
                                        </h3>
                                        {s.series_name && (
                                            <p className="mt-0.5 text-xs text-primary/80">
                                                {s.series_name}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() => setEditing(s)}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                aria-label={`Edit ${s.title}`}
                                            >
                                                <Pencil size={13} />
                                            </button>
                                        )}
                                        {can.delete && (
                                            <button
                                                type="button"
                                                onClick={() => setDeleting(s)}
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                aria-label={`Delete ${s.title}`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <SpeakerAvatar
                                            src={s.speaker_photo}
                                            size="size-5"
                                        />
                                        {s.speaker_name}
                                    </span>
                                    {dot}
                                    <span>{formatDate(s.sermon_date)}</span>
                                    {dot}
                                    <span className="rounded-full bg-muted px-1.5 py-0.5">
                                        {s.service_type}
                                    </span>
                                    {s.scripture_reference && (
                                        <>
                                            {dot}
                                            <span className="italic">
                                                {s.scripture_reference}
                                            </span>
                                        </>
                                    )}
                                    {s.duration_minutes && (
                                        <>
                                            {dot}
                                            <span>
                                                {s.duration_minutes} min
                                            </span>
                                        </>
                                    )}
                                    {dot}
                                    <span className="flex items-center gap-1">
                                        <Eye size={11} />
                                        {views(s).toLocaleString()}
                                    </span>
                                </div>

                                {s.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {s.tags.slice(0, 4).map((t) => (
                                            <button
                                                type="button"
                                                key={t}
                                                onClick={() => setSearch(t)}
                                                className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/20"
                                                title={`Show sermons tagged "${t}"`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && (
                <SermonDrawer
                    sermon={selected}
                    views={views(selected)}
                    can={can}
                    onClose={() => setSelectedId(null)}
                    onEdit={() => {
                        setEditing(selected);
                        setSelectedId(null);
                    }}
                    onDelete={() => setDeleting(selected)}
                />
            )}

            {editing && (
                <SermonModal
                    sermon={editing === 'new' ? null : editing}
                    serviceTypes={serviceTypes}
                    seriesOptions={seriesOptions}
                    speakerOptions={speakerOptions}
                    onClose={() => setEditing(null)}
                />
            )}

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={confirmDelete}
                title="Delete Sermon"
                message={
                    deleting
                        ? `Delete "${deleting.title}"? This removes it from the archive.`
                        : ''
                }
                confirmLabel="Yes, Delete"
                variant="danger"
                loading={busy}
            />
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SermonDrawer({
    sermon: s,
    views,
    can,
    onClose,
    onEdit,
    onDelete,
}: {
    sermon: Sermon;
    views: number;
    can: Props['can'];
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    useEffect(() => {
        const esc = (e: globalThis.KeyboardEvent) =>
            e.key === 'Escape' && onClose();
        window.addEventListener('keydown', esc);
        return () => window.removeEventListener('keydown', esc);
    }, [onClose]);

    const resources = [
        { url: s.audio_url, label: 'Audio Recording', Icon: Music },
        { url: s.video_url, label: 'Video Recording', Icon: Video },
        { url: s.notes_url, label: 'Sermon Notes', Icon: FileText },
    ].filter((r) => r.url);

    return (
        <div
            className="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
        >
            <div className="flex-1 bg-black/40 fade-in" onClick={onClose} />
            <div className="slide-up w-full max-w-lg overflow-y-auto border-l border-border bg-background">
                <div className="relative h-48 bg-muted">
                    <Img
                        src={s.thumbnail_url}
                        className="h-full w-full object-cover"
                        fallback={
                            <span className="flex h-full w-full items-center justify-center bg-primary/10">
                                <Mic size={48} className="text-primary/40" />
                            </span>
                        }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute top-4 right-4 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                    <div className="absolute right-4 bottom-4 left-4">
                        {s.series_name && (
                            <p className="mb-1 text-xs text-white/70">
                                {s.series_name}
                            </p>
                        )}
                        <h2 className="text-base leading-tight font-bold text-white">
                            {s.title}
                        </h2>
                    </div>
                </div>

                <div className="space-y-4 p-5">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <SpeakerAvatar src={s.speaker_photo} size="size-12" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {s.speaker_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {s.service_type} · {formatDate(s.sermon_date)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                Icon: BookOpen,
                                label: 'Scripture',
                                value: s.scripture_reference || '—',
                            },
                            {
                                Icon: Clock,
                                label: 'Duration',
                                value: s.duration_minutes
                                    ? `${s.duration_minutes} min`
                                    : '—',
                            },
                            {
                                Icon: Eye,
                                label: 'Views',
                                value: views.toLocaleString(),
                            },
                            {
                                Icon: CheckCircle2,
                                label: 'Status',
                                value: s.is_published ? 'Published' : 'Draft',
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="rounded-lg bg-muted/50 p-3"
                            >
                                <div className="mb-1 flex items-center gap-1.5">
                                    <item.Icon
                                        size={12}
                                        className="text-muted-foreground"
                                    />
                                    <span className="text-xs text-muted-foreground">
                                        {item.label}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-foreground">
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {s.description && (
                        <div>
                            <h4 className="mb-1.5 text-sm font-semibold text-foreground">
                                Description
                            </h4>
                            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                                {s.description}
                            </p>
                        </div>
                    )}

                    {s.tags.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-foreground">
                                Tags
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                                {s.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {resources.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-foreground">
                                Resources
                            </h4>
                            <div className="space-y-2">
                                {resources.map((r) => (
                                    <a
                                        key={r.label}
                                        href={r.url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-sm text-foreground hover:bg-muted/80"
                                    >
                                        <r.Icon
                                            size={16}
                                            className="text-primary"
                                        />
                                        {r.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {(can.update || can.delete) && (
                        <div className="flex gap-2 pt-2">
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={onEdit}
                                    className="btn-primary flex-1 justify-center py-2.5 text-sm"
                                >
                                    <Pencil size={14} />
                                    Edit Sermon
                                </button>
                            )}
                            {can.delete && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="btn-outline border-danger/30 px-4 py-2.5 text-danger hover:bg-danger/10"
                                    aria-label="Delete sermon"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */

function SermonModal({
    sermon,
    serviceTypes,
    seriesOptions,
    speakerOptions,
    onClose,
}: {
    sermon: Sermon | null;
    serviceTypes: string[];
    seriesOptions: string[];
    speakerOptions: string[];
    onClose: () => void;
}) {
    const [tagDraft, setTagDraft] = useState('');
    const form = useForm({
        title: sermon?.title ?? '',
        speaker_name: sermon?.speaker_name ?? '',
        speaker_photo: sermon?.speaker_photo ?? '',
        series_name: sermon?.series_name ?? '',
        scripture_reference: sermon?.scripture_reference ?? '',
        description: sermon?.description ?? '',
        sermon_date:
            sermon?.sermon_date ?? new Date().toISOString().slice(0, 10),
        service_type: sermon?.service_type ?? 'Sunday Worship',

        audio_file: null as File | null,
        video_file: null as File | null,
        notes_file: null as File | null,

        thumbnail_url: sermon?.thumbnail_url ?? '',
        duration_minutes: sermon?.duration_minutes
            ? String(sermon.duration_minutes)
            : '',
        tags: sermon?.tags ?? ([] as string[]),
        is_published: sermon?.is_published ?? true,
    });

    const addTags = (raw: string) => {
        const next = raw
            .split(',')
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
        if (next.length)
            form.setData(
                'tags',
                Array.from(new Set([...form.data.tags, ...next])),
            );
        setTagDraft('');
    };

    const onTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTags(tagDraft);
        } else if (
            e.key === 'Backspace' &&
            !tagDraft &&
            form.data.tags.length
        ) {
            form.setData('tags', form.data.tags.slice(0, -1));
        }
    };

    const save = () => {
        const pendingTags = tagDraft.trim()
            ? Array.from(
                  new Set([
                      ...form.data.tags,
                      ...tagDraft
                          .split(',')
                          .map((t) => t.trim().toLowerCase())
                          .filter(Boolean),
                  ]),
              )
            : form.data.tags;
        // Files go as multipart/form-data; PHP only parses that for POST, so updates spoof PATCH with _method.
        form.transform((d) => ({
            ...d,
            tags: pendingTags,
            duration_minutes: d.duration_minutes
                ? Number(d.duration_minutes)
                : null,
            ...(sermon ? { _method: 'patch' } : {}),
        }));
        const opts = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: onClose,
        };
        if (sermon) form.post(update.url(sermon.id), opts);
        else form.post(store.url(), opts);
    };

    const label = 'mb-1 block text-xs font-medium text-muted-foreground';
    const err = (k: string) =>
        (form.errors as Record<string, string>)[k] && (
            <p className="error-text">
                {(form.errors as Record<string, string>)[k]}
            </p>
        );
    const text = (
        k: 'title' | 'speaker_name' | 'series_name' | 'scripture_reference',
        l: string,
        placeholder: string,
        list?: string,
    ) => (
        <div>
            <label className={label}>{l}</label>
            <input
                value={form.data[k]}
                onChange={(e) => form.setData(k, e.target.value)}
                placeholder={placeholder}
                list={list}
                className="input-field"
            />
            {err(k)}
        </div>
    );

    const valid =
        form.data.title.trim() &&
        form.data.speaker_name.trim() &&
        form.data.sermon_date;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className="scale-in relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-background shadow-xl">
                <div className="flex items-center justify-between border-b border-border p-5">
                    <h2 className="text-lg font-bold text-foreground">
                        {sermon ? 'Edit Sermon' : 'Add Sermon'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="scrollbar-thin space-y-4 overflow-y-auto p-5">
                    {text('title', 'Sermon Title *', 'Sermon title')}
                    <div className="grid grid-cols-2 gap-3">
                        {text(
                            'speaker_name',
                            'Speaker Name *',
                            'Speaker name',
                            'sermon-speakers',
                        )}
                        <div>
                            <label className={label}>Sermon Date *</label>
                            <input
                                type="date"
                                value={form.data.sermon_date}
                                onChange={(e) =>
                                    form.setData('sermon_date', e.target.value)
                                }
                                className="input-field"
                            />
                            {err('sermon_date')}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Service Type</label>
                            <select
                                value={form.data.service_type}
                                onChange={(e) =>
                                    form.setData('service_type', e.target.value)
                                }
                                className="input-field"
                            >
                                {serviceTypes.map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className={label}>Duration (minutes)</label>
                            <input
                                type="number"
                                min={1}
                                value={form.data.duration_minutes}
                                onChange={(e) =>
                                    form.setData(
                                        'duration_minutes',
                                        e.target.value,
                                    )
                                }
                                placeholder="e.g. 45"
                                className="input-field"
                            />
                            {err('duration_minutes')}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {text(
                            'series_name',
                            'Series Name',
                            'Sermon series',
                            'sermon-series',
                        )}
                        {text(
                            'scripture_reference',
                            'Scripture Reference',
                            'e.g. John 3:16',
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <ImageUploadField
                            label="Thumbnail"
                            value={form.data.thumbnail_url}
                            onChange={(url) =>
                                form.setData('thumbnail_url', url)
                            }
                            variant="banner"
                        />
                        <ImageUploadField
                            label="Speaker Photo"
                            value={form.data.speaker_photo}
                            onChange={(url) =>
                                form.setData('speaker_photo', url)
                            }
                            variant="avatar"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Audio */}
                        <div>
                            <label className={label}>Audio Recording</label>

                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(e) =>
                                    form.setData(
                                        'audio_file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className="input-field cursor-pointer"
                            />

                            {sermon?.audio_url && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Existing audio file:
                                    <a
                                        href={sermon.audio_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-1 text-primary hover:underline"
                                    >
                                        Listen / Download
                                    </a>
                                </p>
                            )}

                            {form.data.audio_file && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Selected: {form.data.audio_file.name}
                                </p>
                            )}

                            {err('audio_file')}
                        </div>

                        {/* Video */}
                        <div>
                            <label className={label}>Video Recording</label>

                            <input
                                type="file"
                                accept="video/*"
                                onChange={(e) =>
                                    form.setData(
                                        'video_file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className="input-field cursor-pointer"
                            />

                            {sermon?.video_url && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Existing video:
                                    <a
                                        href={sermon.video_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-1 text-primary hover:underline"
                                    >
                                        Watch / Download
                                    </a>
                                </p>
                            )}

                            {form.data.video_file && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Selected: {form.data.video_file.name}
                                </p>
                            )}

                            {err('video_file')}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className={label}>Sermon Notes</label>

                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(e) =>
                                    form.setData(
                                        'notes_file',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                                className="input-field cursor-pointer"
                            />

                            {sermon?.notes_url && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Existing notes:
                                    <a
                                        href={sermon.notes_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-1 text-primary hover:underline"
                                    >
                                        Open Notes
                                    </a>
                                </p>
                            )}

                            {form.data.notes_file && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Selected: {form.data.notes_file.name}
                                </p>
                            )}

                            {err('notes_file')}
                        </div>
                    </div>

                    <div>
                        <label className={label}>Tags</label>
                        <div className="input-field flex min-h-10 flex-wrap items-center gap-1.5">
                            {form.data.tags.map((t) => (
                                <span
                                    key={t}
                                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                >
                                    {t}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'tags',
                                                form.data.tags.filter(
                                                    (x) => x !== t,
                                                ),
                                            )
                                        }
                                        aria-label={`Remove tag ${t}`}
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                            <input
                                value={tagDraft}
                                onChange={(e) => setTagDraft(e.target.value)}
                                onKeyDown={onTagKey}
                                onBlur={() =>
                                    tagDraft.trim() && addTags(tagDraft)
                                }
                                placeholder={
                                    form.data.tags.length
                                        ? ''
                                        : 'faith, prayer, healing'
                                }
                                className="min-w-24 flex-1 bg-transparent text-sm outline-none"
                            />
                        </div>
                        <p className="helper-text">
                            Press Enter or comma to add a tag.
                        </p>
                        {err('tags')}
                    </div>

                    <div>
                        <label className={label}>Description</label>
                        <textarea
                            value={form.data.description}
                            onChange={(e) =>
                                form.setData('description', e.target.value)
                            }
                            rows={3}
                            placeholder="Sermon description..."
                            className="input-field resize-none"
                        />
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.is_published}
                            onChange={(e) =>
                                form.setData('is_published', e.target.checked)
                            }
                            className="size-4 rounded border-border"
                        />
                        <span className="text-sm text-foreground">
                            Published
                        </span>
                    </label>

                    <datalist id="sermon-series">
                        {seriesOptions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                    <datalist id="sermon-speakers">
                        {speakerOptions.map((s) => (
                            <option key={s} value={s} />
                        ))}
                    </datalist>
                </div>

                <div className="flex gap-3 border-t border-border p-5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline flex-1 justify-center py-2.5 text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={form.processing || !valid}
                        className="btn-primary flex-1 justify-center py-2.5 text-sm"
                    >
                        {form.processing ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Check size={16} />
                        )}
                        {sermon ? 'Save Changes' : 'Add Sermon'}
                    </button>
                </div>
            </div>
        </div>
    );
}

Sermons.layout = {
    breadcrumbs: [{ title: 'Sermons', href: index() }],
};
