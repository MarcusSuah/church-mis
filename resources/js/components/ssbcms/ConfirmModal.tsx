import { AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
    /** Optional extra content (e.g. a reason textarea) between message and buttons. */
    children?: React.ReactNode;
}

const variants = {
    danger: {
        Icon: AlertTriangle,
        iconBg: 'bg-danger/10',
        iconColor: 'text-danger',
        btnClass: 'btn-danger',
    },
    warning: {
        Icon: AlertCircle,
        iconBg: 'bg-warning/10',
        iconColor: 'text-warning',
        btnClass: 'btn-accent',
    },
    info: {
        Icon: Info,
        iconBg: 'bg-info/10',
        iconColor: 'text-info',
        btnClass: 'btn-primary',
    },
};

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    loading = false,
    children,
}: ConfirmModalProps) {
    if (!isOpen) return null;

    const { Icon, iconBg, iconColor, btnClass } = variants[variant];

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 fade-in"
            role="dialog"
            aria-modal="true"
        >
            <div
                className="absolute inset-0 bg-black/50"
                onClick={loading ? undefined : onClose}
            />
            <div className="scale-in relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-modal">
                <div className="flex gap-4">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconBg}`}
                    >
                        <Icon className={`size-5 ${iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-foreground">
                            {title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {message}
                        </p>
                    </div>
                </div>
                {children && <div className="mt-4">{children}</div>}
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="btn-outline text-sm"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`${btnClass} text-sm`}
                    >
                        {loading && <Loader2 className="size-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
