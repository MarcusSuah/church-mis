import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { members as memberLookup } from '@/routes/lookup';
import Icon from './AppIcon';

export type PickedMember = {
    id: string;
    name: string;
    member_code?: string | null;
    photo_url?: string | null;
};

type Props = {
    /** Currently linked member id (or '' / null when none). */
    value: string | null | undefined;
    /** Name shown for the current value (records already store it, e.g. member_name). */
    label?: string | null;
    onChange: (member: PickedMember | null) => void;
    placeholder?: string;
    /** Text for the "no member" choice. */
    noneLabel?: string;
};

type LookupResult =
    | { ok: true; members: PickedMember[] }
    | { ok: false; status: number };

/**
 * Asks /lookup/members (staff only, at most 20 rows). A redirect (expired
 * session, lock screen) or an error page is reported as a failure instead of
 * silently showing "No members found".
 */
async function lookupMembers(
    query: Record<string, string>,
    signal?: AbortSignal,
): Promise<LookupResult> {
    const res = await fetch(memberLookup.url({ query }), {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin',
        signal,
    });
    const isJson = (res.headers.get('content-type') ?? '').includes(
        'application/json',
    );
    if (!res.ok || res.redirected || !isJson) {
        return { ok: false, status: res.status };
    }
    const body = (await res.json()) as { data?: PickedMember[] };

    return { ok: true, members: body.data ?? [] };
}

/**
 * Type-ahead member search (Phase 3, F07). Lists members from the database as
 * soon as it opens and narrows the list as the user types. The member already
 * linked to a record is loaded by id, so its name and member ID show even when
 * the record's own name field is blank.
 */
export default function MemberPicker({
    value,
    label,
    onChange,
    placeholder = 'Search members by name or ID…',
    noneLabel = 'Not linked to a member',
}: Props) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState<PickedMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [linked, setLinked] = useState<PickedMember | null>(null);
    const [highlighted, setHighlighted] = useState(0);
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', close);

        return () => document.removeEventListener('mousedown', close);
    }, []);

    // Load the linked member's details from the database by id.
    useEffect(() => {
        if (!value) {
            setLinked(null);

            return;
        }
        if (linked?.id === value) {
            return;
        }
        const controller = new AbortController();
        lookupMembers({ id: value }, controller.signal)
            .then((result) => {
                if (result.ok) {
                    setLinked(result.members[0] ?? null);
                }
            })
            .catch(() => {
                // Aborted or offline: fall back to the label prop.
            });

        return () => controller.abort();
    }, [value, linked?.id]);

    // Search (or list the first members) while the drop-down is open.
    useEffect(() => {
        if (!open) {
            return;
        }
        const controller = new AbortController();
        const term = query.trim();
        const t = setTimeout(
            async () => {
                setLoading(true);
                setFailed(false);
                try {
                    const result = await lookupMembers(
                        term ? { q: term } : {},
                        controller.signal,
                    );
                    if (result.ok) {
                        setResults(result.members);
                    } else {
                        console.error('Member lookup failed:', result.status);
                        setResults([]);
                        setFailed(true);
                    }
                    setHighlighted(0);
                } catch {
                    // Aborted or offline: keep the previous results.
                } finally {
                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                }
            },
            term ? 250 : 0,
        );

        return () => {
            clearTimeout(t);
            controller.abort();
        };
    }, [query, open]);

    const pick = (m: PickedMember | null) => {
        setLinked(m);
        onChange(m);
        setQuery('');
        setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[highlighted]) {
                pick(results[highlighted]);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const linkedName = linked?.id === value ? linked?.name : null;
    const linkedCode = linked?.id === value ? linked?.member_code : null;

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
                <span
                    className={`truncate ${value ? '' : 'text-muted-foreground'}`}
                >
                    {value
                        ? linkedName || label || 'Loading member…'
                        : noneLabel}
                    {value && linkedCode && (
                        <span className="ml-2 text-xs text-muted-foreground">
                            {linkedCode}
                        </span>
                    )}
                </span>
                <Icon
                    name="ChevronUpDownIcon"
                    size={16}
                    className="shrink-0 text-muted-foreground"
                />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={onKeyDown}
                        placeholder={placeholder}
                        aria-label="Search members"
                        className="w-full rounded-t-lg border-b border-border bg-background px-3 py-2 text-sm outline-none"
                    />
                    <ul
                        role="listbox"
                        className="max-h-64 overflow-y-auto py-1 text-sm"
                    >
                        <li>
                            <button
                                type="button"
                                onClick={() => pick(null)}
                                className="w-full px-3 py-2 text-left text-muted-foreground hover:bg-muted"
                            >
                                {noneLabel}
                            </button>
                        </li>
                        {loading && results.length === 0 && (
                            <li className="px-3 py-2 text-xs text-muted-foreground">
                                Loading members…
                            </li>
                        )}
                        {failed && (
                            <li className="px-3 py-2 text-xs text-destructive">
                                Could not load members. Refresh the page and try
                                again.
                            </li>
                        )}
                        {!loading && !failed && results.length === 0 && (
                            <li className="px-3 py-2 text-xs text-muted-foreground">
                                {query.trim()
                                    ? 'No members found'
                                    : 'No members in the database yet'}
                            </li>
                        )}
                        {results.map((m, i) => (
                            <li
                                key={m.id}
                                role="option"
                                aria-selected={m.id === value}
                            >
                                <button
                                    type="button"
                                    onClick={() => pick(m)}
                                    onMouseEnter={() => setHighlighted(i)}
                                    className={`w-full px-3 py-2 text-left hover:bg-muted ${i === highlighted ? 'bg-muted' : ''} ${m.id === value ? 'font-semibold' : ''}`}
                                >
                                    {m.name}
                                    {m.member_code && (
                                        <span className="ml-2 text-xs text-muted-foreground">
                                            {m.member_code}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                        {!query.trim() && results.length >= 20 && (
                            <li className="px-3 py-2 text-xs text-muted-foreground">
                                Showing the first 20. Type a name or member ID
                                to find others.
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
