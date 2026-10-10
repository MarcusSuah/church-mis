import { Head, useForm } from '@inertiajs/react';
import Icon from '@/components/ssbcms/AppIcon';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import { Field, inputCls, SaveButton } from '@/components/ssbcms/records-ui';
import { CURRENCIES, CURRENCY_LABELS, fmtMoney } from '@/lib/finance';

type Settings = {
    name: string;
    short_name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
    currency: string;
    exchange_rate: number;
    birthday_notifications: boolean;
};

export default function ChurchSettings({ settings }: { settings: Settings }) {
    const form = useForm({
        name: settings.name ?? '',
        short_name: settings.short_name ?? '',
        address: settings.address ?? '',
        email: settings.email ?? '',
        phone: settings.phone ?? '',
        logo_url: settings.logo_url ?? '',
        currency: settings.currency ?? 'USD',
        exchange_rate: String(settings.exchange_rate ?? 190),
        birthday_notifications: settings.birthday_notifications ?? true,
    });
    const rate = Number(form.data.exchange_rate) || 0;

    return (
        <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Church Settings" />
            <div>
                <h1 className="page-title">Church Settings</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Church details shown on reports, receipts, certificates and
                    emails — plus currency settings
                </p>
            </div>

            <div className="card space-y-4 p-5">
                <h2 className="section-header flex items-center gap-2">
                    <Icon
                        name="BuildingLibraryIcon"
                        size={18}
                        className="text-muted-foreground"
                    />{' '}
                    Church profile
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Church name *" error={form.errors.name} span>
                        <input
                            className={inputCls}
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Short name *" error={form.errors.short_name}>
                        <input
                            className={inputCls}
                            value={form.data.short_name}
                            onChange={(e) =>
                                form.setData('short_name', e.target.value)
                            }
                            placeholder="SSBC"
                        />
                    </Field>
                    <Field label="Phone" error={form.errors.phone}>
                        <input
                            className={inputCls}
                            value={form.data.phone}
                            onChange={(e) =>
                                form.setData('phone', e.target.value)
                            }
                            placeholder="+231 77 000 0000"
                        />
                    </Field>
                    <Field label="Email" error={form.errors.email}>
                        <input
                            type="email"
                            className={inputCls}
                            value={form.data.email}
                            onChange={(e) =>
                                form.setData('email', e.target.value)
                            }
                        />
                    </Field>
                    <Field label="Address" error={form.errors.address}>
                        <input
                            className={inputCls}
                            value={form.data.address}
                            onChange={(e) =>
                                form.setData('address', e.target.value)
                            }
                            placeholder="Street, City, Liberia"
                        />
                    </Field>
                    <div className="sm:col-span-2">
                        <ImageUploadField
                            label="Church logo (PNG or JPG works best on PDFs)"
                            value={form.data.logo_url}
                            onChange={(url) => form.setData('logo_url', url)}
                            variant="avatar"
                        />
                    </div>
                </div>
            </div>

            <div className="card space-y-4 p-5">
                <h2 className="section-header flex items-center gap-2">
                    <Icon
                        name="BanknotesIcon"
                        size={18}
                        className="text-muted-foreground"
                    />{' '}
                    Currency
                </h2>
                <p className="text-sm text-muted-foreground">
                    Every gift and expense is saved in the currency it was paid
                    in (USD or LRD). Totals, charts and reports are shown in the{' '}
                    <strong>default currency</strong>, with the equivalent in
                    the other currency next to them.
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                        label="Default currency"
                        error={form.errors.currency}
                    >
                        <div className="grid grid-cols-2 gap-2">
                            {CURRENCIES.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => form.setData('currency', c)}
                                    className={`rounded-xl border-2 p-3 text-left transition-colors ${form.data.currency === c ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                                >
                                    <p className="text-lg font-bold text-foreground">
                                        {c === 'USD' ? '$' : 'L$'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {CURRENCY_LABELS[c]}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field
                        label="Exchange rate (Liberian dollars per 1 US dollar) *"
                        error={form.errors.exchange_rate}
                    >
                        <div className="flex">
                            <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-muted px-3 text-sm font-semibold">
                                $1 = L$
                            </span>
                            <input
                                type="number"
                                min="0.0001"
                                step="0.01"
                                className={`${inputCls} rounded-l-none`}
                                value={form.data.exchange_rate}
                                onChange={(e) =>
                                    form.setData(
                                        'exchange_rate',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        {rate > 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {fmtMoney(100, 'USD')} ={' '}
                                {fmtMoney(100 * rate, 'LRD')} ·{' '}
                                {fmtMoney(10000, 'LRD')} ={' '}
                                {fmtMoney(10000 / rate, 'USD')}
                            </p>
                        )}
                    </Field>
                </div>
            </div>

            <div className="card space-y-3 p-5">
                <h2 className="section-header flex items-center gap-2">
                    <Icon
                        name="CakeIcon"
                        size={18}
                        className="text-muted-foreground"
                    />{' '}
                    Birthdays
                </h2>
                <label className="flex items-start gap-3">
                    <input
                        type="checkbox"
                        className="mt-1 rounded border-border"
                        checked={form.data.birthday_notifications}
                        onChange={(e) =>
                            form.setData(
                                'birthday_notifications',
                                e.target.checked,
                            )
                        }
                    />
                    <span className="text-sm text-foreground">
                        Notify staff every morning about members celebrating
                        their birthday
                        <span className="block text-xs text-muted-foreground">
                            Appears in the notification bell with a link to send
                            them a wish.
                        </span>
                    </span>
                </label>
            </div>

            <div className="flex justify-end">
                <SaveButton
                    saving={form.processing}
                    label="Save settings"
                    onClick={() =>
                        form.put('/church-settings', { preserveScroll: true })
                    }
                />
            </div>
        </div>
    );
}
