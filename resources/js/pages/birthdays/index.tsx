import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ssbcms/AppIcon';
import type { LaravelPage } from '@/components/ssbcms/Pagination';
import { ServerPaginator } from '@/components/ssbcms/Pagination';
import ReadMore from '@/components/ssbcms/ReadMore';
import { Field, inputCls, Kpi } from '@/components/ssbcms/records-ui';

type Birthday = {
    id: string;
    name: string;
    first_name: string;
    initials: string;
    photo_url: string | null;
    department: string | null;
    email: string | null;
    has_account: boolean;
    date_of_birth: string;
    next_birthday: string;
    days_until: number;
    turning: number;
};
type MemberOpt = {
    id: string;
    name: string;
    first_name: string;
    email: string | null;
    has_account: boolean;
    department: string | null;
    photo_url: string | null;
    date_of_birth: string | null;
};
type Sent = {
    id: number;
    member_name: string;
    occasion: string;
    subject: string;
    message: string;
    channels: string[];
    email_status: string | null;
    sent_by: string | null;
    created_at: string;
};
type Props = {
    today: Birthday[];
    upcoming: Birthday[];
    members?: MemberOpt[];
    memberTotal?: number;
    allMembers?: MemberOpt[];
    memberFilters: { q: string; department: string };
    departments: string[];
    maxRecipients: number;
    preselectMember: MemberOpt | null;
    occasions: Record<string, { subject: string; messages: string[] }>;
    history: LaravelPage<Sent>;
    preselect: string | null;
    can: { send: boolean };
};

const OCCASION_ICON: Record<string, string> = {
    Birthday: '🎂',
    'Wedding Anniversary': '💍',
    Graduation: '🎓',
    'New Baby': '👶',
    'Promotion / New Job': '💼',
    'Baptism Anniversary': '🕊️',
    'Get Well Soon': '🙏',
    Congratulations: '🎉',
};
const fmtDay = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

function Avatar({
    name,
    photo,
    size = 'h-10 w-10',
}: {
    name: string;
    photo: string | null;
    size?: string;
}) {
    const initials = name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('');
    return photo ? (
        <img
            src={photo}
            alt=""
            className={`${size} shrink-0 rounded-full object-cover`}
        />
    ) : (
        <div
            className={`${size} gradient-gold flex shrink-0 items-center justify-center rounded-full text-xs font-bold text-white`}
        >
            {initials}
        </div>
    );
}

export default function Birthdays({
    today,
    upcoming,
    members,
    memberTotal,
    memberFilters,
    departments,
    maxRecipients,
    preselectMember,
    occasions,
    history,
    preselect,
    can,
}: Props) {
    const { church } = usePage<{ church: { name: string } }>().props;
    const occasionNames = Object.keys(occasions);
    const [memberSearch, setMemberSearch] = useState(memberFilters.q);
    const [department, setDepartment] = useState(memberFilters.department);
    const [listLoading, setListLoading] = useState(false);
    const [selectingAll, setSelectingAll] = useState(false);
    const [capped, setCapped] = useState(false);
    const [showAllChips, setShowAllChips] = useState(false);
    const [templateIdx, setTemplateIdx] = useState(0);
    const form = useForm<{
        member_ids: string[];
        occasion: string;
        subject: string;
        message: string;
        channels: string[];
    }>({
        member_ids: preselect ? [preselect] : [],
        occasion: 'Birthday',
        subject: occasions.Birthday?.subject ?? '',
        message: occasions.Birthday?.messages[0] ?? '',
        channels: ['in_app', 'email'],
    });

    // Members picked so far (from search results or the birthday cards), keyed by id.
    const [picked, setPicked] = useState<Record<string, MemberOpt>>(() =>
        preselectMember ? { [preselectMember.id]: preselectMember } : {},
    );
    const selected = form.data.member_ids
        .map((id) => picked[id])
        .filter((m): m is MemberOpt => Boolean(m));

    // Re-list active members from the server 300 ms after the search or
    // department changes; the server sends one page at a time (F07).
    const listQuery = {
        member_q: memberSearch.trim(),
        member_department: department,
    };
    const firstSearch = useRef(true);
    useEffect(() => {
        if (firstSearch.current) {
            firstSearch.current = false;
            return;
        }
        const t = setTimeout(
            () =>
                router.reload({
                    only: ['members', 'memberTotal'],
                    data: {
                        member_q: memberSearch.trim(),
                        member_department: department,
                    },
                    onStart: () => setListLoading(true),
                    onFinish: () => setListLoading(false),
                }),
            300,
        );
        return () => clearTimeout(t);
    }, [memberSearch, department]);

    /** Adds members to the selection, never beyond the send limit. */
    const addMembers = (list: MemberOpt[]) => {
        setPicked((p) => ({
            ...p,
            ...Object.fromEntries(list.map((m) => [m.id, m])),
        }));
        const ids = [...form.data.member_ids];
        let hitLimit = false;
        for (const m of list) {
            if (ids.includes(m.id)) continue;
            if (ids.length >= maxRecipients) {
                hitLimit = true;
                break;
            }
            ids.push(m.id);
        }
        setCapped(hitLimit);
        form.setData('member_ids', ids);
    };
    const removeMember = (id: string) => {
        setCapped(false);
        form.setData(
            'member_ids',
            form.data.member_ids.filter((x) => x !== id),
        );
    };
    const toggleMember = (m: MemberOpt) =>
        form.data.member_ids.includes(m.id)
            ? removeMember(m.id)
            : addMembers([m]);

    // "Select all": asks the server for every matching active member (up to the limit).
    const selectAll = () =>
        router.reload({
            only: ['allMembers'],
            data: listQuery,
            onStart: () => setSelectingAll(true),
            onFinish: () => setSelectingAll(false),
            onSuccess: (page) =>
                addMembers((page.props.allMembers as MemberOpt[]) ?? []),
        });
    const listed = members ?? [];
    const allListedSelected =
        listed.length > 0 &&
        listed.every((m) => form.data.member_ids.includes(m.id));
    const memberError =
        form.errors.member_ids ??
        Object.entries(form.errors).find(([k]) =>
            k.startsWith('member_ids.'),
        )?.[1];

    const templates = occasions[form.data.occasion]?.messages ?? [];
    const applyTemplate = (occasion: string, idx: number) => {
        const t = occasions[occasion];
        if (!t) return;
        setTemplateIdx(idx);
        form.setData((d) => ({
            ...d,
            occasion,
            subject: t.subject,
            message: t.messages[idx] ?? '',
        }));
    };
    const randomTemplate = () => {
        if (templates.length < 2) return applyTemplate(form.data.occasion, 0);
        let i = templateIdx;
        while (i === templateIdx)
            i = Math.floor(Math.random() * templates.length);
        applyTemplate(form.data.occasion, i);
    };
    const toggleChannel = (c: string) =>
        form.setData(
            'channels',
            form.data.channels.includes(c)
                ? form.data.channels.filter((x) => x !== c)
                : [...form.data.channels, c],
        );

    // Preview with the first selected member's details filled in.
    const first = selected[0];
    const fill = (t: string) =>
        t
            .replaceAll('{first_name}', first?.first_name ?? 'Grace')
            .replaceAll('{full_name}', first?.name ?? 'Grace Osei')
            .replaceAll(
                '{age}',
                first?.date_of_birth
                    ? String(
                          new Date().getFullYear() -
                              Number(first.date_of_birth.slice(0, 4)),
                      )
                    : '30',
            )
            .replaceAll('{church_name}', church.name);

    useEffect(() => {
        if (preselect)
            document
                .getElementById('composer')
                ?.scrollIntoView({ behavior: 'smooth' });
    }, [preselect]);

    const send = () =>
        form.post('/birthdays/send', {
            preserveScroll: true,
            onSuccess: () => {
                setCapped(false);
                form.setData('member_ids', []);
            },
        });
    const noEmail = selected.filter((m) => !m.email);
    const noAccount = selected.filter((m) => !m.has_account);

    const BirthdayCard = ({
        b,
        highlight,
    }: {
        b: Birthday;
        highlight?: boolean;
    }) => (
        <div
            className={`flex items-center gap-3 rounded-xl border p-3 ${highlight ? 'border-accent/30 bg-accent/5' : 'border-border bg-card'}`}
        >
            <Avatar name={b.name} photo={b.photo_url} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                    {b.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {highlight
                        ? 'Today'
                        : `${fmtDay(b.next_birthday)} · in ${b.days_until} day${b.days_until === 1 ? '' : 's'}`}{' '}
                    · Turning {b.turning}
                    {b.department ? ` · ${b.department}` : ''}
                </p>
            </div>
            {can.send && (
                <button
                    type="button"
                    onClick={() => {
                        addMembers([
                            {
                                id: b.id,
                                name: b.name,
                                first_name: b.first_name,
                                email: b.email,
                                has_account: b.has_account,
                                department: b.department,
                                photo_url: b.photo_url,
                                date_of_birth: b.date_of_birth,
                            },
                        ]);
                        if (form.data.occasion !== 'Birthday')
                            applyTemplate('Birthday', 0);
                        document
                            .getElementById('composer')
                            ?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${highlight ? 'bg-accent text-white hover:bg-accent/90' : 'border border-border text-foreground hover:bg-muted'}`}
                >
                    {form.data.member_ids.includes(b.id)
                        ? 'Added ✓'
                        : 'Send wish'}
                </button>
            )}
        </div>
    );

    return (
        <div className="space-y-6 p-4 lg:p-6 xl:p-8">
            <Head title="Birthdays & Celebrations" />
            <div>
                <h1 className="page-title">Birthdays & Celebrations</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    See who is celebrating and send birthday wishes or
                    congratulations to members
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Kpi
                    flip
                    label="Birthdays Today"
                    value={today.length}
                    icon="CakeIcon"
                    color="text-accent"
                    bg="bg-accent/10"
                />
                <Kpi
                    flip
                    label="Next 7 Days"
                    value={upcoming.filter((b) => b.days_until <= 7).length}
                    icon="CalendarDaysIcon"
                    color="text-primary"
                    bg="bg-primary/10"
                />
                <Kpi
                    flip
                    label="Next 30 Days"
                    value={upcoming.length}
                    icon="GiftIcon"
                    color="text-success"
                    bg="bg-success/10"
                />
                <Kpi
                    flip
                    label="Messages Sent"
                    value={history.total}
                    icon="PaperAirplaneIcon"
                    color="text-info"
                    bg="bg-info/10"
                />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                <div className="space-y-4 xl:col-span-2">
                    <div className="card p-5">
                        <h2 className="section-header mb-3">Today 🎂</h2>
                        {today.length ? (
                            <div className="space-y-2">
                                {today.map((b) => (
                                    <BirthdayCard key={b.id} b={b} highlight />
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                No birthdays today.
                            </p>
                        )}
                    </div>
                    <div className="card p-5">
                        <h2 className="section-header mb-3">
                            Coming up (30 days)
                        </h2>
                        {upcoming.length ? (
                            <div className="max-h-[420px] scrollbar-thin space-y-2 overflow-y-auto pr-1">
                                {upcoming.map((b) => (
                                    <BirthdayCard key={b.id} b={b} />
                                ))}
                            </div>
                        ) : (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                No birthdays in the next 30 days. Add dates of
                                birth to member profiles to see them here.
                            </p>
                        )}
                    </div>
                </div>

                <div id="composer" className="card p-5 xl:col-span-3">
                    <h2 className="section-header mb-1">Send a message</h2>
                    <p className="mb-4 text-xs text-muted-foreground">
                        Pick members, choose an occasion, use a ready-made
                        message (or write your own) and send.
                    </p>
                    {!can.send ? (
                        <p className="text-sm text-muted-foreground">
                            You can view birthdays but not send messages.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <Field label="Members *" error={memberError}>
                                {/* Chosen members */}
                                <div className="rounded-lg border border-border bg-background p-2">
                                    {selected.length === 0 ? (
                                        <p className="px-1 py-0.5 text-sm text-muted-foreground">
                                            No members chosen yet. Tick active
                                            members below, or use “Send wish” on
                                            a birthday card.
                                        </p>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {(showAllChips
                                                ? selected
                                                : selected.slice(0, 12)
                                            ).map((m) => (
                                                <span
                                                    key={m.id}
                                                    className="flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs font-medium text-primary"
                                                >
                                                    {m.name}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeMember(m.id)
                                                        }
                                                        className="rounded-full p-0.5 hover:bg-primary/20"
                                                        aria-label={`Remove ${m.name}`}
                                                    >
                                                        <Icon
                                                            name="XMarkIcon"
                                                            size={12}
                                                        />
                                                    </button>
                                                </span>
                                            ))}
                                            {selected.length > 12 && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowAllChips(
                                                            (v) => !v,
                                                        )
                                                    }
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    {showAllChips
                                                        ? 'Show fewer'
                                                        : `+${selected.length - 12} more`}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setCapped(false);
                                                    form.setData(
                                                        'member_ids',
                                                        [],
                                                    );
                                                }}
                                                className="ml-auto text-xs text-muted-foreground hover:text-danger"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                    )}
                                </div>
                                {capped && (
                                    <p className="mt-1 text-xs text-warning">
                                        Only the first {maxRecipients} members
                                        were added — that is the most one
                                        message can go to.
                                    </p>
                                )}

                                {/* Active members from the database */}
                                <div className="mt-2 overflow-hidden rounded-lg border border-border">
                                    <div className="flex flex-wrap gap-2 border-b border-border bg-muted/40 p-2">
                                        <div className="relative min-w-0 flex-1 basis-48">
                                            <Icon
                                                name="MagnifyingGlassIcon"
                                                size={14}
                                                className="absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                                            />
                                            <input
                                                type="search"
                                                value={memberSearch}
                                                onChange={(e) =>
                                                    setMemberSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Search active members by name, email or ID…"
                                                aria-label="Search active members"
                                                className={`${inputCls} pl-8`}
                                            />
                                        </div>
                                        <select
                                            value={department}
                                            onChange={(e) =>
                                                setDepartment(e.target.value)
                                            }
                                            aria-label="Filter by department"
                                            className={`${inputCls} w-auto min-w-40 flex-none`}
                                        >
                                            <option value="">
                                                All departments
                                            </option>
                                            {departments.map((d) => (
                                                <option key={d} value={d}>
                                                    {d}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
                                        <span>
                                            {memberTotal === undefined
                                                ? 'Loading active members…'
                                                : `${memberTotal} active member${memberTotal === 1 ? '' : 's'}${listLoading ? ' · updating…' : ''}`}
                                        </span>
                                        {memberTotal !== undefined &&
                                            memberTotal > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={selectAll}
                                                    disabled={
                                                        selectingAll ||
                                                        (allListedSelected &&
                                                            memberTotal <=
                                                                listed.length)
                                                    }
                                                    className="font-semibold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                                                >
                                                    {selectingAll
                                                        ? 'Selecting…'
                                                        : memberTotal >
                                                            maxRecipients
                                                          ? `Select first ${maxRecipients}`
                                                          : `Select all ${memberTotal}`}
                                                </button>
                                            )}
                                    </div>

                                    <div
                                        className={`max-h-72 scrollbar-thin overflow-y-auto ${listLoading ? 'opacity-60' : ''}`}
                                    >
                                        {members === undefined ? (
                                            <div className="space-y-2 p-3">
                                                {[0, 1, 2, 3].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="flex animate-pulse items-center gap-3"
                                                    >
                                                        <div className="h-8 w-8 rounded-full bg-muted" />
                                                        <div className="h-3 w-40 rounded bg-muted" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : listed.length === 0 ? (
                                            <p className="p-4 text-center text-sm text-muted-foreground">
                                                No active members match.
                                            </p>
                                        ) : (
                                            listed.map((m) => {
                                                const checked =
                                                    form.data.member_ids.includes(
                                                        m.id,
                                                    );

                                                return (
                                                    <label
                                                        key={m.id}
                                                        className={`flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-muted ${checked ? 'bg-primary/5' : ''}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={checked}
                                                            onChange={() =>
                                                                toggleMember(m)
                                                            }
                                                            className="rounded border-border"
                                                        />
                                                        <Avatar
                                                            name={m.name}
                                                            photo={m.photo_url}
                                                            size="h-8 w-8"
                                                        />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-medium text-foreground">
                                                                {m.name}
                                                            </span>
                                                            <span className="block truncate text-xs text-muted-foreground">
                                                                {[
                                                                    m.email ??
                                                                        'No email',
                                                                    m.department,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' · ',
                                                                    )}
                                                            </span>
                                                        </span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                    {memberTotal !== undefined &&
                                        memberTotal > listed.length && (
                                            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                                                Showing the first{' '}
                                                {listed.length} — search or pick
                                                a department to find others.
                                            </p>
                                        )}
                                </div>
                            </Field>

                            <Field label="Occasion">
                                <div className="flex flex-wrap gap-2">
                                    {occasionNames.map((o) => (
                                        <button
                                            key={o}
                                            type="button"
                                            onClick={() => applyTemplate(o, 0)}
                                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${form.data.occasion === o ? 'border-primary bg-primary text-white' : 'border-border text-muted-foreground hover:bg-muted'}`}
                                        >
                                            {OCCASION_ICON[o] ?? '✨'} {o}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground">
                                        Ready-made messages
                                    </span>
                                    <button
                                        type="button"
                                        onClick={randomTemplate}
                                        className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                                    >
                                        <Icon name="ArrowPathIcon" size={13} />
                                        Random wish
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {templates.map((_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() =>
                                                applyTemplate(
                                                    form.data.occasion,
                                                    i,
                                                )
                                            }
                                            className={`rounded-md border px-2.5 py-1 text-xs ${templateIdx === i && form.data.message === templates[i] ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-muted'}`}
                                        >
                                            Message {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTemplateIdx(-1);
                                            form.setData('message', '');
                                        }}
                                        className="rounded-md border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted"
                                    >
                                        ✏️ Write my own
                                    </button>
                                </div>
                            </div>

                            <Field
                                label="Subject *"
                                error={form.errors.subject}
                            >
                                <input
                                    className={inputCls}
                                    value={form.data.subject}
                                    onChange={(e) =>
                                        form.setData('subject', e.target.value)
                                    }
                                />
                            </Field>
                            <Field
                                label="Message *"
                                error={form.errors.message}
                            >
                                <textarea
                                    rows={5}
                                    className={`${inputCls} resize-y`}
                                    value={form.data.message}
                                    onChange={(e) =>
                                        form.setData('message', e.target.value)
                                    }
                                    placeholder="Write your own message…"
                                />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Personalise with{' '}
                                    <code>{'{first_name}'}</code>,{' '}
                                    <code>{'{full_name}'}</code>,{' '}
                                    <code>{'{age}'}</code> and{' '}
                                    <code>{'{church_name}'}</code> — each member
                                    gets their own details.
                                </p>
                            </Field>

                            <Field label="Send by" error={form.errors.channels}>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        [
                                            'in_app',
                                            'Member Portal notification',
                                        ],
                                        ['email', 'Email'],
                                    ].map(([v, l]) => (
                                        <label
                                            key={v}
                                            className="flex items-center gap-2 text-sm text-foreground"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.data.channels.includes(
                                                    v,
                                                )}
                                                onChange={() =>
                                                    toggleChannel(v)
                                                }
                                                className="rounded border-border"
                                            />
                                            {l}
                                        </label>
                                    ))}
                                </div>
                                {(noEmail.length > 0 &&
                                    form.data.channels.includes('email')) ||
                                (noAccount.length > 0 &&
                                    form.data.channels.includes('in_app')) ? (
                                    <p className="mt-1.5 text-xs text-warning">
                                        {noEmail.length > 0 &&
                                            form.data.channels.includes(
                                                'email',
                                            ) &&
                                            `No email on file for ${noEmail.map((m) => m.name).join(', ')}. `}
                                        {noAccount.length > 0 &&
                                            form.data.channels.includes(
                                                'in_app',
                                            ) &&
                                            `${noAccount.map((m) => m.name).join(', ')} ha${noAccount.length === 1 ? 's' : 've'} no portal login yet — they'll see it once their account exists.`}
                                    </p>
                                ) : null}
                            </Field>

                            {form.data.message && (
                                <div className="rounded-xl border border-accent/20 bg-accent/5 p-4">
                                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-accent uppercase">
                                        Preview{first ? ` — ${first.name}` : ''}
                                    </p>
                                    <p className="text-sm font-semibold text-foreground">
                                        {fill(form.data.subject)}
                                    </p>
                                    <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">
                                        {fill(form.data.message)}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={send}
                                    disabled={
                                        form.processing ||
                                        !form.data.member_ids.length ||
                                        !form.data.message ||
                                        !form.data.channels.length
                                    }
                                    className="btn-primary text-sm disabled:opacity-50"
                                >
                                    <Icon name="PaperAirplaneIcon" size={16} />
                                    {form.processing
                                        ? 'Sending…'
                                        : `Send to ${form.data.member_ids.length || 0} member${form.data.member_ids.length === 1 ? '' : 's'}`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="border-b border-border px-5 py-4">
                    <h2 className="section-header">Sent messages</h2>
                </div>
                {history.data.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">
                        No messages sent yet.
                    </p>
                ) : (
                    <div className="divide-y divide-border">
                        {history.data.map((h) => (
                            <div
                                key={h.id}
                                className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4"
                            >
                                <div className="w-48 shrink-0">
                                    <p className="text-sm font-medium text-foreground">
                                        {h.member_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {OCCASION_ICON[h.occasion] ?? '✨'}{' '}
                                        {h.occasion}
                                    </p>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {h.subject}
                                    </p>
                                    <ReadMore text={h.message} limit={140} />
                                </div>
                                <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                                    <p>
                                        {new Date(h.created_at).toLocaleString(
                                            'en-US',
                                            {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            },
                                        )}
                                    </p>
                                    <p>
                                        {h.channels.includes('in_app') &&
                                            'Portal'}
                                        {h.channels.includes('in_app') &&
                                            h.channels.includes('email') &&
                                            ' + '}
                                        {h.channels.includes('email') && (
                                            <span
                                                className={
                                                    h.email_status === 'sent'
                                                        ? 'text-success'
                                                        : 'text-warning'
                                                }
                                            >
                                                Email{' '}
                                                {h.email_status === 'sent'
                                                    ? '✓'
                                                    : h.email_status ===
                                                        'no_email'
                                                      ? '(no address)'
                                                      : h.email_status ===
                                                          'failed'
                                                        ? '(failed)'
                                                        : ''}
                                            </span>
                                        )}
                                    </p>
                                    {h.sent_by && <p>by {h.sent_by}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <ServerPaginator meta={history} />
            </div>
        </div>
    );
}
