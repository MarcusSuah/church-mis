// Data contract between the Laravel report controller and the Reports page.
// Every dataset is OPTIONAL: if the backend does not send it, that block is simply not rendered
// (nothing is ever invented client-side). All money values are numbers in the church base currency.
export type ChartDatum = { label: string; value: number };

export type ReportCharts = {
    // Membership
    membership_growth?: { label: string; members: number }[];
    gender?: ChartDatum[];
    age_groups?: ChartDatum[];
    departments?: ChartDatum[];
    attendance_trend?: { label: string; attendance: number }[];
    // Financial
    income_by_category?: ChartDatum[];
    expense_by_category?: ChartDatum[];
    monthly_financials?: { label: string; income: number; expense: number }[];
    budget_vs_actual?: { label: string; budget: number; actual: number }[];
    // Further charts for any report type (sacraments, ministry, events, attendance…), drawn generically.
    extra?: ExtraChart[];
};

/** One generic chart (App\Services\ReportDatasets::chart()). Each row has a `label` plus one value per series key. */
export type ExtraChart = {
    key: string;
    title: string;
    kind: 'donut' | 'bars' | 'lines' | 'area';
    data: Record<string, string | number>[];
    series: { key: string; name: string }[];
    money: boolean;
    horizontal: boolean;
    stacked: boolean;
};

export type LedgerRow = {
    date: string; // YYYY-MM-DD
    ref: string;
    description: string;
    income: number;
    expense: number;
    balance: number; // running balance, computed on the backend
};

export type Ledger = {
    opening_balance: number;
    closing_balance: number;
    total_income: number;
    total_expense: number;
    /** Rows are totals per day, or per month for periods longer than about a quarter. */
    grouping?: 'day' | 'month';
    rows: LedgerRow[];
};

export type Signatory = {
    position_key: string;
    position: string;
    /** Roles allowed to sign this position (ReportSignature::POSITION_ROLES). */
    roles?: string[];
    name: string | null;
    signature_url: string | null;
    signed_at: string | null; // ISO timestamp
    status: 'pending' | 'signed';
    stale: boolean; // report figures changed after this signature was given
    can_sign: boolean; // current user has the permission AND the slot is still open
};

export type Approvals = { signatories: Signatory[] };

// Shared Inertia prop `church` (Church Settings). Missing fields are simply not shown.
export type ChurchInfo = {
    name?: string;
    logo_url?: string | null;
    denomination?: string | null;
    branch?: string | null;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
};
