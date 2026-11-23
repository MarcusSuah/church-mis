import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
    Bold,
    Eraser,
    Heading2,
    Italic,
    Link2,
    List,
    ListOrdered,
    Quote,
    Redo2,
    Strikethrough,
    Underline,
    Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
    /** HTML string */
    value: string;
    /** Receives HTML ('' when the editor is empty) */
    onChange: (html: string) => void;
};

function ToolbarButton({
    label,
    active = false,
    disabled = false,
    onClick,
    children,
}: {
    label: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            // keep focus (and the text selection) inside the editor
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`rounded p-1.5 transition-colors disabled:opacity-30 ${
                active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
        >
            {children}
        </button>
    );
}

const Divider = () => <span className="mx-1 h-5 w-px bg-border" />;

export default function RichTextEditor({ value, onChange }: Props) {
    const editor = useEditor({
        extensions: [
            // Tiptap v3: StarterKit already includes Underline and Link.
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                link: { openOnClick: false },
            }),
        ],
        content: value,
        editorProps: {
            attributes: {
                class: 'rich-text min-h-32 max-h-72 overflow-y-auto px-3 py-2 text-sm text-foreground focus:outline-none',
            },
        },
        onUpdate: ({ editor }) =>
            onChange(editor.isEmpty ? '' : editor.getHTML()),
    });

    // Re-render the toolbar when the selection / formatting changes.
    const s = useEditorState({
        editor,
        selector: ({ editor }) => ({
            bold: editor?.isActive('bold') ?? false,
            italic: editor?.isActive('italic') ?? false,
            underline: editor?.isActive('underline') ?? false,
            strike: editor?.isActive('strike') ?? false,
            h2: editor?.isActive('heading', { level: 2 }) ?? false,
            bullet: editor?.isActive('bulletList') ?? false,
            ordered: editor?.isActive('orderedList') ?? false,
            quote: editor?.isActive('blockquote') ?? false,
            link: editor?.isActive('link') ?? false,
            canUndo: editor?.can().undo() ?? false,
            canRedo: editor?.can().redo() ?? false,
        }),
    });

    if (!editor) return null;

    const setLink = () => {
        const previous = editor.getAttributes('link').href as
            | string
            | undefined;
        const url = window.prompt('Link URL (leave empty to remove)', previous);
        if (url === null) return;
        if (url.trim() === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .setLink({ href: url.trim() })
            .run();
    };

    return (
        <div className="rounded-lg border border-input bg-card focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1.5">
                <ToolbarButton
                    label="Undo"
                    disabled={!s.canUndo}
                    onClick={() => editor.chain().focus().undo().run()}
                >
                    <Undo2 size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Redo"
                    disabled={!s.canRedo}
                    onClick={() => editor.chain().focus().redo().run()}
                >
                    <Redo2 size={15} />
                </ToolbarButton>
                <Divider />
                <ToolbarButton
                    label="Bold"
                    active={s.bold}
                    onClick={() => editor.chain().focus().toggleBold().run()}
                >
                    <Bold size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Italic"
                    active={s.italic}
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                >
                    <Italic size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Underline"
                    active={s.underline}
                    onClick={() =>
                        editor.chain().focus().toggleUnderline().run()
                    }
                >
                    <Underline size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Strikethrough"
                    active={s.strike}
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                >
                    <Strikethrough size={15} />
                </ToolbarButton>
                <Divider />
                <ToolbarButton
                    label="Heading"
                    active={s.h2}
                    onClick={() =>
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                    }
                >
                    <Heading2 size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Bulleted list"
                    active={s.bullet}
                    onClick={() =>
                        editor.chain().focus().toggleBulletList().run()
                    }
                >
                    <List size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Numbered list"
                    active={s.ordered}
                    onClick={() =>
                        editor.chain().focus().toggleOrderedList().run()
                    }
                >
                    <ListOrdered size={15} />
                </ToolbarButton>
                <ToolbarButton
                    label="Quote"
                    active={s.quote}
                    onClick={() =>
                        editor.chain().focus().toggleBlockquote().run()
                    }
                >
                    <Quote size={15} />
                </ToolbarButton>
                <ToolbarButton label="Link" active={s.link} onClick={setLink}>
                    <Link2 size={15} />
                </ToolbarButton>
                <Divider />
                <ToolbarButton
                    label="Clear formatting"
                    onClick={() =>
                        editor
                            .chain()
                            .focus()
                            .clearNodes()
                            .unsetAllMarks()
                            .run()
                    }
                >
                    <Eraser size={15} />
                </ToolbarButton>
            </div>
            <EditorContent editor={editor} />
        </div>
    );
}