import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { PdfButton } from '@/components/ssbcms/PdfViewer';
import { Paginator, usePagination } from '@/components/ssbcms/Pagination';
import { Modal } from '@/components/ssbcms/records-ui';
import { downloadCsv, fmtMoney, useCurrency, useMoney } from '@/lib/finance';

export type Transaction = {
    id: string; // "tithe:uuid" | "offering:uuid" | "donation:uuid"
    date: string | null;
    member: string;
    type: string;
    amount: number;
    currency: string;
    amount_base: number;
    method: string;
    fund: string | null;
    reference: string | null;
    receipt: string | null;
    description: string | null;
    edit: string;
};

const TYPES = ['All', 'Tithe', 'Offering', 'Special Offering', 'Donation'];
const typeColors: Record<string, string> = {
    Tithe: 'bg-primary/10 text-primary',
    Offering: 'bg-success/10 text-success',
    'Special Offering': 'bg-accent/10 text-accent',
    Donation: 'bg-info/10 text-info',
};

const fmtDate = (d: string | null) =>
    d
        ? new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
          })
        : '—';
const receiptUrl = (ids: string[]) =>
    `/finance-management/receipts?ids=${encodeURIComponent(ids.join(','))}`;

export default function TransactionsTable({
    transactions,
    canCreate,
}: {
    transactions: Transaction[];
    canCreate: boolean;
}) {
    const c = useCurrency();
    const { equiv } = useMoney();
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [viewing, setViewing] = useState<Transaction | null>(null);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return transactions.filter(
            (t) =>
                (typeFilter === 'All' || t.type === typeFilter) &&
                (!q ||
                    t.member.toLowerCase().includes(q) ||
                    (t.reference ?? '').toLowerCase().includes(q) ||
                    (t.receipt ?? '').toLowerCase().includes(q)),
        );
    }, [transactions, search, typeFilter]);
    const pager = usePagination(filtered, 10);

    const total = filtered.reduce((s, t) => s + t.amount_base, 0);
    const toggle = (id: string) =>
        setSelectedIds((p) =>
            p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
        );
    const pageIds = pager.pageItems.map((t) => t.id);
    const allOnPage =
        pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
    const toggleAll = () =>
        setSelectedIds((p) =>
            allOnPage
                ? p.filter((id) => !pageIds.includes(id))
                : [...new Set([...p, ...pageIds])],
        );

    const exportRows = (rows: Transaction[]) =>
        downloadCsv(
            `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
            [
                'Date',
                'Member',
                'Type',
                'Amount',
                'Currency',
                `Amount (${c})`,
                'Method',
                'Fund',
                'Reference',
                'Receipt',
            ],
            rows.map((t) => [
                t.date,
                t.member,
                t.type,
                t.amount.toFixed(2),
                t.currency,
                t.amount_base.toFixed(2),
                t.method,
                t.fund,
                t.reference,
                t.receipt,
            ]),
        );

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                        <Icon
                            name="MagnifyingGlassIcon"
                            size={15}
                            className="text-muted-foreground"
                        />
                        <input
                            type="text"
                            placeholder="Search member, reference..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                    </div>
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
                    >
                        {TYPES.map((t) => (
                            <option key={t} value={t}>
                                {t === 'All' ? 'All Types' : t}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                        Total:{' '}
                        <span className="text-success">
                            {fmtMoney(total, c)}
                        </span>{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                            {equiv(total)}
                        </span>
                    </span>
                    <button
                        type="button"
                        onClick={() => exportRows(filtered)}
                        className="btn-outline px-3 py-2 text-xs"
                    >
                        <Icon name="ArrowDownTrayIcon" size={13} />
                        Export CSV
                    </button>
                    {canCreate && (
                        <Link
                            href="/tithes?new=1"
                            className="btn-primary px-3 py-2 text-xs"
                        >
                            <Icon name="PlusIcon" size={13} />
                            Record Giving
                        </Link>
                    )}
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="slide-up flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
                    <span className="text-sm font-semibold text-primary">
                        {selectedIds.length} selected
                    </span>
                    <PdfButton
                        url={receiptUrl(selectedIds)}
                        title="Receipts"
                        className="rounded-lg border border-accent/30 px-3 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
                    >
                        Generate Receipts (PDF)
                    </PdfButton>
                    <button
                        type="button"
                        onClick={() =>
                            exportRows(
                                transactions.filter((t) =>
                                    selectedIds.includes(t.id),
                                ),
                            )
                        }
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                    >
                        Export Selected
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedIds([])}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear
                    </button>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="scrollbar-thin overflow-x-auto">
                    <table className="w-full min-w-[900px]">
                        <thead>
                            <tr>
                                <th className="table-header w-10">
                                    <input
                                        type="checkbox"
                                        checked={allOnPage}
                                        onChange={toggleAll}
                                        className="rounded border-border"
                                        aria-label="Select all on this page"
                                    />
                                </th>
                                {[
                                    'Date',
                                    'Member',
                                    'Type',
                                    'Amount',
                                    'Method',
                                    'Fund',
                                    'Reference',
                                    'Receipt',
                                    '',
                                ].map((h, i) => (
                                    <th
                                        key={`h-${i}`}
                                        className={`table-header ${i === 8 ? 'text-right' : 'text-left'}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pager.pageItems.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="py-12 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Icon
                                                name="BanknotesIcon"
                                                size={28}
                                                className="text-muted-foreground"
                                            />
                                            <p className="text-sm font-medium text-foreground">
                                                No transactions found
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Try adjusting your search or
                                                filter
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                pager.pageItems.map((t) => (
                                    <tr key={t.id} className="group table-row">
                                        <td className="table-cell w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(
                                                    t.id,
                                                )}
                                                onChange={() => toggle(t.id)}
                                                className="rounded border-border"
                                                aria-label={`Select ${t.receipt ?? t.id}`}
                                            />
                                        </td>
                                        <td className="table-cell font-mono text-xs text-muted-foreground">
                                            {fmtDate(t.date)}
                                        </td>
                                        <td className="table-cell text-sm font-medium text-foreground">
                                            {t.member}
                                        </td>
                                        <td className="table-cell">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColors[t.type] ?? 'bg-muted text-muted-foreground'}`}
                                            >
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="table-cell font-semibold text-foreground tabular-nums">
                                            {fmtMoney(t.amount, t.currency)}
                                            {t.currency !== c && (
                                                <span className="block text-[11px] font-normal text-muted-foreground">
                                                    ≈{' '}
                                                    {fmtMoney(t.amount_base, c)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="table-cell text-sm text-muted-foreground">
                                            {t.method}
                                        </td>
                                        <td className="table-cell text-sm text-muted-foreground">
                                            {t.fund}
                                        </td>
                                        <td className="table-cell font-mono text-xs text-muted-foreground">
                                            {t.reference || '—'}
                                        </td>
                                        <td className="table-cell font-mono text-xs text-accent">
                                            {t.receipt || '—'}
                                        </td>
                                        <td className="table-cell text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setViewing(t)
                                                    }
                                                    title="View details"
                                                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                >
                                                    <Icon
                                                        name="EyeIcon"
                                                        size={14}
                                                    />
                                                </button>
                                                <PdfButton
                                                    url={receiptUrl([t.id])}
                                                    title="Receipts"
                                                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                >
                                                    <Icon
                                                        name="PrinterIcon"
                                                        size={14}
                                                    />
                                                </PdfButton>
                                                <Link
                                                    href={`${t.edit}?edit=${t.id.split(':')[1]}`}
                                                    title="Edit"
                                                    className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                >
                                                    <Icon
                                                        name="PencilIcon"
                                                        size={14}
                                                    />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Paginator {...pager} />
            </div>

            {viewing && (
                <Modal
                    wide={false}
                    title="Transaction Details"
                    onClose={() => setViewing(null)}
                    footer={
                        <>
                            <PdfButton
                                url={receiptUrl([viewing.id])}
                                title="Receipts"
                                className="btn-outline text-sm"
                            >
                                <Icon name="PrinterIcon" size={14} />
                                Print Receipt
                            </PdfButton>
                            <Link
                                href={`${viewing.edit}?edit=${viewing.id.split(':')[1]}`}
                                className="btn-primary text-sm"
                            >
                                <Icon name="PencilIcon" size={14} />
                                Edit
                            </Link>
                        </>
                    }
                >
                    <div className="space-y-3 text-sm">
                        <p className="text-2xl font-bold text-foreground tabular-nums">
                            {fmtMoney(viewing.amount, viewing.currency)}
                        </p>
                        {viewing.currency !== c && (
                            <p className="text-sm text-muted-foreground">
                                ≈ {fmtMoney(viewing.amount_base, c)}
                            </p>
                        )}
                        {[
                            ['Date', fmtDate(viewing.date)],
                            ['From', viewing.member],
                            ['Type', viewing.type],
                            ['Method', viewing.method],
                            ['Fund', viewing.fund],
                            ['Reference', viewing.reference || '—'],
                            ['Receipt', viewing.receipt || '—'],
                            ['Notes', viewing.description || '—'],
                        ].map(([l, v]) => (
                            <div
                                key={l}
                                className="flex justify-between gap-4 border-b border-border pb-2 last:border-0"
                            >
                                <span className="text-muted-foreground">
                                    {l}
                                </span>
                                <span className="text-right font-medium text-foreground">
                                    {v}
                                </span>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}
        </div>
    );
}
