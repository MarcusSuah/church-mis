import Icon from '@/components/ssbcms/AppIcon';
import { timeAgo } from './types';
import type { ActivityItem } from './types';

const MODULE_ICON: Record<string, [string, string]> = {
    Members: ['UserPlusIcon', 'bg-info/10 text-info'],
    Finance: ['BanknotesIcon', 'bg-success/10 text-success'],
    Prayer: ['HandRaisedIcon', 'bg-accent/10 text-accent'],
    Attendance: ['CalendarDaysIcon', 'bg-primary/10 text-primary'],
    Events: ['CalendarIcon', 'bg-secondary text-muted-foreground'],
    Sacraments: ['SparklesIcon', 'bg-warning/10 text-warning'],
    Content: ['MegaphoneIcon', 'bg-info/10 text-info'],
    Sermons: ['BookOpenIcon', 'bg-primary/10 text-primary'],
    'Church Structure': ['BuildingOffice2Icon', 'bg-info/10 text-info'],
    Website: ['GlobeAltIcon', 'bg-accent/10 text-accent'],
    Security: ['ShieldCheckIcon', 'bg-warning/10 text-warning'],
    Reports: ['DocumentChartBarIcon', 'bg-primary/10 text-primary'],
    System: ['Cog6ToothIcon', 'bg-muted text-muted-foreground'],
};
const ACTION: Record<string, [string, string]> = {
    CREATE: ['New', 'bg-success/10 text-success'],
    UPDATE: ['Updated', 'bg-info/10 text-info'],
    DELETE: ['Removed', 'bg-danger/10 text-danger'],
    EXPORT: ['Exported', 'bg-primary/10 text-primary'],
    LOGIN: ['Signed in', 'bg-success/10 text-success'],
    LOGOUT: ['Signed out', 'bg-muted text-muted-foreground'],
    LOGIN_FAILED: ['Failed sign-in', 'bg-danger/10 text-danger'],
    PASSWORD_CHANGED: ['Password', 'bg-warning/10 text-warning'],
    BLOCKED: ['Blocked', 'bg-danger/10 text-danger'],
};

export default function ActivityFeed({ items }: { items: ActivityItem[] }) {
    if (!items.length)
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No activity yet.
            </p>
        );
    return (
        <div className="space-y-1">
            {items.map((a) => {
                const [icon, cls] =
                    MODULE_ICON[a.module ?? ''] ?? MODULE_ICON.System;
                const [label, badge] = ACTION[a.action] ?? [
                    a.action,
                    'bg-muted text-muted-foreground',
                ];
                return (
                    <div
                        key={a.id}
                        className="flex gap-3 rounded-lg p-3 transition-colors duration-100 hover:bg-muted/40"
                    >
                        <div
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${cls}`}
                        >
                            <Icon name={icon} size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm leading-snug font-medium text-foreground">
                                    {a.module ?? 'System'}
                                </p>
                                <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}
                                >
                                    {label}
                                </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {a.description}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground/70">
                                {timeAgo(a.at)} · {a.by_name}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
