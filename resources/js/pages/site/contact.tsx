import { Head } from '@inertiajs/react';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { Card, CardContent } from '@/components/ui/card';
import { useSite } from '@/lib/site';

export default function Contact() {
    const { get } = useSite();
    const address = [get('address'), get('city'), get('country')]
        .filter(Boolean)
        .join(', ');
    const rows = [
        {
            icon: MapPin,
            label: 'Address',
            value: address,
            href: address
                ? `https://www.google.com/maps/search/${encodeURIComponent(address)}`
                : null,
        },
        {
            icon: Phone,
            label: 'Phone',
            value: get('phone'),
            href: get('phone')
                ? `tel:${get('phone').replace(/\s/g, '')}`
                : null,
        },
        {
            icon: Mail,
            label: 'Email',
            value: get('email'),
            href: get('email') ? `mailto:${get('email')}` : null,
        },
    ].filter((r) => r.value);
    const services = [
        ['Sunday School', get('service_sunday_school')],
        ['Sunday Worship', get('service_sunday_worship')],
        ['Bible Study', get('service_bible_study')],
        ['Prayer Meeting', get('service_prayer_meeting')],
    ].filter(([, v]) => v);

    return (
        <PublicLayout>
            <Head
                title={`Contact — ${get('name', 'Saint Simon Baptist Church')}`}
            />
            <PageHeader
                eyebrow="Get in touch"
                title="Contact us"
                description="We would love to hear from you and welcome you in person."
            />
            <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
                <Card>
                    <CardContent className="space-y-6 p-8">
                        {rows.map((r) => (
                            <div key={r.label} className="flex gap-4">
                                <r.icon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                                <div>
                                    <p className="eyebrow">{r.label}</p>
                                    {r.href ? (
                                        <a
                                            href={r.href}
                                            target={
                                                r.label === 'Address'
                                                    ? '_blank'
                                                    : undefined
                                            }
                                            rel="noreferrer"
                                            className="mt-1 block text-sm font-medium hover:underline"
                                        >
                                            {r.value}
                                        </a>
                                    ) : (
                                        <p className="mt-1 text-sm font-medium">
                                            {r.value}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                {services.length > 0 && (
                    <Card className="bg-secondary">
                        <CardContent className="p-8">
                            <p className="eyebrow">Service times</p>
                            <ul className="mt-5 space-y-4">
                                {services.map(([label, value]) => (
                                    <li
                                        key={label}
                                        className="flex items-start gap-3"
                                    >
                                        <Clock className="mt-0.5 h-4 w-4 text-accent" />
                                        <div>
                                            <p className="text-sm font-semibold">
                                                {label}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {value}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                )}
            </section>
        </PublicLayout>
    );
}
