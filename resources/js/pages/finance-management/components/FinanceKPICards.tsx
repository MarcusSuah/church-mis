import Icon from '@/components/ssbcms/AppIcon';
import { fmtMoney, pctChange, useCurrency, useMoney } from '@/lib/finance';

export type FinanceKpis = {
    tithes: number;
    tithes_prev: number;
    offerings: number;
    offerings_prev: number;
    expenses: number;
    expenses_prev: number;
    net: number;
    ytd_giving: number;
    giving_goal: number;
};

export default function FinanceKPICards({
    kpis,
    periodLabel,
}: {
    kpis: FinanceKpis;
    periodLabel: string;
}) {
    const c = useCurrency();
    const { equiv } = useMoney();
    const income = kpis.tithes + kpis.offerings;
    const year = new Date().getFullYear();
    const cards = [
        {
            id: 'fin-tithes',
            label: 'Tithes',
            value: fmtMoney(kpis.tithes, c, 0),
            raw: kpis.tithes,
            change: pctChange(kpis.tithes, kpis.tithes_prev),
            positive: kpis.tithes >= kpis.tithes_prev,
            icon: 'CurrencyDollarIcon',
            color: 'bg-primary/5 border-primary/20',
            iconBg: 'bg-primary/10',
            iconColor: 'text-primary',
            sub: periodLabel,
        },
        {
            id: 'fin-offerings',
            label: 'Offerings & Donations',
            value: fmtMoney(kpis.offerings, c, 0),
            raw: kpis.offerings,
            change: pctChange(kpis.offerings, kpis.offerings_prev),
            positive: kpis.offerings >= kpis.offerings_prev,
            icon: 'HeartIcon',
            color: 'bg-success/5 border-success/20',
            iconBg: 'bg-success/10',
            iconColor: 'text-success',
            sub: 'Incl. special offerings',
        },
        {
            id: 'fin-expenses',
            label: 'Expenses',
            value: fmtMoney(kpis.expenses, c, 0),
            raw: kpis.expenses,
            change: pctChange(kpis.expenses, kpis.expenses_prev),
            positive: kpis.expenses <= kpis.expenses_prev,
            icon: 'ArrowTrendingDownIcon',
            color: 'bg-danger/5 border-danger/20',
            iconBg: 'bg-danger/10',
            iconColor: 'text-danger',
            sub: 'Approved + paid',
        },
        {
            id: 'fin-balance',
            label: 'Net Balance',
            value: `${kpis.net >= 0 ? '+' : '−'}${fmtMoney(Math.abs(kpis.net), c, 0)}`,
            raw: kpis.net,
            change: income
                ? `${kpis.net >= 0 ? 'Surplus' : 'Deficit'}: ${Math.abs((kpis.net / income) * 100).toFixed(1)}% of income`
                : 'No income yet',
            positive: kpis.net >= 0,
            icon: 'ScaleIcon',
            color: 'bg-accent/5 border-accent/20',
            iconBg: 'bg-accent/10',
            iconColor: 'text-accent',
            sub: 'Income − Expenses',
        },
        {
            id: 'fin-ytd',
            label: 'Total Giving (YTD)',
            value: fmtMoney(kpis.ytd_giving, c, 0),
            raw: kpis.ytd_giving,
            change: kpis.giving_goal
                ? `Goal: ${fmtMoney(kpis.giving_goal, c, 0)} (${((kpis.ytd_giving / kpis.giving_goal) * 100).toFixed(1)}%)`
                : 'Set fund targets for a goal',
            positive: true,
            icon: 'BanknotesIcon',
            color: 'bg-info/5 border-info/20',
            iconBg: 'bg-info/10',
            iconColor: 'text-info',
            sub: `Jan–today ${year}`,
        },
    ];

    return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {cards.map((k) => (
                <div
                    key={k.id}
                    className={`card border p-4 transition-shadow duration-200 hover:shadow-elevated ${k.color}`}
                >
                    <div className="mb-2 flex items-center gap-2">
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${k.iconBg}`}
                        >
                            <Icon
                                name={k.icon}
                                size={16}
                                className={k.iconColor}
                            />
                        </div>
                        <p className="truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                            {k.label}
                        </p>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">
                        {k.value}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                        {equiv(k.raw)}
                    </p>
                    <p
                        className={`mt-1 text-xs font-medium ${k.positive ? 'text-success' : 'text-danger'}`}
                    >
                        {k.change}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {k.sub}
                    </p>
                </div>
            ))}
        </div>
    );
}
