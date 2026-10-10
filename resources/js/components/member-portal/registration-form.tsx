import { useForm } from '@inertiajs/react';
import { CheckCircle2, Clock, ShieldAlert } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/member/portal';
import type { Member } from '@/types';

export type PortalUser = { name: string; email: string; status: string | null };

const CONTACT_FIELDS = [
    'phone',
    'alt_phone',
    'address',
    'city',
    'state',
    'country',
    'occupation',
    'employer',
    'emergency_name',
    'emergency_phone',
    'emergency_relation',
] as const;

type ContactField = (typeof CONTACT_FIELDS)[number];
type ContactForm = Record<ContactField, string>;

const CONTACT_LABELS: Record<ContactField, string> = {
    phone: 'Phone',
    alt_phone: 'Alternative phone',
    address: 'Street address',
    city: 'City',
    state: 'District / Province',
    country: 'Country',
    occupation: 'Occupation',
    employer: 'Employer',
    emergency_name: 'Emergency contact name',
    emergency_phone: 'Emergency contact phone',
    emergency_relation: 'Relationship',
};

function contactDefaults(member: Member | null): ContactForm {
    return Object.fromEntries(
        CONTACT_FIELDS.map((f) => [f, (member?.[f] as string | null) ?? '']),
    ) as ContactForm;
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label>{label}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

function ContactInputs({
    data,
    setData,
    errors,
}: {
    data: ContactForm;
    setData: (field: ContactField, value: string) => void;
    errors: Partial<Record<string, string>>;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map((field) => (
                <Field
                    key={field}
                    label={CONTACT_LABELS[field]}
                    error={errors[field]}
                >
                    <Input
                        value={data[field]}
                        onChange={(e) => setData(field, e.target.value)}
                    />
                </Field>
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  No membership record yet → registration form                      */
/* ------------------------------------------------------------------ */

export function RegistrationForm({ user }: { user: PortalUser }) {
    const [first, ...rest] = user.name.trim().split(/\s+/);
    const form = useForm({
        first_name: first ?? '',
        middle_name: '',
        last_name: rest.join(' '),
        gender: '',
        date_of_birth: '',
        marital_status: '',
        previous_church: '',
        previous_denomination: '',
        baptized: false,
        ...contactDefaults(null),
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(store.url(), { preserveScroll: true });
    };

    const select =
        'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Complete your membership registration</CardTitle>
                <CardDescription>
                    Your account ({user.email}) isn't linked to a membership
                    record yet. Fill this in and the church office will review
                    it.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field
                            label="First name *"
                            error={form.errors.first_name}
                        >
                            <Input
                                required
                                value={form.data.first_name}
                                onChange={(e) =>
                                    form.setData('first_name', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Middle name"
                            error={form.errors.middle_name}
                        >
                            <Input
                                value={form.data.middle_name}
                                onChange={(e) =>
                                    form.setData('middle_name', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Last name *"
                            error={form.errors.last_name}
                        >
                            <Input
                                required
                                value={form.data.last_name}
                                onChange={(e) =>
                                    form.setData('last_name', e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Gender" error={form.errors.gender}>
                            <select
                                className={select}
                                value={form.data.gender}
                                onChange={(e) =>
                                    form.setData('gender', e.target.value)
                                }
                            >
                                <option value="">—</option>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </Field>
                        <Field
                            label="Date of birth"
                            error={form.errors.date_of_birth}
                        >
                            <Input
                                type="date"
                                value={form.data.date_of_birth}
                                onChange={(e) =>
                                    form.setData(
                                        'date_of_birth',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field
                            label="Marital status"
                            error={form.errors.marital_status}
                        >
                            <select
                                className={select}
                                value={form.data.marital_status}
                                onChange={(e) =>
                                    form.setData(
                                        'marital_status',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">—</option>
                                <option>Single</option>
                                <option>Married</option>
                                <option>Widowed</option>
                                <option>Divorced</option>
                            </select>
                        </Field>
                    </div>

                    <ContactInputs
                        data={form.data}
                        setData={(f, v) => form.setData(f, v)}
                        errors={form.errors}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            label="Previous church"
                            error={form.errors.previous_church}
                        >
                            <Input
                                value={form.data.previous_church}
                                onChange={(e) =>
                                    form.setData(
                                        'previous_church',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field
                            label="Previous denomination"
                            error={form.errors.previous_denomination}
                        >
                            <Input
                                value={form.data.previous_denomination}
                                onChange={(e) =>
                                    form.setData(
                                        'previous_denomination',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>

                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={form.data.baptized}
                            onChange={(e) =>
                                form.setData('baptized', e.target.checked)
                            }
                        />
                        I have been baptized
                    </label>

                    <Button type="submit" disabled={form.processing}>
                        {form.processing
                            ? 'Submitting…'
                            : 'Submit registration'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Existing record → status, details, editable contact info           */
/* ------------------------------------------------------------------ */

export function StatusBanner({ status }: { status: Member['status'] }) {
    if (status === 'Pending' || status === 'Under Review') {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300/50 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <Clock className="mt-0.5 size-4 shrink-0" />
                Your registration is {status.toLowerCase()}. The church office
                will contact you once it has been reviewed.
            </div>
        );
    }
    if (
        status === 'Rejected' ||
        status === 'Suspended' ||
        status === 'Inactive'
    ) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-red-300/50 bg-red-50 p-4 text-sm text-red-900 dark:bg-red-950/30 dark:text-red-200">
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                Your membership is currently {status.toLowerCase()}. Please
                contact the church office if you think this is a mistake.
            </div>
        );
    }
    return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300/50 bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            Your membership is {status.toLowerCase()}. Welcome!
        </div>
    );
}
