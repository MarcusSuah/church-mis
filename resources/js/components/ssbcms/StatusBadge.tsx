import React from 'react';

type StatusType =
    | 'Pending'
    | 'Under Review'
    | 'Approved'
    | 'Active'
    | 'Rejected'
    | 'Suspended'
    | 'Inactive'
    | 'Transferred'
    | 'Deceased'
    | 'Draft'
    | 'Published'
    | 'Scheduled'
    | 'Archived'
    | 'New'
    | 'In Prayer'
    | 'Answered'
    | 'Closed'
    | 'Assigned'
    | 'Open'
    | 'Completed'
    | 'Cancelled'
    | string;

interface StatusBadgeProps {
    status: StatusType;
    size?: 'sm' | 'md';
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> =
    {
        Pending: {
            bg: 'bg-warning/10',
            text: 'text-warning',
            dot: 'bg-warning',
        },
        'Under Review': { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
        Approved: {
            bg: 'bg-success/10',
            text: 'text-success',
            dot: 'bg-success',
        },
        Active: {
            bg: 'bg-success/10',
            text: 'text-success',
            dot: 'bg-success',
        },
        Rejected: { bg: 'bg-danger/10', text: 'text-danger', dot: 'bg-danger' },
        Suspended: {
            bg: 'bg-danger/10',
            text: 'text-danger',
            dot: 'bg-danger',
        },
        Inactive: {
            bg: 'bg-muted',
            text: 'text-muted-foreground',
            dot: 'bg-muted-foreground',
        },
        Transferred: {
            bg: 'bg-secondary',
            text: 'text-secondary-foreground',
            dot: 'bg-secondary-foreground',
        },
        Deceased: {
            bg: 'bg-muted',
            text: 'text-muted-foreground',
            dot: 'bg-muted-foreground',
        },
        Draft: {
            bg: 'bg-muted',
            text: 'text-muted-foreground',
            dot: 'bg-muted-foreground',
        },
        Published: {
            bg: 'bg-success/10',
            text: 'text-success',
            dot: 'bg-success',
        },
        Scheduled: { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
        Archived: {
            bg: 'bg-muted',
            text: 'text-muted-foreground',
            dot: 'bg-muted-foreground',
        },
        New: { bg: 'bg-accent/10', text: 'text-accent', dot: 'bg-accent' },
        'In Prayer': { bg: 'bg-info/10', text: 'text-info', dot: 'bg-info' },
        Answered: {
            bg: 'bg-success/10',
            text: 'text-success',
            dot: 'bg-success',
        },
        Closed: {
            bg: 'bg-muted',
            text: 'text-muted-foreground',
            dot: 'bg-muted-foreground',
        },
        Assigned: {
            bg: 'bg-secondary',
            text: 'text-secondary-foreground',
            dot: 'bg-secondary-foreground',
        },
        Open: { bg: 'bg-warning/10', text: 'text-warning', dot: 'bg-warning' },
        Completed: {
            bg: 'bg-success/10',
            text: 'text-success',
            dot: 'bg-success',
        },
        Cancelled: {
            bg: 'bg-danger/10',
            text: 'text-danger',
            dot: 'bg-danger',
        },
        Available: {
            bg: 'bg-success/10',
            text: 'text-success',
            dot: 'bg-success',
        },
        Ready: { bg: 'bg-success/10', text: 'text-success', dot: 'bg-success' },
        Collected: {
            bg: 'bg-muted',
            text: 'text-muted-foreground',
            dot: 'bg-muted-foreground',
        },
    };

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
    const config = statusConfig[status] || {
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        dot: 'bg-muted-foreground',
    };
    const sizeClass =
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';

    return (
        <span
            className={`status-badge ${config.bg} ${config.text} ${sizeClass} font-semibold`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${config.dot} mr-1.5 inline-block`}
            />
            {status}
        </span>
    );
}
