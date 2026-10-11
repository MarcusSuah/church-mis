import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

/** Up to two initials from a name, e.g. "Rev. John Doe" → "JD". */
export function initials(name: string): string {
    const words = name
        .replace(/^(rev|dr|pastor|deacon|mr|mrs|ms|elder)\.?\s+/i, '')
        .split(/\s+/)
        .filter(Boolean);
    return (
        (
            (words[0]?.[0] ?? '') +
            (words.length > 1 ? words[words.length - 1][0] : '')
        ).toUpperCase() || '?'
    );
}

/** Round photo, or the person's initials when there is no photo. */
export function PersonAvatar({
    name,
    image,
    size = 'md',
}: {
    name: string;
    image?: string | null;
    size?: 'sm' | 'md' | 'lg';
}) {
    const box =
        size === 'lg'
            ? 'h-20 w-20 text-2xl'
            : size === 'sm'
              ? 'h-11 w-11 text-sm'
              : 'h-14 w-14 text-lg';
    return image ? (
        <img
            src={image}
            alt={name}
            loading="lazy"
            className={`${box} shrink-0 rounded-full object-cover ring-2 ring-accent/30`}
        />
    ) : (
        <span
            aria-hidden
            className={`${box} flex shrink-0 items-center justify-center rounded-full bg-accent/15 font-display font-bold text-accent ring-2 ring-accent/20`}
        >
            {initials(name)}
        </span>
    );
}

/**
 * The card used for leaders, board members, ministries and departments:
 * round avatar on the left, serif name, gold role and a short description.
 */
export function PersonCard({
    name,
    role,
    body,
    image,
    href,
    footer,
    actions,
}: {
    name: string;
    role?: string | null;
    body?: string | null;
    image?: string | null;
    href?: string;
    footer?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <article className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md sm:p-6">
            <div className="flex items-start gap-4">
                <PersonAvatar name={name} image={image} />
                <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg leading-snug font-bold wrap-break-word">
                        {href ? (
                            <Link
                                href={href}
                                className="after:absolute after:inset-0 hover:text-accent focus-visible:underline"
                            >
                                {name}
                            </Link>
                        ) : (
                            name
                        )}
                    </h3>
                    {role && (
                        <p className="mt-0.5 text-sm font-medium text-accent">
                            {role}
                        </p>
                    )}
                </div>
            </div>
            {body && (
                <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {body}
                </p>
            )}
            {footer && <div className="mt-auto pt-4">{footer}</div>}
            {actions && (
                <div className="relative z-10 mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    {actions}
                </div>
            )}
        </article>
    );
}
