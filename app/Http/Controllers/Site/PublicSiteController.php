<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Belief;
use App\Models\ChurchLeadership;
use App\Models\Department;
use App\Models\Event;
use App\Models\HeroSlide;
use App\Models\Ministry;
use App\Models\Sermon;
use App\Support\ChurchSettings;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The public church website. Only active / published content is shown.
 * Listing cards link to a detail page addressed by the record's slug
 * (e.g. /church/events/easter-sunday-service).
 */
class PublicSiteController extends Controller
{
    public function home(): Response
    {
        return $this->page('home', [
            'slides' => HeroSlide::active()->get()->map(fn (HeroSlide $s) => $s->only([
                'id', 'eyebrow', 'title', 'subtitle', 'image_url', 'primary_label', 'primary_url', 'secondary_label', 'secondary_url',
            ])),
            'events' => $this->eventsQuery()->limit(3)->get()->map(fn (Event $e) => $this->eventItem($e)),
            'sermons' => $this->sermonsQuery()->limit(3)->get()->map(fn (Sermon $s) => $this->sermonItem($s)),
            'announcements' => $this->announcementsQuery()->limit(2)->get()->map(fn (Announcement $a) => $this->announcementItem($a)),
            'ministries' => Ministry::where('is_active', true)->orderBy('name')->limit(8)->get(['id', 'slug', 'name', 'description'])
                ->map(fn (Ministry $m) => [...$m->only(['id', 'name', 'description']), 'href' => route('site.ministries.show', $m->slug ?: $m->id)]),
            'departments' => Department::where('is_active', true)->orderBy('name')->get(['id', 'slug', 'name'])
                ->map(fn (Department $d) => [...$d->only(['id', 'name']), 'href' => route('site.departments.show', $d->slug ?: $d->id)]),
        ]);
    }

    public function about(): Response
    {
        return $this->page('about', [
            'beliefs' => Belief::active()->get(['id', 'title', 'body']),
        ]);
    }

    public function contact(): Response
    {
        return $this->page('contact');
    }

    public function events(): Response
    {
        return $this->listing('Church calendar', 'Upcoming events', 'Services, fellowships and gatherings — everyone is welcome.',
            $this->eventsQuery()->get()->map(fn (Event $e) => $this->eventItem($e)), 'No upcoming events are scheduled yet.');
    }

    public function sermons(): Response
    {
        return $this->listing('From the pulpit', 'Sermon archive', 'Messages preached at our church.',
            $this->sermonsQuery()->limit(60)->get()->map(fn (Sermon $s) => $this->sermonItem($s)), 'No sermons have been published yet.');
    }

    public function announcements(): Response
    {
        return $this->listing('Church notices', 'News & announcements', 'The latest from the church office.',
            $this->announcementsQuery()->get()->map(fn (Announcement $a) => $this->announcementItem($a)), 'There are no announcements right now.');
    }

    public function ministries(): Response
    {
        return $this->listing('Serve and belong', 'Ministries of the church', 'Find a place to grow and serve.',
            Ministry::where('is_active', true)->orderBy('name')->get()->map(fn (Ministry $m) => $this->ministryItem($m)), 'Ministries will be listed here soon.');
    }

    public function departments(): Response
    {
        return $this->listing('Organised for service', 'Church departments', 'The departments that carry the work of the church.',
            Department::where('is_active', true)->orderBy('name')->get()->map(fn (Department $d) => $this->departmentItem($d)), 'Departments will be listed here soon.');
    }

    public function leadership(): Response
    {
        return $this->listing('Shepherds and servants', 'Church leadership', 'The men and women who lead and serve our congregation.',
            ChurchLeadership::where('is_active', true)->orderBy('display_order')->orderBy('last_name')->get()->map(fn (ChurchLeadership $l) => $this->leaderItem($l)),
            'Leadership profiles will appear here soon.');
    }

    /* Detail pages, addressed by slug. Hidden or unpublished items answer 404. */

    public function showEvent(Event $event): Response
    {
        abort_unless($event->is_public && $event->status !== 'Cancelled', 404);

        return $this->detail('Church calendar', $this->eventItem($event), route('site.events'), 'All events');
    }

    public function showSermon(Sermon $sermon): Response
    {
        abort_unless($sermon->is_published, 404);

        return $this->detail('From the pulpit', $this->sermonItem($sermon), route('site.sermons'), 'All sermons');
    }

    public function showAnnouncement(Announcement $announcement): Response
    {
        abort_unless($this->announcementsQuery()->whereKey($announcement->getKey())->exists(), 404);

        return $this->detail('Church notices', $this->announcementItem($announcement), route('site.announcements'), 'All news');
    }

    public function showMinistry(Ministry $ministry): Response
    {
        abort_unless($ministry->is_active, 404);

        return $this->detail('Serve and belong', $this->ministryItem($ministry), route('site.ministries'), 'All ministries');
    }

    public function showDepartment(Department $department): Response
    {
        abort_unless($department->is_active, 404);

        return $this->detail('Organised for service', $this->departmentItem($department), route('site.departments'), 'All departments');
    }

    public function showLeader(ChurchLeadership $leader): Response
    {
        abort_unless($leader->is_active, 404);

        return $this->detail('Shepherds and servants', $this->leaderItem($leader), route('site.leadership'), 'All leaders');
    }

    /* ------------------------------------------------------------------ */

    /** Every public page gets the church details for the header and footer. */
    private function page(string $component, array $props = []): Response
    {
        return Inertia::render("site/{$component}", [...$props, 'site' => ChurchSettings::all()]);
    }

    private function listing(string $eyebrow, string $title, string $description, $items, string $empty): Response
    {
        return $this->page('listing', compact('eyebrow', 'title', 'description', 'items', 'empty'));
    }

    /** @param  array<string, mixed>  $item */
    private function detail(string $eyebrow, array $item, string $backUrl, string $backLabel): Response
    {
        return $this->page('detail', ['eyebrow' => $eyebrow, 'item' => $item, 'back' => ['url' => $backUrl, 'label' => $backLabel]]);
    }

    private function eventsQuery(): Builder
    {
        return Event::query()->where('is_public', true)
            ->whereIn('status', ['Upcoming', 'In Progress'])
            ->where('start_date', '>=', now()->startOfDay())
            ->orderBy('start_date');
    }

    private function sermonsQuery(): Builder
    {
        return Sermon::query()->where('is_published', true)->orderByDesc('sermon_date');
    }

    private function announcementsQuery(): Builder
    {
        $today = now()->toDateString();

        return Announcement::query()->where('is_published', true)
            ->where(fn ($q) => $q->whereNull('start_date')->orWhere('start_date', '<=', $today))
            ->where(fn ($q) => $q->whereNull('end_date')->orWhere('end_date', '>=', $today))
            ->orderByDesc('is_pinned')->orderByDesc('created_at');
    }

    private function eventItem(Event $e): array
    {
        return [
            'id' => $e->id,
            'href' => route('site.events.show', $e->slug ?: $e->id),
            'title' => $e->title,
            'badge' => $e->event_type,
            'body' => $e->description,
            'image' => $e->banner_url,
            'date' => $e->start_date?->toIso8601String(),
            'meta' => array_values(array_filter([
                $e->start_date?->format('D, M j, Y · g:i A'),
                $e->location,
            ])),
        ];
    }

    private function sermonItem(Sermon $s): array
    {
        return [
            'id' => $s->id,
            'href' => route('site.sermons.show', $s->slug ?: $s->id),
            'title' => $s->title,
            'subtitle' => $s->speaker_name,
            'badge' => $s->scripture_reference,
            'body' => $s->description,
            'image' => $s->thumbnail_url,
            'date' => $s->sermon_date ? Carbon::parse($s->sermon_date)->toDateString() : null,
            'meta' => array_values(array_filter([$s->sermon_date ? Carbon::parse($s->sermon_date)->format('M j, Y') : null, $s->series_name])),
            'links' => array_values(array_filter([
                $s->video_url ? ['label' => 'Watch', 'url' => $s->video_url] : null,
                $s->audio_url ? ['label' => 'Listen', 'url' => $s->audio_url] : null,
            ])),
        ];
    }

    private function announcementItem(Announcement $a): array
    {
        return [
            'id' => $a->id,
            'href' => route('site.announcements.show', $a->slug ?: $a->id),
            'title' => $a->title,
            'badge' => $a->priority === 'Urgent' ? 'Urgent' : $a->category,
            'body' => $a->content,
            'image' => $a->banner_url,
            'date' => $a->created_at?->toIso8601String(),
            'meta' => array_values(array_filter([$a->created_at?->format('M j, Y')])),
        ];
    }

    private function ministryItem(Ministry $m): array
    {
        return [
            'id' => $m->id,
            'href' => route('site.ministries.show', $m->slug ?: $m->id),
            'title' => $m->name,
            'body' => $m->description,
            'image' => $m->banner_url ?? null,
            'meta' => array_values(array_filter([$m->leader_name ? "Led by {$m->leader_name}" : null, $m->meeting_schedule ?? null])),
        ];
    }

    private function departmentItem(Department $d): array
    {
        return [
            'id' => $d->id,
            'href' => route('site.departments.show', $d->slug ?: $d->id),
            'title' => $d->name,
            'body' => $d->description,
            'image' => $d->banner_url ?? null,
            'meta' => array_values(array_filter([$d->leader_name ? "Head: {$d->leader_name}" : null])),
        ];
    }

    private function leaderItem(ChurchLeadership $l): array
    {
        return [
            'id' => $l->id,
            'href' => route('site.leadership.show', $l->slug ?: $l->id),
            'title' => trim("{$l->first_name} {$l->last_name}"),
            'subtitle' => $l->title,
            'body' => $l->bio,
            'image' => $l->photo_url,
            'portrait' => true,
        ];
    }
}
