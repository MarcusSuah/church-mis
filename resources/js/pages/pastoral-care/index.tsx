import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import MemberPicker from '@/components/ssbcms/MemberPicker';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import ReadMore from '@/components/ssbcms/ReadMore';
import {
    DeleteConfirm,
    Field,
    fmtDate,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type CareCase = {
    id: string;
    member_id: string | null;
    member_name: string;
    care_type: string;
    description: string;
    assigned_pastor: string | null;
    status: string;
    priority: string;
    visit_date: string | null;
    follow_up_date: string | null;
    location: string | null;
    notes: string | null;
    outcome: string | null;
    is_confidential: boolean;
    created_at: string;
};

type Stats = {
    total: number;
    open: number;
    in_progress: number;
    urgent: number;
};
type Props = {
    records: CareCase[];
    pagination: PageMeta;
    filters: { search: string; type: string; status: string; priority: string };
    stats: Stats;
    focus: CareCase | null;
    careTypes: string[];
    statuses: string[];
    priorities: string[];
    pastors: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const STATUS_CONFIG: Record<
    string,
    { color: string; bg: string; dot: string }
> = {
    Open: { color: 'text-info', bg: 'bg-info/10', dot: 'bg-info' },
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
    Referred: {
        color: 'text-muted-foreground',
        bg: 'bg-muted',
        dot: 'bg-muted-foreground',
    },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string }> = {
    Normal: { color: 'text-muted-foreground', bg: 'bg-muted' },
    High: { color: 'text-info', bg: 'bg-info/10' },
    Urgent: { color: 'text-danger', bg: 'bg-danger/10' },
};

function Badges({ c, big = false }: { c: CareCase; big?: boolean }) {
    const sc = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.Open;
    const pc = PRIORITY_CONFIG[c.priority] ?? PRIORITY_CONFIG.Normal;
    const pad = big ? 'px-2.5 py-1' : 'px-2 py-0.5';
    return (
        <div className="flex flex-wrap items-center gap-2">
            <span
                className={`inline-flex items-center gap-1.5 rounded-full text-xs font-medium ${pad} ${sc.bg} ${sc.color}`}
            >
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                {c.status}
            </span>
            <span
                className={`rounded-full text-xs font-medium ${pad} ${pc.bg} ${pc.color}`}
            >
                {c.priority}
            </span>
            {c.is_confidential && (
                <span
                    className={`flex items-center gap-1 rounded-full bg-muted text-xs text-muted-foreground ${pad}`}
                >
                    <Icon name="LockClosedIcon" size={9} />
                    Confidential
                </span>
            )}
        </div>
    );
}

export default function PastoralCare({
    records,
    pagination,
    filters,
    stats,
    focus,
    careTypes,
    statuses,
    priorities,
    pastors,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<CareCase | 'new' | null>(null);
    const [selected, setSelected] = useState<CareCase | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);

    const filtered = records;
    const pager = { pageItems: records };
    const closeCase = (c: CareCase) =>
        router.patch(
            `/pastoral-care/${c.id}/status`,
            { status: 'Completed' },
            { preserveScroll: true, onSuccess: () => setSelected(null) },
        );

    const selectCls =
        'rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none';

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Pastoral Care" />

            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Pastoral Care
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track counseling, visits, and member care cases
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        New Case
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    flip
                    label="Total Cases"
                    value={stats.total}
                    icon="UserGroupIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    flip
                    label="Open"
                    value={stats.open}
                    icon="FolderOpenIcon"
                    color="text-info"
                    bg="bg-info/10"
                />
                <Kpi
                    flip
                    label="In Progress"
                    value={stats.in_progress}
                    icon="ArrowPathIcon"
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
                        placeholder="Search cases, members, pastors..."
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={values.type}
                    onChange={(e) => set('type', e.target.value)}
                    className={selectCls}
                    aria-label="Care type"
                >
                    <option value="All">All Care Types</option>
                    {careTypes.map((t) => (
                        <option key={t}>{t}</option>
                    ))}
                </select>
                <select
                    value={values.status}
                    onChange={(e) => set('status', e.target.value)}
                    className={selectCls}
                    aria-label="Status"
                >
                    <option value="All">All Statuses</option>
                    {statuses.map((s) => (
                        <option key={s}>{s}</option>
                    ))}
                </select>
                <select
                    value={values.priority}
                    onChange={(e) => set('priority', e.target.value)}
                    className={selectCls}
                    aria-label="Priority"
                >
                    <option value="All">All Priorities</option>
                    {priorities.map((p) => (
                        <option key={p}>{p}</option>
                    ))}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                    <Icon
                        name="UserGroupIcon"
                        size={40}
                        className="mx-auto mb-3 opacity-30"
                    />
                    <p className="font-medium">No pastoral care cases found</p>
                </div>
            ) : (
                <div>
                    <div className="space-y-3">
                        {pager.pageItems.map((c) => (
                            <div
                                key={c.id}
                                className={`card p-4 transition-shadow hover:shadow-sm ${c.priority === 'Urgent' ? 'border-danger/30' : ''}`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1.5">
                                            <Badges c={c} />
                                        </div>
                                        <h3
                                            className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary"
                                            onClick={() => setSelected(c)}
                                        >
                                            {c.member_name}
                                        </h3>
                                        <p className="mt-0.5 text-xs text-primary/80">
                                            {c.care_type}
                                        </p>
                                        <div className="mt-1">
                                            <ReadMore
                                                text={c.description}
                                                limit={160}
                                            />
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                            {c.assigned_pastor && (
                                                <span className="flex items-center gap-1">
                                                    <Icon
                                                        name="UserIcon"
                                                        size={10}
                                                    />
                                                    {c.assigned_pastor}
                                                </span>
                                            )}
                                            {c.visit_date && (
                                                <span className="flex items-center gap-1">
                                                    <Icon
                                                        name="CalendarIcon"
                                                        size={10}
                                                    />
                                                    Visit:{' '}
                                                    {fmtDate(c.visit_date)}
                                                </span>
                                            )}
                                            {c.follow_up_date && (
                                                <span className="flex items-center gap-1">
                                                    <Icon
                                                        name="ArrowPathIcon"
                                                        size={10}
                                                    />
                                                    Follow-up:{' '}
                                                    {fmtDate(c.follow_up_date)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        <div className="flex gap-1">
                                            {can.update && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setEditing(c)
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    aria-label="Edit case"
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
                                                            `/pastoral-care/${c.id}`,
                                                        )
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
                                                    aria-label="Delete case"
                                                >
                                                    <Icon
                                                        name="TrashIcon"
                                                        size={13}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                        {can.update &&
                                            c.status !== 'Completed' && (
                                                <button
                                                    type="button"
                                                    onClick={() => closeCase(c)}
                                                    className="flex items-center gap-1 rounded-lg bg-success/10 px-2 py-1 text-xs font-medium text-success transition-colors hover:bg-success/20"
                                                >
                                                    <Icon
                                                        name="CheckCircleIcon"
                                                        size={11}
                                                    />
                                                    Close Case
                                                </button>
                                            )}
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
                    <div className="slide-up w-full max-w-md overflow-y-auto border-l border-border bg-background">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-base font-bold text-foreground">
                                Care Case Details
                            </h2>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                                aria-label="Close"
                            >
                                <Icon name="XMarkIcon" size={18} />
                            </button>
                        </div>
                        <div className="space-y-4 p-5">
                            <Badges c={selected} big />
                            <div>
                                <h3 className="text-lg font-bold text-foreground">
                                    {selected.member_name}
                                </h3>
                                <p className="mt-0.5 text-sm text-primary/80">
                                    {selected.care_type}
                                </p>
                            </div>
                            <div className="rounded-xl bg-muted/50 p-4">
                                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                                    {selected.description}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {
                                        label: 'Assigned Pastor',
                                        value:
                                            selected.assigned_pastor ||
                                            'Unassigned',
                                    },
                                    {
                                        label: 'Location',
                                        value: selected.location || '—',
                                    },
                                    {
                                        label: 'Visit Date',
                                        value: fmtDate(selected.visit_date),
                                    },
                                    {
                                        label: 'Follow-up Date',
                                        value: fmtDate(selected.follow_up_date),
                                    },
                                ].map((i) => (
                                    <div
                                        key={i.label}
                                        className="rounded-lg bg-muted/50 p-3"
                                    >
                                        <p className="mb-0.5 text-xs text-muted-foreground">
                                            {i.label}
                                        </p>
                                        <p className="text-sm font-medium text-foreground">
                                            {i.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {selected.notes && (
                                <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                                    <h4 className="mb-1 text-xs font-semibold text-accent">
                                        Pastoral Notes
                                    </h4>
                                    <p className="text-sm whitespace-pre-line text-muted-foreground">
                                        {selected.notes}
                                    </p>
                                </div>
                            )}
                            {selected.outcome && (
                                <div className="rounded-lg border border-success/20 bg-success/5 p-3">
                                    <h4 className="mb-1 text-xs font-semibold text-success">
                                        Outcome
                                    </h4>
                                    <p className="text-sm whitespace-pre-line text-muted-foreground">
                                        {selected.outcome}
                                    </p>
                                </div>
                            )}
                            {can.update && (
                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditing(selected);
                                            setSelected(null);
                                        }}
                                        className="btn-primary flex-1 justify-center py-2.5 text-sm"
                                    >
                                        <Icon name="PencilIcon" size={14} />
                                        Edit Case
                                    </button>
                                    {selected.status !== 'Completed' && (
                                        <button
                                            type="button"
                                            onClick={() => closeCase(selected)}
                                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-success/10 py-2.5 text-sm font-medium text-success hover:bg-success/20"
                                        >
                                            <Icon
                                                name="CheckCircleIcon"
                                                size={14}
                                            />
                                            Close Case
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editing && (
                <CaseModal
                    record={editing === 'new' ? null : editing}
                    careTypes={careTypes}
                    statuses={statuses}
                    priorities={priorities}
                    pastors={pastors}
                    onClose={() => setEditing(null)}
                />
            )}

            <DeleteConfirm
                url={deleteUrl}
                title="Delete Care Case?"
                message="This pastoral care case will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

function CaseModal({
    record,
    careTypes,
    statuses,
    priorities,
    pastors,
    onClose,
}: {
    record: CareCase | null;
    careTypes: string[];
    statuses: string[];
    priorities: string[];
    pastors: string[];
    onClose: () => void;
}) {
    const form = useForm({
        member_id: record?.member_id ?? '',
        member_name: record?.member_name ?? '',
        care_type: record?.care_type ?? 'General Counseling',
        description: record?.description ?? '',
        assigned_pastor: record?.assigned_pastor ?? '',
        status: record?.status ?? 'Open',
        priority: record?.priority ?? 'Normal',
        visit_date: record?.visit_date ?? '',
        follow_up_date: record?.follow_up_date ?? '',
        location: record?.location ?? '',
        notes: record?.notes ?? '',
        outcome: record?.outcome ?? '',
        is_confidential: record?.is_confidential ?? true,
    });
    const pastorOptions =
        form.data.assigned_pastor &&
        !pastors.includes(form.data.assigned_pastor)
            ? [form.data.assigned_pastor, ...pastors]
            : pastors;

    const save = () => {
        const o = { preserveScroll: true, onSuccess: onClose };
        if (record) form.patch(`/pastoral-care/${record.id}`, o);
        else form.post('/pastoral-care', o);
    };

    return (
        <Modal
            title={record ? 'Edit Care Case' : 'New Care Case'}
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
                            !form.data.member_name || !form.data.description
                        }
                        label={record ? 'Save Changes' : 'Create Case'}
                        onClick={save}
                    />
                </>
            }
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Link to Member">
                    <MemberPicker
                        value={form.data.member_id}
                        label={form.data.member_name}
                        noneLabel="— Not a member / Visitor —"
                        onChange={(m) =>
                            form.setData((d) => ({
                                ...d,
                                member_id: m?.id ?? '',
                                member_name: m ? m.name : d.member_name,
                            }))
                        }
                    />
                </Field>
                <Field label="Member Name *" error={form.errors.member_name}>
                    <input
                        className={inputCls}
                        value={form.data.member_name}
                        onChange={(e) =>
                            form.setData('member_name', e.target.value)
                        }
                        placeholder="Member name"
                    />
                </Field>
                <Field label="Care Type">
                    <select
                        className={inputCls}
                        value={form.data.care_type}
                        onChange={(e) =>
                            form.setData('care_type', e.target.value)
                        }
                    >
                        {careTypes.map((t) => (
                            <option key={t}>{t}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Assigned Pastor">
                    <select
                        className={inputCls}
                        value={form.data.assigned_pastor}
                        onChange={(e) =>
                            form.setData('assigned_pastor', e.target.value)
                        }
                    >
                        <option value="">Unassigned</option>
                        {pastorOptions.map((p) => (
                            <option key={p}>{p}</option>
                        ))}
                    </select>
                </Field>
                <Field
                    label="Description *"
                    error={form.errors.description}
                    span
                >
                    <textarea
                        rows={3}
                        className={`${inputCls} resize-none`}
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        placeholder="Describe the care need..."
                    />
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
                <Field label="Priority">
                    <select
                        className={inputCls}
                        value={form.data.priority}
                        onChange={(e) =>
                            form.setData('priority', e.target.value)
                        }
                    >
                        {priorities.map((p) => (
                            <option key={p}>{p}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Visit Date" error={form.errors.visit_date}>
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.visit_date}
                        onChange={(e) =>
                            form.setData('visit_date', e.target.value)
                        }
                    />
                </Field>
                <Field
                    label="Follow-up Date"
                    error={form.errors.follow_up_date}
                >
                    <input
                        type="date"
                        className={inputCls}
                        value={form.data.follow_up_date}
                        onChange={(e) =>
                            form.setData('follow_up_date', e.target.value)
                        }
                    />
                </Field>
                <Field label="Location" span>
                    <input
                        className={inputCls}
                        value={form.data.location}
                        onChange={(e) =>
                            form.setData('location', e.target.value)
                        }
                        placeholder="Meeting location"
                    />
                </Field>
                <Field label="Pastoral Notes" span>
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        placeholder="Internal notes..."
                    />
                </Field>
                <Field label="Outcome" span>
                    <textarea
                        rows={2}
                        className={`${inputCls} resize-none`}
                        value={form.data.outcome}
                        onChange={(e) =>
                            form.setData('outcome', e.target.value)
                        }
                        placeholder="Case outcome or resolution..."
                    />
                </Field>
                <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
                    <input
                        type="checkbox"
                        checked={form.data.is_confidential}
                        onChange={(e) =>
                            form.setData('is_confidential', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-border"
                    />
                    <span className="text-sm text-foreground">
                        Mark as Confidential
                    </span>
                </label>
            </div>
        </Modal>
    );
}
