<?php

namespace App\Observers;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

/**
 * Writes a row to audit_logs whenever a watched record is created,
 * updated or deleted (who, when, from where, old → new values).
 */
class AuditObserver
{
    /** Model class => module shown on the Audit Logs page. */
    public const MODULES = [
        \App\Models\Member::class => 'Members',
        \App\Models\Family::class => 'Members',
        \App\Models\Tithe::class => 'Finance',
        \App\Models\Offering::class => 'Finance',
        \App\Models\Donation::class => 'Finance',
        \App\Models\Expense::class => 'Finance',
        \App\Models\Budget::class => 'Finance',
        \App\Models\FinanceFund::class => 'Finance',
        \App\Models\Event::class => 'Events',
        \App\Models\Announcement::class => 'Content',
        \App\Models\Document::class => 'Content',
        \App\Models\Sermon::class => 'Sermons',
        \App\Models\PrayerRequest::class => 'Prayer',
        \App\Models\PastoralCare::class => 'Prayer',
        \App\Models\Baptism::class => 'Sacraments',
        \App\Models\Communion::class => 'Sacraments',
        \App\Models\Wedding::class => 'Sacraments',
        \App\Models\Funeral::class => 'Sacraments',
        \App\Models\DocumentRequest::class => 'Sacraments',
        \App\Models\AttendanceSession::class => 'Attendance',
        \App\Models\User::class => 'System',
    ];

    /** Never copied into the log. */
    private const HIDDEN = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes', 'updated_at', 'created_at'];

    /**
     * F04: free-text pastoral content. The log records THAT these changed,
     * never what they say, so audit-log readers don't see counselling notes.
     */
    private const REDACTED = [
        \App\Models\PastoralCare::class => ['description', 'notes', 'outcome', 'care_type'],
        \App\Models\PrayerRequest::class => ['request_details', 'notes', 'response', 'subject'],
    ];

    public function created(Model $m): void
    {
        $this->write('CREATE', $m, null, $this->clean($m->getAttributes(), $m));
    }

    public function updated(Model $m): void
    {
        $changes = $this->clean($m->getChanges(), $m);
        if (! $changes) {
            return;
        }
        $old = array_intersect_key($this->clean($m->getOriginal(), $m), $changes);
        $this->write('UPDATE', $m, $old, $changes);
    }

    public function deleted(Model $m): void
    {
        $this->write('DELETE', $m, $this->clean($m->getAttributes(), $m), null);
    }

    private function write(string $action, Model $m, ?array $old, ?array $new): void
    {
        try {
            $user = auth()->user();
            $req = request();
            $label = $this->label($m);
            $module = self::MODULES[$m::class] ?? 'System';
            $type = str(class_basename($m))->headline()->lower();
            $verb = ['CREATE' => 'created', 'UPDATE' => 'updated', 'DELETE' => 'deleted'][$action];

            AuditLog::create([
                'action' => $action,
                'table_name' => $m->getTable(),
                'record_id' => is_string($m->getKey()) && strlen($m->getKey()) === 36 ? $m->getKey() : null,
                'old_values' => $old,
                'new_values' => $new,
                'performed_by' => $user?->email ?? 'system',
                'performed_by_name' => $user?->name ?? 'System',
                'performed_by_role' => $user?->getRoleNames()->first() ?? 'system',
                'ip_address' => $req?->ip(),
                'user_agent' => $req ? mb_substr((string) $req->userAgent(), 0, 255) : null,
                'module' => $module,
                'description' => ucfirst(trim("{$type} {$label} {$verb}"))
                    .($action === 'UPDATE' ? ' — '.implode(', ', array_keys($new)) : ''),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log failed', ['error' => $e->getMessage()]);
        }
    }

    private function label(Model $m): string
    {
        // Pastoral records are described without the person's name (F04).
        if (isset(self::REDACTED[$m::class])) {
            return '';
        }

        foreach (['full_name', 'title', 'name', 'candidate_name', 'deceased_name', 'member_name', 'donor_name', 'service_name', 'category', 'document_type'] as $f) {
            $v = $f === 'full_name' ? ($m->first_name ?? null ? trim("{$m->first_name} {$m->last_name}") : null) : $m->getAttribute($f);
            if (is_scalar($v) && $v !== '') {
                return '"'.mb_substr((string) $v, 0, 60).'"';
            }
            if ($v instanceof \BackedEnum) {
                return '"'.$v->value.'"';
            }
        }

        return '';
    }

    private function clean(array $attrs, Model $m): array
    {
        $attrs = array_diff_key($attrs, array_flip(self::HIDDEN));

        $redact = self::REDACTED[$m::class] ?? [];
        if ($m instanceof \App\Models\PastoralCare && $m->is_confidential) {
            $redact = [...$redact, 'member_name', 'member_id', 'location'];
        }
        foreach ($redact as $field) {
            if (array_key_exists($field, $attrs) && filled($attrs[$field])) {
                $attrs[$field] = '[redacted]';
            }
        }

        return array_map(fn ($v) => is_string($v) && mb_strlen($v) > 300 ? mb_substr($v, 0, 300).'…' : $v, $attrs);
    }
}
