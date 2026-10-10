'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { image as uploadImage } from '@/routes/uploads';
import { ImageIcon, Upload, Camera } from 'lucide-react';

interface ImageUploadFieldProps {
    /** Current image URL (already-uploaded value, or empty). */
    value: string | null | undefined;
    /** Called with the new public URL once upload finishes, or '' on remove. */
    onChange: (url: string) => void;
    label?: string;
    /** Aspect/shape of the preview. */
    variant?: 'banner' | 'avatar';
}

/**
 * Uploads the selected file to POST /uploads/image
 * (App\Http\Controllers\System\UploadController) and hands back the public
 * URL, so the parent form just stores a string.
 */
export default function ImageUploadField({
    value,
    onChange,
    label,
    variant = 'banner',
}: ImageUploadFieldProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (file: File | undefined) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please choose an image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Images must be under 5MB.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // The layout has no csrf-token meta tag; Laravel sets an
            // XSRF-TOKEN cookie on every response and accepts it back as
            // the X-XSRF-TOKEN header.
            const xsrf = decodeURIComponent(
                document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ??
                    '',
            );

            const response = await fetch(uploadImage.url(), {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': xsrf,
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: formData,
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(body?.errors?.file?.[0] ?? 'Upload failed.');
            }

            const data = await response.json();
            onChange(data.url);
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Could not upload this image.',
            );
        } finally {
            setUploading(false);
        }
    };

    const clear = () => {
        onChange('');
        if (inputRef.current) inputRef.current.value = '';
    };

    const openPicker = () => {
        if (!uploading) inputRef.current?.click();
    };

    const previewClass =
        variant === 'avatar'
            ? 'h-20 w-20 rounded-full'
            : 'h-32 w-full rounded-lg';
    const isAvatar = variant === 'avatar';

    return (
        <div>
            {label && (
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                    {label}
                </label>
            )}

            <div className="relative">
                {/* Banner / Avatar Preview — whole area is clickable */}
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={uploading}
                    className={`group relative flex-shrink-0 overflow-hidden border border-border bg-muted text-left transition-opacity ${previewClass} ${
                        uploading
                            ? 'pointer-events-none opacity-60'
                            : 'cursor-pointer'
                    }`}
                    aria-label={value ? 'Change image' : 'Choose image'}
                >
                    {value ? (
                        <img
                            src={value}
                            alt="Preview"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
                            <ImageIcon
                                size={isAvatar ? 20 : 28}
                                className="text-muted-foreground"
                            />
                            {!isAvatar && (
                                <span className="text-xs font-medium text-muted-foreground">
                                    Choose Image
                                </span>
                            )}
                        </div>
                    )}

                    {/* Hover overlay: shows change control without permanently covering the photo */}
                    {value && !uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                            <span
                                className={`flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 ${
                                    isAvatar ? 'px-2 py-1' : ''
                                }`}
                            >
                                <Camera size={isAvatar ? 14 : 15} />
                                {!isAvatar && 'Change'}
                            </span>
                        </div>
                    )}

                    {/* Empty avatar: small camera hint at bottom-right so it doesn't cover the center */}
                    {!value && isAvatar && (
                        <span className="absolute right-0 bottom-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-white shadow-sm">
                            <Upload size={11} />
                        </span>
                    )}

                    {/* Uploading overlay */}
                    {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs font-medium text-white">
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                {!isAvatar && 'Uploading...'}
                            </div>
                        </div>
                    )}
                </button>

                {/* Hidden file input */}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    disabled={uploading}
                    className="hidden"
                />

                {/* Image information / Remove */}
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>JPG, PNG, GIF, or WebP · up to 5MB</span>

                    {value && (
                        <button
                            type="button"
                            onClick={clear}
                            className="font-medium text-danger hover:underline"
                        >
                            Remove
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
