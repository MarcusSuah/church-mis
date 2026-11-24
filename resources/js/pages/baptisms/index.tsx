import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import MemberPicker from '@/components/ssbcms/MemberPicker';
import { ServerPaginatorCard } from '@/components/ssbcms/Pagination';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import {
    Avatar,
    DeleteConfirm,
    EmptyState,
    Field,
    fmtDate,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    SearchBox,
    Toggle,
    useAutoOpen,
} from '@/components/ssbcms/records-ui';
import { useListFilters } from '@/hooks/use-list-filters';

type Baptism = {
    id: string;
    member_id: string | null;
    candidate_name: string;
    candidate_photo: string | null;
    baptism_date: string;
    baptism_type: string;
    officiant: string | null;
    location: string | null;
    witnesses: string | null;
    certificate_number: string | null;
    certificate_issued: boolean;
    certificate_date: string | null;
    notes: string | null;
};

type Stats = {
    total: number;
    this_year: number;
    issued: number;
    pending: number;
};
type Props = {
    records: Baptism[];
    pagination: PageMeta;
    filters: { search: string; type: string; certificate: string };
    stats: Stats;
    focus: Baptism | null;
    types: string[];
    can: { create: boolean; update: boolean; delete: boolean };
};

const TYPE_LABELS: Record<string, string> = {
    immersion: 'Immersion',
    sprinkling: 'Sprinkling',
    pouring: 'Pouring',
};
const TYPE_COLORS: Record<string, string> = {
    immersion: 'bg-primary/10 text-primary',
    sprinkling: 'bg-info/10 text-info',
    pouring: 'bg-accent/10 text-accent',
};

export default function Baptisms({
    records,
    pagination,
    filters,
    stats,
    focus,
    types,
    can,
}: Props) {
    const { values, set } = useListFilters(filters);
    const [editing, setEditing] = useState<Baptism | 'new' | null>(null);
    const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
    useAutoOpen(records, setEditing, focus);
    const filtered = records;
    const thisYear = String(new Date().getFullYear());

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Baptism Records" />
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="page-title">Baptism Records</h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track baptism ceremonies and certificate issuance
                    </p>
                </div>
                {can.create && (
                    <button
                        type="button"
                        onClick={() => setEditing('new')}
                        className="btn-primary text-sm"
                    >
                        <Icon name="PlusIcon" size={16} />
                        Add Baptism Record
                    </button>
                )}
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    label="Total Baptisms"
                    value={stats.total}
                    icon="SparklesIcon"
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
                    label="Certificates Issued"
                    value={stats.issued}
                    icon="DocumentCheckIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    label="Pending Certificates"
                    value={stats.pending}
                    icon="ClockIcon"
                    color="text-warning"
                    bg="bg-warning/10"
                />
            </div>

            <div className="card mb-4 p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <SearchBox
                        value={values.search}
                        onChange={(v) => set('search', v)}
                        placeholder="Search name, certificate..."
                    />
                    <select
                        value={values.type}
                        onChange={(e) => set('type', e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                        <option value="All">All Types</option>
                        {types.map((t) => (
                            <option key={t} value={t}>
                                {TYPE_LABELS[t] ?? t}
                            </option>
                        ))}
                    </select>
                    <select
                        value={values.certificate}
                        onChange={(e) => set('certificate', e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                        <option value="All">All Certificates</option>
                        <option value="Issued">Issued</option>
                        <option value="Pending">Pending</option>
                    </select>
                    <span className="ml-auto text-sm text-muted-foreground">
                        {pagination.total} record
                        {pagination.total !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="card overflow-hidden">
                {filtered.length === 0 ? (
                    <EmptyState
                        card={false}
                        icon="SparklesIcon"
                        title="No baptism records found"
                        text="Add the first baptism record to get started."
                    />
                ) : (
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {[
                                        'Candidate',
                                        'Date',
                                        'Type',
                                        'Officiant',
                                        'Location',
                                        'Certificate',
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
                                                    src={r.candidate_photo}
                                                />
                                                <span className="text-sm font-medium text-foreground">
                                                    {r.candidate_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {fmtDate(r.baptism_date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[r.baptism_type] ?? 'bg-muted text-muted-foreground'}`}
                                            >
                                                {TYPE_LABELS[r.baptism_type] ??
                                                    r.baptism_type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {r.officiant || '—'}
                                        </td>
                                        <td className="max-w-[160px] truncate px-4 py-3 text-sm text-muted-foreground">
                                            {r.location || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 text-xs font-medium ${r.certificate_issued ? 'text-success' : 'text-warning'}`}
                                                >
                                                    <Icon
                                                        name={
                                                            r.certificate_issued
                                                                ? 'CheckCircleIcon'
                                                                : 'ClockIcon'
                                                        }
                                                        size={13}
                                                    />
                                                    {r.certificate_issued
                                                        ? 'Issued'
                                                        : 'Pending'}
                                                </span>
                                                {r.certificate_number && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {r.certificate_number}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                {r.certificate_issued && (
                                                    <PdfButton
                                                        url={`/certificates/baptisms/${r.id}/pdf`}
                                                        title="Baptism certificate"
                                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-success/10 hover:text-success"
                                                    >
                                                        <Icon
                                                            name="DocumentArrowDownIcon"
                                                            size={14}
                                                        />
                                                    </PdfButton>
                                                )}
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
                                                                `/baptisms/${r.id}`,
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
                <BaptismModal
                    record={editing === 'new' ? null : editing}
                    types={types}
                    onClose={() => setEditing(null)}
                />
            )}
            <DeleteConfirm
                url={deleteUrl}
                title="Delete Record?"
                message="This baptism record will be permanently deleted."
                onClose={() => setDeleteUrl(null)}
            />
        </div>
    );
}

type BaptismForm = {
    member_id: string;
    candidate_name: string;
    candidate_photo: string;
    baptism_date: string;
    baptism_type: string;
    officiant: string;
    location: string;
    witnesses: string;
    certificate_number: string;
    certificate_issued: boolean;
    certificate_date: string;
    notes: string;
};
type BaptismField = keyof BaptismForm;

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * The same checks the server makes (BaptismController::rules()), so mistakes
 * show under each field before the form is sent. The server still validates.
 * Every field is required except the certificate number.
 */
function baptismErrors(d: BaptismForm): Partial<Record<BaptismField, string>> {
    const errors: Partial<Record<BaptismField, string>> = {};
    const blank = (v: string) => v.trim() === '';

    if (blank(d.candidate_name))
        errors.candidate_name =
            'Enter the full name of the person being baptized.';
    if (blank(d.baptism_date))
        errors.baptism_date = 'Choose the date of the baptism.';
    else if (d.baptism_date > todayIso())
        errors.baptism_date = 'The baptism date cannot be in the future.';
    if (blank(d.baptism_type))
        errors.baptism_type = 'Choose how the baptism was performed.';
    if (blank(d.officiant))
        errors.officiant =
            'Enter the name of the pastor or minister who officiated.';
    if (blank(d.location))
        errors.location = 'Enter where the baptism took place.';
    if (blank(d.witnesses)) errors.witnesses = 'Enter at least one witness.';
    if (blank(d.candidate_photo))
        errors.candidate_photo = 'Upload a photo of the candidate.';
    if (d.certificate_issued && blank(d.certificate_date))
        errors.certificate_date = 'Choose the date the certificate was issued.';
    else if (
        d.certificate_issued &&
        d.baptism_date &&
        d.certificate_date < d.baptism_date
    )
        errors.certificate_date =
            'The certificate cannot be issued before the baptism date.';
    if (blank(d.notes)) errors.notes = 'Add a short note about this baptism.';

    return errors;
}

function BaptismModal({
    record,
    types,
    onClose,
}: {
    record: Baptism | null;
    types: string[];
    onClose: () => void;
}) {
    const form = useForm<BaptismForm>({
        member_id: record?.member_id ?? '',
        candidate_name: record?.candidate_name ?? '',
        candidate_photo: record?.candidate_photo ?? '',
        baptism_date: record?.baptism_date ?? todayIso(),
        baptism_type: record?.baptism_type ?? 'immersion',
        officiant: record?.officiant ?? '',
        location: record?.location ?? '',
        witnesses: record?.witnesses ?? '',
        certificate_number: record?.certificate_number ?? '',
        certificate_issued: record?.certificate_issued ?? false,
        certificate_date: record?.certificate_date ?? '',
        notes: record?.notes ?? '',
    });
    // Fields the user has left (or every field once Save was pressed): only these show client-side messages.
    const [touched, setTouched] = useState<
        Partial<Record<BaptismField, boolean>>
    >({});
    const [submitted, setSubmitted] = useState(false);
    const clientErrors = baptismErrors(form.data);

    /** Server message first (it is the final word), then the live client check. */
    const errorFor = (field: BaptismField): string | undefined =>
        form.errors[field] ??
        (submitted || touched[field] ? clientErrors[field] : undefined);
    const touch = (field: BaptismField) =>
        setTouched((t) => ({ ...t, [field]: true }));
    const change = <K extends BaptismField>(
        field: K,
        value: BaptismForm[K],
    ) => {
        form.setData((d) => ({ ...d, [field]: value }));
        if (form.errors[field]) form.clearErrors(field);
    };
    const invalid = (field: BaptismField) =>
        errorFor(field)
            ? `${inputCls} border-danger focus:ring-danger`
            : inputCls;
    const aria = (field: BaptismField) => ({
        'aria-invalid': Boolean(errorFor(field)),
        onBlur: () => touch(field),
    });

    const save = () => {
        setSubmitted(true);
        if (Object.keys(clientErrors).length > 0) return;
        const o = { preserveScroll: true, onSuccess: onClose };
        if (record) form.patch(`/baptisms/${record.id}`, o);
        else form.post('/baptisms', o);
    };

    const errorCount = submitted ? Object.keys(clientErrors).length : 0;

    return (
        <Modal
            title={record ? 'Edit Baptism Record' : 'Add Baptism Record'}
            onClose={onClose}
            footer={
                <>
                    {errorCount > 0 && (
                        <p className="mr-auto text-xs text-danger" role="alert">
                            Please fix {errorCount} field
                            {errorCount === 1 ? '' : 's'} before saving.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline text-sm"
                    >
                        Cancel
                    </button>
                    <SaveButton
                        saving={form.processing}
                        label={record ? 'Update Record' : 'Add Record'}
                        onClick={save}
                    />
                </>
            }
        >
            <p className="mb-4 text-xs text-muted-foreground">
                Fields marked * are required. Only the certificate number may be
                left blank.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Link to Member" error={form.errors.member_id}>
                    <MemberPicker
                        value={form.data.member_id}
                        label={form.data.candidate_name}
                        noneLabel="— Not a member / Guest —"
                        onChange={(m) => {
                            form.setData((d) => ({
                                ...d,
                                member_id: m?.id ?? '',
                                candidate_name: m ? m.name : d.candidate_name,
                                candidate_photo:
                                    m?.photo_url || d.candidate_photo,
                            }));
                            if (m) touch('candidate_name');
                        }}
                    />
                </Field>
                <Field
                    label="Candidate Name *"
                    error={errorFor('candidate_name')}
                >
                    <input
                        className={invalid('candidate_name')}
                        value={form.data.candidate_name}
                        onChange={(e) =>
                            change('candidate_name', e.target.value)
                        }
                        placeholder="Full name"
                        {...aria('candidate_name')}
                    />
                </Field>
                <Field label="Baptism Date *" error={errorFor('baptism_date')}>
                    <input
                        type="date"
                        max={todayIso()}
                        className={invalid('baptism_date')}
                        value={form.data.baptism_date}
                        onChange={(e) => change('baptism_date', e.target.value)}
                        {...aria('baptism_date')}
                    />
                </Field>
                <Field label="Baptism Type *" error={errorFor('baptism_type')}>
                    <select
                        className={invalid('baptism_type')}
                        value={form.data.baptism_type}
                        onChange={(e) => change('baptism_type', e.target.value)}
                        {...aria('baptism_type')}
                    >
                        {types.map((t) => (
                            <option key={t} value={t}>
                                {TYPE_LABELS[t] ?? t}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Officiant *" error={errorFor('officiant')}>
                    <input
                        className={invalid('officiant')}
                        value={form.data.officiant}
                        onChange={(e) => change('officiant', e.target.value)}
                        placeholder="Pastor / Minister name"
                        {...aria('officiant')}
                    />
                </Field>
                <Field label="Location *" error={errorFor('location')}>
                    <input
                        className={invalid('location')}
                        value={form.data.location}
                        onChange={(e) => change('location', e.target.value)}
                        placeholder="Baptismal pool, chapel..."
                        {...aria('location')}
                    />
                </Field>
                <Field label="Witnesses *" error={errorFor('witnesses')} span>
                    <input
                        className={invalid('witnesses')}
                        value={form.data.witnesses}
                        onChange={(e) => change('witnesses', e.target.value)}
                        placeholder="Names of witnesses"
                        {...aria('witnesses')}
                    />
                </Field>
                <Field
                    label="Certificate Number (optional)"
                    error={form.errors.certificate_number}
                >
                    <input
                        className={inputCls}
                        value={form.data.certificate_number}
                        onChange={(e) =>
                            change('certificate_number', e.target.value)
                        }
                        placeholder="Left blank → numbered when issued"
                    />
                </Field>
                <Field label="Certificate Issued *">
                    <Toggle
                        value={form.data.certificate_issued}
                        onChange={(v) => change('certificate_issued', v)}
                    />
                </Field>
                {form.data.certificate_issued && (
                    <Field
                        label="Certificate Date *"
                        error={errorFor('certificate_date')}
                    >
                        <input
                            type="date"
                            min={form.data.baptism_date || undefined}
                            className={invalid('certificate_date')}
                            value={form.data.certificate_date}
                            onChange={(e) =>
                                change('certificate_date', e.target.value)
                            }
                            {...aria('certificate_date')}
                        />
                    </Field>
                )}
                <div className="sm:col-span-2">
                    <ImageUploadField
                        label="Photo *"
                        value={form.data.candidate_photo}
                        onChange={(url) => {
                            change('candidate_photo', url);
                            touch('candidate_photo');
                        }}
                        variant="avatar"
                    />
                    {errorFor('candidate_photo') && (
                        <p className="error-text">
                            {errorFor('candidate_photo')}
                        </p>
                    )}
                </div>
                <Field label="Notes *" error={errorFor('notes')} span>
                    <textarea
                        rows={3}
                        className={`${invalid('notes')} resize-none`}
                        value={form.data.notes}
                        onChange={(e) => change('notes', e.target.value)}
                        placeholder="Additional notes..."
                        {...aria('notes')}
                    />
                </Field>
            </div>
        </Modal>
    );
}
