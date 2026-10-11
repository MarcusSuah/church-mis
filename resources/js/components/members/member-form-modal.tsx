import { usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import RegistrationWizard from '@/components/members/registration-wizard';
import type { Member } from '@/types';

interface MemberFormModalProps {
    member: Member | Partial<Member> | null;
    onClose: () => void;
    /** Called after a successful save, in addition to onClose. Lets a parent
     * modal (e.g. MemberDetailModal, which holds a stale local snapshot)
     * close itself too instead of showing outdated data. */
    onSaved?: () => void;
}

/**
 * Add / edit a member. Uses the same five-step form as the public
 * "Join Our Family" registration, in staff mode (Office-use fields, only
 * first and last name required, no consent box).
 */
export default function MemberFormModal({
    member,
    onClose,
    onSaved,
}: MemberFormModalProps) {
    const { props } = usePage<{
        church?: { name: string };
        options?: { departments?: string[] };
    }>();
    const isEditing = Boolean(member?.id);

    // Close on Escape.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 fade-in sm:py-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-form-title"
        >
            <div className="w-full max-w-4xl rounded-xl border border-border bg-card shadow-elevated">
                <div className="flex items-center justify-between border-b border-border px-6 py-4">
                    <div>
                        <h2
                            id="member-form-title"
                            className="text-lg font-semibold text-foreground"
                        >
                            {isEditing
                                ? `Edit ${[member?.first_name, member?.last_name].filter(Boolean).join(' ')}`
                                : 'Add Member'}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            Same form as the public registration. Office-use
                            details are on the Church Info step.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="p-5 sm:p-6">
                    <RegistrationWizard
                        mode="staff"
                        churchName={props.church?.name ?? ''}
                        member={member}
                        departments={props.options?.departments ?? []}
                        onSaved={() => {
                            onSaved?.();
                            onClose();
                        }}
                        footerStart={
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-ghost text-sm"
                            >
                                Cancel
                            </button>
                        }
                    />
                </div>
            </div>
        </div>
    );
}
