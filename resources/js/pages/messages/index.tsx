import { Head, router, useForm } from '@inertiajs/react';
import { Inbox, Mail, Phone, Reply, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ssbcms/ConfirmModal';
import type { PageMeta } from '@/components/ssbcms/Pagination';
import { ServerPaginator } from '@/components/ssbcms/Pagination';
import StatusBadge from '@/components/ssbcms/StatusBadge';
import { formatDateTime } from '@/lib/format';
import {
    destroy,
    index,
    read,
    reply as replyRoute,
    status as statusRoute,
} from '@/routes/messages';

type Status = 'new' | 'read' | 'replied' | 'closed';
type Message = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
    status: Status;
    /** Every reply sent, oldest first (kept for the record). */
    replies: Reply[];
    created_at: string;
};
type Reply = {
    id: number;
    body: string;
    sent_by: string;
    sent_to: string;
    email_sent: boolean;
    sent_at: string | null;
};
type Props = {
    messages: Message[];
    pagination: PageMeta;
    filters: { search: string; status: Status | 'All' };
    counts: Record<string, number>;
    can: { respond: boolean };
};

const TABS: (Status | 'All')[] = ['new', 'read', 'replied', 'closed', 'All'];
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const opts = { preserveScroll: true, preserveState: true };

function Detail({
    message,
    canRespond,
    onDelete,
}: {
    message: Message;
    canRespond: boolean;
    onDelete: () => void;
}) {
    const form = useForm({ response: '' });
    useEffect(() => form.reset(), [message.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const sendReply = () =>
        form.post(replyRoute.url(message.id), {
            ...opts,
            onSuccess: () => form.reset(),
        });
    const setStatus = (status: Status) =>
        router.patch(statusRoute.url(message.id), { status }, opts);

    return (
        <div className="card flex h-full flex-col">
            <div className="border-b border-border p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-foreground">
                            {message.subject}
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            From <strong>{message.name}</strong> ·{' '}
                            {formatDateTime(message.created_at)}
                        </p>
                    </div>
                    <StatusBadge status={label(message.status)} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <a
                        href={`mailto:${message.email}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                        <Mail className="h-4 w-4" />
                        {message.email}
                    </a>
                    {message.phone && (
                        <a
                            href={`tel:${message.phone.replace(/\s/g, '')}`}
                            className="inline-flex items-center gap-1.5 text-primary hover:underline"
                        >
                            <Phone className="h-4 w-4" />
                            {message.phone}
                        </a>
                    )}
                </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto p-5">
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {message.message}
                </p>

                {message.replies.length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                            Conversation · {message.replies.length}{' '}
                            {message.replies.length === 1 ? 'reply' : 'replies'}
                        </p>
                        {message.replies.map((reply, index) => (
                            <div
                                key={reply.id}
                                className="rounded-lg border-l-4 border-accent bg-muted/50 p-4"
                            >
                                <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Reply {index + 1} by {reply.sent_by} ·{' '}
                                    {formatDateTime(reply.sent_at)}
                                </p>
                                <p className="text-sm whitespace-pre-line text-foreground">
                                    {reply.body}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                    {reply.email_sent
                                        ? `Emailed to ${reply.sent_to}`
                                        : `Saved, but the email to ${reply.sent_to} could not be sent`}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {canRespond && (
                <div className="space-y-3 border-t border-border p-5">
                    <label
                        htmlFor="reply"
                        className="text-xs font-medium text-muted-foreground"
                    >
                        {message.replies.length > 0 ? 'Send another reply' : 'Reply'} by
                        email to {message.email}
                    </label>
                    <textarea
                        id="reply"
                        rows={4}
                        className="input-field w-full resize-y"
                        value={form.data.response}
                        onChange={(e) =>
                            form.setData('response', e.target.value)
                        }
                        placeholder="Write your reply…"
                        maxLength={5000}
                    />
                    {form.errors.response && (
                        <p className="error-text">{form.errors.response}</p>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                            {message.status !== 'closed' ? (
                                <button
                                    type="button"
                                    className="btn-outline text-sm"
                                    onClick={() => setStatus('closed')}
                                >
                                    Close
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="btn-outline text-sm"
                                    onClick={() => setStatus('read')}
                                >
                                    Reopen
                                </button>
                            )}
                            <button
                                type="button"
                                className="btn-outline text-sm text-destructive"
                                onClick={onDelete}
                                aria-label="Delete message"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            type="button"
                            className="btn-primary text-sm"
                            disabled={
                                form.processing || !form.data.response.trim()
                            }
                            onClick={sendReply}
                        >
                            <Reply className="h-4 w-4" />
                            {form.processing ? 'Sending…' : 'Send reply'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Messages({
    messages,
    pagination,
    filters,
    counts,
    can,
}: Props) {
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [deleting, setDeleting] = useState<Message | null>(null);
    const selected = messages.find((m) => m.id === selectedId) ?? null;

    const load = (params: Record<string, string>) =>
        router.get(
            index.url(),
            Object.fromEntries(
                Object.entries({
                    status: filters.status,
                    search,
                    ...params,
                }).filter(([, v]) => v && v !== 'All'),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const open = (m: Message) => {
        setSelectedId(m.id);
        if (m.status === 'new') router.post(read.url(m.id), {}, opts);
    };

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Messages" />
            <div>
                <h1 className="page-title">Messages</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Messages sent from the website contact form. Replies are
                    emailed to the sender and kept here.
                </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
                    {TABS.map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => load({ status: t })}
                            className={`rounded-md px-3 py-1.5 text-xs font-medium ${filters.status === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
                        >
                            {label(t)} ({counts[t] ?? 0})
                        </button>
                    ))}
                </div>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        load({ search });
                    }}
                    className="relative"
                >
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        className="input-field w-64 pl-9"
                        placeholder="Search name, email or subject"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label="Search messages"
                    />
                </form>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <div className="card overflow-hidden">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 p-10 text-center">
                            <Inbox className="h-6 w-6 text-muted-foreground" />
                            <p className="text-sm font-semibold">
                                No messages here
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {messages.map((m) => (
                                <li key={m.id}>
                                    <button
                                        type="button"
                                        onClick={() => open(m)}
                                        className={`w-full px-4 py-3 text-left hover:bg-muted/50 ${m.id === selectedId ? 'bg-muted' : ''}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p
                                                className={`truncate text-sm ${m.status === 'new' ? 'font-bold' : 'font-medium'}`}
                                            >
                                                {m.name}
                                            </p>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {formatDateTime(m.created_at)}
                                            </span>
                                        </div>
                                        <p className="truncate text-sm text-foreground">
                                            {m.subject}
                                        </p>
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <p className="truncate text-xs text-muted-foreground">
                                                {m.message}
                                            </p>
                                            <StatusBadge
                                                status={label(m.status)}
                                                size="sm"
                                            />
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <ServerPaginator meta={pagination} />
                </div>

                <div className="min-h-[420px]">
                    {selected ? (
                        <Detail
                            message={selected}
                            canRespond={can.respond}
                            onDelete={() => setDeleting(selected)}
                        />
                    ) : (
                        <div className="card flex h-full min-h-[420px] flex-col items-center justify-center gap-2 p-10 text-center">
                            <Mail className="h-7 w-7 text-muted-foreground" />
                            <p className="text-sm font-semibold">
                                Select a message
                            </p>
                            <p className="max-w-xs text-xs text-muted-foreground">
                                Open a message to read it and reply.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() =>
                    deleting &&
                    router.delete(destroy.url(deleting.id), {
                        ...opts,
                        onSuccess: () => {
                            setDeleting(null);
                            setSelectedId(null);
                        },
                    })
                }
                title="Delete message"
                message={
                    deleting
                        ? `Delete the message from ${deleting.name}? This cannot be undone.`
                        : ''
                }
                confirmLabel="Delete"
                variant="danger"
            />
        </div>
    );
}

Messages.layout = {
    breadcrumbs: [{ title: 'Messages', href: index() }],
};
