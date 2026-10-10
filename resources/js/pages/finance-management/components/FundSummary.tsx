import Icon from '@/components/ssbcms/AppIcon';
import { fmtMoney, useCurrency } from '@/lib/finance';

export type FundRow = {
    id: string;
    name: string;
    balance: number;
    budget: number;
    ytdIncome: number;
    ytdExpenses: number;
    target_amount: number;
    currency: string;
    description: string | null;
    editable: boolean;
};

const COLORS = [
    'bg-primary',
    'bg-accent',
    'bg-success',
    'bg-info',
    'bg-warning',
];

export default function FundSummary({
    funds,
    onEdit,
}: {
    funds: FundRow[];
    onEdit?: (f: FundRow) => void;
}) {
    const c = useCurrency();
    if (!funds.length)
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No funds yet — add one to start tracking balances.
            </p>
        );
    return (
        <div className="space-y-3">
            {funds.map((fund, i) => {
                const color = COLORS[i % COLORS.length];
                const pct =
                    fund.budget > 0
                        ? Math.min(
                              100,
                              Math.max(
                                  0,
                                  Math.round(
                                      (fund.balance / fund.budget) * 100,
                                  ),
                              ),
                          )
                        : null;
                const isLow = pct !== null && pct < 30;
                return (
                    <div key={fund.id} className="card p-4">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <div
                                    className={`h-3 w-3 rounded-full ${color}`}
                                />
                                <span className="text-sm font-semibold text-foreground">
                                    {fund.name}
                                </span>
                                {isLow && (
                                    <span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning">
                                        Low
                                    </span>
                                )}
                                {fund.balance < 0 && (
                                    <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-xs font-medium text-danger">
                                        Overdrawn
                                    </span>
                                )}
                            </div>
                            <div className="flex items-start gap-2">
                                <div className="text-right">
                                    <p
                                        className={`text-sm font-bold tabular-nums ${fund.balance < 0 ? 'text-danger' : 'text-foreground'}`}
                                    >
                                        {fmtMoney(fund.balance, c, 0)}
                                    </p>
                                    {onEdit ? (
                                        <button
                                            type="button"
                                            onClick={() => onEdit(fund)}
                                            className="text-xs text-muted-foreground underline-offset-2 hover:text-accent hover:underline"
                                        >
                                            {fund.budget > 0
                                                ? `of ${fmtMoney(fund.target_amount, fund.currency, 0)} target`
                                                : 'Set target'}
                                        </button>
                                    ) : (
                                        <p className="text-xs text-muted-foreground">
                                            {fund.budget > 0
                                                ? `of ${fmtMoney(fund.budget, c, 0)} target`
                                                : 'No target set'}
                                        </p>
                                    )}
                                </div>
                                {onEdit && (
                                    <button
                                        type="button"
                                        onClick={() => onEdit(fund)}
                                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label={`Edit ${fund.name}`}
                                    >
                                        <Icon name="PencilIcon" size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {pct !== null && (
                            <div className="mb-2 h-2 w-full rounded-full bg-muted">
                                <div
                                    className={`h-2 rounded-full transition-all duration-500 ${isLow ? 'bg-warning' : color}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="tabular-nums">
                                {pct !== null
                                    ? `${pct}% of target`
                                    : 'Balance = all income − expenses'}
                            </span>
                            <div className="flex items-center gap-3">
                                <span className="text-success tabular-nums">
                                    ↑ {fmtMoney(fund.ytdIncome, c, 0)} in
                                </span>
                                {fund.ytdExpenses > 0 && (
                                    <span className="text-danger tabular-nums">
                                        ↓ {fmtMoney(fund.ytdExpenses, c, 0)} out
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
