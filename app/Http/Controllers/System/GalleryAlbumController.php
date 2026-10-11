<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Event;
use App\Models\GalleryAlbum;
use App\Models\GalleryPhoto;
use App\Models\Sermon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * System → Gallery: photo albums for the public gallery. Each album holds up
 * to 10 photos and can be linked to a sermon, an event or a department.
 */
class GalleryAlbumController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('gallery-albums/index', [
            'albums' => GalleryAlbum::with(['photos', 'department:id,name', 'sermon:id,title', 'event:id,title'])
                ->orderByDesc('event_date')->orderByDesc('id')->get()
                ->map(fn (GalleryAlbum $a) => [
                    ...$a->only(['id', 'slug', 'title', 'description', 'department_id', 'sermon_id', 'event_id', 'is_published']),
                    'event_date' => $a->event_date?->toDateString(),
                    'tags' => $a->tags ?? [],
                    'department' => $a->department?->name,
                    'sermon' => $a->sermon?->title,
                    'event' => $a->event?->title,
                    'photos' => $a->photos->map(fn (GalleryPhoto $p) => $p->only(['id', 'url', 'caption', 'sort_order']))->values(),
                ]),
            'options' => [
                'departments' => Department::orderBy('name')->get(['id', 'name']),
                'sermons' => Sermon::orderByDesc('sermon_date')->limit(200)->get(['id', 'title', 'sermon_date']),
                'events' => Event::orderByDesc('start_date')->limit(200)->get(['id', 'title', 'start_date']),
            ],
            'maxPhotos' => GalleryAlbum::MAX_PHOTOS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $album = new GalleryAlbum($this->validated($request));
        $album->created_by = $request->user()->id;
        $album->save();

        return $this->done("Album “{$album->title}” created. Now add up to ".GalleryAlbum::MAX_PHOTOS.' photos.');
    }

    public function update(Request $request, GalleryAlbum $album): RedirectResponse
    {
        $album->update($this->validated($request));

        return $this->done('Album saved.');
    }

    public function destroy(GalleryAlbum $album): RedirectResponse
    {
        // Delete photos one by one so their files are removed too.
        $album->photos()->get()->each->delete();
        $album->delete();

        return $this->done('Album deleted.');
    }

    /** Upload one or more photos, never going above MAX_PHOTOS for the album. */
    public function storePhotos(Request $request, GalleryAlbum $album): RedirectResponse
    {
        $request->validate([
            'photos' => ['required', 'array', 'min:1', 'max:'.GalleryAlbum::MAX_PHOTOS],
            'photos.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $room = GalleryAlbum::MAX_PHOTOS - $album->photos()->count();
        if (count($request->file('photos')) > $room) {
            throw ValidationException::withMessages([
                'photos' => $room > 0
                    ? "This album can take {$room} more photo(s) — the limit is ".GalleryAlbum::MAX_PHOTOS.'.'
                    : 'This album already has '.GalleryAlbum::MAX_PHOTOS.' photos. Remove one to add another.',
            ]);
        }

        $order = (int) $album->photos()->max('sort_order');
        foreach ($request->file('photos') as $file) {
            $album->photos()->create([
                'image_path' => $file->store("gallery/{$album->id}", 'public'),
                'sort_order' => ++$order,
            ]);
        }

        return $this->done(count($request->file('photos')).' photo(s) added.');
    }

    public function updatePhoto(Request $request, GalleryPhoto $photo): RedirectResponse
    {
        $data = $request->validate([
            'caption' => ['nullable', 'string', 'max:200'],
            'move' => ['nullable', 'in:up,down'],
        ]);

        if (array_key_exists('caption', $data)) {
            $photo->update(['caption' => $data['caption']]);
        }
        if (! empty($data['move'])) {
            $this->move($photo, $data['move']);
        }

        return back();
    }

    public function destroyPhoto(GalleryPhoto $photo): RedirectResponse
    {
        $photo->delete();

        return $this->done('Photo removed.');
    }

    /** Swap a photo with its neighbour; the first photo is the album cover. */
    private function move(GalleryPhoto $photo, string $direction): void
    {
        $photos = GalleryPhoto::where('album_id', $photo->album_id)->orderBy('sort_order')->orderBy('id')->get()->values();
        $i = $photos->search(fn (GalleryPhoto $p) => $p->id === $photo->id);
        $j = $direction === 'up' ? $i - 1 : $i + 1;
        if ($i === false || ! isset($photos[$j])) {
            return;
        }

        DB::transaction(function () use ($photos, $i, $j) {
            $ordered = $photos->all();
            [$ordered[$i], $ordered[$j]] = [$ordered[$j], $ordered[$i]];
            foreach ($ordered as $position => $p) {
                $p->update(['sort_order' => $position + 1]);
            }
        });
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:2000'],
            'event_date' => ['nullable', 'date'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'sermon_id' => ['nullable', 'uuid', 'exists:sermons,id'],
            'event_id' => ['nullable', 'uuid', 'exists:events,id'],
            'tags' => ['nullable', 'string', 'max:300'],
            'is_published' => ['boolean'],
        ]);
        $data['tags'] = collect(explode(',', (string) ($data['tags'] ?? '')))
            ->map(fn ($t) => mb_strtolower(trim($t)))->filter()->unique()->take(10)->values()->all();

        return $data;
    }

    private function done(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
