<?php

namespace App\Contracts;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * Implemented by any "group" model (Department, Ministry, Board, Committee)
 * that has a member roster through a role-carrying pivot table, so
 * GroupMembershipService can operate on all four generically.
 */
interface HasGroupMembers
{
    public function members(): BelongsToMany;
}
