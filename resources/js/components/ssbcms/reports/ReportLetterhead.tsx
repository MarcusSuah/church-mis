import { usePage } from '@inertiajs/react';
import type { ChurchInfo } from './types';

export default function ReportLetterhead({
    title,
    rangeLabel,
    period,
    generatedAt,
}: {
    title: string;
    rangeLabel: string;
    period: string;
    generatedAt: string;
}) {
    const { church } = usePage<{ church?: ChurchInfo }>().props;
    const line = (...parts: (string | null | undefined)[]) =>
        parts.filter(Boolean).join(' · ');

    return (
        <header className="break-inside-avoid rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                {church?.logo_url && (
                    <img
                        src={church.logo_url}
                        alt=""
                        className="h-16 w-16 shrink-0 object-contain"
                    />
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                    {church?.name && (
                        <h2 className="text-xl font-bold text-foreground">{church.name}</h2>
                    )}
                    {line(church?.denomination, church?.branch) && (
                        <p className="text-sm text-muted-foreground">
                            {line(church?.denomination, church?.branch)}
                        </p>
                    )}
                    {church?.address && (
                        <p className="text-xs text-muted-foreground">{church.address}</p>
                    )}
                    {line(church?.email, church?.phone) && (
                        <p className="text-xs text-muted-foreground">
                            {line(church?.email, church?.phone)}
                        </p>
                    )}
                </div>
            </div>
            <div className="mt-4 border-t border-border pt-4 text-center sm:text-left">
                <h1 className="text-lg font-semibold text-foreground">{title}</h1>
                <p className="text-sm text-muted-foreground">
                    {rangeLabel} — {period}
                </p>
                <p className="text-xs text-muted-foreground">Generated {generatedAt}</p>
            </div>
        </header>
    );
}