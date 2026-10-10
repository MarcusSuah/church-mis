<?php

namespace App\Http\Controllers\Members;

use App\Http\Controllers\Controller;
use App\Models\Member;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Type-ahead member search for "link to member" pickers (Phase 3, F07).
 *
 * Replaces sending every member to the browser with each tithe, offering,
 * baptism, wedding, funeral and pastoral care page. Returns at most 20
 * matches with only the fields a picker shows. Staff only.
 */
class MemberLookupController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_if($user->isMemberOnly() || $user->getRoleNames()->isEmpty(), 403);

        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'id' => ['nullable', 'uuid'],
        ]);

        $query = Member::query()->select(['id', 'member_id', 'first_name', 'last_name', 'photo_url', 'status']);

        $results = ! empty($data['id'])
            ? $query->whereKey($data['id'])->limit(1)->get()
            : (filled($data['q'] ?? null)
                ? $query->search($data['q'])->orderBy('last_name')->orderBy('first_name')->limit(20)->get()
                : collect());

        return response()->json([
            'data' => $results->map(fn (Member $m) => [
                'id' => $m->id,
                'name' => $m->full_name,
                'member_code' => $m->member_id,
                'photo_url' => $m->photo_url,
                'status' => $m->status,
            ])->values(),
        ]);
    }
}
