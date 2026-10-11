<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\GalleryAlbum;
use App\Models\GalleryPhoto;
use App\Support\ChurchSettings;
use App\Support\ListQuery;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Public photo gallery: published albums with search, department, tag and
 * date filters, loaded page by page as the visitor scrolls. Each album's
 * photos (at most 10) come with it, so the lightbox opens instantly.
 */
class GalleryController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'search' => mb_substr(trim($request->string('search')->toString()), 0, ListQuery::MAX_SEARCH),
            'department' => $request->string('department')->toString(),
            'tag' => mb_substr(mb_strtolower(trim($request->string('tag')->toString())), 0, 40),
            'from' => $this->date($request->string('from')->toString()),
            'to' => $this->date($request->string('to')->toString()),
        ];

        $query = GalleryAlbum::published()
            ->whereHas('photos')
            ->with(['photos', 'department:id,name'])
            ->when($filters['department'] !== '', fn (Builder $q) => $q->whereIn('department_id', Department::whereSlugOrKey($filters['department'])->select('id')))
            ->when($filters['tag'] !== '', fn (Builder $q) => $q->whereJsonContains('tags', $filters['tag']))
            ->when($filters['from'], fn (Builder $q, $from) => $q->where('event_date', '>=', $from))
            ->when($filters['to'], fn (Builder $q, $to) => $q->where('event_date', '<=', $to))
            ->orderByDesc('event_date')->orderByDesc('id');
        ListQuery::search($query, $filters['search'], ['title', 'description', 'tags']);

        return Inertia::render('site/gallery', [
            'albums' => Inertia::scroll(fn () => $query->paginate(12)->through(fn (GalleryAlbum $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'description' => $a->description,
                'event_date' => $a->event_date?->toDateString(),
                'department' => $a->department?->name,
                'tags' => $a->tags ?? [],
                'photos' => $a->photos->map(fn (GalleryPhoto $p) => ['id' => $p->id, 'url' => $p->url, 'caption' => $p->caption])->values(),
            ])),
            'filters' => $filters,
            'departments' => Department::where('is_active', true)->whereHas('galleryAlbums')->orderBy('name')->get(['id', 'slug', 'name']),
            'tags' => GalleryAlbum::published()->pluck('tags')->flatten()->filter()->unique()->sort()->values(),
            'site' => ChurchSettings::all(),
        ]);
    }

    private function date(string $value): ?string
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : null;
    }
}
