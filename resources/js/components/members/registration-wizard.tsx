import { useForm } from '@inertiajs/react';
import type { Page } from '@inertiajs/core';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Church,
    ClipboardCheck,
    Heart,
    Loader2,
    Plus,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { formatLongDate } from '@/lib/format';
import { store as memberStore, update as memberUpdate } from '@/routes/members';
import { store as publicStore } from '@/routes/public-registration';
import type { Member } from '@/types';
import { MINISTRIES } from '@/types/member';

/**
 * The member registration wizard, shared by the public "Join Our Family" page
 * and the staff "Add / Edit member" dialog so both look and behave the same.
 *
 *  - public: every field the church needs is required, consent must be ticked,
 *    and the registration lands in the Pending Registrations queue.
 *  - staff: only first and last name are required (the office often adds
 *    people with partial details), there is an "Office use" box (Member ID,
 *    status, date joined, department, ministry) and no consent box.
 */

export type WizardMode = 'public' | 'staff';

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
    // Office use (staff only)
    member_id: string;
    status: string;
    date_joined: string;
    department: string;
    ministry: string;
};

export const STEPS = [
    {
        title: 'Personal Info',
        heading: 'Personal Information',
        sub: 'Please provide personal details accurately.',
        Icon: User,
    },
    {
        title: 'Church Info',
        heading: 'Church Information',
        sub: 'Faith journey and how they would like to serve.',
        Icon: Church,
    },
    {
        title: 'Family Info',
        heading: 'Family Information',
        sub: 'Optional — helps us connect the household.',
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

const MEMBERSHIP_TYPES = [
    'Regular Member',
    'Associate Member',
    'Junior Member',
    'Transfer Member',
];
const STATUSES = [
    'Pending',
    'Under Review',
    'Approved',
    'Active',
    'Suspended',
    'Inactive',
    'Rejected',
];
const RELATIONS = [
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
];

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
    member_id: 1,
    status: 1,
    date_joined: 1,
    department: 1,
    ministry: 1,
    emergency_name: 3,
    emergency_phone: 3,
    emergency_relation: 3,
    occupation: 3,
    employer: 3,
    skills: 3,
    notes: 3,
    consent: 4,
};

const REQUIRED: Record<WizardMode, Record<number, (keyof FormData)[]>> = {
    public: {
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
    },
    staff: {
        0: ['first_name', 'last_name'],
        1: ['status'],
        2: [],
        3: [],
        4: [],
    },
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
    status: 'Status',
    emergency_name: 'Emergency contact name',
    emergency_phone: 'Emergency contact phone',
    emergency_relation: 'Relationship',
};

const today = () => new Date().toISOString().slice(0, 10);
const dateInput = (v: string | null | undefined) => (v ? v.split('T')[0] : '');

function initialData(mode: WizardMode, m?: Partial<Member> | null): FormData {
    return {
        photo: null,
        first_name: m?.first_name ?? '',
        middle_name: m?.middle_name ?? '',
        last_name: m?.last_name ?? '',
        gender: m?.gender ?? '',
        date_of_birth: dateInput(m?.date_of_birth),
        marital_status: m?.marital_status ?? '',
        nationality: m?.nationality ?? '',
        phone: m?.phone ?? '',
        alt_phone: m?.alt_phone ?? '',
        email: m?.email ?? '',
        address: m?.address ?? '',
        city: m?.city ?? '',
        state: m?.state ?? '',
        country: m?.country ?? '',
        membership_type: m?.membership_type ?? 'Regular Member',
        previous_church: m?.previous_church ?? '',
        previous_denomination: m?.previous_denomination ?? '',
        baptized: Boolean(m?.baptized),
        baptism_date: dateInput(m?.baptism_date),
        communion_participant: Boolean(m?.communion_participant),
        interests: m?.interests ?? '',
        family: {
            spouse_name: m?.family?.spouse_name ?? '',
            spouse_is_member: Boolean(m?.family?.spouse_is_member),
            children: (m?.family?.children ?? []).map((c) => ({
                name: c.name ?? '',
                date_of_birth: dateInput(c.date_of_birth),
            })),
        },
        emergency_name: m?.emergency_name ?? '',
        emergency_phone: m?.emergency_phone ?? '',
        emergency_relation: m?.emergency_relation ?? '',
        occupation: m?.occupation ?? '',
        employer: m?.employer ?? '',
        skills: m?.skills ?? '',
        notes: m?.notes ?? '',
        consent: false,
        member_id: m?.member_id ?? '',
        status: m?.status ?? (mode === 'staff' ? 'Active' : 'Pending'),
        date_joined: dateInput(m?.date_joined) || today(),
        department: m?.department ?? '',
        ministry: m?.ministry ?? '',
    };
}

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
        <div className={`min-w-0 ${className}`}>
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

type Props = {
    mode: WizardMode;
    churchName: string;
    /** Staff only: the member being edited (omit to add a new member). */
    member?: Partial<Member> | null;
    /** Staff only: existing department names, offered as suggestions. */
    departments?: string[];
    onSaved: (page: Page) => void;
    /** Shown at the left of the footer on the first step (e.g. a Cancel button). */
    footerStart?: ReactNode;
};

export default function RegistrationWizard({
    mode,
    churchName,
    member = null,
    departments = [],
    onSaved,
    footerStart,
}: Props) {
    const staff = mode === 'staff';
    const editing = staff && Boolean(member?.id);
    const required = REQUIRED[mode];
    const isRequired = (s: number, f: keyof FormData) =>
        required[s].includes(f);

    const [step, setStep] = useState(0);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>(
        {},
    );
    const [photoPreview, setPhotoPreview] = useState<string | null>(
        member?.photo_url ?? null,
    );

    const form = useForm<FormData>(initialData(mode, member));
    const { data, setData } = form;
    const errors: Record<string, string> = {
        ...clientErrors,
        ...(form.errors as Record<string, string>),
    };

    useEffect(
        () => () => {
            if (photoPreview?.startsWith('blob:'))
                URL.revokeObjectURL(photoPreview);
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

    const membershipTypes = MEMBERSHIP_TYPES.includes(data.membership_type)
        ? MEMBERSHIP_TYPES
        : [...MEMBERSHIP_TYPES, data.membership_type].filter(Boolean);

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
        for (const f of required[s]) {
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
    };

    const goBack = () => {
        setClientErrors({});
        setStep((s) => Math.max(s - 1, 0));
    };

    const goTo = (s: number) => {
        // Jump back freely; jumping forward only over steps that validate.
        if (s <= step) {
            setClientErrors({});
            setStep(s);
            return;
        }
        for (let i = step; i < s; i++) if (!validateStep(i)) return setStep(i);
        setStep(s);
    };

    const submit = () => {
        for (let i = 0; i < STEPS.length; i++) {
            if (!validateStep(i)) return setStep(i);
        }
        form.transform((d) => {
            const {
                consent,
                member_id,
                status,
                date_joined,
                department,
                ministry,
                photo,
                ...rest
            } = d;
            const payload: Record<string, unknown> = {
                ...rest,
                baptism_date: d.baptized ? d.baptism_date : '',
                family:
                    d.family.spouse_name || d.family.children.length
                        ? d.family
                        : null,
            };
            if (photo) payload.photo = photo;
            if (staff) {
                Object.assign(payload, {
                    member_id,
                    status,
                    date_joined,
                    department,
                    ministry,
                });
                if (editing) payload._method = 'patch';
            } else {
                payload.consent = consent;
            }
            return payload as unknown as FormData;
        });
        const url = staff
            ? editing && member?.id
                ? memberUpdate.url(member.id)
                : memberStore.url()
            : publicStore.url();
        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: (page) => {
                if (!staff) {
                    form.reset();
                    setPhotoPreview(null);
                    setStep(0);
                }
                onSaved(page);
            },
            onError: (errs) => {
                const first = Object.keys(errs)[0] ?? '';
                setStep(
                    first.startsWith('family') ? 2 : (FIELD_STEP[first] ?? 0),
                );
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
    const you = staff ? 'the member' : 'you';

    return (
        <>
            {/* Stepper */}
            <ol className="mb-6 flex w-full items-start gap-0 overflow-x-auto pb-2 sm:mb-8">
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
                                className="flex w-12 shrink-0 flex-col items-center gap-1 sm:w-20"
                            >
                                <span
                                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${active
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
                                    className={`text-center text-[9px] leading-tight sm:text-[10px] ${active ? 'font-semibold text-primary' : 'text-muted-foreground'}`}
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
            <p className="mb-5 text-xs text-muted-foreground">{current.sub}</p>

            {/* Step 1 — personal */}
            {step === 0 && (
                <div className="space-y-4">
                    <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
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
                                onChange={(e) => onPhoto(e.target.files?.[0])}
                                className="text-xs file:mr-2 file:rounded-md file:border file:border-border file:bg-muted file:px-2 file:py-1 file:text-xs"
                            />
                            {errors.photo ? (
                                <p className="error-text">{errors.photo}</p>
                            ) : (
                                <p className="helper-text">
                                    JPEG, PNG or WebP. Max 5MB. Recommended:
                                    400×400px square.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                            label="First Name"
                            required={isRequired(0, 'first_name')}
                            error={errors.first_name}
                        >
                            <input
                                {...input('first_name')}
                                placeholder="e.g. Kwame"
                                autoComplete="given-name"
                            />
                        </Field>
                        <Field label="Middle Name" error={errors.middle_name}>
                            <input
                                {...input('middle_name')}
                                placeholder="e.g. Asante"
                                autoComplete="additional-name"
                            />
                        </Field>
                        <Field
                            label="Last Name"
                            required={isRequired(0, 'last_name')}
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
                            required={isRequired(0, 'gender')}
                            error={errors.gender}
                        >
                            <select {...input('gender')}>
                                <option value="">Select gender</option>
                                <option>Male</option>
                                <option>Female</option>
                            </select>
                        </Field>
                        <Field
                            label="Date of Birth"
                            required={isRequired(0, 'date_of_birth')}
                            error={errors.date_of_birth}
                        >
                            <input
                                {...input('date_of_birth')}
                                type="date"
                                max={today()}
                            />
                        </Field>
                        <Field
                            label="Marital Status"
                            error={errors.marital_status}
                        >
                            <select {...input('marital_status')}>
                                <option value="">Select status</option>
                                <option>Single</option>
                                <option>Married</option>
                                <option>Widowed</option>
                                <option>Divorced</option>
                            </select>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nationality" error={errors.nationality}>
                            <input
                                {...input('nationality')}
                                placeholder="e.g. Liberian"
                            />
                        </Field>
                        <Field
                            label="Primary Phone"
                            required={isRequired(0, 'phone')}
                            error={errors.phone}
                        >
                            <input
                                {...input('phone')}
                                type="tel"
                                placeholder="+231 770 000 000"
                                autoComplete="tel"
                            />
                        </Field>
                        <Field label="Alternate Phone" error={errors.alt_phone}>
                            <input
                                {...input('alt_phone')}
                                type="tel"
                                placeholder="Optional"
                            />
                        </Field>
                        <Field
                            label="Email Address"
                            required={isRequired(0, 'email')}
                            error={errors.email}
                            helper={`We'll use this to contact ${you}. Must be unique.`}
                        >
                            <input
                                {...input('email')}
                                type="email"
                                placeholder="name@email.com"
                                autoComplete="email"
                            />
                        </Field>
                    </div>

                    <Field
                        label="Street Address"
                        required={isRequired(0, 'address')}
                        error={errors.address}
                    >
                        <input
                            {...input('address')}
                            placeholder="e.g. Capitol Hill, House 12"
                            autoComplete="street-address"
                        />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                            label="City"
                            required={isRequired(0, 'city')}
                            error={errors.city}
                        >
                            <input
                                {...input('city')}
                                placeholder="e.g. Monrovia"
                                autoComplete="address-level2"
                            />
                        </Field>
                        <Field label="State / County" error={errors.state}>
                            <input
                                {...input('state')}
                                placeholder="e.g. Montserrado"
                                autoComplete="address-level1"
                            />
                        </Field>
                        <Field
                            label="Country"
                            required={isRequired(0, 'country')}
                            error={errors.country}
                        >
                            <input
                                {...input('country')}
                                placeholder="e.g. Liberia"
                                autoComplete="country-name"
                            />
                        </Field>
                    </div>
                </div>
            )}

            {/* Step 2 — church */}
            {step === 1 && (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Membership Type"
                            required={isRequired(1, 'membership_type')}
                            error={errors.membership_type}
                        >
                            <select {...input('membership_type')}>
                                {membershipTypes.map((t) => (
                                    <option key={t}>{t}</option>
                                ))}
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
                                {...input('previous_denomination')}
                                placeholder="e.g. Baptist, Methodist"
                            />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label={
                                staff ? 'Baptized?' : 'Have you been baptized?'
                            }
                        >
                            <div className="flex gap-2">
                                {[true, false].map((v) => (
                                    <button
                                        type="button"
                                        key={String(v)}
                                        onClick={() => setData('baptized', v)}
                                        className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${data.baptized === v
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
                                    max={today()}
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
                        {staff
                            ? 'Participates in Holy Communion'
                            : 'I participate in Holy Communion'}
                    </label>

                    <Field
                        label={
                            staff
                                ? 'Ministries they would like to serve in'
                                : "Ministries you'd like to serve in"
                        }
                        helper="Choose any that apply."
                    >
                        <div className="flex flex-wrap gap-2">
                            {MINISTRIES.map((m) => {
                                const on = selectedInterests.includes(m);
                                return (
                                    <button
                                        type="button"
                                        key={m}
                                        onClick={() => toggleInterest(m)}
                                        className={`rounded-full border px-3 py-1 text-xs transition-colors ${on
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

                    {staff && (
                        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
                            <p className="mb-3 text-xs font-semibold tracking-wide text-primary uppercase">
                                Office use
                            </p>
                            <div className="grid gap-4 sm:grid-cols-3">
                                <Field
                                    label="Member ID"
                                    error={errors.member_id}
                                    helper="Leave blank to assign the next number."
                                >
                                    <input
                                        {...input('member_id')}
                                        placeholder="Auto"
                                    />
                                </Field>
                                <Field
                                    label="Status"
                                    required
                                    error={errors.status}
                                >
                                    <select {...input('status')}>
                                        {STATUSES.map((s) => (
                                            <option key={s}>{s}</option>
                                        ))}
                                    </select>
                                </Field>
                                <Field
                                    label="Date Joined"
                                    error={errors.date_joined}
                                >
                                    <input
                                        {...input('date_joined')}
                                        type="date"
                                        max={today()}
                                    />
                                </Field>
                                <Field
                                    label="Department"
                                    error={errors.department}
                                >
                                    <input
                                        {...input('department')}
                                        list="wizard-departments"
                                        placeholder="e.g. Men Department"
                                    />
                                    <datalist id="wizard-departments">
                                        {departments.map((d) => (
                                            <option key={d} value={d} />
                                        ))}
                                    </datalist>
                                </Field>
                                <Field label="Ministry" error={errors.ministry}>
                                    <input
                                        {...input('ministry')}
                                        placeholder="e.g. Choir"
                                    />
                                </Field>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3 — family */}
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
                                        spouse_name: e.target.value,
                                    })
                                }
                                placeholder={
                                    data.marital_status === 'Married'
                                        ? 'Spouse name'
                                        : 'If married'
                                }
                            />
                        </Field>
                        <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
                            <input
                                type="checkbox"
                                checked={data.family.spouse_is_member}
                                onChange={(e) =>
                                    setData('family', {
                                        ...data.family,
                                        spouse_is_member: e.target.checked,
                                    })
                                }
                                className="rounded border-border"
                            />
                            Spouse is already a member here
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
                                            ...data.family.children,
                                            { name: '', date_of_birth: '' },
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
                                {data.family.children.map((c, i) => (
                                    <div
                                        key={i}
                                       className="grid min-w-0 grid-cols-1 items-start gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]"
                                    >
                                        <div>
                                            <input
                                                className={`input-field ${errors[`family.children.${i}.name`] ? 'border-danger' : ''}`}
                                                placeholder="Child's full name"
                                                value={c.name}
                                                onChange={(e) =>
                                                    setChild(i, {
                                                        name: e.target.value,
                                                    })
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
                                            value={c.date_of_birth}
                                            max={today()}
                                            onChange={(e) =>
                                                setChild(i, {
                                                    date_of_birth:
                                                        e.target.value,
                                                })
                                            }
                                            aria-label="Date of birth"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setData('family', {
                                                    ...data.family,
                                                    children:
                                                        data.family.children.filter(
                                                            (_, idx) =>
                                                                idx !== i,
                                                        ),
                                                })
                                            }
                                            className="btn-ghost p-2 text-danger"
                                            aria-label="Remove child"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4 — emergency & additional */}
            {step === 3 && (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                            label="Emergency Contact Name"
                            required={isRequired(3, 'emergency_name')}
                            error={errors.emergency_name}
                        >
                            <input
                                {...input('emergency_name')}
                                placeholder="Full name"
                            />
                        </Field>
                        <Field
                            label="Emergency Contact Phone"
                            required={isRequired(3, 'emergency_phone')}
                            error={errors.emergency_phone}
                        >
                            <input
                                {...input('emergency_phone')}
                                type="tel"
                                placeholder="+231 770 000 000"
                            />
                        </Field>
                        <Field
                            label="Relationship"
                            required={isRequired(3, 'emergency_relation')}
                            error={errors.emergency_relation}
                        >
                            <select {...input('emergency_relation')}>
                                <option value="">Select</option>
                                {RELATIONS.map((r) => (
                                    <option key={r}>{r}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Occupation" error={errors.occupation}>
                            <input
                                {...input('occupation')}
                                placeholder="e.g. Teacher"
                            />
                        </Field>
                        <Field label="Employer" error={errors.employer}>
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
                        <textarea {...input('skills')} rows={3} />
                    </Field>
                    <Field
                        label={
                            staff ? 'Notes' : 'Anything else we should know?'
                        }
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

            {/* Step 5 — review */}
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
                        <ReviewRow label="Gender" value={data.gender} />
                        <ReviewRow
                            label="Date of Birth"
                            value={formatLongDate(data.date_of_birth)}
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
                        <ReviewRow label="Email" value={data.email} />
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
                        <ReviewRow label="Interests" value={data.interests} />
                        {staff && (
                            <>
                                <ReviewRow
                                    label="Member ID"
                                    value={
                                        data.member_id ||
                                        'Assigned automatically'
                                    }
                                />
                                <ReviewRow label="Status" value={data.status} />
                                <ReviewRow
                                    label="Date Joined"
                                    value={formatLongDate(data.date_joined)}
                                />
                                <ReviewRow
                                    label="Department / Ministry"
                                    value={[data.department, data.ministry]
                                        .filter(Boolean)
                                        .join(' / ')}
                                />
                            </>
                        )}
                    </ReviewSection>
                    <ReviewSection title="Family" onEdit={() => goTo(2)}>
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
                            value={
                                data.emergency_name
                                    ? `${data.emergency_name} (${data.emergency_relation || '—'}) — ${data.emergency_phone || '—'}`
                                    : ''
                            }
                        />
                        <ReviewRow
                            label="Occupation"
                            value={[data.occupation, data.employer]
                                .filter(Boolean)
                                .join(' at ')}
                        />
                        <ReviewRow label="Skills" value={data.skills} />
                    </ReviewSection>

                    {!staff && (
                        <>
                            <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm text-foreground">
                                <input
                                    type="checkbox"
                                    checked={data.consent}
                                    onChange={(e) => {
                                        setData('consent', e.target.checked);
                                        setClientErrors(
                                            ({ consent: _, ...rest }) => rest,
                                        );
                                    }}
                                    className="mt-0.5 rounded border-border"
                                />
                                <span>
                                    I confirm this information is accurate and
                                    agree that {churchName} may store it to
                                    manage my membership, as described in the{' '}
                                    <a
                                        href="/privacy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-medium text-accent hover:underline"
                                    >
                                        Privacy Policy
                                    </a>
                                    .
                                </span>
                            </label>
                            {errors.consent && (
                                <p className="error-text">{errors.consent}</p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
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
                    (footerStart ?? <span />)
                )}
                <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
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
                            {staff
                                ? editing
                                    ? 'Save Changes'
                                    : 'Add Member'
                                : 'Submit Registration'}
                        </button>
                    )}
                </div>
            </div>
        </>
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
            <dl className="grid min-w-0 gap-x-4 gap-y-2 p-4 sm:grid-cols-2">
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
            <dd className="break-words text-sm text-foreground">
                {value && value !== '—' ? value : '—'}
            </dd>
        </div>
    );
}
