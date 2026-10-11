import { Head, useForm } from '@inertiajs/react';
import { ExternalLink, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
    DeleteConfirm,
    Field,
    inputCls,
    Modal,
    SaveButton,
    Toggle,
} from '@/components/ssbcms/records-ui';
import FormattedText from '@/components/site/formatted-text';
import { formatDateTime } from '@/lib/format';
import { destroy, index, store, update } from '@/routes/site-pages';

type SitePage = {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    body: string;
    is_published: boolean;
    show_in_footer: boolean;
    sort_order: number;
    url: string;
    core: boolean;
    updated_by: string | null;
    updated_at: string | null;
};

const opts = { preserveScroll: true };

function PageEditor({
    page,
    onClose,
}: {
    page: SitePage | null;
    onClose: () => void;
}) {
    const form = useForm({
        title: page?.title ?? '',
        slug: page?.slug ?? '',
        summary: page?.summary ?? '',
        body: page?.body ?? '',
        is_published: page?.is_published ?? true,
        show_in_footer: page?.show_in_footer ?? true,
        sort_order: page?.sort_order ?? 0,
    });
    const [preview, setPreview] = useState(false);

    const save = () =>
        page
            ? form.patch(update.url(page.id), { ...opts, onSuccess: onClose })
            : form.post(store.url(), { ...opts, onSuccess: onClose });

    return (
        <Modal
            title={page ? `Edit “${page.title}”` : 'New page'}
            onClose={onClose}
            wide
            footer={
                <SaveButton
                    saving={form.processing}
                    label={page ? 'Save page' : 'Create page'}
                    onClick={save}
                />
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Title *" error={form.errors.title}>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        maxLength={150}
                    />
                </Field>
                <Field label="Web address" error={form.errors.slug}>
                    <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">
                            /pages/
                        </span>
                        <input
                            className={inputCls}
                            value={form.data.slug}
                            onChange={(e) =>
                                form.setData(
                                    'slug',
                                    e.target.value.toLowerCase(),
                                )
                            }
                            placeholder="created from the title"
                            disabled={page?.core}
                            maxLength={120}
                        />
                    </div>
                    {page?.core && (
                        <p className="helper-text">
                            Fixed address — linked from the website and the
                            registration form.
                        </p>
                    )}
                </Field>
                <Field
                    label="Summary (shown under the title)"
                    error={form.errors.summary}
                    span
                >
                    <input
                        className={inputCls}
                        value={form.data.summary}
                        onChange={(e) =>
                            form.setData('summary', e.target.value)
                        }
                        maxLength={300}
                    />
                </Field>
            </div>

            <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                        Page text *
                    </span>
                    <button
                        type="button"
                        onClick={() => setPreview((v) => !v)}
                        className="text-xs font-medium text-primary hover:underline"
                    >
                        {preview ? 'Edit text' : 'Preview'}
                    </button>
                </div>
                {preview ? (
                    <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-border p-4">
                        <FormattedText text={form.data.body} />
                    </div>
                ) : (
                    <textarea
                        rows={16}
                        className={`${inputCls} resize-y font-mono text-xs`}
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                    />
                )}
                {form.errors.body && (
                    <p className="error-text">{form.errors.body}</p>
                )}
                <p className="helper-text">
                    Leave a blank line between paragraphs. Start a line with “##
                    ” for a heading and “- ” for a bullet point.
                </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Published">
                    <Toggle
                        value={form.data.is_published}
                        onChange={(v) => form.setData('is_published', v)}
                    />
                </Field>
                <Field label="Link in website footer">
                    <Toggle
                        value={form.data.show_in_footer}
                        onChange={(v) => form.setData('show_in_footer', v)}
                    />
                </Field>
                <Field label="Order" error={form.errors.sort_order}>
                    <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={form.data.sort_order}
                        onChange={(e) =>
                            form.setData('sort_order', Number(e.target.value))
                        }
                    />
                </Field>
            </div>
        </Modal>
    );
}

export default function SitePages({ pages }: { pages: SitePage[] }) {
    const [editing, setEditing] = useState<SitePage | 'new' | null>(null);
    const [deleting, setDeleting] = useState<SitePage | null>(null);

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Website Pages" />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Website Pages</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Privacy Policy, Terms & Conditions, Terms of Use and
                        other pages. Published pages marked for the footer are
                        linked at the bottom of every website page.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setEditing('new')}
                    className="btn-primary text-sm"
                >
                    <Plus className="h-4 w-4" />
                    New page
                </button>
            </div>

            <div className="card divide-y divide-border">
                {pages.length === 0 && (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                        No pages yet. Run the SitePageSeeder or add one.
                    </p>
                )}
                {pages.map((p) => (
                    <div
                        key={p.id}
                        className="flex flex-wrap items-center gap-4 p-4"
                    >
                        <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground">
                                {p.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                                /pages/{p.slug}
                                {p.updated_at &&
                                    ` · updated ${formatDateTime(p.updated_at)}${p.updated_by ? ` by ${p.updated_by}` : ''}`}
                            </p>
                        </div>
                        <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.is_published ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                        >
                            {p.is_published ? 'Published' : 'Hidden'}
                        </span>
                        {p.show_in_footer && p.is_published && (
                            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                                In footer
                            </span>
                        )}
                        <div className="flex gap-1">
                            {p.is_published && (
                                <a
                                    href={p.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-ghost p-2"
                                    aria-label={`View ${p.title}`}
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                            <button
                                type="button"
                                onClick={() => setEditing(p)}
                                className="btn-ghost p-2"
                                aria-label={`Edit ${p.title}`}
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                            {!p.core && (
                                <button
                                    type="button"
                                    onClick={() => setDeleting(p)}
                                    className="btn-ghost p-2 text-destructive"
                                    aria-label={`Delete ${p.title}`}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {editing && (
                <PageEditor
                    page={editing === 'new' ? null : editing}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleting ? destroy.url(deleting.id) : null}
                title="Delete page"
                message={
                    deleting
                        ? `Delete “${deleting.title}”? Links to it will stop working.`
                        : ''
                }
                onClose={() => setDeleting(null)}
            />
        </div>
    );
}

SitePages.layout = {
    breadcrumbs: [{ title: 'Website Pages', href: index() }],
};
