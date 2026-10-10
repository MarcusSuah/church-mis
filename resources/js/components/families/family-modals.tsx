import { useForm } from '@inertiajs/react';
import { Loader2, Plus, Save, Trash2, UserPlus, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import {
    destroy as destroyFamily,
    store as storeFamily,
    update as updateFamily,
} from '@/routes/families';
import {
    store as storeFamilyMember,
    update as updateFamilyMember,
} from '@/routes/families/members';
import MemberPicker from './member-picker';
import type { MemberOption } from './member-picker';

export type FamilyPerson = {
    id: string;
    member_id: string | null;
    member_code: string | null;
    name: string;
    initials: string;
    role: string;
    status: string | null;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
    photo_url: string | null;
    raw_name: string | null;
    raw_phone: string | null;
    raw_email: string | null;
    raw_date_of_birth: string | null;
};

export type FamilyRecord = {
    id: string;
    family_name: string;
    initials: string;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    status: string;
    notes: string | null;
    created_at: string | null;
    head_name: string | null;
    member_count: number;
    children_count: number;
    members: FamilyPerson[];
};

function Modal({
    title,
    onClose,
    children,
    footer,
    wide = false,
}: {
    title: string;
    onClose: () => void;
    children: ReactNode;
    footer: ReactNode;
    wide?: boolean;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div
                className={`scale-in relative flex max-h-[90vh] w-full flex-col rounded-2xl border border-border bg-card shadow-xl ${wide ? 'max-w-xl' : 'max-w-lg'}`}
            >
                <div className="flex items-center justify-between border-b border-border p-5">
                    <h2 className="text-lg font-bold text-foreground">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-ghost p-2"
                        aria-label="Close"
                    >
                        <X className="size-[18px]" />
                    </button>
                </div>
                <div className="flex-1 scrollbar-thin space-y-4 overflow-y-auto p-5">
                    {children}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-border p-5">
                    {footer}
                </div>
            </div>
        </div>
    );
}

function Field({
    label,
    required,
    error,
    children,
    className = '',
}: {
    label: string;
    required?: boolean;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <label className="label-text">
                {label}
                {required && <span className="text-danger"> *</span>}
            </label>
            {children}
            {error && <p className="error-text">{error}</p>}
        </div>
    );
}

function AddressFields({
    form,
}: {
    form: ReturnType<typeof useForm<Record<string, string>>>;
}) {
    const input = (key: string, placeholder = '') => (
        <input
            className="input-field"
            placeholder={placeholder}
            value={form.data[key] ?? ''}
            onChange={(e) => form.setData(key, e.target.value)}
        />
    );
    return (
        <>
            <Field label="Home Address" error={form.errors.address}>
                {input('address', 'Street address')}
            </Field>
            <div className="grid grid-cols-3 gap-3">
                <Field label="City" error={form.errors.city}>
                    {input('city', 'e.g. Kigali')}
                </Field>
                <Field label="State / District" error={form.errors.state}>
                    {input('state')}
                </Field>
                <Field label="Country" error={form.errors.country}>
                    {input('country')}
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Field label="Phone" error={form.errors.phone}>
                    {input('phone', '+250 788 000 000')}
                </Field>
                <Field label="Email" error={form.errors.email}>
                    {input('email', 'family@email.com')}
                </Field>
            </div>
        </>
    );
}

/* ------------------------------------------------------------------ */

export function AddFamilyModal({
    memberOptions,
    onClose,
    onCreated,
}: {
    memberOptions?: MemberOption[];
    onClose: () => void;
    onCreated: (id: string) => void;
}) {
    const [headMode, setHeadMode] = useState<'member' | 'name'>('member');
    const form = useForm<Record<string, string>>({
        family_name: '',
        head_member_id: '',
        head_name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        phone: '',
        email: '',
    });

    const pickHead = (o: MemberOption | null) => {
        form.setData((d) => ({
            ...d,
            head_member_id: o?.id ?? '',
            // Pre-fill the household from the head's member record when empty.
            family_name:
                d.family_name ||
                (o ? `${o.label.split(' ').slice(-1)[0]} Family` : ''),
            address: d.address || o?.address || '',
            city: d.city || o?.city || '',
            state: d.state || o?.state || '',
            country: d.country || o?.country || '',
            phone: d.phone || o?.phone || '',
            email: d.email || o?.email || '',
        }));
    };

    const submit = () => {
        form.transform((d) => ({
            ...d,
            head_member_id:
                headMode === 'member' ? d.head_member_id || null : null,
            head_name: headMode === 'name' ? d.head_name : null,
        }));
        form.post(storeFamily.url(), {
            preserveScroll: true,
            onSuccess: (page) => {
                const id = (page.flash as Record<string, unknown> | undefined)
                    ?.selectFamily as string | undefined;
                if (id) onCreated(id);
                onClose();
            },
        });
    };

    return (
        <Modal
            title="Add New Family"
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={form.processing}
                        className="btn-primary"
                    >
                        {form.processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        Create Family
                    </button>
                </>
            }
        >
            <Field
                label="Head of Household"
                required
                error={form.errors.head_member_id || form.errors.head_name}
            >
                <div className="mb-2 flex gap-1 rounded-lg bg-muted p-1 text-xs">
                    {(['member', 'name'] as const).map((m) => (
                        <button
                            type="button"
                            key={m}
                            onClick={() => setHeadMode(m)}
                            className={`flex-1 rounded-md px-2 py-1 font-medium ${headMode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                        >
                            {m === 'member'
                                ? 'Church member'
                                : 'Not a member yet'}
                        </button>
                    ))}
                </div>
                {headMode === 'member' ? (
                    <MemberPicker
                        options={memberOptions}
                        value={form.data.head_member_id || null}
                        onChange={pickHead}
                        invalid={!!form.errors.head_member_id}
                    />
                ) : (
                    <input
                        className="input-field"
                        placeholder="Full name"
                        value={form.data.head_name}
                        onChange={(e) =>
                            form.setData('head_name', e.target.value)
                        }
                    />
                )}
            </Field>
            <Field label="Family Name" required error={form.errors.family_name}>
                <input
                    className="input-field"
                    placeholder="e.g. Boateng Family"
                    value={form.data.family_name}
                    onChange={(e) =>
                        form.setData('family_name', e.target.value)
                    }
                />
            </Field>
            <AddressFields form={form} />
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

export function EditFamilyModal({
    family,
    canDelete,
    onClose,
    onDeleted,
}: {
    family: FamilyRecord;
    canDelete: boolean;
    onClose: () => void;
    onDeleted: () => void;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const form = useForm<Record<string, string>>({
        family_name: family.family_name,
        address: family.address ?? '',
        city: family.city ?? '',
        state: family.state ?? '',
        country: family.country ?? '',
        phone: family.phone ?? '',
        email: family.email ?? '',
        status: family.status,
        notes: family.notes ?? '',
    });

    const save = () =>
        form.patch(updateFamily.url(family.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    const remove = () =>
        form.delete(destroyFamily.url(family.id), {
            preserveScroll: true,
            onSuccess: () => {
                onDeleted();
                onClose();
            },
        });

    return (
        <Modal
            title="Edit Family"
            onClose={onClose}
            footer={
                <>
                    {canDelete &&
                        (confirmDelete ? (
                            <div className="mr-auto flex items-center gap-2">
                                <span className="text-xs text-danger">
                                    Delete this family?
                                </span>
                                <button
                                    type="button"
                                    onClick={remove}
                                    disabled={form.processing}
                                    className="btn-danger px-3 py-1.5 text-xs"
                                >
                                    Yes, delete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setConfirmDelete(false)}
                                    className="btn-ghost px-2 py-1.5 text-xs"
                                >
                                    No
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(true)}
                                className="btn-ghost mr-auto text-danger"
                            >
                                <Trash2 className="size-4" />
                                Delete
                            </button>
                        ))}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={form.processing}
                        className="btn-primary"
                    >
                        {form.processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Save className="size-4" />
                        )}
                        Save
                    </button>
                </>
            }
        >
            <div className="grid grid-cols-[1fr_140px] gap-3">
                <Field
                    label="Family Name"
                    required
                    error={form.errors.family_name}
                >
                    <input
                        className="input-field"
                        value={form.data.family_name}
                        onChange={(e) =>
                            form.setData('family_name', e.target.value)
                        }
                    />
                </Field>
                <Field label="Status" error={form.errors.status}>
                    <select
                        className="input-field"
                        value={form.data.status}
                        onChange={(e) => form.setData('status', e.target.value)}
                    >
                        <option>Active</option>
                        <option>Inactive</option>
                    </select>
                </Field>
            </div>
            <AddressFields form={form} />
            <Field label="Notes" error={form.errors.notes}>
                <textarea
                    rows={3}
                    className="input-field resize-none"
                    value={form.data.notes}
                    onChange={(e) => form.setData('notes', e.target.value)}
                />
            </Field>
            <p className="text-xs text-muted-foreground">
                Deleting a family only removes the household grouping — member
                records are kept.
            </p>
        </Modal>
    );
}

/* ------------------------------------------------------------------ */

export function FamilyMemberModal({
    family,
    person,
    roles,
    memberOptions,
    onClose,
}: {
    family: FamilyRecord;
    person: FamilyPerson | null;
    roles: string[];
    memberOptions?: MemberOption[];
    onClose: () => void;
}) {
    const editing = person !== null;
    const [mode, setMode] = useState<'member' | 'name'>(
        person && !person.member_id ? 'name' : 'member',
    );
    const hasHead = family.members.some(
        (m) => m.role === 'Head of Household' && m.id !== person?.id,
    );
    const form = useForm<Record<string, string>>({
        member_id: person?.member_id ?? '',
        name: person?.raw_name ?? '',
        role: person?.role ?? (hasHead ? 'Child' : 'Head of Household'),
        date_of_birth: person?.raw_date_of_birth ?? '',
        phone: person?.raw_phone ?? '',
        email: person?.raw_email ?? '',
    });

    // When editing a linked member, keep them selectable even though they're "taken".
    const options =
        editing && person?.member_id && memberOptions
            ? [
                  {
                      id: person.member_id,
                      label: person.name,
                      code: person.member_code,
                      phone: null,
                      email: null,
                      address: null,
                      city: null,
                      state: null,
                      country: null,
                  },
                  ...memberOptions,
              ]
            : memberOptions;

    const submit = () => {
        form.transform((d) => ({
            ...d,
            member_id: mode === 'member' ? d.member_id || null : null,
            name: mode === 'name' ? d.name : null,
        }));
        const opts = { preserveScroll: true, onSuccess: onClose };
        if (editing)
            form.patch(updateFamilyMember.url([family.id, person.id]), opts);
        else form.post(storeFamilyMember.url(family.id), opts);
    };

    return (
        <Modal
            title={
                editing
                    ? `Edit ${person.name}`
                    : `Add Member to ${family.family_name}`
            }
            onClose={onClose}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={form.processing}
                        className="btn-primary"
                    >
                        {form.processing ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : editing ? (
                            <Save className="size-4" />
                        ) : (
                            <UserPlus className="size-4" />
                        )}
                        {editing ? 'Save' : 'Add to Family'}
                    </button>
                </>
            }
        >
            <div className="flex gap-1 rounded-lg bg-muted p-1 text-xs">
                {(['member', 'name'] as const).map((m) => (
                    <button
                        type="button"
                        key={m}
                        onClick={() => setMode(m)}
                        className={`flex-1 rounded-md px-2 py-1 font-medium ${mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                    >
                        {m === 'member'
                            ? 'Church member'
                            : 'Not a member (e.g. a child)'}
                    </button>
                ))}
            </div>

            {mode === 'member' ? (
                <Field
                    label="Church Member"
                    required
                    error={form.errors.member_id}
                >
                    <MemberPicker
                        options={options}
                        value={form.data.member_id || null}
                        onChange={(o) => form.setData('member_id', o?.id ?? '')}
                        invalid={!!form.errors.member_id}
                    />
                    <p className="helper-text">
                        Contact details and date of birth come from the member
                        record.
                    </p>
                </Field>
            ) : (
                <>
                    <Field label="Full Name" required error={form.errors.name}>
                        <input
                            className="input-field"
                            value={form.data.name}
                            onChange={(e) =>
                                form.setData('name', e.target.value)
                            }
                        />
                    </Field>
                    <div className="grid grid-cols-3 gap-3">
                        <Field
                            label="Date of Birth"
                            error={form.errors.date_of_birth}
                        >
                            <input
                                type="date"
                                className="input-field"
                                max={new Date().toISOString().slice(0, 10)}
                                value={form.data.date_of_birth}
                                onChange={(e) =>
                                    form.setData(
                                        'date_of_birth',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                        <Field label="Phone" error={form.errors.phone}>
                            <input
                                className="input-field"
                                value={form.data.phone}
                                onChange={(e) =>
                                    form.setData('phone', e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Email" error={form.errors.email}>
                            <input
                                className="input-field"
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData('email', e.target.value)
                                }
                            />
                        </Field>
                    </div>
                </>
            )}

            <Field label="Role in Household" required error={form.errors.role}>
                <select
                    className="input-field"
                    value={form.data.role}
                    onChange={(e) => form.setData('role', e.target.value)}
                >
                    {roles.map((r) => (
                        <option
                            key={r}
                            disabled={r === 'Head of Household' && hasHead}
                        >
                            {r}
                            {r === 'Head of Household' && hasHead
                                ? ' (already set)'
                                : ''}
                        </option>
                    ))}
                </select>
            </Field>
        </Modal>
    );
}
