import { Check, Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

export type MemberOption = {
    id: string;
    label: string;
    code: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
};

type Props = {
    options: MemberOption[] | undefined;
    value: string | null;
    onChange: (option: MemberOption | null) => void;
    placeholder?: string;
    invalid?: boolean;
};

/** Searchable single-select over church members who aren't in a family yet. */
export default function MemberPicker({
    options,
    value,
    onChange,
    placeholder = 'Search church members…',
    invalid,
}: Props) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = options?.find((o) => o.id === value) ?? null;

    useEffect(() => {
        const close = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const results = useMemo(() => {
        if (!options) return [];
        const q = query.trim().toLowerCase();
        const list = q
            ? options.filter(
                  (o) =>
                      o.label.toLowerCase().includes(q) ||
                      (o.code ?? '').toLowerCase().includes(q) ||
                      (o.email ?? '').toLowerCase().includes(q),
              )
            : options;
        return list.slice(0, 50);
    }, [options, query]);

    if (selected) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                        {selected.label}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                        {selected.code || 'No member ID yet'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="btn-ghost p-1.5"
                    aria-label="Clear selection"
                >
                    <X className="size-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div ref={ref} className="relative">
            <div
                className={`flex items-center gap-2 rounded-lg border bg-card px-3 py-2 ${invalid ? 'border-danger' : 'border-input'}`}
            >
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    placeholder={placeholder}
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                />
                {!options && (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                )}
            </div>
            {open && options && (
                <div className="absolute z-20 mt-1 max-h-60 w-full scrollbar-thin overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg">
                    {results.length === 0 ? (
                        <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                            {options.length === 0
                                ? 'Every member already belongs to a family.'
                                : 'No matching members.'}
                        </p>
                    ) : (
                        results.map((o) => (
                            <button
                                type="button"
                                key={o.id}
                                onClick={() => {
                                    onChange(o);
                                    setQuery('');
                                    setOpen(false);
                                }}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm text-foreground">
                                        {o.label}
                                    </span>
                                    <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                        {o.code || o.email || '—'}
                                    </span>
                                </span>
                                {value === o.id && (
                                    <Check className="size-3.5 text-primary" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
