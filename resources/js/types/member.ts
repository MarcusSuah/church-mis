export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};

export const MEMBER_STATUSES = [
    'Pending',
    'Under Review',
    'Approved',
    'Active',
    'Suspended',
    'Inactive',
    'Rejected',
] as const;

export type MemberStatus =
    | 'Pending'
    | 'Under Review'
    | 'Approved'
    | 'Active'
    | 'Suspended'
    | 'Inactive'
    | 'Rejected';

export type Member = {
    id: string;
    user_id: number | null;
    member_id: string | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    initials: string;
    gender: string | null;
    date_of_birth: string | null;
    marital_status: string | null;
    nationality: string | null;
    email: string | null;
    phone: string | null;
    alt_phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    photo_url: string | null;
    department: string | null;
    ministry: string | null;
    status: MemberStatus;
    membership_type: string | null;
    date_joined: string | null;
    baptized: boolean;
    baptism_date: string | null;
    communion_participant: boolean;
    previous_church: string | null;
    previous_denomination: string | null;
    occupation: string | null;
    employer: string | null;
    emergency_name: string | null;
    emergency_phone: string | null;
    emergency_relation: string | null;
    family: MemberFamily | null;
    skills: string | null;
    interests: string | null;
    notes: string | null;
    reg_ref: string | null;
    reviewed_at: string | null;
    created_at: string;
};

export type MemberFamily = {
    spouse_name?: string | null;
    spouse_is_member?: boolean | null;
    children?: { name: string; date_of_birth?: string | null }[];
};

export type MemberFilters = {
    search: string | null;
    status: string;
    department: string | null;
    membership_type: string | null;
    baptized: 'yes' | 'no' | null;
    sort_col: string;
    sort_dir: 'asc' | 'desc';
    per_page: number;
};

export type MemberStats = {
    total: number;
    pending: number;
    under_review: number;
    active: number;
    inactive: number;
};

export type MemberAbilities = {
    create: boolean;
    update: boolean;
    delete: boolean;
};

/** Shared lists for department / ministry / classification pickers. */
export const DEPARTMENTS = [
    'Administration',
    'Finance',
    'Christian Education',
    'Evangelism',
    'Worship',
    'Music',
    'Youth',
    "Women's Ministry",
    "Men's Ministry",
    "Children's Ministry",
    'Ushers',
    'Hospitality',
    'Media',
    'Prayer',
    'Sunday School',
    'Outreach',
    'Welfare',
    'Membership',
];

export const MINISTRIES = [
    'Choir',
    'Praise Team',
    'Ushers',
    'Sunday School Teachers',
    'Youth Leaders',
    'Evangelism Team',
    'Prayer Warriors',
    'Media Team',
    'Welcome Team',
];

export const MEMBERSHIP_TYPES = [
    'Regular Member',
    'Associate Member',
    'Honorary Member',
    'Candidate Member',
    'Junior Member',
    'Transfer Member',
];

export type PrayerRequest = {
    id: string;
    category: string;
    request: string;
    is_private: boolean;
    status: string;
    assigned_to: string | null;
    response: string | null;
    created_at: string;
    updated_at: string;
};

export type DocumentRequest = {
    id: string;
    document_type: string;
    notes: string | null;
    status: string;
    staff_note: string | null;
    created_at: string;
    updated_at: string;
};

export type AttendanceRecord = {
    id: string;
    service_name: string;
    service_date: string;
    service_time: string | null;
    present: boolean;
};

export type Contribution = {
    id: string;
    contributed_on: string;
    type: string;
    fund: string | null;
    method: string | null;
    amount: string;
    receipt_no: string | null;
};

export type Announcement = {
    id: string;
    title: string;
    body: string;
    category: string | null;
    is_urgent: boolean;
    published_at: string;
};

export type ChurchEvent = {
    id: string;
    title: string;
    starts_at: string;
    location: string | null;
    category: string | null;
};

export type PortalData = {
    stats: {
        years: number | null;
        attendance_present: number;
        attendance_total: number;
        attendance_rate: number | null;
        giving_ytd: number;
        giving_ytd_tithes: number;
        giving_ytd_other: number;
        giving_30_days: number;
    };
    attendance: AttendanceRecord[];
    giving: Contribution[];
    prayer_requests: PrayerRequest[];
    document_requests: DocumentRequest[];
    certificates: { membership: boolean; baptism: boolean };
    announcements: Announcement[];
    events: ChurchEvent[];
};
