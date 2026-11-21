import { useEffect, useId, useRef } from 'react';
import 'trix';
import 'trix/dist/trix.css';

type TrixEditorProps = {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
};

export default function TrixEditor({
    value,
    onChange,
    placeholder = 'Sermon description...',
    className = '',
}: TrixEditorProps) {
    const id = useId();
    const inputId = `trix-input-${id}`;
    const editorRef = useRef<HTMLElement>(null);

    // Sync external value → editor (only when different)
    useEffect(() => {
        const editor = editorRef.current as any;
        if (!editor) return;

        // Avoid infinite loops / cursor jumps
        if (editor.value !== value) {
            editor.value = value ?? '';
        }
    }, [value]);

    // Listen for changes from Trix
    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleChange = () => {
            onChange((editor as any).value);
        };

        editor.addEventListener('trix-change', handleChange);
        return () => editor.removeEventListener('trix-change', handleChange);
    }, [onChange]);

    return (
        <div className={className}>
            {/* Hidden input that Trix uses as the source of truth */}
            <input id={inputId} type="hidden" value={value} />
            {/* @ts-expect-error – custom element */}
            <trix-editor
                ref={editorRef}
                input={inputId}
                placeholder={placeholder}
                class="trix-content"
            />
        </div>
    );
}