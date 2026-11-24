import { router } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import { formatDateTime } from '@/lib/format'; // adjust to wherever your date helpers live
import SignaturePad from './SignaturePad';
import type { Approvals, Signatory } from './types';

function Status({ s }: { s: Signatory }) {
    if (s.status === 'signed' && s.stale)
        return (
            <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                Signed — figures changed since
            </span>
        );
    if (s.status === 'signed')
        return (
            <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                Signed
            </span>
        );
    return (
        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            Pending
        </span>
    );
}

export default function ApprovalSection({
    approvals,
    type,
    from,
    to,
}: {
    approvals: Approvals;
    type: string;
    from: string;
    to: string;
}) {
    const [signing, setSigning] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = (position: string, signature: string) =>
        router.post(
            '/reports/signatures',
            { type, from, to, position, signature },
            {
                preserveScroll: true,
                onStart: () => {
                    setBusy(true);
                    setError(null);
                },
                onSuccess: () => setSigning(null),
                onError: (errs) =>
                    setError(
                        (Object.values(errs)[0] as string) ??
                            'The signature could not be saved.',
                    ),
                onFinish: () => setBusy(false),
            },
        );

    const anyStale = approvals.signatories.some((s) => s.stale);

    return (
        <section className="break-inside-avoid overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold text-foreground">
                    Report approval
                </h2>
                <p className="text-xs text-muted-foreground">
                    Each position signs once. Signatures are stored with the
                    report figures they approved.
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-muted/60">
                        <tr>
                            {[
                                'Position',
                                'Name',
                                'Digital signature',
                                'Date',
                                'Status',
                            ].map((h) => (
                                <th
                                    key={h}
                                    className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {approvals.signatories.map((s) => (
                            <Fragment key={s.position_key}>
                                <tr className="border-t border-border">
                                    <td className="px-4 py-3 font-medium text-foreground">
                                        {s.position}
                                    </td>
                                    <td className="px-4 py-3 text-foreground">
                                        {s.name ?? '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {s.signature_url ? (
                                            <img
                                                src={s.signature_url}
                                                alt={`Signature of ${s.name ?? s.position}`}
                                                className="h-12 max-w-[160px] rounded bg-white object-contain p-1"
                                            />
                                        ) : s.can_sign ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError(null);
                                                    setSigning(s.position_key);
                                                }}
                                                className="btn-outline px-3 py-1.5 text-xs print:hidden"
                                            >
                                                Sign
                                            </button>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                Not signed
                                                {s.roles?.length ? (
                                                    <span className="block text-[11px] print:hidden">
                                                        Signed by:{' '}
                                                        {s.roles.join(' / ')}
                                                    </span>
                                                ) : null}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-foreground">
                                        {s.signed_at
                                            ? formatDateTime(s.signed_at)
                                            : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Status s={s} />
                                    </td>
                                </tr>
                                {signing === s.position_key && (
                                    <tr className="border-t border-border print:hidden">
                                        <td colSpan={5} className="p-4">
                                            <SignaturePad
                                                busy={busy}
                                                error={error}
                                                onCancel={() =>
                                                    setSigning(null)
                                                }
                                                onConfirm={(png) =>
                                                    submit(s.position_key, png)
                                                }
                                            />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {anyStale && (
                <p className="border-t border-border px-5 py-3 text-xs text-red-700">
                    Some figures in this report have changed since it was
                    signed. Those signatures approved the earlier figures.
                </p>
            )}
        </section>
    );
}
