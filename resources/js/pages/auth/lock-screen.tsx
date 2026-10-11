import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Eye, EyeOff, Lock, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { broadcast, UNLOCKED_KEY } from '@/hooks/use-screen-lock';
import { lockScreen, logout } from '@/routes';
import { unlock } from '@/routes/lock-screen';

type Props = {
    user: { name: string; avatar: string | null; role: string | null };
    /** A church photo from Church Settings; a gradient is used when there is none. */
    background: string | null;
    lockedAt: string | null;
};

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

/** Live clock, updated every 15 seconds. */
function useNow(): Date {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 15_000);
        return () => window.clearInterval(timer);
    }, []);
    return now;
}

/**
 * Lock screen. The user is still signed in; the page they were on opens
 * again after they type their password. See LockScreenController.
 */
export default function LockScreen({ user, background }: Props) {
    const church = usePage<{ church?: { name: string } }>().props.church;
    const [showPassword, setShowPassword] = useState(false);
    const now = useNow();

    // Unlocked in another tab: this tab follows (the server sends it back to its page).
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === UNLOCKED_KEY) {
                router.visit(lockScreen.url());
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-slate-900 px-4 py-10 text-white">
            <Head title="Screen locked" />

            {/* Background photo with a dark blue wash, like a lock screen. */}
            {background ? (
                <img
                    src={background}
                    alt=""
                    className="absolute inset-0 h-full w-full scale-105 object-cover blur-[2px]"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-sky-950 to-slate-900" />
            )}
            <div className="absolute inset-0 bg-slate-950/65" />

            <div className="relative z-10 flex w-full max-w-sm flex-col items-center text-center">
                <p className="text-5xl font-light tracking-tight tabular-nums sm:text-6xl">
                    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-1 text-sm text-white/70">
                    {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>

                <div className="mt-10 rounded-full bg-white p-1 shadow-2xl">
                    {user.avatar ? (
                        <img
                            src={user.avatar}
                            alt={user.name}
                            className="h-24 w-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="gradient-gold flex h-24 w-24 items-center justify-center rounded-full">
                            <span className="text-2xl font-bold text-white">
                                {initials(user.name)}
                            </span>
                        </div>
                    )}
                </div>

                <h1 className="mt-5 text-xl font-bold">{user.name}</h1>
                {user.role && (
                    <p className="mt-1 text-sm font-semibold text-white/80">
                        {user.role}
                    </p>
                )}

                <p className="mt-4 flex items-center gap-1.5 text-xs text-white/60">
                    <Lock className="size-3.5" />
                    Screen locked. Enter your password to continue.
                </p>

                <Form
                    {...unlock.form()}
                    resetOnError
                    onSuccess={() => broadcast(UNLOCKED_KEY)}
                    className="mt-4 w-full"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 p-1 pl-4 backdrop-blur focus-within:border-white/60">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    required
                                    autoFocus
                                    autoComplete="current-password"
                                    placeholder="Password"
                                    aria-label="Password"
                                    aria-invalid={Boolean(errors.password)}
                                    className="min-w-0 flex-1 bg-transparent py-2 text-sm text-white placeholder:text-white/50 focus:outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="rounded-full p-2 text-white/70 hover:text-white"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex size-9 items-center justify-center rounded-full bg-white text-slate-900 transition hover:bg-white/90 disabled:opacity-60"
                                    aria-label="Unlock"
                                >
                                    <ArrowRight className="size-4" />
                                </button>
                            </div>
                            {errors.password && (
                                <p className="mt-2 text-sm text-red-300" role="alert">
                                    {errors.password}
                                </p>
                            )}
                        </>
                    )}
                </Form>

                <div className="mt-8 flex items-center gap-5 text-xs text-white/70">
                    <Link
                        href={logout()}
                        as="button"
                        className="flex items-center gap-1.5 hover:text-white"
                    >
                        <LogOut className="size-3.5" />
                        Not you? Sign out
                    </Link>
                </div>
            </div>

            {church?.name && (
                <p className="absolute bottom-4 z-10 text-xs text-white/50">
                    {church.name}
                </p>
            )}
        </div>
    );
}
