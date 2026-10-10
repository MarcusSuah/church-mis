import { Head, Link, useForm } from '@inertiajs/react';
import {
    BookOpen,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Church,
    ClipboardCheck,
    Clock,
    Heart,
    Loader2,
    LogIn,
    Bell,
    Plus,
    ShieldCheck,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { formatLongDate } from '@/lib/format';
import { login } from '@/routes';
import { store } from '@/routes/public-registration';
import { MINISTRIES } from '@/types/member';

type Props = {
    church: { name: string; email: string };
};

type Child = { name: string; date_of_birth: string };

type FormData = {
    photo: File | null;
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    marital_status: string;
    nationality: string;
    phone: string;
    alt_phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
    membership_type: string;
    previous_church: string;
    previous_denomination: string;
    baptized: boolean;
    baptism_date: string;
    communion_participant: boolean;
    interests: string;
    family: {
        spouse_name: string;
        spouse_is_member: boolean;
        children: Child[];
    };
    emergency_name: string;
    emergency_phone: string;
    emergency_relation: string;
    occupation: string;
    employer: string;
    skills: string;
    notes: string;
    consent: boolean;
};

const STEPS = [
    {
        title: 'Personal Info',
        heading: 'Personal Information',
        sub: 'Please provide your personal details accurately.',
        Icon: User,
    },
    {
        title: 'Church Info',
        heading: 'Church Information',
        sub: 'Tell us about your faith journey and how you would like to serve.',
        Icon: Church,
    },
    {
        title: 'Family Info',
        heading: 'Family Information',
        sub: 'Optional — helps us connect your household.',
        Icon: Users,
    },
    {
        title: 'Emergency & Additional',
        heading: 'Emergency & Additional Details',
        sub: 'Who should we contact in an emergency?',
        Icon: Heart,
    },
    {
        title: 'Review & Submit',
        heading: 'Review & Submit',
        sub: 'Please check everything before submitting.',
        Icon: ClipboardCheck,
    },
] as const;

/** Which step each field lives on — used to jump to the first server error. */
const FIELD_STEP: Record<string, number> = {
    photo: 0,
    first_name: 0,
    middle_name: 0,
    last_name: 0,
    gender: 0,
    date_of_birth: 0,
    marital_status: 0,
    nationality: 0,
    phone: 0,
    alt_phone: 0,
    email: 0,
    address: 0,
    city: 0,
    state: 0,
    country: 0,
    membership_type: 1,
    previous_church: 1,
    previous_denomination: 1,
    baptized: 1,
    baptism_date: 1,
    communion_participant: 1,
    interests: 1,
    emergency_name: 3,
    emergency_phone: 3,
    emergency_relation: 3,
    occupation: 3,
    employer: 3,
    skills: 3,
    notes: 3,
    consent: 4,
};

const REQUIRED: Record<number, (keyof FormData)[]> = {
    0: [
        'first_name',
        'last_name',
        'gender',
        'date_of_birth',
        'phone',
        'email',
        'address',
        'city',
        'country',
    ],
    1: ['membership_type'],
    2: [],
    3: ['emergency_name', 'emergency_phone', 'emergency_relation'],
    4: ['consent'],
};

const LABELS: Partial<Record<keyof FormData, string>> = {
    first_name: 'First name',
    last_name: 'Last name',
    gender: 'Gender',
    date_of_birth: 'Date of birth',
    phone: 'Primary phone',
    email: 'Email address',
    address: 'Street address',
    city: 'City',
    country: 'Country',
    membership_type: 'Membership type',
    emergency_name: 'Emergency contact name',
    emergency_phone: 'Emergency contact phone',
    emergency_relation: 'Relationship',
};

const SERVICE_TIMES = [
    'Sunday Worship: 9:00 AM & 11:00 AM',
    'Sunday School: 8:00 AM',
    'Bible Study: Wednesdays 7:00 PM',
    'Prayer Meeting: Fridays 6:30 PM',
];

const emptyForm = (): FormData => ({
    photo: null,
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    nationality: '',
    phone: '',
    alt_phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    membership_type: 'Regular Member',
    previous_church: '',
    previous_denomination: '',
    baptized: false,
    baptism_date: '',
    communion_participant: false,
    interests: '',
    family: { spouse_name: '', spouse_is_member: false, children: [] },
    emergency_name: '',
    emergency_phone: '',
    emergency_relation: '',
    occupation: '',
    employer: '',
    skills: '',
    notes: '',
    consent: false,
});

function Field({
    label,
    required,
    error,
    helper,
    className = '',
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    helper?: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <div className={className}>
            <label className="mb-1 block text-xs font-medium text-foreground">
                {label}
                {required && <span className="text-danger"> *</span>}
            </label>
            {children}
            {error ? (
                <p className="error-text">{error}</p>
            ) : helper ? (
                <p className="helper-text">{helper}</p>
            ) : null}
        </div>
    );
}

export default function PublicMemberRegistration({ church }: Props) {
    const [step, setStep] = useState(0);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>(
        {},
    );
    const [submitted, setSubmitted] = useState<{
        reference: string;
        name: string;
        email: string;
    } | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const form = useForm<FormData>(emptyForm());
    const { data, setData } = form;
    const errors: Record<string, string> = {
        ...clientErrors,
        ...(form.errors as Record<string, string>),
    };

    useEffect(
        () => () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        },
        [photoPreview],
    );

    const selectedInterests = useMemo(
        () =>
            data.interests
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
        [data.interests],
    );

    const input = (field: keyof FormData) => ({
        value: data[field] as string,
        onChange: (
            e: ChangeEvent<
                HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
            >,
        ) => {
            setData(field, e.target.value as never);
            if (clientErrors[field])
                setClientErrors(({ [field]: _, ...rest }) => rest);
            form.clearErrors(field as never);
        },
        className: `input-field ${errors[field] ? 'border-danger focus:ring-danger' : ''}`,
    });

    const validateStep = (s: number): boolean => {
        const next: Record<string, string> = {};
        for (const f of REQUIRED[s]) {
            const v = data[f];
            if (
                f === 'consent' ? !v : typeof v === 'string' && v.trim() === ''
            ) {
                next[f] =
                    f === 'consent'
                        ? 'Please confirm to continue.'
                        : `${LABELS[f] ?? f} is required.`;
            }
        }
        if (s === 0 && data.email && !/^\S+@\S+\.\S+$/.test(data.email))
            next.email = 'Enter a valid email address.';
        if (
            s === 0 &&
            data.date_of_birth &&
            new Date(data.date_of_birth) >= new Date()
        )
            next.date_of_birth = 'Date of birth must be in the past.';
        if (s === 2) {
            data.family.children.forEach((c, i) => {
                if (!c.name.trim())
                    next[`family.children.${i}.name`] =
                        'Name is required (or remove this row).';
            });
        }
        setClientErrors(next);
        return Object.keys(next).length === 0;
    };

    const goNext = () => {
        if (!validateStep(step)) return;
        setStep((s) => Math.min(s + 1, STEPS.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        setClientErrors({});
        setStep((s) => Math.max(s - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goTo = (s: number) => {
        // Only allow jumping back, or forward over steps that already validate.
        if (s <= step) {
            setClientErrors({});
            setStep(s);
            return;
        }
        for (let i = step; i < s; i++) if (!validateStep(i)) return setStep(i);
        setStep(s);
    };

    const submit = () => {
        if (!validateStep(4)) return;
        form.transform((d) => ({
            ...d,
            baptism_date: d.baptized ? d.baptism_date : '',
            family:
                d.family.spouse_name || d.family.children.length
                    ? d.family
                    : null,
        }));
        form.post(store.url(), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const reg = (page.flash as Record<string, unknown> | undefined)
                    ?.registration as typeof submitted;
                setSubmitted(
                    reg ?? {
                        reference: '',
                        name: data.first_name,
                        email: data.email,
                    },
                );
                form.reset();
                setPhotoPreview(null);
                setStep(0);
                window.scrollTo({ top: 0 });
            },
            onError: (errs) => {
                const first = Object.keys(errs)[0] ?? '';
                const target = first.startsWith('family')
                    ? 2
                    : (FIELD_STEP[first] ?? 0);
                setStep(target);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
        });
    };

    const onPhoto = (file: File | undefined) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            setClientErrors((e) => ({
                ...e,
                photo: 'Photo must be 5MB or smaller.',
            }));
            return;
        }
        setData('photo', file);
        setPhotoPreview(URL.createObjectURL(file));
        setClientErrors(({ photo: _, ...rest }) => rest);
    };

    const toggleInterest = (name: string) => {
        const set = new Set(selectedInterests);
        if (set.has(name)) set.delete(name);
        else set.add(name);
        setData('interests', [...set].join(', '));
    };

    const setChild = (i: number, patch: Partial<Child>) =>
        setData('family', {
            ...data.family,
            children: data.family.children.map((c, idx) =>
                idx === i ? { ...c, ...patch } : c,
            ),
        });

    const current = STEPS[step];

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
                    <Link
                        href={login()}
                        className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                        <LogIn className="size-3.5" />
                        Sign In
                    </Link>
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
                    <div className="card p-4">
                        <p className="mb-2 text-xs font-semibold text-foreground">
                            Service Times
                        </p>
                        <ul className="space-y-1 text-xs text-muted-foreground">
                            {SERVICE_TIMES.map((t) => (
                                <li key={t}>{t}</li>
                            ))}
                        </ul>
                    </div>
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
                        <>
                            {/* Stepper */}
                            <ol className="mb-8 flex items-start">
                                {STEPS.map((s, i) => {
                                    const done = i < step;
                                    const active = i === step;
                                    return (
                                        <li
                                            key={s.title}
                                            className="flex flex-1 items-start last:flex-none"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => goTo(i)}
                                                className="flex w-16 flex-col items-center gap-1 sm:w-20"
                                            >
                                                <span
                                                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                                                        active
                                                            ? 'bg-primary text-primary-foreground'
                                                            : done
                                                              ? 'bg-success text-white'
                                                              : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {done ? (
                                                        <Check className="size-4" />
                                                    ) : (
                                                        <s.Icon className="size-4" />
                                                    )}
                                                </span>
                                                <span
                                                    className={`text-center text-[10px] leading-tight ${active ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
                                                >
                                                    {s.title}
                                                </span>
                                            </button>
                                            {i < STEPS.length - 1 && (
                                                <span
                                                    className={`mx-1 mt-[18px] h-px flex-1 ${i < step ? 'bg-success' : 'bg-border'}`}
                                                />
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>

                            <h2 className="text-base font-semibold text-foreground">
                                {current.heading}
                            </h2>
                            <p className="mb-5 text-xs text-muted-foreground">
                                {current.sub}
                            </p>

                            {/* Step 1 */}
                            {step === 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        {photoPreview ? (
                                            <img
                                                src={photoPreview}
                                                alt=""
                                                className="h-16 w-16 rounded-full object-cover"
                                            />
                                        ) : (
                                            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                                                <User className="size-6 text-muted-foreground" />
                                            </span>
                                        )}
                                        <div>
                                            <p className="mb-1 text-xs font-medium text-foreground">
                                                Profile Photo
                                            </p>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={(e) =>
                                                    onPhoto(e.target.files?.[0])
                                                }
                                                className="text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-xs"
                                            />
                                            {errors.photo ? (
                                                <p className="error-text">
                                                    {errors.photo}
                                                </p>
                                            ) : (
                                                <p className="helper-text">
                                                    JPEG, PNG or WebP. Max 5MB.
                                                    Recommended: 400×400px
                                                    square.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <Field
                                            label="First Name"
                                            required
                                            error={errors.first_name}
                                        >
                                            <input
                                                {...input('first_name')}
                                                placeholder="e.g. Kwame"
                                                autoComplete="given-name"
                                            />
                                        </Field>
                                        <Field
                                            label="Middle Name"
                                            error={errors.middle_name}
                                        >
                                            <input
                                                {...input('middle_name')}
                                                placeholder="e.g. Asante"
                                                autoComplete="additional-name"
                                            />
                                        </Field>
                                        <Field
                                            label="Last Name"
                                            required
                                            error={errors.last_name}
                                        >
                                            <input
                                                {...input('last_name')}
                                                placeholder="e.g. Boateng"
                                                autoComplete="family-name"
                                            />
                                        </Field>
                                        <Field
                                            label="Gender"
                                            required
                                            error={errors.gender}
                                        >
                                            <select {...input('gender')}>
                                                <option value="">
                                                    Select gender
                                                </option>
                                                <option>Male</option>
                                                <option>Female</option>
                                            </select>
                                        </Field>
                                        <Field
                                            label="Date of Birth"
                                            required
                                            error={errors.date_of_birth}
                                        >
                                            <input
                                                {...input('date_of_birth')}
                                                type="date"
                                                max={new Date()
                                                    .toISOString()
                                                    .slice(0, 10)}
                                            />
                                        </Field>
                                        <Field
                                            label="Marital Status"
                                            error={errors.marital_status}
                                        >
                                            <select
                                                {...input('marital_status')}
                                            >
                                                <option value="">
                                                    Select status
                                                </option>
                                                <option>Single</option>
                                                <option>Married</option>
                                                <option>Widowed</option>
                                                <option>Divorced</option>
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Nationality"
                                            error={errors.nationality}
                                        >
                                            <input
                                                {...input('nationality')}
                                                placeholder="e.g. Rwandan, Ghanaian"
                                            />
                                        </Field>
                                        <Field
                                            label="Primary Phone"
                                            required
                                            error={errors.phone}
                                        >
                                            <input
                                                {...input('phone')}
                                                type="tel"
                                                placeholder="+250 788 000 000"
                                                autoComplete="tel"
                                            />
                                        </Field>
                                        <Field
                                            label="Alternate Phone"
                                            error={errors.alt_phone}
                                        >
                                            <input
                                                {...input('alt_phone')}
                                                type="tel"
                                                placeholder="Optional"
                                            />
                                        </Field>
                                        <Field
                                            label="Email Address"
                                            required
                                            error={errors.email}
                                            helper="We'll use this to contact you. Must be unique."
                                        >
                                            <input
                                                {...input('email')}
                                                type="email"
                                                placeholder="you@email.com"
                                                autoComplete="email"
                                            />
                                        </Field>
                                    </div>

                                    <Field
                                        label="Street Address"
                                        required
                                        error={errors.address}
                                    >
                                        <input
                                            {...input('address')}
                                            placeholder="e.g. KG 7 Ave, House 12"
                                            autoComplete="street-address"
                                        />
                                    </Field>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <Field
                                            label="City"
                                            required
                                            error={errors.city}
                                        >
                                            <input
                                                {...input('city')}
                                                placeholder="e.g. Kigali"
                                                autoComplete="address-level2"
                                            />
                                        </Field>
                                        <Field
                                            label="State / District"
                                            error={errors.state}
                                        >
                                            <input
                                                {...input('state')}
                                                placeholder="e.g. Gasabo"
                                                autoComplete="address-level1"
                                            />
                                        </Field>
                                        <Field
                                            label="Country"
                                            required
                                            error={errors.country}
                                        >
                                            <input
                                                {...input('country')}
                                                placeholder="e.g. Rwanda"
                                                autoComplete="country-name"
                                            />
                                        </Field>
                                    </div>
                                </div>
                            )}

                            {/* Step 2 */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Membership Type"
                                            required
                                            error={errors.membership_type}
                                        >
                                            <select
                                                {...input('membership_type')}
                                            >
                                                <option>Regular Member</option>
                                                <option>
                                                    Associate Member
                                                </option>
                                                <option>Junior Member</option>
                                                <option>Transfer Member</option>
                                            </select>
                                        </Field>
                                        <Field
                                            label="Previous Church"
                                            error={errors.previous_church}
                                        >
                                            <input
                                                {...input('previous_church')}
                                                placeholder="If any"
                                            />
                                        </Field>
                                        <Field
                                            label="Previous Denomination"
                                            error={errors.previous_denomination}
                                        >
                                            <input
                                                {...input(
                                                    'previous_denomination',
                                                )}
                                                placeholder="e.g. Baptist, Methodist"
                                            />
                                        </Field>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field label="Have you been baptized?">
                                            <div className="flex gap-2">
                                                {[true, false].map((v) => (
                                                    <button
                                                        type="button"
                                                        key={String(v)}
                                                        onClick={() =>
                                                            setData(
                                                                'baptized',
                                                                v,
                                                            )
                                                        }
                                                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                                            data.baptized === v
                                                                ? 'border-primary bg-primary/5 font-semibold text-primary'
                                                                : 'border-border text-muted-foreground'
                                                        }`}
                                                    >
                                                        {v ? 'Yes' : 'No'}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                        {data.baptized && (
                                            <Field
                                                label="Baptism Date"
                                                error={errors.baptism_date}
                                            >
                                                <input
                                                    {...input('baptism_date')}
                                                    type="date"
                                                    max={new Date()
                                                        .toISOString()
                                                        .slice(0, 10)}
                                                />
                                            </Field>
                                        )}
                                    </div>

                                    <label className="flex items-center gap-2 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={data.communion_participant}
                                            onChange={(e) =>
                                                setData(
                                                    'communion_participant',
                                                    e.target.checked,
                                                )
                                            }
                                            className="rounded border-border"
                                        />
                                        I participate in Holy Communion
                                    </label>

                                    <Field
                                        label="Ministries you'd like to serve in"
                                        helper="Choose any that interest you."
                                    >
                                        <div className="flex flex-wrap gap-2">
                                            {MINISTRIES.map((m) => {
                                                const on =
                                                    selectedInterests.includes(
                                                        m,
                                                    );
                                                return (
                                                    <button
                                                        type="button"
                                                        key={m}
                                                        onClick={() =>
                                                            toggleInterest(m)
                                                        }
                                                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                                                            on
                                                                ? 'border-primary bg-primary text-primary-foreground'
                                                                : 'border-border text-muted-foreground hover:bg-muted'
                                                        }`}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </Field>
                                </div>
                            )}

                            {/* Step 3 */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Spouse's Full Name"
                                            error={errors['family.spouse_name']}
                                        >
                                            <input
                                                className="input-field"
                                                value={data.family.spouse_name}
                                                onChange={(e) =>
                                                    setData('family', {
                                                        ...data.family,
                                                        spouse_name:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder={
                                                    data.marital_status ===
                                                    'Married'
                                                        ? 'Spouse name'
                                                        : 'If married'
                                                }
                                            />
                                        </Field>
                                        <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    data.family.spouse_is_member
                                                }
                                                onChange={(e) =>
                                                    setData('family', {
                                                        ...data.family,
                                                        spouse_is_member:
                                                            e.target.checked,
                                                    })
                                                }
                                                className="rounded border-border"
                                            />
                                            My spouse is already a member here
                                        </label>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs font-medium text-foreground">
                                                Children
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setData('family', {
                                                        ...data.family,
                                                        children: [
                                                            ...data.family
                                                                .children,
                                                            {
                                                                name: '',
                                                                date_of_birth:
                                                                    '',
                                                            },
                                                        ],
                                                    })
                                                }
                                                className="btn-ghost px-2 py-1 text-xs"
                                            >
                                                <Plus className="size-3.5" />
                                                Add child
                                            </button>
                                        </div>
                                        {data.family.children.length === 0 ? (
                                            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                                                No children added.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {data.family.children.map(
                                                    (c, i) => (
                                                        <div
                                                            key={i}
                                                            className="grid grid-cols-[1fr_160px_auto] items-start gap-2"
                                                        >
                                                            <div>
                                                                <input
                                                                    className={`input-field ${errors[`family.children.${i}.name`] ? 'border-danger' : ''}`}
                                                                    placeholder="Child's full name"
                                                                    value={
                                                                        c.name
                                                                    }
                                                                    onChange={(
                                                                        e,
                                                                    ) =>
                                                                        setChild(
                                                                            i,
                                                                            {
                                                                                name: e
                                                                                    .target
                                                                                    .value,
                                                                            },
                                                                        )
                                                                    }
                                                                />
                                                                {errors[
                                                                    `family.children.${i}.name`
                                                                ] && (
                                                                    <p className="error-text">
                                                                        {
                                                                            errors[
                                                                                `family.children.${i}.name`
                                                                            ]
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <input
                                                                type="date"
                                                                className="input-field"
                                                                value={
                                                                    c.date_of_birth
                                                                }
                                                                max={new Date()
                                                                    .toISOString()
                                                                    .slice(
                                                                        0,
                                                                        10,
                                                                    )}
                                                                onChange={(e) =>
                                                                    setChild(
                                                                        i,
                                                                        {
                                                                            date_of_birth:
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                        },
                                                                    )
                                                                }
                                                                aria-label="Date of birth"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setData(
                                                                        'family',
                                                                        {
                                                                            ...data.family,
                                                                            children:
                                                                                data.family.children.filter(
                                                                                    (
                                                                                        _,
                                                                                        idx,
                                                                                    ) =>
                                                                                        idx !==
                                                                                        i,
                                                                                ),
                                                                        },
                                                                    )
                                                                }
                                                                className="btn-ghost p-2 text-danger"
                                                                aria-label="Remove child"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </button>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Step 4 */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <Field
                                            label="Emergency Contact Name"
                                            required
                                            error={errors.emergency_name}
                                        >
                                            <input
                                                {...input('emergency_name')}
                                                placeholder="Full name"
                                            />
                                        </Field>
                                        <Field
                                            label="Emergency Contact Phone"
                                            required
                                            error={errors.emergency_phone}
                                        >
                                            <input
                                                {...input('emergency_phone')}
                                                type="tel"
                                                placeholder="+250 788 000 000"
                                            />
                                        </Field>
                                        <Field
                                            label="Relationship"
                                            required
                                            error={errors.emergency_relation}
                                        >
                                            <select
                                                {...input('emergency_relation')}
                                            >
                                                <option value="">Select</option>
                                                {[
                                                    'Spouse',
                                                    'Parent',
                                                    'Mother',
                                                    'Father',
                                                    'Sibling',
                                                    'Sister',
                                                    'Brother',
                                                    'Child',
                                                    'Relative',
                                                    'Friend',
                                                    'Other',
                                                ].map((r) => (
                                                    <option key={r}>{r}</option>
                                                ))}
                                            </select>
                                        </Field>
                                    </div>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Occupation"
                                            error={errors.occupation}
                                        >
                                            <input
                                                {...input('occupation')}
                                                placeholder="e.g. Teacher"
                                            />
                                        </Field>
                                        <Field
                                            label="Employer"
                                            error={errors.employer}
                                        >
                                            <input
                                                {...input('employer')}
                                                placeholder="Optional"
                                            />
                                        </Field>
                                    </div>
                                    <Field
                                        label="Skills & Talents"
                                        error={errors.skills}
                                        helper="e.g. singing, IT, accounting, teaching children"
                                    >
                                        <textarea
                                            {...input('skills')}
                                            rows={3}
                                        />
                                    </Field>
                                    <Field
                                        label="Anything else we should know?"
                                        error={errors.notes}
                                    >
                                        <textarea
                                            {...input('notes')}
                                            rows={3}
                                            placeholder="Prayer requests, accessibility needs, questions…"
                                        />
                                    </Field>
                                </div>
                            )}

                            {/* Step 5 */}
                            {step === 4 && (
                                <div className="space-y-4">
                                    <ReviewSection
                                        title="Personal Information"
                                        onEdit={() => goTo(0)}
                                    >
                                        <ReviewRow
                                            label="Name"
                                            value={[
                                                data.first_name,
                                                data.middle_name,
                                                data.last_name,
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                        />
                                        <ReviewRow
                                            label="Gender"
                                            value={data.gender}
                                        />
                                        <ReviewRow
                                            label="Date of Birth"
                                            value={formatLongDate(
                                                data.date_of_birth,
                                            )}
                                        />
                                        <ReviewRow
                                            label="Marital Status"
                                            value={data.marital_status}
                                        />
                                        <ReviewRow
                                            label="Phone"
                                            value={[data.phone, data.alt_phone]
                                                .filter(Boolean)
                                                .join(' / ')}
                                        />
                                        <ReviewRow
                                            label="Email"
                                            value={data.email}
                                        />
                                        <ReviewRow
                                            label="Address"
                                            value={[
                                                data.address,
                                                data.city,
                                                data.state,
                                                data.country,
                                            ]
                                                .filter(Boolean)
                                                .join(', ')}
                                        />
                                    </ReviewSection>
                                    <ReviewSection
                                        title="Church Information"
                                        onEdit={() => goTo(1)}
                                    >
                                        <ReviewRow
                                            label="Membership Type"
                                            value={data.membership_type}
                                        />
                                        <ReviewRow
                                            label="Baptized"
                                            value={
                                                data.baptized
                                                    ? `Yes${data.baptism_date ? ` (${formatLongDate(data.baptism_date)})` : ''}`
                                                    : 'No'
                                            }
                                        />
                                        <ReviewRow
                                            label="Previous Church"
                                            value={data.previous_church}
                                        />
                                        <ReviewRow
                                            label="Interests"
                                            value={data.interests}
                                        />
                                    </ReviewSection>
                                    <ReviewSection
                                        title="Family"
                                        onEdit={() => goTo(2)}
                                    >
                                        <ReviewRow
                                            label="Spouse"
                                            value={data.family.spouse_name}
                                        />
                                        <ReviewRow
                                            label="Children"
                                            value={data.family.children
                                                .map((c) => c.name)
                                                .filter(Boolean)
                                                .join(', ')}
                                        />
                                    </ReviewSection>
                                    <ReviewSection
                                        title="Emergency & Additional"
                                        onEdit={() => goTo(3)}
                                    >
                                        <ReviewRow
                                            label="Emergency Contact"
                                            value={`${data.emergency_name} (${data.emergency_relation}) — ${data.emergency_phone}`}
                                        />
                                        <ReviewRow
                                            label="Occupation"
                                            value={[
                                                data.occupation,
                                                data.employer,
                                            ]
                                                .filter(Boolean)
                                                .join(' at ')}
                                        />
                                        <ReviewRow
                                            label="Skills"
                                            value={data.skills}
                                        />
                                    </ReviewSection>

                                    <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-foreground">
                                        <input
                                            type="checkbox"
                                            checked={data.consent}
                                            onChange={(e) => {
                                                setData(
                                                    'consent',
                                                    e.target.checked,
                                                );
                                                setClientErrors(
                                                    ({ consent: _, ...rest }) =>
                                                        rest,
                                                );
                                            }}
                                            className="mt-0.5 rounded border-border"
                                        />
                                        <span>
                                            I confirm this information is
                                            accurate and agree that{' '}
                                            {church.name} may store it to manage
                                            my membership.
                                        </span>
                                    </label>
                                    {errors.consent && (
                                        <p className="error-text">
                                            {errors.consent}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-6 flex items-center justify-between border-t border-border pt-5">
                                {step > 0 ? (
                                    <button
                                        type="button"
                                        onClick={goBack}
                                        className="btn-ghost text-sm"
                                    >
                                        <ChevronLeft className="size-4" />
                                        Back
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-muted-foreground">
                                        Step {step + 1} of {STEPS.length}
                                    </span>
                                    {step < STEPS.length - 1 ? (
                                        <button
                                            type="button"
                                            onClick={goNext}
                                            className="btn-primary text-sm"
                                        >
                                            Continue
                                            <ChevronRight className="size-4" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={submit}
                                            disabled={form.processing}
                                            className="btn-accent text-sm"
                                        >
                                            {form.processing ? (
                                                <Loader2 className="size-4 animate-spin" />
                                            ) : (
                                                <Check className="size-4" />
                                            )}
                                            Submit Registration
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
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
            </footer>
        </div>
    );
}

function ReviewSection({
    title,
    onEdit,
    children,
}: {
    title: string;
    onEdit: () => void;
    children: ReactNode;
}) {
    return (
        <div className="rounded-lg border border-border">
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
                <p className="text-xs font-semibold text-foreground">{title}</p>
                <button
                    type="button"
                    onClick={onEdit}
                    className="text-xs font-medium text-accent hover:underline"
                >
                    Edit
                </button>
            </div>
            <dl className="grid gap-x-4 gap-y-2 p-4 sm:grid-cols-2">
                {children}
            </dl>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                {label}
            </dt>
            <dd className="text-sm text-foreground">
                {value && value !== '—' ? value : '—'}
            </dd>
        </div>
    );
}
