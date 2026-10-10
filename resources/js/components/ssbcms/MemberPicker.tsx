import { useEffect, useRef, useState } from 'react';
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

/**
 * Type-ahead member search (Phase 3, F07). Replaces drop-downs that loaded
 * every member into the page. Asks the server for at most 20 matches as the
 * user types (/lookup/members, staff only).
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
    const box = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (box.current && !box.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    useEffect(() => {
        if (!open || query.trim().length < 2) {
            setResults([]);
            return;
        }
        const controller = new AbortController();
        const t = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await fetch(
                    `/lookup/members?q=${encodeURIComponent(query.trim())}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        credentials: 'same-origin',
                        signal: controller.signal,
                    },
                );
                const body = res.ok ? await res.json() : { data: [] };
                setResults(body.data ?? []);
            } catch {
                // Aborted or offline: keep the previous results.
            } finally {
                setLoading(false);
            }
        }, 250);
        return () => {
            clearTimeout(t);
            controller.abort();
        };
    }, [query, open]);

    const pick = (m: PickedMember | null) => {
        onChange(m);
        setQuery('');
        setOpen(false);
    };

    return (
        <div ref={box} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
                <span className={value ? '' : 'text-muted-foreground'}>
                    {value ? label || 'Linked member' : noneLabel}
                </span>
                <Icon
                    name="ChevronUpDownIcon"
                    size={16}
                    className="text-muted-foreground"
                />
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={placeholder}
                        className="w-full rounded-t-lg border-b border-border bg-background px-3 py-2 text-sm outline-none"
                    />
                    <ul className="max-h-64 overflow-y-auto py-1 text-sm">
                        <li>
                            <button
                                type="button"
                                onClick={() => pick(null)}
                                className="w-full px-3 py-2 text-left text-muted-foreground hover:bg-muted"
                            >
                                {noneLabel}
                            </button>
                        </li>
                        {query.trim().length < 2 && (
                            <li className="px-3 py-2 text-xs text-muted-foreground">
                                Type at least 2 letters…
                            </li>
                        )}
                        {loading && (
                            <li className="px-3 py-2 text-xs text-muted-foreground">
                                Searching…
                            </li>
                        )}
                        {!loading &&
                            query.trim().length >= 2 &&
                            results.length === 0 && (
                                <li className="px-3 py-2 text-xs text-muted-foreground">
                                    No members found
                                </li>
                            )}
                        {results.map((m) => (
                            <li key={m.id}>
                                <button
                                    type="button"
                                    onClick={() => pick(m)}
                                    className={`w-full px-3 py-2 text-left hover:bg-muted ${m.id === value ? 'font-semibold' : ''}`}
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
                    </ul>
                </div>
            )}
        </div>
    );
}
