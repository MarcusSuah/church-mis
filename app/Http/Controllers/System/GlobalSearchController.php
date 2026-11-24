<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Content\AnnouncementController;
use App\Http\Controllers\Content\DocumentController;
use App\Http\Controllers\Content\EventController;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Finance\DonationController;
use App\Http\Controllers\Finance\ExpenseController;
use App\Http\Controllers\Finance\OfferingController;
use App\Http\Controllers\Finance\TitheController;
use App\Http\Controllers\Sacraments\BaptismController;
use App\Http\Controllers\Sacraments\CommunionController;
use App\Http\Controllers\Sacraments\FuneralController;
use App\Http\Controllers\Sacraments\PastoralCareController;
use App\Http\Controllers\Sacraments\RecordsController;
use App\Http\Controllers\Sacraments\WeddingController;
use App\Models\Board;
use App\Models\Budget;
use App\Models\Committee;
use App\Models\ContactMessage;
use App\Models\Department;
use App\Models\Family;
use App\Models\GalleryAlbum;
use App\Models\Leader;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\PrayerRequest;
use App\Models\Sermon;
use App\Models\SitePage;
use App\Models\User;
use App\Support\ListQuery;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Live search behind the search box in the staff header. Looks through every
 * module the signed-in user may open and returns a few matches per module,
 * each linking to the page that shows it.
 *
 * Every source checks the same permission as its page, and record modules
 * reuse their controller's visibility rules (e.g. confidential pastoral care
 * stays hidden), so search never reveals a record its page would not.
 */
class GlobalSearchController extends Controller
{
    public const PER_GROUP = 5;

    public const MIN_LENGTH = 2;

    private string $term = '';

    private User $user;

    public function __invoke(Request $request): JsonResponse
    {
        $this->user = $request->user();
        abort_if($this->user->isMemberOnly() || $this->user->getRoleNames()->isEmpty(), 403);

        $data = $request->validate(['q' => ['nullable', 'string', 'max:'.ListQuery::MAX_SEARCH]]);
        $this->term = trim((string) ($data['q'] ?? ''));

        if (mb_strlen($this->term) < self::MIN_LENGTH) {
            return response()->json(['query' => $this->term, 'groups' => []]);
        }

        $groups = collect($this->sources())
            ->filter(fn (array $source) => $this->user->can($source['permission']))
            ->map(function (array $source, string $key) {
                $rows = ($source['find'])(self::PER_GROUP + 1);
                if ($rows->isEmpty()) {
                    return null;
                }

                return [
                    'key' => $key,
                    'label' => $source['label'],
                    'items' => $rows->take(self::PER_GROUP)
                        ->map(fn (Model $row) => ['id' => (string) $row->getKey(), ...($source['item'])($row)])
                        ->values()
                        ->all(),
                    'more_url' => $rows->count() > self::PER_GROUP ? $source['more'] : null,
                ];
            })
            ->filter()
            ->values();

        return response()->json(['query' => $this->term, 'groups' => $groups]);
    }

    /**
     * Searchable modules in the order they are shown.
     *
     * @return array<string, array{label: string, permission: string, find: Closure(int): Collection<int, Model>, item: Closure(Model): array{title: string, subtitle: ?string, url: string}, more: string}>
     */
    private function sources(): array
    {
        return [
            'members' => [
                'label' => 'Members',
                'permission' => 'members.view',
                'find' => fn (int $limit) => Member::query()->search($this->term)
                    ->orderBy('last_name')->orderBy('first_name')->limit($limit)
                    ->get(['id', 'member_id', 'first_name', 'last_name', 'email', 'phone', 'status', 'photo_url']),
                'item' => fn (Member $m) => [
                    'title' => $m->full_name,
                    'subtitle' => $this->join([$m->member_id, $m->status, $m->email ?: $m->phone]),
                    'image' => $m->photo_url,
                    'url' => $this->link('/member-management', ['search' => $this->term]),
                ],
                'more' => $this->link('/member-management', ['search' => $this->term]),
            ],
            'families' => $this->model('Families', 'members.view', Family::class, ['family_name', 'city', 'phone', 'email'], 'family_name',
                fn (Family $f) => [
                    'title' => $f->family_name,
                    'subtitle' => $this->join([$f->city, $f->status]),
                    'url' => $this->link('/families', ['search' => $f->family_name]),
                ], '/families', pageSearchesTerm: true),
            'users' => $this->model('User accounts', 'users.view', User::class, ['name', 'email', 'phone'], 'name',
                fn (User $u) => [
                    'title' => $u->name,
                    'subtitle' => $this->join([$u->email, $u->status]),
                    'url' => "/admin/users/{$u->getKey()}",
                ], '/admin/users', pageSearchesTerm: true),
            'departments' => $this->model('Departments', 'departments.view', Department::class, ['name', 'description', 'leader_name'], 'name',
                fn (Department $d) => $this->group($d->name, [$d->category, $d->leader_name], '/departments'), '/departments'),
            'ministries' => $this->model('Ministries', 'ministries.view', Ministry::class, ['name', 'description', 'leader_name'], 'name',
                fn (Ministry $m) => $this->group($m->name, [$m->category, $m->leader_name], '/ministries'), '/ministries'),
            'boards' => $this->model('Boards', 'boards.view', Board::class, ['name', 'description', 'chairperson_name'], 'name',
                fn (Board $b) => $this->group($b->name, [$b->board_type, $b->chairperson_name], '/boards'), '/boards'),
            'committees' => $this->model('Committees', 'committees.view', Committee::class, ['name', 'description', 'chairperson_name'], 'name',
                fn (Committee $c) => $this->group($c->name, [$c->committee_type, $c->chairperson_name], '/committees'), '/committees'),
            'leadership' => $this->model('Leadership', 'leadership.view', Leader::class, ['first_name', 'last_name', 'title'], 'last_name',
                fn (Leader $l) => [
                    'title' => trim("{$l->first_name} {$l->last_name}"),
                    'subtitle' => $l->title,
                    'image' => $l->photo_url,
                    'url' => $this->link('/leadership', ['search' => trim("{$l->first_name} {$l->last_name}")]),
                ], '/leadership'),
            'events' => $this->records('Events', EventController::class, 'events', '/events',
                fn ($e) => [$e->title, [$this->date($e->start_date), $e->location, $e->status]]),
            'announcements' => $this->records('Announcements', AnnouncementController::class, 'announcements', '/announcements',
                fn ($a) => [$a->title, [$a->category, $a->author_name, $this->date($a->created_at)]]),
            'documents' => $this->records('Documents', DocumentController::class, 'documents', '/documents',
                fn ($d) => [$d->title, [$d->category, $d->author_name]]),
            'sermons' => $this->model('Sermons', 'sermons.view', Sermon::class, ['title', 'speaker_name', 'series_name', 'scripture_reference'], 'sermon_date',
                fn (Sermon $s) => [
                    'title' => $s->title,
                    'subtitle' => $this->join([$s->speaker_name, $this->date($s->sermon_date), $s->scripture_reference]),
                    'url' => $this->link('/sermons', ['search' => $s->title]),
                ], '/sermons', descending: true),
            'prayer_requests' => [
                'label' => 'Prayer requests',
                'permission' => 'prayer-requests.view',
                // Same matching as the prayer request list; anonymous requesters are never matched by name.
                'find' => fn (int $limit) => PrayerRequest::query()
                    ->where(function (Builder $w) {
                        foreach (['subject', 'request_details', 'category'] as $column) {
                            ListQuery::whereLike($w, $column, $this->term, 'contains', 'or');
                        }
                        $w->orWhere(fn (Builder $n) => ListQuery::whereLike($n->where('is_anonymous', false), 'requester_name', $this->term));
                    })
                    ->latest()->limit($limit)->get(),
                'item' => fn (PrayerRequest $p) => [
                    'title' => $p->subject,
                    'subtitle' => $this->join([$p->is_anonymous ? 'Anonymous' : $p->requester_name, $p->category, $p->status]),
                    'url' => $this->link('/prayer-requests', ['search' => $this->term]),
                ],
                'more' => $this->link('/prayer-requests', ['search' => $this->term]),
            ],
            'tithes' => $this->records('Tithes', TitheController::class, 'tithes', '/tithes',
                fn ($t) => [$t->member_name ?: 'Tithe', [$this->money($t->amount, $t->currency), $this->date($t->tithe_date), $t->receipt_number]]),
            'offerings' => $this->records('Offerings', OfferingController::class, 'offerings', '/offerings',
                fn ($o) => [$o->member_name ?: ($o->offering_type ?: 'Offering'), [$this->money($o->amount, $o->currency), $this->date($o->offering_date), $o->receipt_number]]),
            'donations' => $this->records('Donations', DonationController::class, 'donations', '/donations',
                fn ($d) => [$d->is_anonymous ? 'Anonymous donor' : $d->donor_name, [$this->money($d->amount, $d->currency), $this->date($d->donation_date), $d->purpose]]),
            'expenses' => $this->records('Expenses', ExpenseController::class, 'expenses', '/expenses',
                fn ($e) => [$e->title, [$this->money($e->amount, $e->currency), $e->vendor_name, $e->status]]),
            'budgets' => $this->model('Budgets', 'budgets.view', Budget::class, ['category', 'description', 'fund_name'], 'fiscal_year',
                fn (Budget $b) => [
                    'title' => $b->category,
                    'subtitle' => $this->join([$b->period, $b->fiscal_year, $this->money($b->allocated_amount, $b->currency)]),
                    'url' => $this->link('/budgets', ['search' => $b->category]),
                ], '/budgets', descending: true),
            'baptisms' => $this->records('Baptisms', BaptismController::class, 'baptisms', '/baptisms',
                fn ($b) => [$b->candidate_name, [$this->date($b->baptism_date), $b->certificate_number]]),
            'communions' => $this->records('Communion services', CommunionController::class, 'communions', '/communions',
                fn ($c) => [$c->service_name ?: 'Communion service', [$this->date($c->service_date), $c->officiant]]),
            'weddings' => $this->records('Weddings', WeddingController::class, 'weddings', '/weddings',
                fn ($w) => ["{$w->groom_name} & {$w->bride_name}", [$this->date($w->wedding_date), $w->certificate_number]]),
            'funerals' => $this->records('Funerals', FuneralController::class, 'funerals', '/funerals',
                fn ($f) => [$f->deceased_name, [$this->date($f->funeral_date), $f->officiant]]),
            'pastoral_care' => $this->records('Pastoral care', PastoralCareController::class, 'pastoral-care', '/pastoral-care',
                fn ($p) => [$p->member_name ?: 'Pastoral care', [$p->care_type, $p->status, $p->assigned_pastor]]),
            'messages' => $this->model('Contact messages', 'messages.view', ContactMessage::class, ['name', 'email', 'subject'], 'created_at',
                fn (ContactMessage $m) => [
                    'title' => $m->subject ?: $m->name,
                    'subtitle' => $this->join([$m->name, $m->email, $m->status]),
                    'url' => $this->link('/messages', ['search' => $this->term]),
                ], '/messages', descending: true, pageSearchesTerm: true),
            'gallery_albums' => $this->model('Gallery albums', 'website.manage', GalleryAlbum::class, ['title', 'description'], 'event_date',
                fn (GalleryAlbum $g) => [
                    'title' => $g->title,
                    'subtitle' => $this->join([$this->date($g->event_date), $g->is_published ? 'Published' : 'Draft']),
                    'url' => '/gallery-albums',
                ], '/gallery-albums', descending: true),
            'site_pages' => $this->model('Website pages', 'website.manage', SitePage::class, ['title', 'summary'], 'title',
                fn (SitePage $p) => [
                    'title' => $p->title,
                    'subtitle' => $p->is_published ? 'Published' : 'Draft',
                    'url' => '/site-pages',
                ], '/site-pages'),
        ];
    }

    /**
     * A record module backed by a RecordsController: its own visibility rules
     * and search columns. The link opens the record when the user may edit it.
     *
     * @param  class-string<RecordsController>  $controller
     * @param  Closure(Model): array{0: ?string, 1: array<int, mixed>}  $describe
     */
    private function records(string $label, string $controller, string $permission, string $path, Closure $describe): array
    {
        $records = app($controller);
        $canEdit = $this->user->can("{$permission}.update");

        return [
            'label' => $label,
            'permission' => "{$permission}.view",
            'find' => fn (int $limit) => $records->searchMatches($this->term, $limit),
            'item' => function (Model $row) use ($describe, $path, $canEdit) {
                [$title, $details] = $describe($row);

                return [
                    'title' => (string) ($title ?: '—'),
                    'subtitle' => $this->join($details),
                    'url' => $this->link($path, ['search' => $this->term, ...($canEdit ? ['edit' => (string) $row->getKey()] : [])]),
                ];
            },
            'more' => $this->link($path, ['search' => $this->term]),
        ];
    }

    /**
     * A plain model searched across $columns (column names come from code only).
     * $pageSearchesTerm: the module's page filters by ?search= on the server,
     * so "more results" can pass the typed term through.
     *
     * @param  class-string<Model>  $model
     * @param  array<int, string>  $columns
     */
    private function model(string $label, string $permission, string $model, array $columns, string $orderBy, Closure $item, string $path, bool $descending = false, bool $pageSearchesTerm = false): array
    {
        return [
            'label' => $label,
            'permission' => $permission,
            'find' => fn (int $limit) => ListQuery::search($model::query(), $this->term, $columns)
                ->orderBy($orderBy, $descending ? 'desc' : 'asc')
                ->limit($limit)
                ->get(),
            'item' => $item,
            'more' => $pageSearchesTerm ? $this->link($path, ['search' => $this->term]) : $path,
        ];
    }

    /** Departments, ministries, boards and committees: their pages filter by name. */
    private function group(?string $name, array $details, string $path): array
    {
        return [
            'title' => (string) $name,
            'subtitle' => $this->join($details),
            'url' => $this->link($path, ['search' => (string) $name]),
        ];
    }

    private function link(string $path, array $query): string
    {
        $query = array_filter($query, fn ($value) => $value !== null && $value !== '');

        return $query === [] ? $path : $path.'?'.http_build_query($query);
    }

    private function join(array $parts): ?string
    {
        $text = collect($parts)
            ->map(fn ($part) => $part instanceof \BackedEnum ? $part->value : $part)
            ->filter(fn ($part) => filled($part) && is_scalar($part))
            ->map(fn ($part) => Str::limit((string) $part, 60))
            ->implode(' · ');

        return $text !== '' ? $text : null;
    }

    private function date(mixed $value): ?string
    {
        if (blank($value)) {
            return null;
        }

        try {
            return Carbon::parse($value)->format('M j, Y');
        } catch (\Throwable) {
            return null;
        }
    }

    private function money(mixed $amount, ?string $currency): ?string
    {
        return $amount === null ? null : trim(($currency ?: '').' '.number_format((float) $amount, 2));
    }
}
