<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Department;
use App\Models\Event;
use App\Models\GalleryAlbum;
use App\Models\GalleryPhoto;
use App\Models\HeroSlide;
use App\Models\Ministry;
use App\Models\Sermon;
use App\Support\ChurchSettings;
use App\Support\ListQuery;
use App\Support\PublicFile;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public photo gallery. Combines albums created by staff with images already
 * on the website (event, sermon, news, ministry and department banners, hero
 * slides). People's profile photos are never included.
 */
class GalleryController extends Controller
{
    private const PER_PAGE = 12;

    public function index(Request $request): Response
    {
        $filters = [
            'search' => mb_substr(trim($request->string('search')->toString()), 0, ListQuery::MAX_SEARCH),
            'department' => $request->string('department')->toString(),
            'tag' => mb_substr(mb_strtolower(trim($request->string('tag')->toString())), 0, 40),
            'from' => $this->date($request->string('from')->toString()),
            'to' => $this->date($request->string('to')->toString()),
        ];

        // 1. Albums created in the admin (filtered in the database).
        $query = GalleryAlbum::published()
            ->whereHas('photos')
            ->with(['photos', 'department:id,name'])
            ->when($filters['department'] !== '', fn (Builder $q) => $q->whereIn('department_id', Department::whereSlugOrKey($filters['department'])->select('id')))
            ->when($filters['tag'] !== '', fn (Builder $q) => $q->whereJsonContains('tags', $filters['tag']))
            ->when($filters['from'], fn (Builder $q, $from) => $q->where('event_date', '>=', $from))
            ->when($filters['to'], fn (Builder $q, $to) => $q->where('event_date', '<=', $to));
        ListQuery::search($query, $filters['search'], ['title', 'description', 'tags']);

        $albums = $query->get()->map(fn (GalleryAlbum $a) => [
            'id' => $a->id,
            'title' => $a->title,
            'description' => $a->description,
            'event_date' => $a->event_date?->toDateString(),
            'department' => $a->department?->name,
            'tags' => $a->tags ?? [],
            'photos' => $a->photos->map(fn (GalleryPhoto $p) => [
                'id' => $p->id,
                'url' => $p->url,
                'caption' => $p->caption,
            ])->values()->all(),
        ]);

        // 2. Images that already exist elsewhere on the website.
        $siteAll = $this->siteAlbums();
        $deptIds = $filters['department'] !== ''
            ? Department::whereSlugOrKey($filters['department'])->pluck('id')->all()
            : null;
        $site = $siteAll->filter(fn (array $a) => $this->passes($a, $filters, $deptIds));

        // 3. Merge, newest first, then page it for infinite scroll.
        $all = $albums->concat($site)
            ->sortByDesc(fn (array $a) => $a['event_date'] ?? '')
            ->values();

        $page = LengthAwarePaginator::resolveCurrentPage();

        return Inertia::render('site/gallery', [
            'albums' => Inertia::scroll(fn () => new LengthAwarePaginator(
                $all->forPage($page, self::PER_PAGE)->values(),
                $all->count(),
                self::PER_PAGE,
                $page,
                ['path' => $request->url(), 'query' => $request->query()],
            )),
            'filters' => $filters,
            'departments' => Department::where('is_active', true)
                ->where(fn (Builder $q) => $q->whereHas('galleryAlbums')->orWhereNotNull('banner_url'))
                ->orderBy('name')->get(['id', 'slug', 'name']),
            'tags' => GalleryAlbum::published()->pluck('tags')->flatten()
                ->merge($siteAll->pluck('tags')->flatten())
                ->filter()->unique()->sort()->values(),
            'site' => ChurchSettings::all(),
        ]);
    }

    /**
     * One single-photo "album" per website image. Profile photos (members,
     * leaders, board members, ministry/department leaders) are left out.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function siteAlbums(): Collection
    {
        return collect()
            ->concat(Event::where('is_public', true)->where('status', '!=', 'Cancelled')->whereNotNull('banner_url')->get()
                ->map(fn (Event $e) => $this->item('events', $e->id, $e->title, $e->banner_url, $e->start_date?->toDateString(), $e->description)))
            ->concat(Sermon::where('is_published', true)->whereNotNull('thumbnail_url')->get()
                ->map(fn (Sermon $s) => $this->item('sermons', $s->id, $s->title, $s->thumbnail_url, $s->sermon_date ? Carbon::parse($s->sermon_date)->toDateString() : null, $s->description)))
            ->concat(Announcement::where('is_published', true)->whereNotNull('banner_url')->get()
                ->map(fn (Announcement $a) => $this->item('news', $a->id, $a->title, $a->banner_url, $a->created_at?->toDateString(), $a->content)))
            ->concat(Ministry::where('is_active', true)->whereNotNull('banner_url')->get()
                ->map(fn (Ministry $m) => $this->item('ministries', $m->id, $m->name, $m->banner_url, null, $m->description)))
            ->concat(Department::where('is_active', true)->whereNotNull('banner_url')->get()
                ->map(fn (Department $d) => $this->item('departments', $d->id, $d->name, $d->banner_url, null, $d->description, $d->name, $d->id)))
            ->concat(HeroSlide::active()->get()
                ->map(fn (HeroSlide $h) => $this->item('highlights', $h->id, $h->title, $h->image_url, null, $h->subtitle)))
            ->filter()
            ->values();
    }

    /** @return array<string, mixed>|null */
    private function item(string $tag, int|string $id, ?string $title, ?string $image, ?string $date, ?string $description = null, ?string $department = null, int|string|null $departmentId = null): ?array
    {
        if (blank($image) || blank($title)) {
            return null;
        }

        $text = $description
            ? Str::limit(trim(preg_replace('/[\s\x{00A0}]+/u', ' ', html_entity_decode(preg_replace('/<[^>]+>/', ' ', $description), ENT_QUOTES | ENT_HTML5, 'UTF-8'))), 160)
            : null;

        return [
            'id' => "{$tag}-{$id}",
            'title' => $title,
            'description' => $text ?: null,
            'event_date' => $date,
            'department' => $department,
            'department_id' => $departmentId,
            'tags' => [$tag],
            'photos' => [['id' => "{$tag}-{$id}", 'url' => PublicFile::normalize($image), 'caption' => $title]],
        ];
    }

    /** Applies the visitor's filters to a website-image album. */
    private function passes(array $a, array $f, ?array $deptIds): bool
    {
        if ($deptIds !== null && ! in_array($a['department_id'] ?? null, $deptIds, true)) {
            return false;
        }
        if ($f['tag'] !== '' && ! in_array($f['tag'], $a['tags'], true)) {
            return false;
        }
        if ($f['from'] && (! $a['event_date'] || $a['event_date'] < $f['from'])) {
            return false;
        }
        if ($f['to'] && (! $a['event_date'] || $a['event_date'] > $f['to'])) {
            return false;
        }
        if ($f['search'] !== '') {
            $haystack = mb_strtolower(implode(' ', [$a['title'], (string) $a['description'], ...$a['tags']]));
            if (! str_contains($haystack, mb_strtolower($f['search']))) {
                return false;
            }
        }

        return true;
    }

    private function date(string $value): ?string
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }
}
