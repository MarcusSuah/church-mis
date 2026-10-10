import { router } from '@inertiajs/react';
import { Check, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { assign } from '@/routes/members';
import type { Member } from '@/types';
import { DEPARTMENTS, MEMBERSHIP_TYPES, MINISTRIES } from '@/types/member';

/** Department / ministry / classification picker, saved via PATCH members.assign. */
export default function MemberAssignmentForm({
    member,
    canEdit,
}: {
    member: Member;
    canEdit: boolean;
}) {
    const initial = () => ({
        department: member.department || 'Unassigned',
        ministry: member.ministry || 'Unassigned',
        membership_type: member.membership_type || 'Regular Member',
    });
    const [values, setValues] = useState(initial);
    const [saving, setSaving] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(
        () => setValues(initial()),
        [member.id, member.department, member.ministry, member.membership_type],
    );

    // Keep any legacy value that isn't in the standard lists selectable.
    const withCurrent = (list: string[], current: string) =>
        list.includes(current) ? list : [current, ...list];

    const save = () => {
        setSaving(true);
        router.patch(assign.url(member.id), values, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    const select = (
        key: keyof typeof values,
        label: string,
        options: string[],
    ) => (
        <div>
            <label className="label-text">{label}</label>
            <select
                className="input-field"
                disabled={!canEdit}
                value={values[key]}
                onChange={(e) =>
                    setValues((v) => ({ ...v, [key]: e.target.value }))
                }
            >
                {withCurrent(options, values[key]).map((o) => (
                    <option key={o}>{o}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {select('department', 'Department Assignment', [
                    'Unassigned',
                    ...DEPARTMENTS,
                ])}
                {select('ministry', 'Ministry Assignment', [
                    'Unassigned',
                    ...MINISTRIES,
                ])}
                {select(
                    'membership_type',
                    'Membership Classification',
                    MEMBERSHIP_TYPES,
                )}
            </div>
            {canEdit && (
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="btn-primary text-sm"
                >
                    {saving ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <Check className="size-3.5" />
                    )}
                    Save Assignments
                </button>
            )}
        </div>
    );
}
