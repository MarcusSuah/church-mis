import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton
                        key={`dash-skel-${i + 1}`}
                        className={`h-32 ${i === 0 ? 'md:col-span-2' : ''}`}
                    />
                ))}
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Skeleton className="h-72 lg:col-span-2" />
                <Skeleton className="h-72" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
        </div>
    );
}

export function TableSkeleton({
    rows = 8,
    cols = 6,
}: {
    rows?: number;
    cols?: number;
}) {
    return (
        <div className="space-y-3">
            <div className="mb-4 flex gap-3">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div className="overflow-hidden rounded-xl border border-border">
                <div className="flex gap-4 bg-muted/50 px-4 py-3">
                    {Array.from({ length: cols }).map((_, i) => (
                        <Skeleton
                            key={`th-skel-${i + 1}`}
                            className="h-4 flex-1"
                        />
                    ))}
                </div>
                {Array.from({ length: rows }).map((_, i) => (
                    <div
                        key={`tr-skel-${i + 1}`}
                        className="flex gap-4 border-t border-border px-4 py-3"
                    >
                        {Array.from({ length: cols }).map((_, j) => (
                            <Skeleton
                                key={`td-skel-${i + 1}-${j + 1}`}
                                className="h-4 flex-1"
                            />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}
