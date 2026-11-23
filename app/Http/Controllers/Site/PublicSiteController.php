<?php
namespace App\Http\Controllers\Site;

use App\Enums\LeadershipRole;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\Belief;
use App\Models\Board;
use App\Models\BoardMember;
use App\Models\ChurchLeadership;
use App\Models\ContactMessage;
use App\Models\Department;
use App\Models\Document;
use App\Models\Event;
use App\Models\GalleryAlbum;
use App\Models\GalleryPhoto;
use App\Models\HeroSlide;
use App\Models\Ministry;
use App\Models\Sermon;
use App\Models\SitePage;
use App\Support\ChurchSettings;
use App\Support\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Stevebauman\Purify\Facades\Purify;
use Illuminate\Support\Str;
/**
 * The public church website. Only active / published content is shown.
 * Listing cards link to a detail page addressed by the record's slug
 * (e.g. /church/events/easter-sunday-service).
 */
class PublicSiteController extends Controller
{
    /** File types a browser can show inside the page, with their content types. */
    private const VIEWABLE = [
        'pdf' => 'application/pdf',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
    ];

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
            'documents' => $this->publicDocuments(),
            'pastor' => $this->seniorPastor(),
        ]);
    }

    /**
     * The active Senior Pastor from Church Leadership, shown under "A word from
     * our pastor". Null when there is none (the page then uses the name typed
     * in Website settings).
     *
     * @return array{name: string, title: string, photo: ?string, href: string}|null
     */
    private function seniorPastor(): ?array
    {
        $pastor = ChurchLeadership::where('is_active', true)
            ->where('leadership_role', LeadershipRole::SeniorPastor->value)
            ->orderBy('display_order')->orderBy('last_name')
            ->first();

        return $pastor ? [
            'name' => $pastor->full_name,
            'title' => $pastor->title ?: 'Senior Pastor',
            'photo' => $pastor->photo_url,
            'href' => route('site.leadership.show', $pastor->slug ?: $pastor->id),
        ] : null;
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

    /** An editable page such as the Privacy Policy. Hidden pages answer 404. */
    public function showPage(SitePage $sitePage): Response
    {
        abort_unless($sitePage->is_published, 404);

        return $this->page('page', [
            'page' => [
                ...$sitePage->only(['slug', 'title', 'summary', 'body']),
                'updated_at' => $sitePage->updated_at?->toIso8601String(),
            ],
        ]);
    }

    /**
     * Streams a public document for reading inside the website. It is sent
     * "inline" with no-store caching, and the page shows it without a download
     * button. Anything a browser displays can still be captured by a determined
     * visitor, so confidential files must stay private.
     */
    public function viewDocument(Document $document): BinaryFileResponse
    {
        abort_unless($document->is_public && ! $document->is_archived && $this->isViewable($document), 404);

        $type = strtolower((string) $document->file_type);

        return response()->file(Storage::disk('local')->path($document->file_url), [
            'Content-Type' => self::VIEWABLE[$type],
            'Content-Disposition' => 'inline; filename="'.str($document->title)->slug().'.'.$type.'"',
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options' => 'SAMEORIGIN',
        ]);
    }

    /**
     * Contact form. Rate-limited (public-forms); the hidden "website" field
     * catches bots that fill every input. Staff who can read messages are notified.
     */
    public function sendMessage(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'phone' => ['nullable', 'string', 'max:40'],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:5', 'max:5000'],
            'website' => ['prohibited'],
        ]);

        $message = ContactMessage::create([...$data, 'ip_address' => $request->ip()]);

        Notifier::permission('messages.view', '✉️ New website message', "{$message->name}: {$message->subject}", 'info', '/messages');

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Thank you — your message has been sent. The church office will reply by email.']);

        return back();
    }

    public function events(): Response
    {
        return $this->listing('Church calendar', 'Upcoming events', 'Services, fellowships and gatherings — everyone is welcome.',
            $this->eventsQuery()->get()->map(fn (Event $e) => $this->eventItem($e)), 'No upcoming events are scheduled yet.');
    }

    public function sermons(): Response
    {
        return $this->listing('From the pulpit', 'Sermon archive', 'Messages preached at our church.',
            $this->sermonsQuery()->with('galleryAlbums.photos')->limit(60)->get()->map(fn (Sermon $s) => $this->sermonItem($s)),
            'No sermons have been published yet.');
    }

    public function announcements(): Response
    {
        return $this->listing('Church notices', 'News & announcements', 'The latest from the church office.',
            $this->announcementsQuery()->get()->map(fn (Announcement $a) => $this->announcementItem($a)), 'There are no announcements right now.');
    }

    public function ministries(): Response
    {
        return $this->listing('Serve and belong', 'Ministries of the church', 'Find a place to grow and serve.',
            Ministry::where('is_active', true)->orderBy('name')->get()->map(fn (Ministry $m) => $this->ministryItem($m)),
            'Ministries will be listed here soon.', 'groups');
    }

    public function departments(): Response
    {
        return $this->listing('Organised for service', 'Church departments', 'The departments that carry the work of the church.',
            Department::where('is_active', true)->orderBy('name')->get()->map(fn (Department $d) => $this->departmentItem($d)),
            'Departments will be listed here soon.', 'groups');
    }

    /** The leadership team, followed by each active board and its members. */
    public function leadership(): Response
    {
        // Active boards and their current members: term not ended, member record Active.
        $boards = Board::where('is_active', true)
            ->with(['memberships' => fn ($q) => $q
                ->where(fn ($t) => $t->whereNull('term_end')->orWhereDate('term_end', '>=', today()))
                ->whereHas('member', fn ($m) => $m->where('status', 'Active'))
                ->with('member:id,first_name,last_name,photo_url'),
            ])
            ->orderBy('name')->get()
            ->map(fn (Board $b) => [
                'id' => $b->id,
                'title' => $b->name,
                'subtitle' => $b->board_type,
                'body' => $b->mandate ?: $b->description,
                'meta' => array_values(array_filter([$b->meeting_schedule, $b->location])),
                'members' => $this->boardMembers($b),
            ])
            ->filter(fn (array $b) => $b['members'] !== [])
            ->values();

        return $this->listing('Shepherds and servants', 'Church leadership', 'The men and women who lead and serve our congregation.',
            ChurchLeadership::where('is_active', true)->orderBy('display_order')->orderBy('last_name')->get()->map(fn (ChurchLeadership $l) => $this->leaderItem($l)),
            'Leadership profiles will appear here soon.', 'people', ['boards' => $boards]);
    }

    /* Detail pages, addressed by slug. Hidden or unpublished items answer 404. */

    public function showEvent(Event $event): Response
    {
        abort_unless($event->is_public && $event->status !== 'Cancelled', 404);

        $event->load('galleryAlbums.photos');

        return $this->detail('Church calendar', $this->eventItem($event), route('site.events'), 'All events', 'media', $this->albumPhotos($event->galleryAlbums));
    }

    public function showSermon(Sermon $sermon): Response
    {
        abort_unless($sermon->is_published, 404);

        $sermon->load('galleryAlbums.photos');

        return $this->detail('From the pulpit', $this->sermonItem($sermon), route('site.sermons'), 'All sermons', 'media', $this->albumPhotos($sermon->galleryAlbums));
    }


private function excerpt(?string $html, int $limit = 200): ?string
{
    if (blank($html)) {
        return null;
    }

    $text = html_entity_decode(
        preg_replace('/<[^>]+>/', ' ', $html),
        ENT_QUOTES | ENT_HTML5,
        'UTF-8'
    );

    return Str::limit(trim(preg_replace('/[\s\x{00A0}]+/u', ' ', $text)), $limit);
}
    public function showAnnouncement(Announcement $announcement): Response
    {
        abort_unless($this->announcementsQuery()->whereKey($announcement->getKey())->exists(), 404);

        return $this->detail('Church notices', $this->announcementItem($announcement), route('site.announcements'), 'All news');
    }

    public function showMinistry(Ministry $ministry): Response
    {
        abort_unless($ministry->is_active, 404);

        return $this->detail('Serve and belong', $this->ministryItem($ministry), route('site.ministries'), 'All ministries', 'groups');
    }

    public function showDepartment(Department $department): Response
    {
        abort_unless($department->is_active, 404);

        return $this->detail('Organised for service', $this->departmentItem($department), route('site.departments'), 'All departments', 'groups');
    }

    public function showLeader(ChurchLeadership $leader): Response
    {
        abort_unless($leader->is_active, 404);

        return $this->detail('Shepherds and servants', $this->leaderItem($leader), route('site.leadership'), 'All leaders', 'people');
    }

    /* ------------------------------------------------------------------ */

    /** Every public page gets the church details for the header and footer. */
    private function page(string $component, array $props = []): Response
    {
        return Inertia::render("site/{$component}", [...$props, 'site' => ChurchSettings::all()]);
    }

    /**
     * @param  'media'|'groups'|'people'  $kind  card style: pictures with dates, named groups, or people
     * @param  array<string, mixed>  $extra
     */
    private function listing(string $eyebrow, string $title, string $description, Collection $items, string $empty, string $kind = 'media', array $extra = []): Response
    {
        return $this->page('listing', [...compact('eyebrow', 'title', 'description', 'items', 'empty', 'kind'), ...$extra]);
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  list<array{id: int, url: string, caption: ?string}>  $photos
     */
    private function detail(string $eyebrow, array $item, string $backUrl, string $backLabel, string $kind = 'media', array $photos = []): Response
    {
        return $this->page('detail', [
            'eyebrow' => $eyebrow,
            'item' => $item,
            'kind' => $kind,
            'photos' => $photos,
            'back' => ['url' => $backUrl, 'label' => $backLabel],
        ]);
    }

    /**
     * Photos from the published albums linked to a sermon or event.
     *
     * @param  Collection<int, GalleryAlbum>  $albums
     * @return list<array{id: int, url: string, caption: ?string}>
     */
    private function albumPhotos(Collection $albums): array
    {
        return $albums->where('is_published', true)
            ->flatMap(fn (GalleryAlbum $a) => $a->photos)
            ->map(fn (GalleryPhoto $p) => ['id' => $p->id, 'url' => $p->url, 'caption' => $p->caption])
            ->values()->all();
    }

    /** @return list<array{id: string, title: string, subtitle: string, image: ?string}> */
    private function boardMembers(Board $board): array
    {
        return $board->memberships
            ->filter(fn (BoardMember $m) => $m->member !== null)
            ->sortBy(fn (BoardMember $m) => [$m->role === 'Chairperson' ? 0 : 1, $m->member->last_name])
            ->map(fn (BoardMember $m) => [
                'id' => (string) $m->id,
                'title' => $m->member->full_name,
                'subtitle' => $m->role ?: 'Member',
                'image' => $m->member->photo_url,
            ])
            ->values()->all();
    }

    /** Up to six public documents a visitor can open (view only) from the home page. */
    private function publicDocuments(): Collection
    {
        return Document::where('is_public', true)->where('is_archived', false)
            ->whereIn('file_type', array_keys(self::VIEWABLE))
            ->latest()->limit(12)->get()
            ->filter(fn (Document $d) => $this->isViewable($d))
            ->take(6)
            ->map(fn (Document $d) => [
                'id' => $d->id,
                'title' => $d->title,
                'description' => $d->description,
                'category' => $d->category instanceof \BackedEnum ? $d->category->value : $d->category,
                'type' => strtoupper((string) $d->file_type),
                'is_pdf' => strtolower((string) $d->file_type) === 'pdf',
                'updated_at' => $d->updated_at?->toIso8601String(),
                'view_url' => route('site.documents.view', $d->slug ?: $d->id),
            ])
            ->values();
    }

    /** True when the file is a type the browser can display and exists in private storage. */
    private function isViewable(Document $d): bool
    {
        return isset(self::VIEWABLE[strtolower((string) $d->file_type)])
            && str_starts_with((string) $d->file_url, 'documents/')
            && ! str_contains((string) $d->file_url, '..')
            && Storage::disk('local')->exists($d->file_url);
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
        // Without a thumbnail, use the first photo from the sermon's gallery.
        $cover = $s->thumbnail_url;
        if (! $cover && $s->relationLoaded('galleryAlbums')) {
            $cover = $s->galleryAlbums->where('is_published', true)->flatMap(fn (GalleryAlbum $a) => $a->photos)->first()?->url;
        }

        return [
            'id' => $s->id,
            'href' => route('site.sermons.show', $s->slug ?: $s->id),
            'title' => $s->title,
            'subtitle' => $s->speaker_name,
            'badge' => $s->scripture_reference,
            'body' => $s->description,
            'image' => $cover,
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
            'subtitle' => $m->leader_name ? "Led by {$m->leader_name}" : null,
            'body' => $m->description,
            'image' => $m->banner_url,
            'avatar' => $m->leader_photo,
            'meta' => array_values(array_filter([$m->meeting_schedule, $m->location])),
        ];
    }

    private function departmentItem(Department $d): array
    {
        return [
            'id' => $d->id,
            'href' => route('site.departments.show', $d->slug ?: $d->id),
            'title' => $d->name,
            'subtitle' => $d->leader_name ? "Head: {$d->leader_name}" : null,
            'body' => $d->description,
            'image' => $d->banner_url,
            'avatar' => $d->leader_photo,
            'meta' => array_values(array_filter([$d->meeting_schedule, $d->location])),
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
