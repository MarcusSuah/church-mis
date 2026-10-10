<?php

namespace App\Console\Commands;

use App\Enums\Role as RoleEnum;
use App\Models\Member;
use App\Models\User;
use App\Support\MemberAccounts;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Member logins (Phase 2 — F01: no shared default password).
 *
 *   php artisan members:accounts                       # create logins for approved members, email each a set-password link
 *   php artisan members:accounts --dry-run             # only list what would happen
 *   php artisan members:accounts --reset=a@b.com       # email one user a fresh set-password link
 *   php artisan members:accounts --retire-default="OLD_DEFAULT_PASSWORD"
 *       # every account still using the old shared password gets a random
 *       # password, is signed out everywhere, and is emailed a set-password link
 */
class MemberAccountsCommand extends Command
{
    protected $signature = 'members:accounts
        {--dry-run : Only list what would happen}
        {--reset= : Email of a user who should get a new set-password link}
        {--retire-default= : The old shared default password; accounts still using it are locked and re-invited}';

    protected $description = 'Create logins for approved members, send set-password links, or retire the old shared default password';

    public function handle(): int
    {
        if ($email = $this->option('reset')) {
            return $this->resetOne(trim((string) $email));
        }

        if (filled($this->option('retire-default'))) {
            return $this->retireDefault((string) $this->option('retire-default'));
        }

        return $this->createMissing();
    }

    private function resetOne(string $email): int
    {
        $user = User::where('email', $email)->first();
        if (! $user) {
            $this->error("No user with email {$email}.");

            return self::FAILURE;
        }

        if ($this->option('dry-run')) {
            $this->info("Would email a set-password link to {$user->email}.");

            return self::SUCCESS;
        }

        if (! MemberAccounts::invite($user)) {
            $this->error('The email could not be sent. Check the MAIL_* settings and storage/logs/laravel.log.');

            return self::FAILURE;
        }
        $this->info("A set-password link was emailed to {$user->email}.");

        return self::SUCCESS;
    }

    private function retireDefault(string $legacy): int
    {
        $dry = (bool) $this->option('dry-run');
        $found = 0;
        $emailed = 0;

        User::query()->select(['id', 'name', 'email', 'password'])->orderBy('id')
            ->chunkById(200, function ($users) use ($legacy, $dry, &$found, &$emailed) {
                foreach ($users as $user) {
                    if (! Hash::check($legacy, (string) $user->password)) {
                        continue;
                    }
                    $found++;
                    $this->line(($dry ? 'Would lock ' : 'Locked ').$user->email);
                    if ($dry) {
                        continue;
                    }

                    $user->forceFill([
                        'password' => Str::password(48),
                        'remember_token' => Str::random(60),
                        'must_change_credentials' => false,
                    ])->save();

                    if (config('session.driver') === 'database') {
                        DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
                    }

                    $emailed += MemberAccounts::invite($user) ? 1 : 0;
                }
            });

        $this->info($dry
            ? "{$found} account(s) still use the old default password."
            : "{$found} account(s) locked; {$emailed} set-password email(s) sent.");

        if (! $dry && $emailed < $found) {
            $this->warn('Some emails failed. Those users can use "Forgot password" on the sign-in page, or run --reset=their@email later.');
        }

        return self::SUCCESS;
    }

    private function createMissing(): int
    {
        $dry = (bool) $this->option('dry-run');

        $members = Member::whereNull('user_id')
            ->whereNotNull('email')->where('email', '!=', '')
            ->whereIn('status', Member::ACCEPTED)
            ->get();

        if ($members->isEmpty()) {
            $this->info('Every approved member with an email already has a login.');
        }

        $rows = [];
        foreach ($members as $member) {
            $existing = User::withTrashed()->where('email', $member->email)->first();
            $plan = match (true) {
                ! $existing => 'new login + set-password email',
                MemberAccounts::canLinkTo($existing) => 'linked to existing member login',
                default => 'SKIPPED: email belongs to a staff, deleted or already-linked login',
            };

            if (! $dry) {
                MemberAccounts::ensureFor($member);
            }
            $rows[] = [$member->full_name, $member->email, $plan];
        }

        if ($rows) {
            $this->table(['Member', 'Email', $dry ? 'Would get' : 'Result'], $rows);
        }

        // Linked accounts with no role at all get the Member role.
        if (! $dry) {
            User::whereIn('id', Member::whereNotNull('user_id')->pluck('user_id'))
                ->whereDoesntHave('roles')
                ->each(fn (User $u) => $u->assignRole(RoleEnum::MEMBER->value));
        }

        $pending = Member::whereNull('user_id')->whereNotIn('status', Member::ACCEPTED)->count();
        if ($pending) {
            $this->line("{$pending} member(s) are not approved yet; they get a login when staff approve them.");
        }

        $noEmail = Member::whereNull('user_id')->whereIn('status', Member::ACCEPTED)
            ->where(fn ($q) => $q->whereNull('email')->orWhere('email', ''))->count();
        if ($noEmail) {
            $this->warn("{$noEmail} approved member(s) have no email address, so no login could be made.");
        }

        return self::SUCCESS;
    }
}
