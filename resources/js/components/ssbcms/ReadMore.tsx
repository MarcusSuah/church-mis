import { useState } from 'react';

/** Long text clamped to a few lines with a "Read more" / "Show less" toggle. */
export default function ReadMore({
    text,
    limit = 160,
    className = 'text-xs text-muted-foreground',
}: {
    text?: string | null;
    limit?: number;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    if (!text) return null;
    const long = text.length > limit;
    return (
        <p className={`${className} whitespace-pre-line`}>
            {open || !long ? text : `${text.slice(0, limit).trimEnd()}…`}
            {long && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(!open);
                    }}
                    className="ml-1 font-medium text-accent hover:underline"
                >
                    {open ? 'Show less' : 'Read more'}
                </button>
            )}
        </p>
    );
}
