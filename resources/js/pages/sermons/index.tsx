import { useSearchParam } from '@/hooks/use-search-param';
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
import RichText from '@/components/ssbcms/RichText';
import RichTextEditor from '@/components/ssbcms/RichTextEditor';
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
    service_session: string | null;
    service_label: string;
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
    stats: {
        total: number;
        published: number;
        views: number;
        series: number;
    };
    seriesOptions: string[];
    speakerOptions: string[];
    serviceTypes: Record<string, string>;
    serviceSessions: Record<string, string>;
    can: {
        create: boolean;
        update: boolean;
        delete: boolean;
    };
};

const formatDate = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });

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

    if (!src || failed) {
        return <>{fallback}</>;
    }

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
        .then((response) => (response.ok ? response.json() : null))
        .catch(() => null) as Promise<{ view_count: number } | null>;
}

export default function Sermons({
    sermons,
    stats,
    seriesOptions,
    speakerOptions,
    serviceTypes,
    serviceSessions,
    can,
}: Props) {
    const [search, setSearch] = useState('');
    useSearchParam(setSearch);
    const [serviceFilter, setServiceFilter] = useState('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Sermon | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Sermon | null>(null);
    const [busy, setBusy] = useState(false);
    const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

    const views = (sermon: Sermon) =>
        viewCounts[sermon.id] ?? sermon.view_count;

    const selected = sermons.find((sermon) => sermon.id === selectedId) ?? null;

    const filtered = useMemo(() => {
        const query = search.toLowerCase().trim();

        return sermons.filter((sermon) => {
            const matchesService =
                serviceFilter === 'all' ||
                sermon.service_type === serviceFilter;

            const matchesSearch =
                !query ||
                sermon.title.toLowerCase().includes(query) ||
                sermon.speaker_name.toLowerCase().includes(query) ||
                sermon.service_label.toLowerCase().includes(query) ||
                sermon.series_name?.toLowerCase().includes(query) ||
                sermon.scripture_reference?.toLowerCase().includes(query) ||
                sermon.tags.some((tag) => tag.includes(query));

            return matchesService && matchesSearch;
        });
    }, [sermons, search, serviceFilter]);

    const open = (sermon: Sermon) => {
        setSelectedId(sermon.id);

        recordView(sermon.id).then((response) => {
            if (response) {
                setViewCounts((current) => ({
                    ...current,
                    [sermon.id]: response.view_count,
                }));
            }
        });
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        setBusy(true);

        router.delete(destroy.url(deleting.id), {
            preserveScroll: true,
            onSuccess: () => {
                if (selectedId === deleting.id) {
                    setSelectedId(null);
                }

                setDeleting(null);
            },
            onFinish: () => setBusy(false),
        });
    };

    const totalViews =
        stats.views +
        Object.entries(viewCounts).reduce(
            (total, [id, count]) =>
                total +
                count -
                (sermons.find((sermon) => sermon.id === id)?.view_count ??
                    count),
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

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {kpis.map((item) => (
                    <div
                        key={item.label}
                        className="card flex items-center gap-4 p-5"
                    >
                        <item.Icon
                            className={`size-5 shrink-0 ${item.color}`}
                        />

                        <div>
                            <p className="text-2xl font-bold text-foreground tabular-nums">
                                {item.value}
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {item.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />

                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search sermons, speakers, services, series..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>

                <select
                    value={serviceFilter}
                    onChange={(event) => setServiceFilter(event.target.value)}
                    className="min-w-40 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                    aria-label="Filter by service type"
                >
                    <option value="all">All Services</option>

                    {Object.entries(serviceTypes).map(([value, label]) => (
                        <option key={value} value={value}>
                            {label}
                        </option>
                    ))}
                </select>
            </div>

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
                            <Plus size={16} />
                            Add Sermon
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((sermon) => (
                        <div
                            key={sermon.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => open(sermon)}
                            onKeyDown={(event) => {
                                if (
                                    event.key === 'Enter' ||
                                    event.key === ' '
                                ) {
                                    event.preventDefault();
                                    open(sermon);
                                }
                            }}
                            className="card flex cursor-pointer gap-4 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                        >
                            <button
                                type="button"
                                onClick={() => open(sermon)}
                                className="relative h-[72px] w-28 shrink-0 overflow-hidden rounded-lg bg-muted"
                                aria-label={`Open ${sermon.title}`}
                            >
                                <Img
                                    src={sermon.thumbnail_url}
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

                                {!sermon.is_published && (
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
                                            onClick={() => open(sermon)}
                                        >
                                            {sermon.title}
                                        </h3>

                                        {sermon.series_name && (
                                            <p className="mt-0.5 text-xs text-primary/80">
                                                {sermon.series_name}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex shrink-0 gap-1">
                                        {can.update && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setEditing(sermon)
                                                }
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                aria-label={`Edit ${sermon.title}`}
                                            >
                                                <Pencil size={13} />
                                            </button>
                                        )}

                                        {can.delete && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDeleting(sermon)
                                                }
                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                aria-label={`Delete ${sermon.title}`}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <SpeakerAvatar
                                            src={sermon.speaker_photo}
                                            size="size-5"
                                        />

                                        {sermon.speaker_name}
                                    </span>

                                    {dot}

                                    <span>
                                        {formatDate(sermon.sermon_date)}
                                    </span>

                                    {dot}

                                    <span className="rounded-full bg-muted px-1.5 py-0.5">
                                        {sermon.service_label}
                                    </span>

                                    {sermon.scripture_reference && (
                                        <>
                                            {dot}

                                            <span className="italic">
                                                {sermon.scripture_reference}
                                            </span>
                                        </>
                                    )}

                                    {sermon.duration_minutes && (
                                        <>
                                            {dot}

                                            <span>
                                                {sermon.duration_minutes} min
                                            </span>
                                        </>
                                    )}

                                    {dot}

                                    <span className="flex items-center gap-1">
                                        <Eye size={11} />

                                        {views(sermon).toLocaleString()}
                                    </span>
                                </div>

                                {sermon.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {sermon.tags.slice(0, 4).map((tag) => (
                                            <button
                                                type="button"
                                                key={tag}
                                                onClick={() => setSearch(tag)}
                                                className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary hover:bg-primary/20"
                                                title={`Show sermons tagged "${tag}"`}
                                            >
                                                {tag}
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
                    serviceSessions={serviceSessions}
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

function SermonDrawer({
    sermon,
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
        const handleEscape = (event: globalThis.KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);

        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const resources = [
        {
            url: sermon.audio_url,
            label: 'Audio Recording',
            Icon: Music,
        },
        {
            url: sermon.video_url,
            label: 'Video Recording',
            Icon: Video,
        },
        {
            url: sermon.notes_url,
            label: 'Sermon Notes',
            Icon: FileText,
        },
    ].filter((resource) => resource.url);

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
                        src={sermon.thumbnail_url}
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
                        {sermon.series_name && (
                            <p className="mb-1 text-xs text-white/70">
                                {sermon.series_name}
                            </p>
                        )}

                        <h2 className="text-base leading-tight font-bold text-white">
                            {sermon.title}
                        </h2>
                    </div>
                </div>

                <div className="space-y-4 p-5">
                    <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                        <SpeakerAvatar
                            src={sermon.speaker_photo}
                            size="size-12"
                        />

                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {sermon.speaker_name}
                            </p>

                            <p className="text-xs text-muted-foreground">
                                {sermon.service_label} ·{' '}
                                {formatDate(sermon.sermon_date)}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            {
                                Icon: BookOpen,
                                label: 'Scripture',
                                value: sermon.scripture_reference || '—',
                            },
                            {
                                Icon: Clock,
                                label: 'Duration',
                                value: sermon.duration_minutes
                                    ? `${sermon.duration_minutes} min`
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
                                value: sermon.is_published
                                    ? 'Published'
                                    : 'Draft',
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

                    {sermon.description && (
                        <div>
                            <h4 className="mb-1.5 text-sm font-semibold text-foreground">
                                Description
                            </h4>

                            <RichText
                                html={sermon.description}
                                className="text-sm text-muted-foreground"
                            />
                        </div>
                    )}

                    {sermon.tags.length > 0 && (
                        <div>
                            <h4 className="mb-2 text-sm font-semibold text-foreground">
                                Tags
                            </h4>

                            <div className="flex flex-wrap gap-1.5">
                                {sermon.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
                                    >
                                        {tag}
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
                                {resources.map((resource) => (
                                    <a
                                        key={resource.label}
                                        href={resource.url!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 rounded-lg bg-muted p-2.5 text-sm text-foreground hover:bg-muted/80"
                                    >
                                        <resource.Icon
                                            size={16}
                                            className="text-primary"
                                        />

                                        {resource.label}
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

function SermonModal({
    sermon,
    serviceTypes,
    serviceSessions,
    seriesOptions,
    speakerOptions,
    onClose,
}: {
    sermon: Sermon | null;
    serviceTypes: Record<string, string>;
    serviceSessions: Record<string, string>;
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
        service_type: sermon?.service_type ?? 'sunday_worship',
        service_session: sermon?.service_session ?? '',
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
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean);

        if (next.length) {
            form.setData('tags', [...new Set([...form.data.tags, ...next])]);
        }

        setTagDraft('');
    };

    const onTagKey = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addTags(tagDraft);
        } else if (
            event.key === 'Backspace' &&
            !tagDraft &&
            form.data.tags.length
        ) {
            form.setData('tags', form.data.tags.slice(0, -1));
        }
    };

    const save = () => {
        const pendingTags = tagDraft.trim()
            ? [
                  ...new Set([
                      ...form.data.tags,
                      ...tagDraft
                          .split(',')
                          .map((tag) => tag.trim().toLowerCase())
                          .filter(Boolean),
                  ]),
              ]
            : form.data.tags;

        form.transform((data) => ({
            ...data,
            tags: pendingTags,
            duration_minutes: data.duration_minutes
                ? Number(data.duration_minutes)
                : null,
            service_session:
                data.service_type === 'sunday_worship'
                    ? data.service_session || null
                    : null,
            ...(sermon ? { _method: 'patch' } : {}),
        }));

        const options = {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: onClose,
        };

        if (sermon) {
            form.post(update.url(sermon.id), options);
        } else {
            form.post(store.url(), options);
        }
    };

    const label = 'mb-1 block text-xs font-medium text-muted-foreground';

    const error = (field: string) =>
        (form.errors as Record<string, string>)[field] && (
            <p className="error-text">
                {(form.errors as Record<string, string>)[field]}
            </p>
        );

    const textField = (
        field: 'title' | 'speaker_name' | 'series_name' | 'scripture_reference',
        labelText: string,
        placeholder: string,
        list?: string,
    ) => (
        <div>
            <label className={label}>{labelText}</label>

            <input
                value={form.data[field]}
                onChange={(event) => form.setData(field, event.target.value)}
                placeholder={placeholder}
                list={list}
                className="input-field"
            />

            {error(field)}
        </div>
    );

    const isValid =
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
                    {textField('title', 'Sermon Title *', 'Sermon title')}

                    <div className="grid grid-cols-2 gap-3">
                        {textField(
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
                                onChange={(event) =>
                                    form.setData(
                                        'sermon_date',
                                        event.target.value,
                                    )
                                }
                                className="input-field"
                            />

                            {error('sermon_date')}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={label}>Service Type *</label>

                            <select
                                value={form.data.service_type}
                                onChange={(event) => {
                                    const value = event.target.value;

                                    form.setData('service_type', value);

                                    if (value !== 'sunday_worship') {
                                        form.setData('service_session', '');
                                    }
                                }}
                                className="input-field"
                            >
                                {Object.entries(serviceTypes).map(
                                    ([value, serviceLabel]) => (
                                        <option key={value} value={value}>
                                            {serviceLabel}
                                        </option>
                                    ),
                                )}
                            </select>

                            {error('service_type')}
                        </div>

                        <div>
                            <label className={label}>Duration (minutes)</label>

                            <input
                                type="number"
                                min={1}
                                value={form.data.duration_minutes}
                                onChange={(event) =>
                                    form.setData(
                                        'duration_minutes',
                                        event.target.value,
                                    )
                                }
                                placeholder="e.g. 45"
                                className="input-field"
                            />

                            {error('duration_minutes')}
                        </div>
                    </div>

                    {form.data.service_type === 'sunday_worship' && (
                        <div>
                            <label className={label}>Service Session</label>

                            <select
                                value={form.data.service_session}
                                onChange={(event) =>
                                    form.setData(
                                        'service_session',
                                        event.target.value,
                                    )
                                }
                                className="input-field"
                            >
                                <option value="">No specific service</option>

                                {Object.entries(serviceSessions).map(
                                    ([value, sessionLabel]) => (
                                        <option key={value} value={value}>
                                            {sessionLabel}
                                        </option>
                                    ),
                                )}
                            </select>

                            <p className="helper-text">
                                Leave empty for a branch with only one Sunday
                                worship service.
                            </p>

                            {error('service_session')}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {textField(
                            'series_name',
                            'Series Name',
                            'Sermon series',
                            'sermon-series',
                        )}

                        {textField(
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
                        <div>
                            <label className={label}>Audio Recording</label>

                            <input
                                type="file"
                                accept="audio/*"
                                onChange={(event) =>
                                    form.setData(
                                        'audio_file',
                                        event.target.files?.[0] ?? null,
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

                            {error('audio_file')}
                        </div>

                        <div>
                            <label className={label}>Video Recording</label>

                            <input
                                type="file"
                                accept="video/*"
                                onChange={(event) =>
                                    form.setData(
                                        'video_file',
                                        event.target.files?.[0] ?? null,
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

                            {error('video_file')}
                        </div>

                        <div>
                            <label className={label}>Sermon Notes</label>

                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={(event) =>
                                    form.setData(
                                        'notes_file',
                                        event.target.files?.[0] ?? null,
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

                            {error('notes_file')}
                        </div>
                    </div>

                    <div>
                        <label className={label}>Tags</label>

                        <div className="input-field flex min-h-10 flex-wrap items-center gap-1.5">
                            {form.data.tags.map((tag) => (
                                <span
                                    key={tag}
                                    className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                                >
                                    {tag}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'tags',
                                                form.data.tags.filter(
                                                    (item) => item !== tag,
                                                ),
                                            )
                                        }
                                        aria-label={`Remove tag ${tag}`}
                                    >
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}

                            <input
                                value={tagDraft}
                                onChange={(event) =>
                                    setTagDraft(event.target.value)
                                }
                                onKeyDown={onTagKey}
                                onBlur={() => {
                                    if (tagDraft.trim()) {
                                        addTags(tagDraft);
                                    }
                                }}
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

                        {error('tags')}
                    </div>

                    <div>
                        <label className={label}>Description</label>

                        <RichTextEditor
                            value={form.data.description}
                            onChange={(html) =>
                                form.setData('description', html)
                            }
                        />

                        {error('description')}
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.is_published}
                            onChange={(event) =>
                                form.setData(
                                    'is_published',
                                    event.target.checked,
                                )
                            }
                            className="size-4 rounded border-border"
                        />

                        <span className="text-sm text-foreground">
                            Published
                        </span>
                    </label>

                    <datalist id="sermon-series">
                        {seriesOptions.map((option) => (
                            <option key={option} value={option} />
                        ))}
                    </datalist>

                    <datalist id="sermon-speakers">
                        {speakerOptions.map((option) => (
                            <option key={option} value={option} />
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
                        disabled={form.processing || !isValid}
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
    breadcrumbs: [
        {
            title: 'Sermons',
            href: index(),
        },
    ],
};
