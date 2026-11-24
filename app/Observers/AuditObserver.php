<?php

namespace App\Observers;

use App\Models\Announcement;
use App\Models\AttendanceSession;
use App\Models\AuditLog;
use App\Models\Baptism;
use App\Models\Belief;
use App\Models\BlockedIp;
use App\Models\Board;
use App\Models\BoardMember;
use App\Models\Budget;
use App\Models\ChurchLeadership;
use App\Models\ChurchSetting;
use App\Models\Committee;
use App\Models\CommitteeMember;
use App\Models\Communion;
use App\Models\CommunionParticipant;
use App\Models\ContactMessage;
use App\Models\ContactMessageReply;
use App\Models\Contribution;
use App\Models\Department;
use App\Models\DepartmentActivity;
use App\Models\DepartmentMember;
use App\Models\Document;
use App\Models\DocumentRequest;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\FinanceFund;
use App\Models\Funeral;
use App\Models\GalleryAlbum;
use App\Models\GalleryPhoto;
use App\Models\HeroSlide;
use App\Models\Leader;
use App\Models\Member;
use App\Models\MemberMessage;
use App\Models\Ministry;
use App\Models\MinistryMember;
use App\Models\Offering;
use App\Models\PastoralCare;
use App\Models\Permission;
use App\Models\PrayerRequest;
use App\Models\ReportSignature;
use App\Models\Role;
use App\Models\Sermon;
use App\Models\SitePage;
use App\Models\Tithe;
use App\Models\User;
use App\Models\Wedding;
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
        Member::class => 'Members',
        Family::class => 'Members',
        Tithe::class => 'Finance',
        Offering::class => 'Finance',
        Donation::class => 'Finance',
        Expense::class => 'Finance',
        Budget::class => 'Finance',
        Contribution::class => 'Finance',
        FinanceFund::class => 'Finance',
        Event::class => 'Events',
        Announcement::class => 'Content',
        Document::class => 'Content',
        Sermon::class => 'Sermons',
        PrayerRequest::class => 'Prayer',
        PastoralCare::class => 'Prayer',
        Baptism::class => 'Sacraments',
        Communion::class => 'Sacraments',
        CommunionParticipant::class => 'Sacraments',
        Wedding::class => 'Sacraments',
        Funeral::class => 'Sacraments',
        DocumentRequest::class => 'Sacraments',
        AttendanceSession::class => 'Attendance',
        FamilyMember::class => 'Members',
        Department::class => 'Church Structure',
        DepartmentMember::class => 'Church Structure',
        DepartmentActivity::class => 'Church Structure',
        Ministry::class => 'Church Structure',
        MinistryMember::class => 'Church Structure',
        Board::class => 'Church Structure',
        BoardMember::class => 'Church Structure',
        Committee::class => 'Church Structure',
        CommitteeMember::class => 'Church Structure',
        ChurchLeadership::class => 'Church Structure',
        Leader::class => 'Church Structure',
        HeroSlide::class => 'Website',
        Belief::class => 'Website',
        SitePage::class => 'Website',
        GalleryAlbum::class => 'Website',
        GalleryPhoto::class => 'Website',
        ContactMessage::class => 'Website',
        ContactMessageReply::class => 'Website',
        ReportSignature::class => 'Reports',
        ChurchSetting::class => 'System',
        MemberMessage::class => 'Members',
        Role::class => 'Security',
        Permission::class => 'Security',
        BlockedIp::class => 'Security',
        User::class => 'System',
    ];

    /** Never copied into the log. */
    private const HIDDEN = ['password', 'remember_token', 'two_factor_secret', 'two_factor_recovery_codes', 'updated_at', 'created_at'];

    /**
     * F04: free-text pastoral content. The log records THAT these changed,
     * never what they say, so audit-log readers don't see counselling notes.
     */
    private const REDACTED = [
        PastoralCare::class => ['description', 'notes', 'outcome', 'care_type'],
        PrayerRequest::class => ['request_details', 'notes', 'response', 'subject'],
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

    /**
     * Audit an action that is not a model save, e.g. a role given to a user.
     *
     * @param  array<string, mixed>|null  $new
     */
    public static function note(string $action, string $module, string $description, ?string $table = null, ?array $new = null): void
    {
        try {
            $user = auth()->user();
            $req = request();

            AuditLog::create([
                'action' => $action,
                'table_name' => $table,
                'record_id' => null,
                'old_values' => null,
                'new_values' => $new,
                'performed_by' => $user?->email ?? 'system',
                'performed_by_name' => $user?->name ?? 'System',
                'performed_by_role' => $user?->getRoleNames()->first() ?? 'system',
                'ip_address' => $req?->ip(),
                'user_agent' => $req ? mb_substr((string) $req->userAgent(), 0, 255) : null,
                'module' => $module,
                'description' => mb_substr($description, 0, 500),
            ]);
        } catch (\Throwable $e) {
            Log::warning('Audit log failed', ['error' => $e->getMessage()]);
        }
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
        if ($m instanceof PastoralCare && $m->is_confidential) {
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
