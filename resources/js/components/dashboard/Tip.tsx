/** Shared tooltip card used by every dashboard chart. */
export default function Tip({
    title,
    rows,
    footer,
}: {
    title: string;
    rows: { name: string; value: string; color?: string }[];
    footer?: { name: string; value: string };
}) {
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-elevated">
            <p className="mb-2 font-semibold text-foreground">{title}</p>
            {rows.map((r) => (
                <div
                    key={r.name}
                    className="flex items-center justify-between gap-6"
                >
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                        {r.color && (
                            <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: r.color }}
                            />
                        )}
                        {r.name}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                        {r.value}
                    </span>
                </div>
            ))}
            {footer && (
                <div className="mt-2 flex justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">{footer.name}</span>
                    <span className="font-bold text-foreground tabular-nums">
                        {footer.value}
                    </span>
                </div>
            )}
        </div>
    );
}
