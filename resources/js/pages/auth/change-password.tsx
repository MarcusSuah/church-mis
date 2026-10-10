import { Head, Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import { logout } from '@/routes';
import { update } from '@/routes/password/change';

type Props = {
    /** True when an administrator requires this user to set a new password. */
    forced: boolean;
    home: string;
};

const strengthOf = (pwd: string) =>
    [
        pwd.length >= 8,
        /[A-Z]/.test(pwd),
        /[a-z]/.test(pwd),
        /[0-9]/.test(pwd),
        /[^A-Za-z0-9]/.test(pwd),
    ].filter(Boolean).length;

function PasswordField({
    id,
    label,
    icon,
    placeholder,
    value,
    onChange,
    error,
    autoComplete,
}: {
    id: string;
    label: string;
    icon: string;
    placeholder: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    autoComplete: string;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <label className="label-text" htmlFor={id}>
                {label}
            </label>
            <div className="relative">
                <div className="absolute top-1/2 left-3 -translate-y-1/2">
                    <Icon
                        name={icon}
                        size={16}
                        className="text-muted-foreground"
                    />
                </div>
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    className="input-field pr-10 pl-9"
                    placeholder={placeholder}
                    value={value}
                    autoComplete={autoComplete}
                    onChange={(e) => onChange(e.target.value)}
                />
                <button
                    type="button"
                    onClick={() => setShow(!show)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={show ? 'Hide password' : 'Show password'}
                >
                    <Icon name={show ? 'EyeSlashIcon' : 'EyeIcon'} size={16} />
                </button>
            </div>
            {error && <p className="error-text">{error}</p>}
        </div>
    );
}

export default function ChangePassword({ forced, home }: Props) {
    const form = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [clientErrors, setClientErrors] = useState<Record<string, string>>(
        {},
    );

    const pwd = form.data.password;
    const strength = strengthOf(pwd);
    const strengthLabel = [
        '',
        'Very Weak',
        'Weak',
        'Fair',
        'Strong',
        'Very Strong',
    ][strength];
    const strengthColor = [
        '',
        'bg-danger',
        'bg-warning',
        'bg-warning',
        'bg-success',
        'bg-success',
    ][strength];

    const requirements = [
        { label: 'At least 8 characters', met: pwd.length >= 8 },
        {
            label: 'At least one uppercase letter (A–Z)',
            met: /[A-Z]/.test(pwd),
        },
        {
            label: 'At least one lowercase letter (a–z)',
            met: /[a-z]/.test(pwd),
        },
        { label: 'At least one number (0–9)', met: /[0-9]/.test(pwd) },
        {
            label: 'At least one special character (!@#$...)',
            met: /[^A-Za-z0-9]/.test(pwd),
        },
    ];

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!form.data.current_password)
            errs.current_password = 'Current password is required';
        if (!pwd) errs.password = 'New password is required';
        else if (pwd.length < 8)
            errs.password = 'Password must be at least 8 characters';
        else if (strength < 5)
            errs.password = 'Password must meet all the requirements below';
        if (!form.data.password_confirmation)
            errs.password_confirmation = 'Please confirm your password';
        else if (form.data.password_confirmation !== pwd)
            errs.password_confirmation = 'Passwords do not match';
        setClientErrors(errs);
        if (Object.keys(errs).length) return;

        form.put(update.url(), {
            onError: () => form.reset('password', 'password_confirmation'),
        });
    };

    const err = (
        k: 'current_password' | 'password' | 'password_confirmation',
    ) => clientErrors[k] ?? form.errors[k];

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Head title="Change Password" />
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="gradient-navy mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
                        <Icon
                            name="LockClosedIcon"
                            size={28}
                            className="text-white"
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Change Your Password
                    </h1>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                        {forced
                            ? 'For your security, you must choose a new password before accessing your account.'
                            : 'Choose a new password for your account. You will use it the next time you sign in.'}
                    </p>
                </div>

                {/* Security notice */}
                {forced && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 px-4 py-3">
                        <Icon
                            name="ExclamationTriangleIcon"
                            size={16}
                            className="mt-0.5 shrink-0 text-warning"
                        />
                        <div>
                            <p className="text-sm font-semibold text-warning">
                                Action Required
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                An administrator has asked you to set a new
                                password. Please create a new secure password.
                            </p>
                        </div>
                    </div>
                )}

                <div className="card p-6">
                    <form onSubmit={submit} noValidate className="space-y-5">
                        <PasswordField
                            id="current_password"
                            label="Current Password"
                            icon="LockClosedIcon"
                            placeholder="Enter current password"
                            autoComplete="current-password"
                            value={form.data.current_password}
                            onChange={(v) =>
                                form.setData('current_password', v)
                            }
                            error={err('current_password')}
                        />

                        <div>
                            <PasswordField
                                id="password"
                                label="New Password"
                                icon="KeyIcon"
                                placeholder="Create a strong password"
                                autoComplete="new-password"
                                value={pwd}
                                onChange={(v) => form.setData('password', v)}
                                error={err('password')}
                            />
                            {pwd && (
                                <div className="mt-2 space-y-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= strength ? strengthColor : 'bg-border'}`}
                                            />
                                        ))}
                                    </div>
                                    <p
                                        className={`text-xs font-medium ${strength >= 4 ? 'text-success' : strength >= 3 ? 'text-warning' : 'text-danger'}`}
                                    >
                                        {strengthLabel}
                                    </p>
                                </div>
                            )}
                        </div>

                        <PasswordField
                            id="password_confirmation"
                            label="Confirm New Password"
                            icon="KeyIcon"
                            placeholder="Confirm your new password"
                            autoComplete="new-password"
                            value={form.data.password_confirmation}
                            onChange={(v) =>
                                form.setData('password_confirmation', v)
                            }
                            error={err('password_confirmation')}
                        />

                        {/* Requirements */}
                        <div className="space-y-2 rounded-xl bg-muted/50 p-4">
                            <p className="text-xs font-semibold text-foreground">
                                Password Requirements
                            </p>
                            {requirements.map((r) => (
                                <div
                                    key={r.label}
                                    className="flex items-center gap-2"
                                >
                                    <Icon
                                        name={
                                            r.met
                                                ? 'CheckCircleIcon'
                                                : 'XCircleIcon'
                                        }
                                        size={14}
                                        className={
                                            r.met
                                                ? 'text-success'
                                                : 'text-muted-foreground'
                                        }
                                    />
                                    <span
                                        className={`text-xs ${r.met ? 'text-success' : 'text-muted-foreground'}`}
                                    >
                                        {r.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="btn-primary w-full py-2.5 text-base"
                        >
                            {form.processing ? (
                                <>
                                    <Icon
                                        name="ArrowPathIcon"
                                        size={18}
                                        className="animate-spin"
                                    />
                                    Changing Password...
                                </>
                            ) : (
                                <>
                                    <Icon name="CheckIcon" size={18} />
                                    {forced
                                        ? 'Change Password & Continue'
                                        : 'Change Password'}
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="mt-4 text-center text-xs text-muted-foreground">
                    {forced ? (
                        <>
                            Having trouble?{' '}
                            <span className="font-medium text-accent">
                                Contact your administrator
                            </span>{' '}
                            ·{' '}
                            <Link
                                href={logout()}
                                as="button"
                                className="font-medium text-accent hover:underline"
                            >
                                Sign out
                            </Link>
                        </>
                    ) : (
                        <Link
                            href={home}
                            className="font-medium text-accent hover:underline"
                        >
                            ← Back
                        </Link>
                    )}
                </p>
            </div>
        </div>
    );
}
