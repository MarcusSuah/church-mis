import { formatShortDate } from '@/lib/format'; // adjust to wherever your date helpers live
import { fmtMoney } from '@/lib/finance';
import type { Ledger } from './types';

const num = 'px-4 py-2 text-right tabular-nums';

export default function LedgerTable({
    ledger,
    currency,
}: {
    ledger: Ledger;
    currency: string;
}) {
    const m = (v: number) => fmtMoney(v, currency, 2);
    const cell = (v: number) => (v ? m(v) : '—');

    return (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div>
                    <h2 className="text-sm font-semibold text-foreground">
                        Financial ledger
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {ledger.grouping === 'month'
                            ? 'Income and approved/paid expenses, totalled per month'
                            : 'Income and approved/paid expenses, totalled per day'}{' '}
                        ({currency})
                    </p>
                </div>
                <span className="text-xs text-muted-foreground">
                    {ledger.rows.length} entr
                    {ledger.rows.length === 1 ? 'y' : 'ies'}
                </span>
            </div>
            <div className="max-h-[32rem] overflow-auto print:max-h-none print:overflow-visible">
                <table className="w-full min-w-[680px] text-sm">
                    <thead className="sticky top-0 bg-muted/60 print:static">
                        <tr>
                            {['Date', 'Ref', 'Description'].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground"
                                >
                                    {h}
                                </th>
                            ))}
                            {['Income', 'Expense', 'Balance'].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-t border-border bg-muted/30 font-medium">
                            <td className="px-4 py-2" colSpan={3}>
                                Opening balance
                            </td>
                            <td className={num} />
                            <td className={num} />
                            <td className={num}>{m(ledger.opening_balance)}</td>
                        </tr>
                        {ledger.rows.map((r, i) => (
                            <tr
                                key={i}
                                className="break-inside-avoid border-t border-border"
                            >
                                <td className="px-4 py-2 whitespace-nowrap text-foreground">
                                    {ledger.grouping === 'month'
                                        ? new Date(
                                              `${r.date}T00:00:00`,
                                          ).toLocaleDateString('en-US', {
                                              month: 'short',
                                              year: 'numeric',
                                          })
                                        : formatShortDate(r.date)}
                                </td>
                                <td className="px-4 py-2 text-foreground">
                                    {r.ref}
                                </td>
                                <td className="px-4 py-2 text-foreground">
                                    {r.description}
                                </td>
                                <td className={`${num} text-green-700`}>
                                    {cell(r.income)}
                                </td>
                                <td className={`${num} text-red-700`}>
                                    {cell(r.expense)}
                                </td>
                                <td
                                    className={`${num} font-medium text-foreground`}
                                >
                                    {m(r.balance)}
                                </td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                            <td className="px-4 py-2" colSpan={3}>
                                Totals / closing balance
                            </td>
                            <td className={num}>{m(ledger.total_income)}</td>
                            <td className={num}>{m(ledger.total_expense)}</td>
                            <td className={num}>{m(ledger.closing_balance)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>
    );
}
