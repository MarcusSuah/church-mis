import { Link } from '@inertiajs/react';
import Icon from '@/components/ssbcms/AppIcon';
import type { EventItem } from './types';

const TYPE_COLOR: Record<string, string> = {
    'Sunday Worship': 'bg-primary/10 text-primary',
    'Youth Event': 'bg-success/10 text-success',
    'Special Service': 'bg-accent/10 text-accent',
    Outreach: 'bg-orange-50 text-orange-600',
    'Prayer Meeting': 'bg-info/10 text-info',
    'Children Event': 'bg-pink-50 text-pink-600',
};

export default function UpcomingEventsWidget({
    events,
}: {
    events: EventItem[];
}) {
    if (!events.length)
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No upcoming events.
            </p>
        );
    return (
        <div className="space-y-2">
            {events.map((e) => {
                const d = new Date(e.start);
                return (
                    <Link
                        key={e.id}
                        href="/events"
                        className="flex gap-3 rounded-lg border border-border p-3 transition-colors duration-100 hover:bg-muted/30"
                    >
                        <div className="w-12 shrink-0 text-center">
                            <p className="text-xs text-muted-foreground">
                                {d.toLocaleDateString('en-US', {
                                    month: 'short',
                                })}
                            </p>
                            <p className="text-lg leading-tight font-bold text-foreground">
                                {d.getDate()}
                            </p>
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="truncate text-sm leading-snug font-semibold text-foreground">
                                    {e.title}
                                </p>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[e.type] ?? 'bg-muted text-muted-foreground'}`}
                                >
                                    {e.type}
                                </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Icon name="ClockIcon" size={11} />
                                    {d.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    })}
                                </span>
                                {e.location && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Icon name="MapPinIcon" size={11} />
                                        {e.location}
                                    </span>
                                )}
                                {e.capacity && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Icon name="UsersIcon" size={11} />
                                        {e.registered}/{e.capacity}
                                    </span>
                                )}
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
}
