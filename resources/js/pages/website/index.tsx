import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import {
    DeleteConfirm,
    Field,
    inputCls,
    Modal,
    SaveButton,
} from '@/components/ssbcms/records-ui';

type Slide = {
    id: number;
    eyebrow: string | null;
    title: string;
    subtitle: string | null;
    image_url: string | null;
    primary_label: string | null;
    primary_url: string | null;
    secondary_label: string | null;
    secondary_url: string | null;
    is_active: boolean;
    sort_order: number;
};
type Belief = {
    id: number;
    title: string;
    body: string;
    is_active: boolean;
    sort_order: number;
};
type Props = {
    content: Record<string, string | null>;
    slides: Slide[];
    beliefs: Belief[];
};

const opts = { preserveScroll: true };

export default function Website({ content, slides, beliefs }: Props) {
    const [tab, setTab] = useState<'content' | 'slides' | 'beliefs'>('content');
    const [slide, setSlide] = useState<Slide | 'new' | null>(null);
    const [belief, setBelief] = useState<Belief | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Website" />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Website</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        What visitors see on the public site. Only active items
                        are shown.
                    </p>
                </div>
                <a
                    href="/"
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-sm"
                >
                    <Icon name="GlobeAltIcon" size={16} />
                    View website
                </a>
            </div>

            <div className="flex gap-1 border-b border-border">
                {[
                    ['content', 'Text & service times'],
                    [
                        'slides',
                        `Hero slides (${slides.filter((s) => s.is_active).length} active)`,
                    ],
                    ['beliefs', 'Statement of faith'],
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id as typeof tab)}
                        className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium ${tab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'content' && <ContentForm content={content} />}

            {tab === 'slides' && (
                <div className="space-y-3">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setSlide('new')}
                            className="btn-primary text-sm"
                        >
                            <Icon name="PlusIcon" size={16} />
                            Add slide
                        </button>
                    </div>
                    {slides.map((s) => (
                        <div
                            key={s.id}
                            className="card flex items-center gap-4 p-3"
                        >
                            <div className="h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-primary">
                                {s.image_url && (
                                    <img
                                        src={s.image_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground">
                                    {s.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {s.subtitle}
                                </p>
                            </div>
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                            >
                                {s.is_active ? 'Active' : 'Hidden'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSlide(s)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                                aria-label="Edit"
                            >
                                <Icon name="PencilIcon" size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setDeleteUrl(
                                        `/website-content/slides/${s.id}`,
                                    )
                                }
                                className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                aria-label="Delete"
                            >
                                <Icon name="TrashIcon" size={14} />
                            </button>
                        </div>
                    ))}
                    {slides.length === 0 && (
                        <p className="card p-8 text-center text-sm text-muted-foreground">
                            No slides yet — the home page shows the church name
                            instead.
                        </p>
                    )}
                </div>
            )}

            {tab === 'beliefs' && (
                <div className="space-y-3">
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setBelief('new')}
                            className="btn-primary text-sm"
                        >
                            <Icon name="PlusIcon" size={16} />
                            Add belief
                        </button>
                    </div>
                    {beliefs.map((b) => (
                        <div
                            key={b.id}
                            className="card flex items-start gap-4 p-4"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-foreground">
                                    {b.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {b.body}
                                </p>
                            </div>
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${b.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}
                            >
                                {b.is_active ? 'Active' : 'Hidden'}
                            </span>
                            <button
                                type="button"
                                onClick={() => setBelief(b)}
                                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                                aria-label="Edit"
                            >
                                <Icon name="PencilIcon" size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setDeleteUrl(
                                        `/website-content/beliefs/${b.id}`,
                                    )
                                }
                                className="rounded p-1.5 text-muted-foreground hover:bg-danger/10 hover:text-danger"
                                aria-label="Delete"
                            >
                                <Icon name="TrashIcon" size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {slide && (
                <SlideModal
                    slide={slide === 'new' ? null : slide}
                    onClose={() => setSlide(null)}
                />
            )}
            {belief && (
                <BeliefModal
                    belief={belief === 'new' ? null : belief}
                    onClose={() => setBelief(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete this item?"
                message="It will be removed from the website."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function ContentForm({ content }: { content: Record<string, string | null> }) {
    const form = useForm(
        Object.fromEntries(
            Object.entries(content).map(([k, v]) => [k, v ?? '']),
        ) as Record<string, string>,
    );
    const text = (key: string, label: string, rows = 0, placeholder = '') => (
        <Field label={label} error={form.errors[key]} span={rows > 0}>
            {rows > 0 ? (
                <textarea
                    rows={rows}
                    className={`${inputCls} resize-y`}
                    value={form.data[key] ?? ''}
                    onChange={(e) => form.setData(key, e.target.value)}
                    placeholder={placeholder}
                />
            ) : (
                <input
                    className={inputCls}
                    value={form.data[key] ?? ''}
                    onChange={(e) => form.setData(key, e.target.value)}
                    placeholder={placeholder}
                />
            )}
        </Field>
    );
    return (
        <div className="card space-y-6 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {text(
                    'tagline',
                    'Tagline (under the church name)',
                    0,
                    'Established in faith',
                )}
                {text('city', 'City')}
                {text('country', 'Country')}
                {text('description', 'Short description', 2)}
                {text('mission', 'Mission', 3)}
                {text('vision', 'Vision', 3)}
                {text('pastor_message', 'Word from the pastor (home page)', 3)}
                {text(
                    'story',
                    'Our story (About page — leave a blank line between paragraphs)',
                    6,
                )}
            </div>
            <div>
                <p className="section-header mb-3">Service times</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {text(
                        'service_sunday_school',
                        'Sunday School',
                        0,
                        'Sundays, 8:30 AM',
                    )}
                    {text(
                        'service_sunday_worship',
                        'Sunday Worship',
                        0,
                        'Sundays, 10:00 AM',
                    )}
                    {text(
                        'service_bible_study',
                        'Bible Study',
                        0,
                        'Wednesdays, 6:00 PM',
                    )}
                    {text(
                        'service_prayer_meeting',
                        'Prayer Meeting',
                        0,
                        'Fridays, 6:00 PM',
                    )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    Leave a service blank to hide it. Church name, address,
                    phone, email and logo are edited in Church Settings.
                </p>
            </div>
            <div>
                <p className="section-header mb-3">About page</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {text(
                        'about_heading',
                        'Heading above "Our story"',
                        0,
                        'A heritage of faith',
                    )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="space-y-2">
                            <ImageUploadField
                                label={`Photo ${n}${n === 1 ? ' (shown largest)' : ''}`}
                                value={form.data[`about_image_${n}`]}
                                onChange={(url) =>
                                    form.setData(`about_image_${n}`, url)
                                }
                                variant="banner"
                            />
                            <input
                                className={inputCls}
                                value={form.data[`about_caption_${n}`] ?? ''}
                                onChange={(e) =>
                                    form.setData(
                                        `about_caption_${n}`,
                                        e.target.value,
                                    )
                                }
                                placeholder="Caption (optional)"
                                maxLength={120}
                            />
                            {form.errors[`about_image_${n}`] && (
                                <p className="error-text">
                                    {form.errors[`about_image_${n}`]}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    Photos appear on the About page in this order. Remove a
                    photo to hide it.
                </p>
            </div>
            <div>
                <p className="section-header mb-3">Contact page</p>
                {text(
                    'contact_intro',
                    'Introduction under the "Contact us" heading',
                    2,
                )}
            </div>
            <div className="flex justify-end">
                <SaveButton
                    saving={form.processing}
                    label="Save website text"
                    onClick={() => form.put('/website-content/content', opts)}
                />
            </div>
        </div>
    );
}

function SlideModal({
    slide,
    onClose,
}: {
    slide: Slide | null;
    onClose: () => void;
}) {
    const form = useForm({
        eyebrow: slide?.eyebrow ?? '',
        title: slide?.title ?? '',
        subtitle: slide?.subtitle ?? '',
        image_url: slide?.image_url ?? '',
        primary_label: slide?.primary_label ?? 'Become a member',
        primary_url: slide?.primary_url ?? '/public-member-registration',
        secondary_label: slide?.secondary_label ?? 'Plan your visit',
        secondary_url: slide?.secondary_url ?? '/about',
        is_active: slide?.is_active ?? true,
        sort_order: String(slide?.sort_order ?? 0),
    });
    const save = () =>
        slide
            ? form.patch(`/website-content/slides/${slide.id}`, {
                  ...opts,
                  onSuccess: onClose,
              })
            : form.post('/website-content/slides', {
                  ...opts,
                  onSuccess: onClose,
              });
    return (
        <Modal
            title={slide ? 'Edit hero slide' : 'Add hero slide'}
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
                        label="Save slide"
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <ImageUploadField
                        label="Background image (wide photo works best)"
                        value={form.data.image_url}
                        onChange={(url) => form.setData('image_url', url)}
                        variant="banner"
                    />
                </div>
                <Field
                    label="Small line above title"
                    error={form.errors.eyebrow}
                >
                    <input
                        className={inputCls}
                        value={form.data.eyebrow}
                        onChange={(e) =>
                            form.setData('eyebrow', e.target.value)
                        }
                        placeholder="Welcome home"
                    />
                </Field>
                <Field label="Order" error={form.errors.sort_order}>
                    <input
                        type="number"
                        min={0}
                        className={inputCls}
                        value={form.data.sort_order}
                        onChange={(e) =>
                            form.setData('sort_order', e.target.value)
                        }
                    />
                </Field>
                <Field label="Title *" error={form.errors.title} span>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                </Field>
                <Field label="Subtitle" error={form.errors.subtitle} span>
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.subtitle}
                        onChange={(e) =>
                            form.setData('subtitle', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Main button text"
                    error={form.errors.primary_label}
                >
                    <input
                        className={inputCls}
                        value={form.data.primary_label}
                        onChange={(e) =>
                            form.setData('primary_label', e.target.value)
                        }
                    />
                </Field>
                <Field label="Main button link" error={form.errors.primary_url}>
                    <input
                        className={inputCls}
                        value={form.data.primary_url}
                        onChange={(e) =>
                            form.setData('primary_url', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Second button text"
                    error={form.errors.secondary_label}
                >
                    <input
                        className={inputCls}
                        value={form.data.secondary_label}
                        onChange={(e) =>
                            form.setData('secondary_label', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Second button link"
                    error={form.errors.secondary_url}
                >
                    <input
                        className={inputCls}
                        value={form.data.secondary_url}
                        onChange={(e) =>
                            form.setData('secondary_url', e.target.value)
                        }
                    />
                </Field>
                <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
                    <input
                        type="checkbox"
                        checked={form.data.is_active}
                        onChange={(e) =>
                            form.setData('is_active', e.target.checked)
                        }
                        className="rounded border-border"
                    />
                    Show on the website
                </label>
            </div>
        </Modal>
    );
}

function BeliefModal({
    belief,
    onClose,
}: {
    belief: Belief | null;
    onClose: () => void;
}) {
    const form = useForm({
        title: belief?.title ?? '',
        body: belief?.body ?? '',
        is_active: belief?.is_active ?? true,
        sort_order: String(belief?.sort_order ?? 0),
    });
    const save = () =>
        belief
            ? form.patch(`/website-content/beliefs/${belief.id}`, {
                  ...opts,
                  onSuccess: onClose,
              })
            : form.post('/website-content/beliefs', {
                  ...opts,
                  onSuccess: onClose,
              });
    return (
        <Modal
            wide={false}
            title={belief ? 'Edit belief' : 'Add belief'}
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
                        disabled={!form.data.title || !form.data.body}
                        label="Save"
                        onClick={save}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <Field label="Title *" error={form.errors.title}>
                    <input
                        className={inputCls}
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                    />
                </Field>
                <Field label="Statement *" error={form.errors.body}>
                    <textarea
                        rows={4}
                        className={`${inputCls} resize-none`}
                        value={form.data.body}
                        onChange={(e) => form.setData('body', e.target.value)}
                    />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Order" error={form.errors.sort_order}>
                        <input
                            type="number"
                            min={0}
                            className={inputCls}
                            value={form.data.sort_order}
                            onChange={(e) =>
                                form.setData('sort_order', e.target.value)
                            }
                        />
                    </Field>
                    <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={(e) =>
                                form.setData('is_active', e.target.checked)
                            }
                            className="rounded border-border"
                        />
                        Show on the website
                    </label>
                </div>
            </div>
        </Modal>
    );
}
