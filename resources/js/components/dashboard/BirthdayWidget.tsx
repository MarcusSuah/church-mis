import { Link } from '@inertiajs/react';
import type { BirthdayItem } from './types';

function Avatar({ b, big = false }: { b: BirthdayItem; big?: boolean }) {
    const size = big ? 'h-9 w-9' : 'h-7 w-7';
    return b.photo_url ? (
        <img
            src={b.photo_url}
            alt=""
            className={`${size} shrink-0 rounded-full object-cover`}
        />
    ) : (
        <div
            className={`${size} flex shrink-0 items-center justify-center rounded-full ${big ? 'gradient-gold text-white' : 'bg-muted text-muted-foreground'}`}
        >
            <span className="text-xs font-bold">{b.initials}</span>
        </div>
    );
}

export default function BirthdayWidget({
    today,
    upcoming,
    canSend,
}: {
    today: BirthdayItem[];
    upcoming: BirthdayItem[];
    canSend: boolean;
}) {
    if (!today.length && !upcoming.length)
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No birthdays in the next 10 days.
            </p>
        );
    return (
        <div className="space-y-4">
            {today.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Today 🎂
                    </p>
                    <div className="space-y-2">
                        {today.map((b) => (
                            <div
                                key={b.id}
                                className="flex items-center gap-3 rounded-lg border border-accent/20 bg-accent/5 p-2.5"
                            >
                                <Avatar b={b} big />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-foreground">
                                        {b.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {b.department
                                            ? `${b.department} · `
                                            : ''}
                                        Turning {b.turning}
                                    </p>
                                </div>
                                {canSend ? (
                                    <Link
                                        href={`/birthdays?member=${b.id}`}
                                        className="shrink-0 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-white hover:bg-accent/90"
                                    >
                                        Send wish
                                    </Link>
                                ) : (
                                    <span className="text-lg">🎉</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {upcoming.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Upcoming
                    </p>
                    <div className="space-y-1.5">
                        {upcoming.map((b) => (
                            <div
                                key={b.id}
                                className="flex items-center gap-3 py-1.5"
                            >
                                <Avatar b={b} />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-foreground">
                                        {b.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {b.department ?? `Turning ${b.turning}`}
                                    </p>
                                </div>
                                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                    {new Date(
                                        `${b.next_birthday}T00:00:00`,
                                    ).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
