<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

use App\Models\AttendanceRecord;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Member;
use App\Models\Offering;
use App\Models\PastoralCare;
use App\Models\PrayerRequest;
use App\Models\Tithe;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Single-action controller for the home dashboard. Replaces the original
 * Laravel starter kit's empty placeholder page with real church data.
 */
class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $monthStart = now()->startOfMonth();

        $givingThisMonth = (float) (
            Tithe::where('tithe_date', '>=', $monthStart)->sum('amount')
            + Offering::where('offering_date', '>=', $monthStart)->sum('amount')
            + Donation::where('donation_date', '>=', $monthStart)->sum('amount')
        );

        $recentActivity = collect()
            ->concat(
                Member::latest('created_at')->take(5)->get()->map(fn ($m) => [
                    'type' => 'member', 'label' => "{$m->full_name} joined as a member",
                    'date' => $m->created_at,
                ])
            )
            ->concat(
                Event::latest('created_at')->take(5)->get()->map(fn ($e) => [
                    'type' => 'event', 'label' => "Event scheduled: {$e->title}",
                    'date' => $e->created_at,
                ])
            )
            ->sortByDesc('date')
            ->take(6)
            ->values();

        return Inertia::render('dashboard', [
            'stats' => [
                'total_members' => Member::count(),
                'pending_registrations' => Member::whereIn('status', ['Pending', 'Under Review'])->count(),
                'giving_this_month' => $givingThisMonth,
                'upcoming_events' => Event::where('status', 'Upcoming')->count(),
            ],
            'attention' => [
                'pending_registrations' => Member::whereIn('status', ['Pending', 'Under Review'])->count(),
                'urgent_prayer_requests' => PrayerRequest::where('is_urgent', true)->where('status', 'Active')->count(),
                'open_pastoral_cases' => PastoralCare::where('status', 'Open')->count(),
                'expenses_pending_approval' => Expense::where('status', 'Pending')->count(),
            ],
            'attendanceThisWeek' => AttendanceRecord::whereHas(
                'session',
                fn ($q) => $q->where('service_date', '>=', now()->subDays(7))
            )->where('attendance_status', 'present')->count(),
            'recentActivity' => $recentActivity,
        ]);
    }
}
