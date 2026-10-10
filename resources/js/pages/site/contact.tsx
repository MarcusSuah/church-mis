import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { PageHeader, PublicLayout } from '@/components/site/PublicLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useSite } from '@/lib/site';
import { send } from '@/routes/site/contact';

/** Contact form: messages go to the church office inbox (System → Messages). */
function MessageForm() {
    const [sent, setSent] = useState(false);
    const form = useForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        // Honeypot: hidden from people, filled in by bots.
        website: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(send.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setSent(true);
            },
        });
    };

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <h3 className="font-display text-xl font-bold">Message sent</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                    Thank you for reaching out. The church office will reply to
                    your email address.
                </p>
                <Button
                    variant="outline"
                    type="button"
                    onClick={() => setSent(false)}
                >
                    Send another message
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="contact-name">Your name *</Label>
                    <Input
                        id="contact-name"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        autoComplete="name"
                        maxLength={120}
                        required
                    />
                    <InputError message={form.errors.name} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="contact-email">Email *</Label>
                    <Input
                        id="contact-email"
                        type="email"
                        value={form.data.email}
                        onChange={(e) => form.setData('email', e.target.value)}
                        autoComplete="email"
                        maxLength={190}
                        required
                    />
                    <InputError message={form.errors.email} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="contact-phone">Phone</Label>
                    <Input
                        id="contact-phone"
                        type="tel"
                        value={form.data.phone}
                        onChange={(e) => form.setData('phone', e.target.value)}
                        autoComplete="tel"
                        maxLength={40}
                    />
                    <InputError message={form.errors.phone} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="contact-subject">Subject *</Label>
                    <Input
                        id="contact-subject"
                        value={form.data.subject}
                        onChange={(e) =>
                            form.setData('subject', e.target.value)
                        }
                        maxLength={150}
                        required
                    />
                    <InputError message={form.errors.subject} />
                </div>
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="contact-message">Message *</Label>
                <Textarea
                    id="contact-message"
                    rows={6}
                    value={form.data.message}
                    onChange={(e) => form.setData('message', e.target.value)}
                    maxLength={5000}
                    required
                />
                <InputError message={form.errors.message} />
            </div>
            <div className="hidden" aria-hidden="true">
                <label htmlFor="contact-website">Website</label>
                <input
                    id="contact-website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.data.website}
                    onChange={(e) => form.setData('website', e.target.value)}
                />
            </div>
            <Button type="submit" disabled={form.processing} size="lg">
                <Send className="h-4 w-4" />
                {form.processing ? 'Sending…' : 'Send message'}
            </Button>
        </form>
    );
}

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
                description={get('contact_intro')}
            />
            <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.4fr_1fr]">
                <Card>
                    <CardContent className="p-8">
                        <p className="eyebrow">Send us a message</p>
                        <h2 className="mt-2 mb-6 font-display text-2xl font-bold">
                            How can we help?
                        </h2>
                        <MessageForm />
                    </CardContent>
                </Card>

                <div className="space-y-8">
                    {rows.length > 0 && (
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
                                                    rel="noopener noreferrer"
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
                    )}
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
                </div>
            </section>
        </PublicLayout>
    );
}
