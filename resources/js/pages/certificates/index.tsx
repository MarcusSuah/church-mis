import { Head, router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { openPdf, PdfButton } from '@/components/ssbcms/PdfViewer';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import {
    Avatar,
    EmptyState,
    Field,
    fmtDate,
    inputCls,
    Kpi,
    Modal,
    SaveButton,
    SearchBox,
} from '@/components/ssbcms/records-ui';

type RequestRow = {
    template?: string | null;
    custom_message?: string | null;
    cert_type?: string | null;
    id: string;
    document_type: string;
    notes: string | null;
    status: string;
    staff_note: string | null;
    has_file: boolean;
    created_at: string;
    updated_at: string;
    member: {
        name: string;
        member_id: string | null;
        photo_url: string | null;
        status: string;
    } | null;
};

type CertRow = {
    id: string;
    name: string;
    photo?: string | null;
    date: string | null;
    officiant: string | null;
    status?: string;
    certificate_number: string | null;
    issued: boolean;
    issued_on: string | null;
    template?: string | null;
    message?: string | null;
    linked: boolean;
};

type Templates = Record<string, { label: string; description: string }>;
type CertTypes = Record<string, { label: string; messages: string[] }>;
type Props = {
    requests: RequestRow[];
    baptisms: CertRow[];
    weddings: CertRow[];
    templates: Templates;
    certTypes: CertTypes;
    can: { approve: boolean };
};

type Tab = 'requests' | 'baptisms' | 'weddings';

const opts = { preserveScroll: true, preserveState: true };

export default function Certificates({
    requests,
    baptisms,
    weddings,
    templates,
    certTypes,
    can,
}: Props) {
    const [tab, setTab] = useState<Tab>('requests');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [acting, setActing] = useState<{
        row: RequestRow;
        mode: 'approve' | 'reject';
    } | null>(null);
    const [issuing, setIssuing] = useState<CertRow | null>(null);

    const pending = requests.filter((r) => r.status === 'Pending').length;
    const q = search.toLowerCase();

    const filteredRequests = useMemo(
        () =>
            requests.filter(
                (r) =>
                    (statusFilter === 'All' || r.status === statusFilter) &&
                    (!q ||
                        r.document_type.toLowerCase().includes(q) ||
                        (r.member?.name ?? '').toLowerCase().includes(q) ||
                        (r.member?.member_id ?? '').toLowerCase().includes(q)),
            ),
        [requests, statusFilter, q],
    );

    const certRows = (tab === 'baptisms' ? baptisms : weddings).filter(
        (c) =>
            (statusFilter === 'All' ||
                (statusFilter === 'Pending' ? !c.issued : c.issued)) &&
            (!q ||
                c.name.toLowerCase().includes(q) ||
                (c.certificate_number ?? '').toLowerCase().includes(q)),
    );

    const tabs: { id: Tab; label: string; icon: string; count: number }[] = [
        {
            id: 'requests',
            label: 'Document Requests',
            icon: 'DocumentPlusIcon',
            count: pending,
        },
        {
            id: 'baptisms',
            label: 'Baptism Certificates',
            icon: 'SparklesIcon',
            count: baptisms.filter((b) => !b.issued).length,
        },
        {
            id: 'weddings',
            label: 'Marriage Certificates',
            icon: 'HeartIcon',
            count: weddings.filter((w) => !w.issued && w.status === 'completed')
                .length,
        },
    ];

    const statusOptions =
        tab === 'requests'
            ? ['Pending', 'Ready', 'Collected', 'Rejected', 'All']
            : ['Pending', 'Issued', 'All'];

    return (
        <div className="p-4 lg:p-6 xl:p-8">
            <Head title="Certificates & Documents" />
            <div className="mb-6">
                <h1 className="page-title">Certificates & Documents</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Approve member document requests and issue certificates as
                    PDF
                </p>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    label="Pending Requests"
                    value={pending}
                    icon="ClockIcon"
                    color="text-warning"
                    bg="bg-warning/10"
                />
                <Kpi
                    label="Ready for Members"
                    value={requests.filter((r) => r.status === 'Ready').length}
                    icon="DocumentCheckIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    label="Baptism Certificates Issued"
                    value={baptisms.filter((b) => b.issued).length}
                    icon="SparklesIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    label="Marriage Certificates Issued"
                    value={weddings.filter((w) => w.issued).length}
                    icon="HeartIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
            </div>

            <div className="mb-4 flex scrollbar-thin items-center gap-1 overflow-x-auto border-b border-border">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                            setTab(t.id);
                            setStatusFilter('Pending');
                        }}
                        className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                            tab === t.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <Icon name={t.icon} size={15} />
                        {t.label}
                        {t.count > 0 && (
                            <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-bold text-white">
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="card mb-4 p-4">
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                    <SearchBox
                        value={search}
                        onChange={setSearch}
                        placeholder={
                            tab === 'requests'
                                ? 'Search member, document...'
                                : 'Search name, certificate...'
                        }
                    />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                        aria-label="Status"
                    >
                        {statusOptions.map((s) => (
                            <option key={s} value={s}>
                                {s === 'All' ? 'All Statuses' : s}
                            </option>
                        ))}
                    </select>
                    <span className="ml-auto text-sm text-muted-foreground">
                        {tab === 'requests'
                            ? filteredRequests.length
                            : certRows.length}{' '}
                        records
                    </span>
                </div>
            </div>

            {tab === 'requests' ? (
                filteredRequests.length === 0 ? (
                    <EmptyState
                        icon="DocumentPlusIcon"
                        title="No document requests"
                        text="Requests members make in the Member Portal appear here."
                    />
                ) : (
                    <div className="space-y-3">
                        {filteredRequests.map((r) => (
                            <div
                                key={r.id}
                                className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
                            >
                                <div className="flex min-w-0 flex-1 items-start gap-3">
                                    <Avatar
                                        src={r.member?.photo_url}
                                        size={40}
                                    />
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                                {r.document_type}
                                            </p>
                                            <StatusBadge
                                                status={r.status}
                                                size="sm"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {r.member?.name ?? 'Unknown member'}
                                            {r.member?.member_id
                                                ? ` · ${r.member.member_id}`
                                                : ''}{' '}
                                            · Requested{' '}
                                            {fmtDate(r.created_at.slice(0, 10))}
                                        </p>
                                        {r.notes && (
                                            <p className="mt-1 text-xs text-foreground">
                                                “{r.notes}”
                                            </p>
                                        )}
                                        {r.staff_note && (
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Office note: {r.staff_note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-center gap-2">
                                    <PdfButton
                                        url={`/certificates/requests/${r.id}/pdf`}
                                        title={`${r.document_type} — ${r.member?.name ?? ''}`}
                                        className="btn-outline px-3 py-1.5 text-xs"
                                    >
                                        <Icon
                                            name={
                                                r.has_file
                                                    ? 'ArrowDownTrayIcon'
                                                    : 'EyeIcon'
                                            }
                                            size={13}
                                        />
                                        {r.has_file ? 'PDF' : 'Preview PDF'}
                                    </PdfButton>
                                    {can.approve && r.status === 'Pending' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActing({
                                                        row: r,
                                                        mode: 'approve',
                                                    })
                                                }
                                                className="btn-primary px-3 py-1.5 text-xs"
                                            >
                                                <Icon
                                                    name="CheckIcon"
                                                    size={13}
                                                />
                                                Approve & Issue
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActing({
                                                        row: r,
                                                        mode: 'reject',
                                                    })
                                                }
                                                className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/10"
                                            >
                                                Reject
                                            </button>
                                        </>
                                    )}
                                    {can.approve && r.status === 'Ready' && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(
                                                    `/certificates/requests/${r.id}/collected`,
                                                    {},
                                                    opts,
                                                )
                                            }
                                            className="btn-outline px-3 py-1.5 text-xs"
                                        >
                                            <Icon
                                                name="HandRaisedIcon"
                                                size={13}
                                            />
                                            Mark Collected
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : certRows.length === 0 ? (
                <EmptyState
                    icon={tab === 'baptisms' ? 'SparklesIcon' : 'HeartIcon'}
                    title="Nothing here"
                    text={
                        tab === 'baptisms'
                            ? 'Baptism records appear here from the Baptism page.'
                            : 'Wedding records appear here from the Weddings page.'
                    }
                />
            ) : (
                <div className="card overflow-hidden">
                    <div className="scrollbar-thin overflow-x-auto">
                        <table className="w-full min-w-[760px]">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    {[
                                        tab === 'baptisms'
                                            ? 'Candidate'
                                            : 'Couple',
                                        'Date',
                                        'Officiant',
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
                                {certRows.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="transition-colors hover:bg-muted/20"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                {tab === 'baptisms' && (
                                                    <Avatar src={c.photo} />
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">
                                                        {c.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {c.linked
                                                            ? 'Member — can download from portal'
                                                            : 'Not linked to a member'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {fmtDate(c.date)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {c.officiant || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex items-center gap-1 text-xs font-medium ${c.issued ? 'text-success' : 'text-warning'}`}
                                            >
                                                <Icon
                                                    name={
                                                        c.issued
                                                            ? 'CheckCircleIcon'
                                                            : 'ClockIcon'
                                                    }
                                                    size={13}
                                                />
                                                {c.issued
                                                    ? `Issued ${fmtDate(c.issued_on)}`
                                                    : 'Pending'}
                                            </span>
                                            {c.certificate_number && (
                                                <p className="text-xs text-muted-foreground">
                                                    {c.certificate_number}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <PdfButton
                                                    url={`/certificates/${tab}/${c.id}/pdf`}
                                                    title={`Certificate — ${c.name}`}
                                                    className="btn-outline px-3 py-1.5 text-xs"
                                                >
                                                    <Icon
                                                        name={
                                                            c.issued
                                                                ? 'ArrowDownTrayIcon'
                                                                : 'EyeIcon'
                                                        }
                                                        size={13}
                                                    />
                                                    {c.issued
                                                        ? 'PDF'
                                                        : 'Preview'}
                                                </PdfButton>
                                                {can.approve && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setIssuing(c)
                                                        }
                                                        className={`${c.issued ? 'btn-outline' : 'btn-primary'} px-3 py-1.5 text-xs`}
                                                    >
                                                        <Icon
                                                            name={
                                                                c.issued
                                                                    ? 'PaintBrushIcon'
                                                                    : 'DocumentCheckIcon'
                                                            }
                                                            size={13}
                                                        />
                                                        {c.issued
                                                            ? 'Change design'
                                                            : 'Approve & Issue'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {acting && (
                <DecisionModal
                    row={acting.row}
                    mode={acting.mode}
                    templates={templates}
                    certTypes={certTypes}
                    onClose={() => setActing(null)}
                />
            )}
            {issuing && (
                <Modal
                    title={`${issuing.issued ? 'Certificate design' : 'Approve & Issue'} — ${issuing.name}`}
                    onClose={() => setIssuing(null)}
                    footer={null}
                >
                    <IssueForm
                        url={`/certificates/${tab}/${issuing.id}/issue`}
                        previewUrl={`/certificates/${tab}/${issuing.id}/pdf`}
                        type={tab === 'baptisms' ? 'baptism' : 'marriage'}
                        initial={{
                            template: issuing.template ?? 'classic',
                            message: issuing.message ?? '',
                        }}
                        templates={templates}
                        certTypes={certTypes}
                        submitLabel={
                            issuing.issued ? 'Save design' : 'Approve & Issue'
                        }
                        onDone={() => setIssuing(null)}
                    />
                </Modal>
            )}
        </div>
    );
}

/** Template picker + custom / random message + live PDF preview. */
function DesignFields({
    type,
    data,
    setData,
    templates,
    certTypes,
    previewUrl,
}: {
    type: string;
    data: { template: string; message: string };
    setData: (k: 'template' | 'message', v: string) => void;
    templates: Templates;
    certTypes: CertTypes;
    previewUrl: string;
}) {
    const stock = certTypes[type]?.messages ?? [];
    const [mode, setMode] = useState<'random' | 'stock' | 'custom'>(
        data.message ? 'custom' : 'random',
    );
    const preview = () =>
        openPdf(
            `${previewUrl}?${new URLSearchParams({ template: data.template, message: mode === 'random' ? '' : data.message }).toString()}`,
            'Certificate preview',
        );
    return (
        <div className="space-y-4">
            <Field label="Certificate design">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {Object.entries(templates).map(([key, t]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setData('template', key)}
                            className={`rounded-xl border-2 p-3 text-left transition-colors ${data.template === key ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                            <div
                                className={`mb-2 h-14 rounded-md ${key === 'classic' ? 'border-4 border-[#4a5596] bg-[#f6f6f8]' : key === 'royal' ? 'border-2 border-blue-700 bg-gradient-to-br from-white via-white to-blue-700' : 'border-4 border-double border-[#b8912a] bg-[#fbf7ec]'}`}
                            />
                            <p className="text-sm font-semibold text-foreground">
                                {t.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {t.description}
                            </p>
                        </button>
                    ))}
                </div>
            </Field>
            <Field label="Message on the certificate">
                <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    {[
                        ['random', '🎲 Let the system choose'],
                        ['stock', '📜 Pick a message'],
                        ['custom', '✏️ Write my own'],
                    ].map(([m, l]) => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => {
                                setMode(m as typeof mode);
                                if (m === 'random') setData('message', '');
                                if (m === 'stock')
                                    setData('message', stock[0] ?? '');
                            }}
                            className={`rounded-full border px-3 py-1.5 font-medium ${mode === m ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground hover:bg-muted'}`}
                        >
                            {l}
                        </button>
                    ))}
                </div>
                {mode === 'random' && (
                    <p className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                        A suitable message for this certificate is chosen
                        automatically and kept, so the certificate never changes
                        afterwards.
                    </p>
                )}
                {mode === 'stock' && (
                    <div className="max-h-44 scrollbar-thin space-y-1.5 overflow-y-auto">
                        {stock.map((m, i) => (
                            <label
                                key={i}
                                className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-xs ${data.message === m ? 'border-primary bg-primary/5' : 'border-border'}`}
                            >
                                <input
                                    type="radio"
                                    checked={data.message === m}
                                    onChange={() => setData('message', m)}
                                    className="mt-0.5"
                                />
                                <span className="text-foreground">{m}</span>
                            </label>
                        ))}
                    </div>
                )}
                {mode === 'custom' && (
                    <>
                        <textarea
                            rows={3}
                            maxLength={600}
                            className={`${inputCls} resize-none`}
                            value={data.message}
                            onChange={(e) => setData('message', e.target.value)}
                            placeholder="e.g. was baptized on {date} at {church_name}…"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            Use <code>{'{name}'}</code>, <code>{'{date}'}</code>{' '}
                            and <code>{'{church_name}'}</code>. Keep it short —
                            the certificate is always one page.
                        </p>
                    </>
                )}
            </Field>
            <button
                type="button"
                onClick={preview}
                className="btn-outline text-sm"
            >
                <Icon name="EyeIcon" size={14} />
                Preview PDF
            </button>
        </div>
    );
}

function IssueForm({
    url,
    previewUrl,
    type,
    initial,
    templates,
    certTypes,
    submitLabel,
    onDone,
}: {
    url: string;
    previewUrl: string;
    type: string;
    initial: { template: string; message: string };
    templates: Templates;
    certTypes: CertTypes;
    submitLabel: string;
    onDone: () => void;
}) {
    const form = useForm(initial);
    return (
        <div className="space-y-5">
            <DesignFields
                type={type}
                data={form.data}
                setData={(k, v) => form.setData(k, v)}
                templates={templates}
                certTypes={certTypes}
                previewUrl={previewUrl}
            />
            {(form.errors.template || form.errors.message) && (
                <p className="error-text">
                    {form.errors.template ?? form.errors.message}
                </p>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
                <button
                    type="button"
                    onClick={onDone}
                    className="btn-outline text-sm"
                >
                    Cancel
                </button>
                <SaveButton
                    saving={form.processing}
                    label={submitLabel}
                    onClick={() =>
                        form.post(url, { ...opts, onSuccess: onDone })
                    }
                />
            </div>
        </div>
    );
}

function DecisionModal({
    row,
    mode,
    templates,
    certTypes,
    onClose,
}: {
    row: RequestRow;
    mode: 'approve' | 'reject';
    templates: Templates;
    certTypes: CertTypes;
    onClose: () => void;
}) {
    const form = useForm({
        staff_note: '',
        template: row.template ?? 'classic',
        message: row.custom_message ?? '',
    });
    const approve = mode === 'approve';
    const submit = () =>
        form.post(`/certificates/requests/${row.id}/${mode}`, {
            ...opts,
            onSuccess: onClose,
        });

    return (
        <Modal
            wide={approve && !!row.cert_type}
            title={approve ? 'Approve & Issue Document' : 'Reject Request'}
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
                        disabled={!approve && !form.data.staff_note.trim()}
                        label={
                            approve
                                ? 'Approve & Generate PDF'
                                : 'Reject Request'
                        }
                        onClick={submit}
                    />
                </>
            }
        >
            <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="font-semibold text-foreground">
                        {row.document_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {row.member?.name}
                        {row.member?.member_id
                            ? ` · ${row.member.member_id}`
                            : ''}
                    </p>
                </div>
                {approve && row.cert_type && (
                    <DesignFields
                        type={row.cert_type}
                        data={{
                            template: form.data.template,
                            message: form.data.message,
                        }}
                        setData={(k, v) => form.setData(k, v)}
                        templates={templates}
                        certTypes={certTypes}
                        previewUrl={`/certificates/requests/${row.id}/pdf`}
                    />
                )}
                {approve && (
                    <p className="flex items-start gap-2 rounded-xl border border-info/20 bg-info/5 p-3 text-xs text-info">
                        <Icon
                            name="InformationCircleIcon"
                            size={14}
                            className="mt-0.5 shrink-0"
                        />
                        A one-page PDF is generated and the member is notified.
                        Only approved members can download it from the Documents
                        tab in their portal.
                    </p>
                )}
                <Field
                    label={
                        approve
                            ? 'Note to member (optional)'
                            : 'Reason (shown to the member) *'
                    }
                    error={form.errors.staff_note}
                >
                    <textarea
                        rows={3}
                        className={`${inputCls} resize-none`}
                        value={form.data.staff_note}
                        onChange={(e) =>
                            form.setData('staff_note', e.target.value)
                        }
                        placeholder={
                            approve
                                ? 'e.g. Original signed copy can be collected from the office.'
                                : 'e.g. Membership is still pending approval.'
                        }
                    />
                </Field>
            </div>
        </Modal>
    );
}
