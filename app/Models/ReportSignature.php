<?php

namespace App\Models;

use App\Enums\Role as RoleEnum;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class ReportSignature extends Model
{
    /** position key => label. */
    public const POSITIONS = [
        'secretary' => 'Church Secretary',
        'treasurer' => 'Church Treasurer',
        'finance_committee' => 'Finance Committee',
        'pastor' => 'Pastor',
        'board' => 'Church Board',
    ];

    /**
     * The roles that may sign each position. A Pastor signs only the Pastor
     * line, a Finance Officer only the Treasurer or Finance Committee line,
     * and so on. Nobody else (not even a Superadmin) can sign for them.
     *
     * @var array<string, list<RoleEnum>>
     */
    public const POSITION_ROLES = [
        'secretary' => [RoleEnum::ADMIN],
        'treasurer' => [RoleEnum::FINANCEOFFICER],
        'finance_committee' => [RoleEnum::FINANCEOFFICER],
        'pastor' => [RoleEnum::PASTOR],
        'board' => [RoleEnum::SUPERVISOR],
    ];

    /** Whether this user's role lets them sign this position. */
    public static function roleCanSign(?User $user, string $position): bool
    {
        $roles = array_map(fn (RoleEnum $r) => $r->value, self::POSITION_ROLES[$position] ?? []);

        return $user !== null && $roles !== [] && $user->hasAnyRole($roles);
    }

    protected $fillable = [
        'report_type', 'period_from', 'period_to', 'position', 'user_id',
        'signer_name', 'signature_path', 'data_hash', 'signed_at', 'ip',
    ];

    protected function casts(): array
    {
        return [
            'period_from' => 'date:Y-m-d',
            'period_to' => 'date:Y-m-d',
            'signed_at' => 'datetime',
        ];
    }

    /**
     * Fingerprint of the report figures. Call it with the report array you already build
     * (summary + sections); generated_at is deliberately excluded so it stays stable.
     */
    public static function fingerprint(array $report): string
    {
        return hash('sha256', json_encode([
            'summary' => $report['summary'] ?? [],
            'sections' => $report['sections'] ?? [],
        ]));
    }

    /** Data the Reports page expects in the `approvals` prop. */
    public static function approvalsFor(string $type, string $from, string $to, ?User $viewer, string $currentHash): array
    {
        $signed = static::query()
            ->where('report_type', $type)
            ->whereDate('period_from', $from)
            ->whereDate('period_to', $to)
            ->get()
            ->keyBy('position');
        // One position per person per report: someone who signed already can't sign another line.
        $viewerSigned = $viewer !== null && $signed->contains('user_id', $viewer->id);

        $signatories = [];
        foreach (self::POSITIONS as $key => $label) {
            $s = $signed->get($key);
            $signatories[] = [
                'position_key' => $key,
                'position' => $label,
                'roles' => array_map(fn (RoleEnum $r) => $r->value, self::POSITION_ROLES[$key]),
                'name' => $s?->signer_name,
                'signature_url' => $s ? route('reports.signatures.image', $s) : null,
                'signed_at' => $s?->signed_at?->toIso8601String(),
                'status' => $s ? 'signed' : 'pending',
                'stale' => $s ? ! hash_equals($s->data_hash, $currentHash) : false,
                'can_sign' => ! $s && ! $viewerSigned && self::roleCanSign($viewer, $key),
            ];
        }

        return ['signatories' => $signatories];
    }

    /** For embedding in the server-rendered PDF. */
    public function dataUri(): ?string
    {
        $disk = Storage::disk('local');
        if (! $disk->exists($this->signature_path)) {
            return null;
        }

        return 'data:image/png;base64,'.base64_encode($disk->get($this->signature_path));
    }
}
