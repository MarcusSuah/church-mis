import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    ExternalLink,
    Images,
    Pencil,
    Plus,
    Trash2,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
    DeleteConfirm,
    Field,
    inputCls,
    Modal,
    SaveButton,
    Toggle,
} from '@/components/ssbcms/records-ui';
import { formatShortDate } from '@/lib/format';
import { destroy, index, store, update } from '@/routes/gallery-albums';
import {
    destroy as destroyPhoto,
    store as storePhotos,
    update as updatePhoto,
} from '@/routes/gallery-albums/photos';
import RichTextEditor from '@/components/ssbcms/RichTextEditor';
type Photo = {
    id: number;
    url: string;
    caption: string | null;
    sort_order: number;
};
type Album = {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    event_date: string | null;
    department_id: string | null;
    sermon_id: string | null;
    event_id: string | null;
    is_published: boolean;
    tags: string[];
    department: string | null;
    sermon: string | null;
    event: string | null;
    photos: Photo[];
};
type Option = { id: string; name?: string; title?: string };
type Props = {
    albums: Album[];
    options: { departments: Option[]; sermons: Option[]; events: Option[] };
    maxPhotos: number;
};

const opts = { preserveScroll: true };

function AlbumEditor({
    album,
    options,
    onClose,
}: {
    album: Album | null;
    options: Props['options'];
    onClose: () => void;
}) {
    const form = useForm({
        title: album?.title ?? '',
        description: album?.description ?? '',
        event_date: album?.event_date ?? '',
        department_id: album?.department_id ?? '',
        sermon_id: album?.sermon_id ?? '',
        event_id: album?.event_id ?? '',
        tags: album?.tags.join(', ') ?? '',
        is_published: album?.is_published ?? true,
    });

    const save = () => {
        form.transform((d) => ({
            ...d,
            event_date: d.event_date || null,
            department_id: d.department_id || null,
            sermon_id: d.sermon_id || null,
            event_id: d.event_id || null,
        }));
        if (album) {
            form.patch(update.url(album.id), { ...opts, onSuccess: onClose });
        } else {
            form.post(store.url(), { ...opts, onSuccess: onClose });
        }
    };

    const select = (
        key: 'department_id' | 'sermon_id' | 'event_id',
        list: Option[],
        empty: string,
    ) => (
        <select
            className={inputCls}
            value={form.data[key]}
            onChange={(e) => form.setData(key, e.target.value)}
        >
            <option value="">{empty}</option>
            {list.map((o) => (
                <option key={o.id} value={o.id}>
                    {o.name ?? o.title}
                </option>
            ))}
        </select>
    );

    return (
        <Modal
            title={album ? `Edit “${album.title}”` : 'New album'}
            onClose={onClose}
            wide
            footer={
                <SaveButton
                    saving={form.processing}
                    label={album ? 'Save album' : 'Create album'}
                    onClick={save}
                />
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Title *" error={form.errors.title} span>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        maxLength={150}
                    />
                </Field>
                <Field label="Description" error={form.errors.description} span>
                    <RichTextEditor
                        value={form.data.description}
                        onChange={(html) => form.setData('description', html)}
                    />
                </Field>
                <Field label="Date" error={form.errors.event_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.event_date}
                        onChange={(e) =>
                            form.setData('event_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="Department" error={form.errors.department_id}>
                    {select('department_id', options.departments, 'None')}
                </Field>
                <Field label="Sermon" error={form.errors.sermon_id}>
                    {select('sermon_id', options.sermons, 'Not a sermon')}
                </Field>
                <Field label="Event" error={form.errors.event_id}>
                    {select('event_id', options.events, 'Not an event')}
                </Field>
                <Field label="Tags (comma separated)" error={form.errors.tags}>
                    <input
                        className={inputCls}
                        value={form.data.tags}
                        onChange={(e) => form.setData('tags', e.target.value)}
                        placeholder="easter, choir, youth"
                        maxLength={300}
                    />
                </Field>
                <Field label="Show on website">
                    <Toggle
                        value={form.data.is_published}
                        onChange={(v) => form.setData('is_published', v)}
                    />
                </Field>
            </div>
        </Modal>
    );
}

function PhotoManager({
    album,
    maxPhotos,
    onClose,
}: {
    album: Album;
    maxPhotos: number;
    onClose: () => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [captions, setCaptions] = useState<Record<number, string>>({});
    const room = maxPhotos - album.photos.length;

    const upload = (files: FileList | null) => {
        if (!files || files.length === 0) {
            return;
        }
        const picked = Array.from(files);
        if (picked.length > room) {
            setError(
                `You can add ${room} more photo(s). An album holds at most ${maxPhotos}.`,
            );
            return;
        }
        setError(null);
        router.post(
            storePhotos.url(album.id),
            { photos: picked },
            {
                ...opts,
                forceFormData: true,
                onStart: () => setUploading(true),
                onFinish: () => {
                    setUploading(false);
                    if (input.current) {
                        input.current.value = '';
                    }
                },
                onError: (errors) =>
                    setError(Object.values(errors)[0] ?? 'Upload failed.'),
            },
        );
    };

    const patch = (photo: Photo, data: Record<string, string | null>) =>
        router.patch(updatePhoto.url(photo.id), data, opts);

    return (
        <Modal
            title={`Photos · ${album.title}`}
            onClose={onClose}
            wide
            footer={
                <button
                    type="button"
                    onClick={onClose}
                    className="btn-primary text-sm"
                >
                    Done
                </button>
            }
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {album.photos.length} of {maxPhotos} photos. The first photo
                    is the album cover.
                </p>
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => upload(e.target.files)}
                />
                <button
                    type="button"
                    disabled={room <= 0 || uploading}
                    onClick={() => input.current?.click()}
                    className="btn-primary text-sm disabled:opacity-50"
                >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Add photos'}
                </button>
            </div>
            <p className="helper-text">
                JPG, PNG or WebP, up to 5 MB each. Select several at once.
            </p>
            {error && <p className="error-text">{error}</p>}

            {album.photos.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground">
                    <Images className="h-8 w-8 opacity-50" />
                    No photos yet.
                </div>
            ) : (
                <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {album.photos.map((p, i) => (
                        <li
                            key={p.id}
                            className="flex gap-3 rounded-xl border border-border p-2"
                        >
                            <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted">
                                <img
                                    src={p.url}
                                    alt={p.caption ?? ''}
                                    className="h-full w-full object-cover"
                                />
                                {i === 0 && (
                                    <span className="absolute top-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                        Cover
                                    </span>
                                )}
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-2">
                                <input
                                    className={`${inputCls} text-xs`}
                                    placeholder="Caption (optional)"
                                    maxLength={200}
                                    value={captions[p.id] ?? p.caption ?? ''}
                                    onChange={(e) =>
                                        setCaptions({
                                            ...captions,
                                            [p.id]: e.target.value,
                                        })
                                    }
                                    onBlur={() => {
                                        const value = captions[p.id];
                                        if (
                                            value !== undefined &&
                                            value !== (p.caption ?? '')
                                        ) {
                                            patch(p, {
                                                caption: value || null,
                                            });
                                        }
                                    }}
                                />
                                <div className="mt-auto flex gap-1">
                                    <button
                                        type="button"
                                        disabled={i === 0}
                                        onClick={() => patch(p, { move: 'up' })}
                                        className="btn-ghost p-1.5 disabled:opacity-30"
                                        aria-label="Move earlier"
                                    >
                                        <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={i === album.photos.length - 1}
                                        onClick={() =>
                                            patch(p, { move: 'down' })
                                        }
                                        className="btn-ghost p-1.5 disabled:opacity-30"
                                        aria-label="Move later"
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.delete(
                                                destroyPhoto.url(p.id),
                                                opts,
                                            )
                                        }
                                        className="btn-ghost ml-auto p-1.5 text-destructive"
                                        aria-label="Remove photo"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

export default function GalleryAlbums({ albums, options, maxPhotos }: Props) {
    const [editing, setEditing] = useState<Album | 'new' | null>(null);
    const [managingId, setManagingId] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<Album | null>(null);
    // Read the album from fresh props so uploads show straight away.
    const managing = albums.find((a) => a.id === managingId) ?? null;

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Gallery" />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Gallery</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Photo albums for the public gallery. Each album holds up
                        to {maxPhotos} photos and can be linked to a sermon, an
                        event or a department.
                    </p>
                </div>
                <div className="flex gap-2">
                    <a
                        href="/gallery"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost text-sm"
                    >
                        <ExternalLink className="h-4 w-4" />
                        View gallery
                    </a>
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New album
                    </button>
                </div>
            </div>

            {albums.length === 0 ? (
                <div className="card flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
                    <Images className="h-10 w-10 opacity-40" />
                    No albums yet. Create one, then add photos.
                </div>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {albums.map((a) => (
                        <article
                            key={a.id}
                            className="card flex flex-col overflow-hidden"
                        >
                            <button
                                type="button"
                                onClick={() => setManagingId(a.id)}
                                className="relative aspect-video bg-muted"
                                aria-label={`Manage photos for ${a.title}`}
                            >
                                {a.photos[0] ? (
                                    <img
                                        src={a.photos[0].url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center text-muted-foreground">
                                        <Images className="h-10 w-10 opacity-40" />
                                    </span>
                                )}
                                <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                                    {a.photos.length}/{maxPhotos}
                                </span>
                            </button>
                            <div className="flex flex-1 flex-col p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-foreground">
                                        {a.title}
                                    </h3>
                                    <span
                                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${a.is_published ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                                    >
                                        {a.is_published
                                            ? 'Published'
                                            : 'Hidden'}
                                    </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {[
                                        a.event_date &&
                                        formatShortDate(a.event_date),
                                        a.sermon && `Sermon: ${a.sermon}`,
                                        a.event && `Event: ${a.event}`,
                                        a.department,
                                    ]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </p>
                                {a.tags.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {a.tags.map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                                            >
                                                #{t}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-auto flex gap-1 border-t border-border pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setManagingId(a.id)}
                                        className="btn-ghost text-xs"
                                    >
                                        <Images className="h-4 w-4" /> Photos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditing(a)}
                                        className="btn-ghost text-xs"
                                    >
                                        <Pencil className="h-4 w-4" /> Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleting(a)}
                                        className="btn-ghost ml-auto p-2 text-destructive"
                                        aria-label={`Delete ${a.title}`}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            {editing && (
                <AlbumEditor
                    album={editing === 'new' ? null : editing}
                    options={options}
                    onClose={() => setEditing(null)}
                />
            )}
            {managing && (
                <PhotoManager
                    album={managing}
                    maxPhotos={maxPhotos}
                    onClose={() => setManagingId(null)}
                />
            )}
            <DeleteConfirm
                url={deleting ? destroy.url(deleting.id) : null}
                title="Delete album"
                message={
                    deleting
                        ? `Delete “${deleting.title}” and all its photos? This cannot be undone.`
                        : ''
                }
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}

GalleryAlbums.layout = {
    breadcrumbs: [{ title: 'Gallery', href: index() }],
};
