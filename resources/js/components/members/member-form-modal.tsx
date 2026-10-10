import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import ImageUploadField from '@/components/ssbcms/ImageUploadField';
import { store, update } from '@/routes/members';
import type { Member } from '@/types';

type FormState = {
    member_id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    gender: string;
    date_of_birth: string;
    marital_status: string;
    photo_url: string;
    phone: string;
    alt_phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    country: string;
    membership_type: string;
    status: string;
    date_joined: string;
    department: string;
    ministry: string;
    baptized: boolean;
    baptism_date: string;
    communion_participant: boolean;
    previous_church: string;
    previous_denomination: string;
    occupation: string;
    employer: string;
    emergency_name: string;
    emergency_phone: string;
    emergency_relation: string;
    notes: string;
};

const emptyForm = (): FormState => ({
    member_id: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    gender: '',
    date_of_birth: '',
    marital_status: '',
    photo_url: '',
    phone: '',
    alt_phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    membership_type: 'Regular Member',
    status: 'Active',
    date_joined: new Date().toISOString().split('T')[0],
    department: '',
    ministry: '',
    baptized: false,
    baptism_date: '',
    communion_participant: false,
    previous_church: '',
    previous_denomination: '',
    occupation: '',
    employer: '',
    emergency_name: '',
    emergency_phone: '',
    emergency_relation: '',
    notes: '',
});

const STATUSES = [
    'Pending',
    'Under Review',
    'Approved',
    'Active',
    'Suspended',
    'Inactive',
    'Rejected',
];
const MEMBERSHIP_TYPES = [
    'Regular Member',
    'Associate Member',
    'Visitor',
    'Youth Member',
    'Senior Member',
];
const GENDERS = ['Male', 'Female', 'Other'];
const MARITAL_STATUSES = ['Single', 'Married', 'Widowed', 'Divorced'];

const TABS = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'contact', label: 'Contact' },
    { id: 'church', label: 'Church Info' },
    { id: 'other', label: 'Other' },
] as const;

interface MemberFormModalProps {
    member: Member | Partial<Member> | null;
    onClose: () => void;
    /** Called after a successful save, in addition to onClose. Lets a parent
     * modal (e.g. MemberDetailModal, which holds a stale local snapshot)
     * close itself too instead of showing outdated data. */
    onSaved?: () => void;
}

function FieldError({ message }: { message?: string }) {
    return message ? (
        <p className="mt-1 text-xs text-destructive">{message}</p>
    ) : null;
}

function toDateInput(value: string | null | undefined): string {
    if (!value) return '';
    return value.split('T')[0];
}

export default function MemberFormModal({
    member,
    onClose,
    onSaved,
}: MemberFormModalProps) {
    const isEditing = Boolean(member?.id);

    const [form, setForm] = useState<FormState>(
        isEditing && member
            ? {
                  member_id: member.member_id || '',
                  first_name: member.first_name || '',
                  middle_name: member.middle_name || '',
                  last_name: member.last_name || '',
                  gender: member.gender || '',
                  date_of_birth: toDateInput(member.date_of_birth),
                  marital_status: member.marital_status || '',
                  photo_url: member.photo_url || '',
                  phone: member.phone || '',
                  alt_phone: member.alt_phone || '',
                  email: member.email || '',
                  address: member.address || '',
                  city: member.city || '',
                  state: member.state || '',
                  country: member.country || '',
                  membership_type: member.membership_type || 'Regular Member',
                  status: member.status || 'Active',
                  date_joined: toDateInput(member.date_joined),
                  department: member.department || '',
                  ministry: member.ministry || '',
                  baptized: member.baptized ?? false,
                  baptism_date: toDateInput(member.baptism_date),
                  communion_participant: member.communion_participant ?? false,
                  previous_church: member.previous_church || '',
                  previous_denomination: member.previous_denomination || '',
                  occupation: member.occupation || '',
                  employer: member.employer || '',
                  emergency_name: member.emergency_name || '',
                  emergency_phone: member.emergency_phone || '',
                  emergency_relation: member.emergency_relation || '',
                  notes: member.notes || '',
              }
            : { ...emptyForm(), status: member?.status || 'Active' },
    );
    const [activeTab, setActiveTab] =
        useState<(typeof TABS)[number]['id']>('basic');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const set = (patch: Partial<FormState>) =>
        setForm((p) => ({ ...p, ...patch }));

    const handleSave = () => {
        if (!form.first_name || !form.last_name) {
            setActiveTab('basic');
            toast.error('First and last name are required.');
            return;
        }
        setSaving(true);

        const payload = {
            ...form,
            middle_name: form.middle_name || null,
            gender: form.gender || null,
            date_of_birth: form.date_of_birth || null,
            marital_status: form.marital_status || null,
            photo_url: form.photo_url || null,
            phone: form.phone || null,
            alt_phone: form.alt_phone || null,
            email: form.email || null,
            address: form.address || null,
            city: form.city || null,
            state: form.state || null,
            country: form.country || null,
            date_joined: form.date_joined || null,
            department: form.department || null,
            ministry: form.ministry || null,
            baptism_date: form.baptized ? form.baptism_date || null : null,
            previous_church: form.previous_church || null,
            previous_denomination: form.previous_denomination || null,
            occupation: form.occupation || null,
            employer: form.employer || null,
            emergency_name: form.emergency_name || null,
            emergency_phone: form.emergency_phone || null,
            emergency_relation: form.emergency_relation || null,
            notes: form.notes || null,
            member_id: form.member_id || null,
        };

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                onSaved?.();
                onClose();
            },
            onError: (errors: Record<string, string>) => {
                setErrors(errors);
                const first = Object.keys(errors)[0] ?? '';
                const tabFor: Record<string, (typeof TABS)[number]['id']> = {
                    phone: 'contact',
                    alt_phone: 'contact',
                    email: 'contact',
                    address: 'contact',
                    city: 'contact',
                    state: 'contact',
                    country: 'contact',
                    emergency_name: 'contact',
                    emergency_phone: 'contact',
                    emergency_relation: 'contact',
                    membership_type: 'church',
                    date_joined: 'church',
                    department: 'church',
                    ministry: 'church',
                    baptism_date: 'church',
                    previous_church: 'church',
                    previous_denomination: 'church',
                    occupation: 'other',
                    employer: 'other',
                    notes: 'other',
                };
                setActiveTab(tabFor[first] ?? 'basic');
                toast.error(
                    Object.values(errors)[0] ?? 'Could not save this member.',
                );
            },
            onFinish: () => setSaving(false),
        };

        setErrors({});

        if (isEditing && member?.id) {
            router.patch(update.url(member.id), payload, options);
        } else {
            router.post(store.url(), payload, options);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <div
                className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border p-6">
                    <h2 className="text-lg font-bold text-foreground">
                        {isEditing
                            ? `Edit ${member?.full_name ?? 'Member'}`
                            : 'Add New Member'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 transition-colors hover:bg-muted"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex border-b border-border px-4">
                    {TABS.map((tab) => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                                activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <ImageUploadField
                                value={form.photo_url}
                                onChange={(url) => set({ photo_url: url })}
                                label="Photo"
                                variant="avatar"
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="label-text">
                                        First Name *
                                    </label>
                                    <input
                                        value={form.first_name}
                                        onChange={(e) =>
                                            set({ first_name: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                    <FieldError message={errors.first_name} />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Middle Name
                                    </label>
                                    <input
                                        value={form.middle_name}
                                        onChange={(e) =>
                                            set({ middle_name: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Last Name *
                                    </label>
                                    <input
                                        value={form.last_name}
                                        onChange={(e) =>
                                            set({ last_name: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                    <FieldError message={errors.last_name} />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="label-text">Gender</label>
                                    <select
                                        value={form.gender}
                                        onChange={(e) =>
                                            set({ gender: e.target.value })
                                        }
                                        className="input-field"
                                    >
                                        <option value="">—</option>
                                        {GENDERS.map((g) => (
                                            <option key={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">
                                        Date of Birth
                                    </label>
                                    <input
                                        type="date"
                                        value={form.date_of_birth}
                                        onChange={(e) =>
                                            set({
                                                date_of_birth: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    />
                                    <FieldError
                                        message={errors.date_of_birth}
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Marital Status
                                    </label>
                                    <select
                                        value={form.marital_status}
                                        onChange={(e) =>
                                            set({
                                                marital_status: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    >
                                        <option value="">—</option>
                                        {MARITAL_STATUSES.map((m) => (
                                            <option key={m}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-text">
                                        Status *
                                    </label>
                                    <select
                                        value={form.status}
                                        onChange={(e) =>
                                            set({ status: e.target.value })
                                        }
                                        className="input-field"
                                    >
                                        {STATUSES.map((s) => (
                                            <option key={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">
                                        Member ID
                                    </label>
                                    <input
                                        value={form.member_id}
                                        onChange={(e) =>
                                            set({ member_id: e.target.value })
                                        }
                                        className="input-field"
                                        placeholder="Auto-generated if left blank"
                                    />
                                    <FieldError message={errors.member_id} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contact' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-text">Phone</label>
                                    <input
                                        value={form.phone}
                                        onChange={(e) =>
                                            set({ phone: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                    <FieldError message={errors.phone} />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Alt Phone
                                    </label>
                                    <input
                                        value={form.alt_phone}
                                        onChange={(e) =>
                                            set({ alt_phone: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) =>
                                        set({ email: e.target.value })
                                    }
                                    className="input-field"
                                />
                                <FieldError message={errors.email} />
                            </div>
                            <div>
                                <label className="label-text">
                                    Street Address
                                </label>
                                <input
                                    value={form.address}
                                    onChange={(e) =>
                                        set({ address: e.target.value })
                                    }
                                    className="input-field"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="label-text">City</label>
                                    <input
                                        value={form.city}
                                        onChange={(e) =>
                                            set({ city: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        State / County
                                    </label>
                                    <input
                                        value={form.state}
                                        onChange={(e) =>
                                            set({ state: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Country
                                    </label>
                                    <input
                                        value={form.country}
                                        onChange={(e) =>
                                            set({ country: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="border-t border-border pt-4">
                                <h3 className="mb-3 text-sm font-semibold text-foreground">
                                    Emergency Contact
                                </h3>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="label-text">
                                            Name
                                        </label>
                                        <input
                                            value={form.emergency_name}
                                            onChange={(e) =>
                                                set({
                                                    emergency_name:
                                                        e.target.value,
                                                })
                                            }
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">
                                            Phone
                                        </label>
                                        <input
                                            value={form.emergency_phone}
                                            onChange={(e) =>
                                                set({
                                                    emergency_phone:
                                                        e.target.value,
                                                })
                                            }
                                            className="input-field"
                                        />
                                    </div>
                                    <div>
                                        <label className="label-text">
                                            Relationship
                                        </label>
                                        <input
                                            value={form.emergency_relation}
                                            onChange={(e) =>
                                                set({
                                                    emergency_relation:
                                                        e.target.value,
                                                })
                                            }
                                            className="input-field"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'church' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-text">
                                        Membership Type
                                    </label>
                                    <select
                                        value={form.membership_type}
                                        onChange={(e) =>
                                            set({
                                                membership_type: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    >
                                        {MEMBERSHIP_TYPES.map((t) => (
                                            <option key={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label-text">
                                        Date Joined
                                    </label>
                                    <input
                                        type="date"
                                        value={form.date_joined}
                                        onChange={(e) =>
                                            set({ date_joined: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-text">
                                        Department
                                    </label>
                                    <input
                                        value={form.department}
                                        onChange={(e) =>
                                            set({ department: e.target.value })
                                        }
                                        className="input-field"
                                        placeholder="e.g. Worship Department"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Ministry
                                    </label>
                                    <input
                                        value={form.ministry}
                                        onChange={(e) =>
                                            set({ ministry: e.target.value })
                                        }
                                        className="input-field"
                                        placeholder="e.g. Prayer Ministry"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.baptized}
                                        onChange={(e) =>
                                            set({ baptized: e.target.checked })
                                        }
                                        className="h-4 w-4 rounded border-border text-primary"
                                    />
                                    <span className="text-sm text-foreground">
                                        Baptized
                                    </span>
                                </label>
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={form.communion_participant}
                                        onChange={(e) =>
                                            set({
                                                communion_participant:
                                                    e.target.checked,
                                            })
                                        }
                                        className="h-4 w-4 rounded border-border text-primary"
                                    />
                                    <span className="text-sm text-foreground">
                                        Communion Participant
                                    </span>
                                </label>
                            </div>
                            {form.baptized && (
                                <div>
                                    <label className="label-text">
                                        Baptism Date
                                    </label>
                                    <input
                                        type="date"
                                        value={form.baptism_date}
                                        onChange={(e) =>
                                            set({
                                                baptism_date: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    />
                                    <FieldError message={errors.baptism_date} />
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-text">
                                        Previous Church
                                    </label>
                                    <input
                                        value={form.previous_church}
                                        onChange={(e) =>
                                            set({
                                                previous_church: e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Previous Denomination
                                    </label>
                                    <input
                                        value={form.previous_denomination}
                                        onChange={(e) =>
                                            set({
                                                previous_denomination:
                                                    e.target.value,
                                            })
                                        }
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'other' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="label-text">
                                        Occupation
                                    </label>
                                    <input
                                        value={form.occupation}
                                        onChange={(e) =>
                                            set({ occupation: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="label-text">
                                        Employer
                                    </label>
                                    <input
                                        value={form.employer}
                                        onChange={(e) =>
                                            set({ employer: e.target.value })
                                        }
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="label-text">Notes</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) =>
                                        set({ notes: e.target.value })
                                    }
                                    rows={4}
                                    className="input-field resize-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border p-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !form.first_name || !form.last_name}
                        className="btn-accent text-sm"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Saving...
                            </span>
                        ) : isEditing ? (
                            'Save Changes'
                        ) : (
                            'Add Member'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
