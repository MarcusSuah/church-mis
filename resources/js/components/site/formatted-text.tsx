import type { ReactNode } from 'react';

/**
 * Renders page text written in the System → Pages editor. The text is never
 * treated as HTML (so it cannot run scripts). Simple conventions:
 *   - a blank line starts a new paragraph
 *   - a line starting with "## " is a heading
 *   - lines starting with "- " form a bulleted list
 */
export default function FormattedText({ text }: { text: string }) {
    const blocks: ReactNode[] = [];
    let bullets: string[] = [];
    let paragraph: string[] = [];

    const flushParagraph = () => {
        if (paragraph.length) {
            blocks.push(
                <p key={`p${blocks.length}`} className="leading-relaxed">
                    {paragraph.join(' ')}
                </p>,
            );
            paragraph = [];
        }
    };
    const flushBullets = () => {
        if (bullets.length) {
            blocks.push(
                <ul
                    key={`u${blocks.length}`}
                    className="list-disc space-y-1.5 pl-6 leading-relaxed"
                >
                    {bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                    ))}
                </ul>,
            );
            bullets = [];
        }
    };

    for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
        const line = raw.trim();
        if (line === '') {
            flushParagraph();
            flushBullets();
        } else if (line.startsWith('## ')) {
            flushParagraph();
            flushBullets();
            blocks.push(
                <h2
                    key={`h${blocks.length}`}
                    className="pt-4 font-display text-xl font-bold text-foreground"
                >
                    {line.slice(3)}
                </h2>,
            );
        } else if (line.startsWith('- ')) {
            flushParagraph();
            bullets.push(line.slice(2));
        } else {
            flushBullets();
            paragraph.push(line);
        }
    }
    flushParagraph();
    flushBullets();

    return (
        <div className="space-y-4 text-sm text-muted-foreground md:text-base">
            {blocks}
        </div>
    );
}
