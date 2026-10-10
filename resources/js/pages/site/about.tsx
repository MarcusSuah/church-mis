import { Head } from '@inertiajs/react';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { safeUrl } from '@/lib/safe-url';
import { useSite } from '@/lib/site';

type Belief = { id: number; title: string; body: string };

export default function About({ beliefs }: { beliefs: Belief[] }) {
    const { get } = useSite();
    const name = get('name', 'Saint Simon Baptist Church');
    // "Our story" (edited under System → Website) is split into paragraphs on blank lines.
    const story = (get('story') ?? '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);
    // Up to three photos with captions, also edited under System → Website.
    const photos = [1, 2, 3]
        .map((n) => ({
            url: safeUrl(get(`about_image_${n}`)),
            caption: get(`about_caption_${n}`),
        }))
        .filter((p): p is { url: string; caption: string } => Boolean(p.url));
    const visit = [
        ['Sunday School', get('service_sunday_school')],
        ['Sunday Worship', get('service_sunday_worship')],
        ['Bible Study', get('service_bible_study')],
        ['Prayer Meeting', get('service_prayer_meeting')],
        ['Address', [get('address'), get('city')].filter(Boolean).join(', ')],
    ].filter(([, v]) => v);

    return (
        <PublicLayout>
            <Head title={`About Us — ${name}`}>
                <meta
                    name="description"
                    content={`Learn about ${name}: our history, mission, vision, statement of faith and what to expect when you visit.`}
                />
            </Head>
            <PageHeader
                eyebrow="Our Church"
                title={`About ${name}`}
                description={get('description')}
            />

            <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
                <div className="grid gap-10 md:grid-cols-2">
                    {get('mission') && (
                        <Card className="bg-secondary">
                            <CardContent className="p-8">
                                <p className="eyebrow">Our Mission</p>
                                <p className="mt-3 font-display text-lg leading-relaxed">
                                    {get('mission')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                    {get('vision') && (
                        <Card className="bg-secondary">
                            <CardContent className="p-8">
                                <p className="eyebrow">Our Vision</p>
                                <p className="mt-3 font-display text-lg leading-relaxed">
                                    {get('vision')}
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {photos.length > 0 && (
                    <div
                        className={`mt-16 grid gap-4 ${photos.length === 1 ? '' : photos.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}
                    >
                        {photos.map((p, i) => (
                            <figure
                                key={p.url}
                                className={`overflow-hidden rounded-xl bg-muted ${photos.length === 3 && i === 0 ? 'sm:col-span-2 sm:row-span-2' : ''}`}
                            >
                                <img
                                    src={p.url}
                                    alt={p.caption || `${name} photo ${i + 1}`}
                                    loading="lazy"
                                    className={`w-full object-cover ${photos.length === 3 && i === 0 ? 'aspect-4/3 sm:h-full' : 'aspect-4/3'}`}
                                />
                                {p.caption && (
                                    <figcaption className="px-4 py-3 text-xs text-muted-foreground">
                                        {p.caption}
                                    </figcaption>
                                )}
                            </figure>
                        ))}
                    </div>
                )}

                <div className="mt-16 grid gap-12 md:grid-cols-[1.2fr_1fr]">
                    {story.length > 0 && (
                        <div>
                            <p className="eyebrow">Our Story</p>
                            <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
                                {get('about_heading', 'Our story')}
                            </h2>
                            <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                                {story.map((p, i) => (
                                    <p key={i}>{p}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {visit.length > 0 && (
                        <div className="pt-6 rule-brass">
                            <p className="eyebrow">Plan your visit</p>
                            <dl className="mt-5 space-y-4 text-sm">
                                {visit.map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="font-semibold">
                                            {label}
                                        </dt>
                                        <dd className="text-muted-foreground">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    )}
                </div>
            </section>

            {beliefs.length > 0 && (
                <section className="bg-card py-16">
                    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
                        <p className="eyebrow">What we believe</p>
                        <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
                            Statement of faith
                        </h2>
                        <div className="mt-10 grid gap-8 md:grid-cols-3">
                            {beliefs.map((b) => (
                                <div
                                    key={b.id}
                                    className="border-t border-border pt-5"
                                >
                                    <h3 className="font-display text-base font-bold">
                                        {b.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {b.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}
