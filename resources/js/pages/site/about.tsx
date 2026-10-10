import { Head } from '@inertiajs/react';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useSite } from '@/lib/site';

type Belief = { id: number; title: string; body: string };

export default function About({ beliefs }: { beliefs: Belief[] }) {
    const { get } = useSite();
    const name = get('name', 'Saint Simon Baptist Church');
    // The "Our story" text is split into paragraphs on blank lines.
    const story = get('story')
        ? get('story')
              .split(/\n\s*\n/)
              .filter(Boolean)
        : [
              `${name} was established by a small group of believers who longed for a congregation shaped by Scripture and marked by genuine fellowship. From those first gatherings, the Lord has grown a church family that spans generations.`,
              'Today the church serves through numerous departments and ministries — from Sunday School and the Choir to Missions, Youth and Benevolence — each carrying a share of the work entrusted to us.',
              "We remain committed to the historic Baptist convictions: the authority of Scripture, the priesthood of all believers, believer's baptism, and the autonomy of the local church under the Lordship of Christ.",
          ];
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

                <div className="mt-16 grid gap-12 md:grid-cols-[1.2fr_1fr]">
                    <div>
                        <p className="eyebrow">Our Story</p>
                        <h2 className="mt-2 font-display text-2xl font-bold md:text-3xl">
                            A heritage of faith
                        </h2>
                        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                            {story.map((p, i) => (
                                <p key={i}>{p}</p>
                            ))}
                        </div>
                    </div>

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
