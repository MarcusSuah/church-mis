import { Head, router, useForm } from '@inertiajs/react';
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

type Announcement = {
    id: string;
    title: string;
    content: string;
    category: string;
    priority: string;
    author_name: string | null;
    banner_url: string | null;
    start_date: string | null;
    end_date: string | null;
    is_pinned: boolean;
    is_published: boolean;
    target_audience: string;
    created_at: string;
};
type Lists = {
    categories: string[];
    priorities: string[];
    audiences: string[];
};
type Stats = {
    total: number;
    pinned: number;
    urgent: number;
    published: number;
};
type Props = Lists & {
    records: Announcement[];
    pagination: PageMeta;
    filters: { search: string; category: string; priority: string };
    stats: Stats;
    focus: Announcement | null;
    can: Can;
};

const PRIORITY: Record<string, string> = {
    Normal: 'bg-muted text-muted-foreground',
    High: 'bg-info/10 text-info',
    Urgent: 'bg-danger/10 text-danger',
};
const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

function Thumb({ src, alt }: { src: string | null; alt: string }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return null;
    return (
        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg">
            <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover"
                onError={() => setFailed(true)}
            />
        </div>
    );
}

export default function Announcements({
    records,
    pagination,
    filters,
    stats,
    focus,
    can,
    ...lists
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Announcement | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);

    // The server filters, sorts (pinned first, then newest) and paginates.
    const filtered = records;
    const pager = { pageItems: records };
    const toggle = (a: Announcement, field: 'is_pinned' | 'is_published') =>
        router.patch(
            `/announcements/${a.id}/toggle`,
            { field },
            { preserveScroll: true },
        );
    const selCls =
        'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none';

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Announcements" />
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Announcements
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage church announcements and notices — published ones
                        appear in the Member Portal
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        New Announcement
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    flip
                    label="Total"
                    value={stats.total}
                    icon="MegaphoneIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    flip
                    label="Pinned"
                    value={stats.pinned}
                    icon="BookmarkIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
                <Kpi
                    flip
                    label="Urgent"
                    value={stats.urgent}
                    icon="ExclamationTriangleIcon"
                    color="text-danger"
                    bg="bg-danger/10"
                />
                <Kpi
                    flip
                    label="Published"
                    value={stats.published}
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
                        placeholder="Search announcements..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={values.category}
                    onChange={(e) => set('category', e.target.value)}
                    className={selCls}
                >
                    <option value="All">All Categories</option>
                    {lists.categories.map((c) => (
                        <option key={c}>{c}</option>
                    ))}
                </select>
                <select
                    value={values.priority}
                    onChange={(e) => set('priority', e.target.value)}
                    className={selCls}
                >
                    <option value="All">All Priorities</option>
                    {lists.priorities.map((p) => (
                        <option key={p}>{p}</option>
                    ))}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Icon
                        name="MegaphoneIcon"
                        size={40}
                        className="mx-auto mb-3 opacity-30"
                    />
                    <p className="font-medium">No announcements found</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl">
                    <div className="space-y-3">
                        {pager.pageItems.map((a) => (
                            <div
                                key={a.id}
                                className={`overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-sm ${a.is_pinned ? 'border-accent/40' : 'border-border'}`}
                            >
                                <div className="flex gap-4 p-4">
                                    <Thumb
                                        src={a.banner_url}
                                        alt={`Banner for announcement: ${a.title}`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1.5 flex items-start justify-between gap-2">
                                            <div className="flex min-w-0 items-center gap-2">
                                                {a.is_pinned && (
                                                    <Icon
                                                        name="BookmarkIcon"
                                                        variant="solid"
                                                        size={14}
                                                        className="shrink-0 text-accent"
                                                    />
                                                )}
                                                <h3 className="line-clamp-1 text-sm leading-snug font-semibold text-foreground">
                                                    {a.title}
                                                </h3>
                                            </div>
                                            {can.update && (
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggle(
                                                                a,
                                                                'is_pinned',
                                                            )
                                                        }
                                                        title={
                                                            a.is_pinned
                                                                ? 'Unpin'
                                                                : 'Pin'
                                                        }
                                                        className={`rounded-lg p-1.5 transition-colors ${a.is_pinned ? 'text-accent hover:bg-accent/10' : 'text-muted-foreground hover:bg-muted'}`}
                                                    >
                                                        <Icon
                                                            name="BookmarkIcon"
                                                            size={13}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            toggle(
                                                                a,
                                                                'is_published',
                                                            )
                                                        }
                                                        title={
                                                            a.is_published
                                                                ? 'Unpublish'
                                                                : 'Publish'
                                                        }
                                                        className={`rounded-lg p-1.5 transition-colors ${a.is_published ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted'}`}
                                                    >
                                                        <Icon
                                                            name={
                                                                a.is_published
                                                                    ? 'EyeIcon'
                                                                    : 'EyeSlashIcon'
                                                            }
                                                            size={13}
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setEditing(a)
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        aria-label="Edit"
                                                    >
                                                        <Icon
                                                            name="PencilIcon"
                                                            size={13}
                                                        />
                                                    </button>
                                                    {can.delete && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteUrl(
                                                                    `/announcements/${a.id}`,
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
                                            )}
                                        </div>
                                        <div className="mb-2">
                                            <ReadMore
                                                text={a.content}
                                                limit={180}
                                            />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            <span
                                                className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY[a.priority] ?? PRIORITY.Normal}`}
                                            >
                                                {a.priority}
                                            </span>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                                {a.category}
                                            </span>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                                                {a.target_audience}
                                            </span>
                                            {a.author_name && (
                                                <span className="text-muted-foreground">
                                                    by {a.author_name}
                                                </span>
                                            )}
                                            <span className="text-muted-foreground">
                                                {fmt(a.created_at)}
                                            </span>
                                            {(a.start_date || a.end_date) && (
                                                <span className="text-muted-foreground">
                                                    · Shows{' '}
                                                    {a.start_date
                                                        ? fmt(a.start_date)
                                                        : 'now'}{' '}
                                                    –{' '}
                                                    {a.end_date
                                                        ? fmt(a.end_date)
                                                        : 'until removed'}
                                                </span>
                                            )}
                                            {!a.is_published && (
                                                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground italic">
                                                    Draft
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <ServerPaginatorCard meta={pagination} />
                </div>
            )}

            {editing && (
                <AnnouncementModal
                    record={editing === 'new' ? null : editing}
                    lists={lists}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Announcement?"
                message="This announcement will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function AnnouncementModal({
    record,
    lists,
    onClose,
}: {
    record: Announcement | null;
    lists: Lists;
    onClose: () => void;
}) {
    const form = useForm({
        title: record?.title ?? '',
        content: record?.content ?? '',
        category: record?.category ?? 'General',
        priority: record?.priority ?? 'Normal',
        author_name: record?.author_name ?? '',
        target_audience: record?.target_audience ?? 'All Members',
        start_date: record?.start_date ?? '',
        end_date: record?.end_date ?? '',
        banner_url: record?.banner_url ?? '',
        is_pinned: record?.is_pinned ?? false,
        is_published: record?.is_published ?? true,
    });
    const save = () =>
        record
            ? form.patch(`/announcements/${record.id}`, {
                  preserveScroll: true,
                  onSuccess: onClose,
              })
            : form.post('/announcements', {
                  preserveScroll: true,
                  onSuccess: onClose,
              });

    return (
        <Modal
            title={record ? 'Edit Announcement' : 'New Announcement'}
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
                        disabled={!form.data.title || !form.data.content}
                        label={record ? 'Save Changes' : 'Post Announcement'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Title *" error={form.errors.title} span>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        placeholder="Announcement title"
                    />
                </Field>
                <Field label="Content *" error={form.errors.content} span>
                    <textarea
                        rows={4}
                        className={`${inputCls} resize-none`}
                        value={form.data.content}
                        onChange={(e) =>
                            form.setData('content', e.target.value)
                        }
                        placeholder="Announcement content..."
                    />
                </Field>
                <Field label="Category" error={form.errors.category}>
                    <select
                        className={inputCls}
                        value={form.data.category}
                        onChange={(e) =>
                            form.setData('category', e.target.value)
                        }
                    >
                        {lists.categories.map((c) => (
                            <option key={c}>{c}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Priority" error={form.errors.priority}>
                    <select
                        className={inputCls}
                        value={form.data.priority}
                        onChange={(e) =>
                            form.setData('priority', e.target.value)
                        }
                    >
                        {lists.priorities.map((p) => (
                            <option key={p}>{p}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Author">
                    <input
                        className={inputCls}
                        value={form.data.author_name}
                        onChange={(e) =>
                            form.setData('author_name', e.target.value)
                        }
                        placeholder="Defaults to you"
                    />
                </Field>
                <Field label="Target Audience" error={form.errors.target_audience}>
                    <select
                        className={inputCls}
                        value={form.data.target_audience}
                        onChange={(e) =>
                            form.setData('target_audience', e.target.value)
                        }
                    >
                        {lists.audiences.map((a) => (
                            <option key={a}>{a}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Start Date" error={form.errors.start_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.start_date}
                        onChange={(e) =>
                            form.setData('start_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="End Date" error={form.errors.end_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.end_date}
                        onChange={(e) =>
                            form.setData('end_date', e.target.value)
                        }
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
                <div className="flex gap-4 sm:col-span-2">
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.is_pinned}
                            onChange={(e) =>
                                form.setData('is_pinned', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-border"
                        />
                        <span className="text-sm text-foreground">
                            Pin to top
                        </span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={form.data.is_published}
                            onChange={(e) =>
                                form.setData('is_published', e.target.checked)
                            }
                            className="h-4 w-4 rounded border-border"
                        />
                        <span className="text-sm text-foreground">
                            Published
                        </span>
                    </label>
                </div>
            </div>
        </Modal>
    );
}
