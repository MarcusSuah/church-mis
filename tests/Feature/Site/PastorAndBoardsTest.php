<?php

use App\Enums\LeadershipRole;
use App\Models\Board;
use App\Models\ChurchLeadership;
use App\Models\Member;
use Inertia\Testing\AssertableInertia as Assert;

test('the home page names the active Senior Pastor under "A word from our pastor"', function () {
    ChurchLeadership::create(['first_name' => 'Old', 'last_name' => 'Pastor', 'title' => 'Senior Pastor', 'leadership_role' => LeadershipRole::SeniorPastor, 'is_active' => false]);
    ChurchLeadership::create(['first_name' => 'Esther', 'last_name' => 'Kpoto', 'title' => 'Associate Pastor', 'leadership_role' => LeadershipRole::AssociatePastor, 'is_active' => true]);
    ChurchLeadership::create(['first_name' => 'Samuel', 'last_name' => 'Kollie', 'title' => 'Senior Pastor', 'leadership_role' => LeadershipRole::SeniorPastor, 'is_active' => true]);

    $this->get('/')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('pastor.name', 'Samuel Kollie')
        ->where('pastor.title', 'Senior Pastor')
        ->where('pastor.href', route('site.leadership.show', 'samuel-kollie')));
});

test('the home page has no pastor when no active Senior Pastor is set up', function () {
    ChurchLeadership::create(['first_name' => 'Esther', 'last_name' => 'Kpoto', 'title' => 'Associate Pastor', 'leadership_role' => LeadershipRole::AssociatePastor, 'is_active' => true]);

    $this->get('/')->assertInertia(fn (Assert $p) => $p->where('pastor', null));
});

test('the leadership page lists the current, active members of active boards only', function () {
    $trustees = Board::create(['name' => 'Board of Trustees', 'board_type' => 'Trustees', 'is_active' => true]);
    $closed = Board::create(['name' => 'Old Board', 'board_type' => 'Other', 'is_active' => false]);
    $current = Member::create(['first_name' => 'Henry', 'last_name' => 'Mensah', 'status' => 'Active']);
    $formerTerm = Member::create(['first_name' => 'Past', 'last_name' => 'Term', 'status' => 'Active']);
    $inactive = Member::create(['first_name' => 'Gone', 'last_name' => 'Away', 'status' => 'Inactive']);

    $trustees->memberships()->create(['member_id' => $current->id, 'role' => 'Chairperson']);
    $trustees->memberships()->create(['member_id' => $formerTerm->id, 'role' => 'Member', 'term_end' => now()->subMonth()->toDateString()]);
    $trustees->memberships()->create(['member_id' => $inactive->id, 'role' => 'Member']);
    $closed->memberships()->create(['member_id' => $current->id, 'role' => 'Member']);

    $this->get('/church/leadership')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->has('boards', 1)
        ->where('boards.0.title', 'Board of Trustees')
        ->where('boards.0.members', fn ($members) => collect($members)->pluck('title')->all() === ['Henry Mensah']));
});
