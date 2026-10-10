import { fmtMoney } from '@/lib/finance';
export type PortalMember = {
    id: string;
    member_id: string | null;
    reg_ref: string | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    initials: string;
    email: string | null;
    phone: string | null;
    alt_phone: string | null;
    photo_url: string | null;
    gender: string | null;
    marital_status: string | null;
    nationality: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    occupation: string | null;
    employer: string | null;
    membership_type: string | null;
    department: string | null;
    ministry: string | null;
    baptized: boolean;
    baptism_date: string | null;
    status: string;
    date_of_birth: string | null;
    date_joined: string | null;
    emergency_name: string | null;
    emergency_phone: string | null;
    emergency_relation: string | null;
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
    attendance: {
        id: string;
        service: string;
        date: string | null;
        time: string | null;
        status: string;
    }[];
    giving: {
        id: string;
        date: string | null;
        type: string;
        fund: string | null;
        method: string | null;
        amount: number;
        receipt: string | null;
    }[];
    prayer_requests: {
        id: string;
        subject: string | null;
        request: string;
        category: string;
        status: string;
        is_private: boolean;
        assigned_to: string | null;
        response: string | null;
        created_at: string | null;
    }[];
    document_requests: {
        id: string;
        document_type: string;
        notes: string | null;
        status: string;
        staff_note: string | null;
        download_url: string | null;
        created_at: string | null;
    }[];
    /** Approved certificates/letters ready to download (PDF). */
    issued_documents: {
        id: string;
        name: string;
        type: string;
        date: string | null;
        url: string;
    }[];
    announcements: {
        id: string;
        title: string;
        body: string;
        category: string | null;
        urgent: boolean;
        date: string | null;
    }[];
    events: {
        id: string;
        title: string;
        start: string | null;
        location: string | null;
        category: string | null;
    }[];
};

export type PortalOptions = {
    prayer_categories: string[];
    document_types: string[];
};

export type PortalTab =
    | 'overview'
    | 'profile'
    | 'attendance'
    | 'giving'
    | 'prayer'
    | 'documents';

/** "$3,240" — whole amounts without cents, like the reference design. */
export function money(amount: number, currency: string): string {
    return fmtMoney(amount, currency);
}
