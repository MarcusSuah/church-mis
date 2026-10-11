import { Head, Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpen,
    CheckCircle2,
    Clock,
    Home,
    LogIn,
    ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';
import RegistrationWizard from '@/components/members/registration-wizard';
import { login } from '@/routes';

type Props = {
    church: { name: string; email: string };
    /** Service times from Church Settings (blank ones are left out). */
    services: string[];
};
export default function PublicMemberRegistration({ church, services }: Props) {
    const footerPages =
        usePage<{ footerPages?: { title: string; url: string }[] }>().props
            .footerPages ?? [];
    const [submitted, setSubmitted] = useState<{
        reference: string;
        name: string;
        email: string;
    } | null>(null);
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Head title="Member Registration" />

            {/* Top bar */}
            <header className="border-b border-border bg-card">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
                    <Link href="/" className="flex items-center gap-2">
                        <BookOpen className="size-6 text-accent" />
                        <span>
                            <span className="block text-sm leading-tight font-bold text-primary">
                                {church.name}
                            </span>
                            <span className="block text-[11px] leading-tight text-muted-foreground">
                                Member Registration
                            </span>
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/"
                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                            <Home className="size-3.5" />
                            Home
                        </Link>
                        <Link
                            href={login()}
                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                            <LogIn className="size-3.5" />
                            Sign In
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto grid w-full max-w-5xl flex-1 gap-6 px-4 py-8 md:grid-cols-[220px_1fr]">
                {/* Side info */}
                <aside className="space-y-5">
                    <div>
                        <h1 className="text-lg font-bold text-foreground">
                            Join Our Family
                        </h1>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            Welcome to {church.name}. Complete this registration
                            to become a member of our congregation.
                        </p>
                    </div>
                    <ul className="space-y-2.5 text-xs text-muted-foreground">
                        <li className="flex gap-2">
                            <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                            No login required to register
                        </li>
                        <li className="flex gap-2">
                            <Clock className="size-3.5 shrink-0" />
                            Applications reviewed within 3–5 days
                        </li>
                        <li className="flex gap-2">
                            <ShieldCheck className="size-3.5 shrink-0 text-info" />
                            Your data is secure and private
                        </li>
                        <li className="flex gap-2">
                            <Bell className="size-3.5 shrink-0 text-accent" />
                            We'll contact you once approved
                        </li>
                    </ul>
                    {services.length > 0 && (
                        <div className="card p-4">
                            <p className="mb-2 text-xs font-semibold text-foreground">
                                Service Times
                            </p>
                            <ul className="space-y-1 text-xs text-muted-foreground">
                                {services.map((t) => (
                                    <li key={t}>{t}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Already a member?{' '}
                        <Link
                            href={login()}
                            className="font-medium text-accent hover:underline"
                        >
                            Sign in here
                        </Link>
                    </p>
                </aside>

                {/* Form card */}
                <section className="card p-5 sm:p-6">
                    {submitted ? (
                        <div className="flex flex-col items-center gap-4 py-10 text-center fade-in">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                                <CheckCircle2 className="size-8 text-success" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    Registration Submitted!
                                </h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Thank you, {submitted.name}. Our church
                                    office will review your application within
                                    3–5 days.
                                </p>
                            </div>
                            {submitted.reference && (
                                <div className="rounded-xl border border-border bg-muted/40 px-6 py-3">
                                    <p className="text-xs text-muted-foreground">
                                        Your reference number
                                    </p>
                                    <p className="font-mono text-lg font-bold text-foreground">
                                        {submitted.reference}
                                    </p>
                                </div>
                            )}
                            <p className="max-w-sm text-xs text-muted-foreground">
                                Keep this reference for any enquiries. We'll
                                contact you at{' '}
                                <strong>{submitted.email}</strong>. To view your
                                membership online later, create an account with
                                this same email.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setSubmitted(null)}
                                    className="btn-outline text-sm"
                                >
                                    Register another person
                                </button>
                                <Link href="/" className="btn-primary text-sm">
                                    Back to home
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <RegistrationWizard
                            mode="public"
                            churchName={church.name}
                            onSaved={(page) => {
                                const reg = (
                                    page.flash as
                                        | Record<string, unknown>
                                        | undefined
                                )?.registration as typeof submitted;
                                setSubmitted(
                                    reg ?? {
                                        reference: '',
                                        name: '',
                                        email: '',
                                    },
                                );
                                window.scrollTo({ top: 0 });
                            }}
                        />
                    )}
                </section>
            </main>

            <footer className="border-t border-border py-5 text-center text-xs text-muted-foreground">
                <p>
                    © {new Date().getFullYear()} {church.name} · All rights
                    reserved
                </p>
                <p>
                    Questions? Contact us at{' '}
                    <a
                        href={`mailto:${church.email}`}
                        className="text-accent hover:underline"
                    >
                        {church.email}
                    </a>
                </p>
                {footerPages.length > 0 && (
                    <p className="mt-2 flex flex-wrap justify-center gap-x-4">
                        {footerPages.map((p) => (
                            <Link
                                key={p.url}
                                href={p.url}
                                className="hover:underline"
                            >
                                {p.title}
                            </Link>
                        ))}
                    </p>
                )}
            </footer>
        </div>
    );
}
