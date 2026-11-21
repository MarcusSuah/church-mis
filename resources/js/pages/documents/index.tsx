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
    Modal,
    SaveButton,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type Doc = {
    id: string;
    title: string;
    description: string | null;
    category: string;
    file_name: string | null;
    file_size_kb: number | null;
    file_type: string | null;
    thumbnail_url: string | null;
    version: string | null;
    author_name: string | null;
    department: string | null;
    is_public: boolean;
    is_archived: boolean;
    tags: string[];
    download_count: number;
    has_file: boolean;
    external_url: string | null;
    created_at: string;
    updated_at: string;
};
type Stats = {
    total: number;
    public: number;
    archived: number;
    downloads: number;
    categories: Record<string, number>;
    base_total: number;
};
type Props = {
    records: Doc[];
    pagination: PageMeta;
    filters: { search: string; archived: string; category: string };
    stats: Stats;
    focus: Doc | null;
    categories: string[];
    departments: string[];
    can: Can;
};

const CAT: Record<string, { color: string; bg: string; icon: string }> = {
    Policy: {
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        icon: 'ShieldCheckIcon',
    },
    Minutes: {
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        icon: 'ClipboardDocumentListIcon',
    },
    Financial: {
        color: 'text-green-700',
        bg: 'bg-green-100',
        icon: 'BanknotesIcon',
    },
    Legal: { color: 'text-red-700', bg: 'bg-red-100', icon: 'ScaleIcon' },
    Forms: {
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        icon: 'DocumentTextIcon',
    },
    Bulletin: {
        color: 'text-indigo-700',
        bg: 'bg-indigo-100',
        icon: 'NewspaperIcon',
    },
    Newsletter: {
        color: 'text-cyan-700',
        bg: 'bg-cyan-100',
        icon: 'EnvelopeIcon',
    },
    Other: { color: 'text-gray-700', bg: 'bg-gray-100', icon: 'FolderIcon' },
};
const FILE_ICON: Record<string, string> = {
    PDF: 'DocumentTextIcon',
    XLSX: 'TableCellsIcon',
    XLS: 'TableCellsIcon',
    CSV: 'TableCellsIcon',
    DOCX: 'DocumentIcon',
    DOC: 'DocumentIcon',
    PNG: 'PhotoIcon',
    JPG: 'PhotoIcon',
    JPEG: 'PhotoIcon',
};
const size = (kb: number | null) =>
    !kb ? '—' : kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
const download = (d: Doc) => {
    window.location.href = `/documents/${d.id}/download`;
    setTimeout(() => router.reload({ only: ['records'] }), 1500);
};

function Thumb({ d, className }: { d: Doc; className: string }) {
    const [failed, setFailed] = useState(false);
    return d.thumbnail_url && !failed ? (
        <img
            src={d.thumbnail_url}
            alt={d.title}
            className={className}
            onError={() => setFailed(true)}
        />
    ) : (
        <div className="flex h-full w-full items-center justify-center">
            <Icon
                name={FILE_ICON[d.file_type ?? ''] ?? 'DocumentIcon'}
                size={48}
                className="text-muted-foreground/30"
            />
        </div>
    );
}

export default function Documents({
    records,
    pagination,
    filters,
    stats,
    focus,
    categories,
    departments,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const category = values.category;
    const archived = values.archived === 'yes';
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [editing, setEditing] = useState<Doc | 'new' | null>(null);
    const [selected, setSelected] = useState<Doc | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);

    // Search, archive filter, category and paging are applied by the server.
    const filtered = records;
    const pager = { pageItems: records };
    const archive = (d: Doc) =>
        router.patch(
            `/documents/${d.id}/archive`,
            {},
            { preserveScroll: true },
        );

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Document Management" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Document Management
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Manage church documents, policies, and files
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        Upload Document
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    {
                        label: 'Total Documents',
                        value: stats.total,
                        icon: 'DocumentDuplicateIcon',
                        color: 'bg-blue-500',
                    },
                    {
                        label: 'Public Documents',
                        value: stats.public,
                        icon: 'GlobeAltIcon',
                        color: 'bg-green-500',
                    },
                    {
                        label: 'Archived',
                        value: stats.archived,
                        icon: 'ArchiveBoxIcon',
                        color: 'bg-amber-500',
                    },
                    {
                        label: 'Total Downloads',
                        value: stats.downloads,
                        icon: 'ArrowDownTrayIcon',
                        color: 'bg-purple-500',
                    },
                ].map((k) => (
                    <div
                        key={k.label}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                    >
                        <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.color}`}
                        >
                            <Icon
                                name={k.icon}
                                size={18}
                                className="text-white"
                            />
                        </div>
                        <div>
                            <p className="text-xl font-bold text-foreground">
                                {k.value}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {k.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Icon
                        name="MagnifyingGlassIcon"
                        size={16}
                        className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                        type="text"
                        placeholder="Search documents, tags..."
                        value={values.search}
                        onChange={(e) => set('search', e.target.value)}
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => set('archived', archived ? 'no' : 'yes')}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${archived ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                >
                    <Icon name="ArchiveBoxIcon" size={15} />
                    {archived ? 'Archived' : 'Active'}
                </button>
                <div className="flex overflow-hidden rounded-lg border border-border bg-card">
                    {(['grid', 'list'] as const).map((v) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setView(v)}
                            className={`p-2 transition-colors ${view === v ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
                            aria-label={`${v} view`}
                        >
                            <Icon
                                name={
                                    v === 'grid'
                                        ? 'Squares2X2Icon'
                                        : 'ListBulletIcon'
                                }
                                size={16}
                            />
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {['All', ...categories].map((c) => (
                    <button
                        key={c}
                        type="button"
                        onClick={() => set('category', c)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${category === c ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                    >
                        {c}{' '}
                        <span className="opacity-70">
                            (
                            {c === 'All'
                                ? stats.base_total
                                : (stats.categories[c] ?? 0)}
                            )
                        </span>
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Icon
                        name="FolderOpenIcon"
                        size={40}
                        className="mx-auto mb-3 text-muted-foreground/40"
                    />
                    <p className="text-muted-foreground">No documents found</p>
                </div>
            ) : view === 'grid' ? (
                <div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {pager.pageItems.map((d) => {
                            const cfg = CAT[d.category] ?? CAT.Other;
                            return (
                                <div
                                    key={d.id}
                                    className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md"
                                >
                                    <div className="relative h-36 overflow-hidden bg-muted">
                                        <Thumb
                                            d={d}
                                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <span
                                            className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                                        >
                                            {d.category}
                                        </span>
                                        {d.is_public && (
                                            <span className="absolute top-2 right-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                                Public
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h3 className="mb-1 line-clamp-2 text-sm font-semibold text-foreground">
                                            {d.title}
                                        </h3>
                                        <div className="mb-2">
                                            <ReadMore
                                                text={d.description}
                                                limit={80}
                                            />
                                        </div>
                                        <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                                            <span>
                                                {d.file_type || 'DOC'} ·{' '}
                                                {size(d.file_size_kb)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Icon
                                                    name="ArrowDownTrayIcon"
                                                    size={11}
                                                />
                                                {d.download_count}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setSelected(d)}
                                                className="flex-1 rounded-lg border border-border py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => download(d)}
                                                disabled={!d.has_file}
                                                className="flex-1 rounded-lg bg-primary/10 py-1.5 text-center text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
                                            >
                                                Download
                                            </button>
                                            {can.update && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditing(d)
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    aria-label="Edit"
                                                >
                                                    <Icon
                                                        name="PencilSquareIcon"
                                                        size={14}
                                                    />
                                                </button>
                                            )}
                                            {can.delete && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteUrl(
                                                            `/documents/${d.id}`,
                                                        )
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                    aria-label="Delete"
                                                >
                                                    <Icon
                                                        name="TrashIcon"
                                                        size={14}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <ServerPaginatorCard meta={pagination} />
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[800px] text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/40">
                                    {[
                                        'Document',
                                        'Category',
                                        'Department',
                                        'Size',
                                        'Downloads',
                                        'Date',
                                        '',
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
                            <tbody>
                                {pager.pageItems.map((d) => {
                                    const cfg = CAT[d.category] ?? CAT.Other;
                                    return (
                                        <tr
                                            key={d.id}
                                            className="border-b border-border transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelected(d)
                                                    }
                                                    className="flex items-center gap-3 text-left"
                                                >
                                                    <div
                                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}
                                                    >
                                                        <Icon
                                                            name={cfg.icon}
                                                            size={14}
                                                            className={
                                                                cfg.color
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground hover:text-primary">
                                                            {d.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {d.file_type ||
                                                                'DOC'}{' '}
                                                            · v{d.version}
                                                        </p>
                                                    </div>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                                                >
                                                    {d.category}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {d.department || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {size(d.file_size_kb)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {d.download_count}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {fmt(d.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        disabled={!d.has_file}
                                                        onClick={() =>
                                                            download(d)
                                                        }
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-40"
                                                        aria-label="Download"
                                                    >
                                                        <Icon
                                                            name="ArrowDownTrayIcon"
                                                            size={14}
                                                        />
                                                    </button>
                                                    {can.update && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditing(
                                                                        d,
                                                                    )
                                                                }
                                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                                aria-label="Edit"
                                                            >
                                                                <Icon
                                                                    name="PencilSquareIcon"
                                                                    size={14}
                                                                />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    archive(d)
                                                                }
                                                                title={
                                                                    d.is_archived
                                                                        ? 'Restore'
                                                                        : 'Archive'
                                                                }
                                                                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-amber-50 hover:text-amber-600"
                                                            >
                                                                <Icon
                                                                    name="ArchiveBoxIcon"
                                                                    size={14}
                                                                />
                                                            </button>
                                                        </>
                                                    )}
                                                    {can.delete && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteUrl(
                                                                    `/documents/${d.id}`,
                                                                )
                                                            }
                                                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                            aria-label="Delete"
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
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <ServerPaginatorCard meta={pagination} />
                </div>
            )}

            {selected && (
                <Modal
                    wide={false}
                    title="Document Details"
                    onClose={() => setSelected(null)}
                    footer={
                        <>
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        archive(selected);
                                        setSelected(null);
                                    }}
                                    className="btn-outline text-sm"
                                >
                                    <Icon name="ArchiveBoxIcon" size={14} />
                                    {selected.is_archived
                                        ? 'Restore'
                                        : 'Archive'}
                                </button>
                            )}
                            {can.update && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(selected);
                                        setSelected(null);
                                    }}
                                    className="btn-outline text-sm"
                                >
                                    Edit
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={!selected.has_file}
                                onClick={() => download(selected)}
                                className="btn-primary text-sm disabled:opacity-40"
                            >
                                <Icon name="ArrowDownTrayIcon" size={15} />
                                Download
                            </button>
                        </>
                    }
                >
                    <div className="space-y-3">
                        {selected.thumbnail_url && (
                            <div className="h-40 overflow-hidden rounded-xl bg-muted">
                                <Thumb
                                    d={selected}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}
                        <h3 className="text-lg font-bold text-foreground">
                            {selected.title}
                        </h3>
                        <ReadMore
                            text={selected.description}
                            limit={300}
                            className="text-sm text-muted-foreground"
                        />
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {[
                                ['Category', selected.category],
                                ['Department', selected.department || '—'],
                                ['Author', selected.author_name || '—'],
                                ['Version', `v${selected.version}`],
                                [
                                    'File',
                                    selected.file_name ||
                                        selected.file_type ||
                                        '—',
                                ],
                                ['File Size', size(selected.file_size_kb)],
                                ['Downloads', String(selected.download_count)],
                                [
                                    'Visibility',
                                    selected.is_public ? 'Public' : 'Private',
                                ],
                                ['Added', fmt(selected.created_at)],
                            ].map(([l, v]) => (
                                <div key={l}>
                                    <p className="text-xs text-muted-foreground">
                                        {l}
                                    </p>
                                    <p className="font-medium break-all text-foreground">
                                        {v}
                                    </p>
                                </div>
                            ))}
                        </div>
                        {selected.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {selected.tags.map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {editing && (
                <DocumentModal
                    record={editing === 'new' ? null : editing}
                    categories={categories}
                    departments={departments}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Document?"
                message="The document and its file will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function DocumentModal({
    record,
    categories,
    departments,
    onClose,
}: {
    record: Doc | null;
    categories: string[];
    departments: string[];
    onClose: () => void;
}) {
    const form = useForm<{
        title: string;
        description: string;
        category: string;
        department: string;
        version: string;
        author_name: string;
        file: File | null;
        file_url: string;
        thumbnail_url: string;
        tags: string;
        is_public: boolean;
        _method?: string;
    }>({
        title: record?.title ?? '',
        description: record?.description ?? '',
        category: record?.category ?? 'Other',
        department: record?.department ?? 'Administration',
        version: record?.version ?? '1.0',
        author_name: record?.author_name ?? '',
        file: null,
        file_url: record?.external_url ?? '',
        thumbnail_url: record?.thumbnail_url ?? '',
        tags: (record?.tags ?? []).join(', '),
        is_public: record?.is_public ?? false,
        ...(record ? { _method: 'patch' } : {}),
    });
    // Files go as multipart; PATCH is sent as POST + _method so the upload works.
    const save = () =>
        form.post(record ? `/documents/${record.id}` : '/documents', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: onClose,
        });

    return (
        <Modal
            title={record ? 'Edit Document' : 'Upload Document'}
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
                        disabled={!form.data.title}
                        label={record ? 'Update' : 'Save Document'}
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
                        placeholder="Document title"
                    />
                </Field>
                <Field label="Description" span>
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        placeholder="Brief description..."
                    />
                </Field>
                <Field label="Category">
                    <select
                        className={inputCls}
                        value={form.data.category}
                        onChange={(e) =>
                            form.setData('category', e.target.value)
                        }
                    >
                        {categories.map((c) => (
                            <option key={c}>{c}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Department">
                    <select
                        className={inputCls}
                        value={form.data.department}
                        onChange={(e) =>
                            form.setData('department', e.target.value)
                        }
                    >
                        {departments.map((d) => (
                            <option key={d}>{d}</option>
                        ))}
                    </select>
                </Field>
                <Field
                    label={record?.has_file ? 'Replace File' : 'File'}
                    error={form.errors.file}
                    span
                >
                    <input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp,.zip"
                        onChange={(e) =>
                            form.setData('file', e.target.files?.[0] ?? null)
                        }
                        className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                        PDF, Word, Excel, PowerPoint, images or ZIP — up to 25
                        MB.{' '}
                        {record?.file_name && `Current: ${record.file_name}`}
                    </p>
                </Field>
                <Field
                    label="…or link to a file (URL)"
                    error={form.errors.file_url}
                    span
                >
                    <input
                        className={inputCls}
                        value={form.data.file_url}
                        onChange={(e) =>
                            form.setData('file_url', e.target.value)
                        }
                        placeholder="https://drive.google.com/…"
                    />
                </Field>
                <Field label="Version">
                    <input
                        className={inputCls}
                        value={form.data.version}
                        onChange={(e) =>
                            form.setData('version', e.target.value)
                        }
                        placeholder="1.0"
                    />
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
                <Field label="Tags (comma-separated)" span>
                    <input
                        className={inputCls}
                        value={form.data.tags}
                        onChange={(e) => form.setData('tags', e.target.value)}
                        placeholder="policy, 2026, governance"
                    />
                </Field>
                <div className="sm:col-span-2">
                    <ImageUploadField
                        label="Thumbnail (optional)"
                        value={form.data.thumbnail_url}
                        onChange={(url) => form.setData('thumbnail_url', url)}
                        variant="banner"
                    />
                </div>
                <label className="flex cursor-pointer items-center gap-3 sm:col-span-2">
                    <input
                        type="checkbox"
                        checked={form.data.is_public}
                        onChange={(e) =>
                            form.setData('is_public', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">
                        Make this document public (members can download it)
                    </span>
                </label>
                {form.progress && (
                    <progress
                        value={form.progress.percentage}
                        max="100"
                        className="w-full sm:col-span-2"
                    />
                )}
            </div>
        </Modal>
    );
}
