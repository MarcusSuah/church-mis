import Icon from '@/components/ssbcms/AppIcon';
import { CAT_LABELS, fmtMoney, useCurrency } from '@/lib/finance';

export type BudgetRow = {
    id: string;
    category: string;
    icon: string;
    budgeted: number;
    spent: number;
};

export default function BudgetProgress({ items }: { items: BudgetRow[] }) {
    const c = useCurrency();
    if (!items.length)
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No budgets for this year yet.
            </p>
        );
    return (
        <div className="space-y-3">
            {items.map((item) => {
                const pct =
                    item.budgeted > 0
                        ? Math.round((item.spent / item.budgeted) * 100)
                        : 0;
                const remaining = item.budgeted - item.spent;
                const over = pct > 100;
                const warn = pct > 80 && !over;
                return (
                    <div key={item.id} className="flex items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon
                                name={item.icon || 'BanknotesIcon'}
                                size={15}
                                className="text-muted-foreground"
                            />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between">
                                <span className="truncate text-xs font-medium text-foreground">
                                    {CAT_LABELS[item.category] ?? item.category}
                                </span>
                                <div className="ml-2 flex shrink-0 items-center gap-2">
                                    <span
                                        className={`text-xs font-semibold tabular-nums ${over ? 'text-danger' : warn ? 'text-warning' : 'text-muted-foreground'}`}
                                    >
                                        {pct}%
                                    </span>
                                    <span className="hidden text-xs text-muted-foreground tabular-nums sm:block">
                                        {fmtMoney(item.spent, c, 0)} /{' '}
                                        {fmtMoney(item.budgeted, c, 0)}
                                    </span>
                                </div>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted">
                                <div
                                    className={`h-1.5 rounded-full transition-all duration-500 ${over ? 'bg-danger' : warn ? 'bg-warning' : 'bg-primary'}`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                />
                            </div>
                        </div>
                        <div className="hidden shrink-0 text-right md:block">
                            <p
                                className={`text-xs font-semibold tabular-nums ${remaining >= 0 ? 'text-success' : 'text-danger'}`}
                            >
                                {remaining >= 0
                                    ? `${fmtMoney(remaining, c, 0)} left`
                                    : `-${fmtMoney(Math.abs(remaining), c, 0)} over`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
