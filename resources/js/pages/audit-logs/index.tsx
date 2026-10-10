import { Head, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import type { LaravelPage } from '@/components/ssbcms/Pagination';
import { ServerPaginator } from '@/components/ssbcms/Pagination';
import { Modal } from '@/components/ssbcms/records-ui';

type Log = {
    id: string;
    action: string;
    table_name: string;
    record_id: string | null;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    performed_by: string;
    performed_by_name: string | null;
    performed_by_role: string;
    ip_address: string | null;
    user_agent: string | null;
    module: string | null;
    description: string | null;
    created_at: string;
};
type Props = {
    logs: LaravelPage<Log>;
    filters: { search?: string; action?: string; module?: string };
    stats: { total: number; creates: number; updates: number; deletes: number };
    modules: string[];
};

const ACTION: Record<
    string,
    { label: string; color: string; bg: string; icon: string }
> = {
    CREATE: {
        label: 'Create',
        color: 'text-green-700',
        bg: 'bg-green-100',
        icon: 'PlusCircleIcon',
    },
    UPDATE: {
        label: 'Update',
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        icon: 'PencilSquareIcon',
    },
    DELETE: {
        label: 'Delete',
        color: 'text-red-700',
        bg: 'bg-red-100',
        icon: 'TrashIcon',
    },
    LOGIN: {
        label: 'Login',
        color: 'text-purple-700',
        bg: 'bg-purple-100',
        icon: 'ArrowRightOnRectangleIcon',
    },
    EXPORT: {
        label: 'Export',
        color: 'text-amber-700',
        bg: 'bg-amber-100',
        icon: 'ArrowDownTrayIcon',
    },
    VIEW: {
        label: 'View',
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        icon: 'EyeIcon',
    },
};
const fmtDT = (d: string) =>
    new Date(d).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function AuditLogs({ logs, filters, stats, modules }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<Log | null>(null);
    const first = useRef(true);

    const apply = (next: Partial<Props['filters']>) =>
        router.get(
            '/audit-logs',
            { ...filters, ...next, page: undefined },
            { preserveState: true, preserveScroll: true, replace: true },
        );

    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const t = setTimeout(() => apply({ search: search || undefined }), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const exportUrl = `/audit-logs/export?${new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]).toString()}`;

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Audit Logs" />
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Audit Logs
                    </h1>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Track all system activity and changes
                    </p>
                </div>
                <a
                    href={exportUrl}
                    className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    <Icon name="ArrowDownTrayIcon" size={16} />
                    Export CSV
                </a>
            </div>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    {
                        label: 'Total Logs',
                        value: stats.total,
                        icon: 'ClipboardDocumentListIcon',
                        color: 'bg-blue-500',
                    },
                    {
                        label: 'Creates',
                        value: stats.creates,
                        icon: 'PlusCircleIcon',
                        color: 'bg-green-500',
                    },
                    {
                        label: 'Updates',
                        value: stats.updates,
                        icon: 'PencilSquareIcon',
                        color: 'bg-amber-500',
                    },
                    {
                        label: 'Deletes',
                        value: stats.deletes,
                        icon: 'TrashIcon',
                        color: 'bg-red-500',
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
                                {k.value.toLocaleString()}
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
                        placeholder="Search by name, email, description, table..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-lg border border-border bg-card py-2 pr-4 pl-9 text-sm text-foreground focus:ring-2 focus:ring-primary/30 focus:outline-none"
                    />
                </div>
                <select
                    value={filters.action ?? ''}
                    onChange={(e) =>
                        apply({ action: e.target.value || undefined })
                    }
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                    <option value="">All Actions</option>
                    {Object.keys(ACTION).map((a) => (
                        <option key={a}>{a}</option>
                    ))}
                </select>
                <select
                    value={filters.module ?? ''}
                    onChange={(e) =>
                        apply({ module: e.target.value || undefined })
                    }
                    className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none"
                >
                    <option value="">All Modules</option>
                    {modules.map((m) => (
                        <option key={m}>{m}</option>
                    ))}
                </select>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="scrollbar-thin overflow-x-auto">
                    <table className="w-full min-w-[900px] text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                {[
                                    'Date & Time',
                                    'Action',
                                    'Module',
                                    'Description',
                                    'Performed By',
                                    'IP Address',
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
                            {logs.data.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="px-4 py-12 text-center text-muted-foreground"
                                    >
                                        No audit logs found
                                    </td>
                                </tr>
                            ) : (
                                logs.data.map((l) => {
                                    const cfg = ACTION[l.action] ?? ACTION.VIEW;
                                    return (
                                        <tr
                                            key={l.id}
                                            className="border-b border-border transition-colors hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                                                {fmtDT(l.created_at)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                                                >
                                                    <Icon
                                                        name={cfg.icon}
                                                        size={12}
                                                    />
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                                    {l.module || l.table_name}
                                                </span>
                                            </td>
                                            <td
                                                className="max-w-xs truncate px-4 py-3 text-foreground"
                                                title={l.description ?? ''}
                                            >
                                                {l.description ||
                                                    `${l.action} on ${l.table_name}`}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-xs font-medium text-foreground">
                                                    {l.performed_by_name ??
                                                        l.performed_by}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    <span className="capitalize">
                                                        {l.performed_by_role}
                                                    </span>
                                                    {l.performed_by !==
                                                        'system' &&
                                                        ` · ${l.performed_by}`}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                {l.ip_address || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelected(l)
                                                    }
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                    aria-label="View details"
                                                >
                                                    <Icon
                                                        name="EyeIcon"
                                                        size={14}
                                                    />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <ServerPaginator meta={logs} />
            </div>

            {selected && (
                <Modal
                    wide={false}
                    title="Log Detail"
                    onClose={() => setSelected(null)}
                    footer={
                        <button
                            type="button"
                            onClick={() => setSelected(null)}
                            className="btn-outline text-sm"
                        >
                            Close
                        </button>
                    }
                >
                    <div className="space-y-4">
                        {[
                            ['Date & Time', fmtDT(selected.created_at)],
                            ['Action', selected.action],
                            ['Module', selected.module || '—'],
                            ['Table', selected.table_name],
                            ['Description', selected.description || '—'],
                            [
                                'Performed By',
                                selected.performed_by_name ??
                                    selected.performed_by,
                            ],
                            ['Email', selected.performed_by],
                            ['Role', selected.performed_by_role],
                            ['IP Address', selected.ip_address || '—'],
                            ['Record ID', selected.record_id || '—'],
                        ].map(([l, v]) => (
                            <div key={l} className="flex justify-between gap-4">
                                <span className="shrink-0 text-sm text-muted-foreground">
                                    {l}
                                </span>
                                <span className="text-right text-sm font-medium break-all text-foreground">
                                    {v}
                                </span>
                            </div>
                        ))}
                        {selected.old_values && (
                            <div>
                                <p className="mb-1 text-sm text-muted-foreground">
                                    Old Values
                                </p>
                                <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                                    {JSON.stringify(
                                        selected.old_values,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </div>
                        )}
                        {selected.new_values && (
                            <div>
                                <p className="mb-1 text-sm text-muted-foreground">
                                    New Values
                                </p>
                                <pre className="max-h-32 overflow-auto rounded-lg bg-muted p-3 text-xs text-foreground">
                                    {JSON.stringify(
                                        selected.new_values,
                                        null,
                                        2,
                                    )}
                                </pre>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
}
