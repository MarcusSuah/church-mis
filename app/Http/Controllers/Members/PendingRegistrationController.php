<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Review queue for members who signed up through a registration form
 * (public form or member portal) — anything with a reg_ref.
 */
class PendingRegistrationController extends Controller
{
    public const TABS = ['All', 'Pending', 'Under Review', 'Approved', 'Rejected'];

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status', 'Pending')->toString();
        $status = in_array($status, self::TABS, true) ? $status : 'Pending';

        $registrations = Member::registrations()
            ->whereIn('status', array_slice(self::TABS, 1))
            ->when($status !== 'All', fn (Builder $q) => $q->where('status', $status))
            ->when($search !== '', fn (Builder $query) => $query->search($search))
            ->orderByRaw("CASE status WHEN 'Pending' THEN 0 WHEN 'Under Review' THEN 1 ELSE 2 END")
            ->latest('created_at')
            ->limit(200)
            ->get();

        $counts = Member::registrations()
            ->whereIn('status', array_slice(self::TABS, 1))
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        return Inertia::render('pending-registrations/index', [
            'registrations' => $registrations,
            'filters' => ['search' => $search !== '' ? $search : null, 'status' => $status],
            'counts' => [
                'All' => (int) $counts->sum(),
                ...collect(array_slice(self::TABS, 1))->mapWithKeys(fn ($s) => [$s => (int) ($counts[$s] ?? 0)])->all(),
            ],
            'can' => MemberController::abilities($request),
        ]);
    }
}
