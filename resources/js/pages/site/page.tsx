import { Head } from '@inertiajs/react';
import FormattedText from '@/components/site/formatted-text';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { formatDate, useSite } from '@/lib/site';

type Props = {
    page: {
        slug: string;
        title: string;
        summary: string | null;
        body: string;
        updated_at: string | null;
    };
};

/** An editable website page: Privacy Policy, Terms & Conditions, Terms of Use… */
export default function SitePage({ page }: Props) {
    const { get } = useSite();

    return (
        <PublicLayout>
            <Head
                title={`${page.title} — ${get('name', 'Saint Simon Baptist Church')}`}
            >
                {page.summary && (
                    <meta name="description" content={page.summary} />
                )}
            </Head>
            <PageHeader
                eyebrow={get('name', 'Our church')}
                title={page.title}
                description={page.summary ?? ''}
            />
            <article className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
                {page.updated_at && (
                    <p className="mb-8 text-xs tracking-wide text-muted-foreground uppercase">
                        Last updated {formatDate(page.updated_at)}
                    </p>
                )}
                <FormattedText text={page.body} />
            </article>
        </PublicLayout>
    );
}
