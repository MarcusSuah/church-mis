<?php

namespace App\Http\Controllers\WorshipCare;

use App\Http\Controllers\Controller;
use App\Models\Sermon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Sermon archive: recordings, notes and series. Views are counted once per
 * browser session when someone opens a sermon.
 */
class SermonController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $sermons = Sermon::query()->orderByDesc('sermon_date')->orderByDesc('created_at')->get();

        return Inertia::render('sermons/index', [
            'sermons' => $sermons->map(fn (Sermon $s) => [
                ...$s->only([
                    'id', 'title', 'speaker_name', 'speaker_photo', 'series_name', 'scripture_reference', 'description',
                    'service_type', 'audio_url', 'video_url', 'notes_url', 'thumbnail_url', 'duration_minutes',
                    'is_published', 'view_count',
                ]),
                'sermon_date' => $s->sermon_date->format('Y-m-d'),
                'tags' => $s->tags ?? [],
            ]),
            'stats' => [
                'total' => $sermons->count(),
                'published' => $sermons->where('is_published', true)->count(),
                'views' => (int) $sermons->sum('view_count'),
                'series' => $sermons->pluck('series_name')->filter()->unique()->count(),
            ],
            // For autocomplete in the form.
            'seriesOptions' => $sermons->pluck('series_name')->filter()->unique()->sort()->values(),
            'speakerOptions' => $sermons->pluck('speaker_name')->filter()->unique()->sort()->values(),
            'serviceTypes' => array_values(Sermon::SERVICE_TYPES),
            'can' => [
                'create' => $user->can('sermons.create'),
                'update' => $user->can('sermons.update'),
                'delete' => $user->can('sermons.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $sermon = Sermon::create([...$this->withUploadedMedia($request, $this->validated($request)), 'created_by' => $request->user()->id]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "\"{$sermon->title}\" added."]);

        return back();
    }

    public function update(Request $request, Sermon $sermon): RedirectResponse
    {
        $sermon->update($this->withUploadedMedia($request, $this->validated($request), $sermon));

        Inertia::flash('toast', ['type' => 'success', 'message' => "\"{$sermon->title}\" updated."]);

        return back();
    }

    public function destroy(Sermon $sermon): RedirectResponse
    {
        $sermon->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "\"{$sermon->title}\" deleted."]);

        return back();
    }

    /** Count a view — once per sermon per browser session so refreshes don't inflate it. */
    public function recordView(Request $request, Sermon $sermon): JsonResponse
    {
        $key = 'sermon_viewed.'.$sermon->id;

        if (! $request->session()->has($key)) {
            $sermon->increment('view_count');
            $request->session()->put($key, true);
        }

        return response()->json(['view_count' => $sermon->fresh()->view_count]);
    }

    private function validated(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'speaker_name' => ['required', 'string', 'max:150'],
            'speaker_photo' => ['nullable', 'string', 'max:500'],
            'series_name' => ['nullable', 'string', 'max:150'],
            'scripture_reference' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:5000'],
            'sermon_date' => ['required', 'date'],
            'service_type' => ['required', Rule::in(Sermon::SERVICE_TYPES)],
            'audio_url' => ['nullable', 'url:http,https', 'max:500'],
            'video_url' => ['nullable', 'url:http,https', 'max:500'],
            'notes_url' => ['nullable', 'url:http,https', 'max:500'],
            // Uploaded recordings and notes (type and size checked; stored under a generated name).
            'audio_file' => ['nullable', 'file', 'mimes:mp3,m4a,aac,wav,ogg', 'max:102400'],
            'video_file' => ['nullable', 'file', 'mimes:mp4,webm,mov', 'max:512000'],
            'notes_file' => ['nullable', 'file', 'mimes:pdf,doc,docx', 'max:20480'],
            'thumbnail_url' => ['nullable', 'string', 'max:500'],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'tags' => ['nullable', 'array', 'max:15'],
            'tags.*' => ['string', 'max:40'],
            'is_published' => ['boolean'],
        ]);

        // Tidy tags: trimmed, lower-case, no duplicates.
        $data['tags'] = collect($data['tags'] ?? [])
            ->map(fn ($t) => mb_strtolower(trim($t)))
            ->filter()->unique()->values()->all();

        return $data;
    }

    /**
     * Store uploaded audio, video and notes on the public disk (sermons are
     * published content) and point the matching *_url at them. A replaced
     * file that this app stored is deleted.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function withUploadedMedia(Request $request, array $data, ?Sermon $sermon = null): array
    {
        $disk = Storage::disk('public');

        foreach (['audio' => 'audio_url', 'video' => 'video_url', 'notes' => 'notes_url'] as $kind => $urlField) {
            unset($data["{$kind}_file"]);
            $file = $request->file("{$kind}_file");
            if (! $file) {
                continue;
            }

            $path = $file->store("sermons/{$kind}", 'public');
            if ($path === false) {
                throw ValidationException::withMessages(["{$kind}_file" => 'The file could not be saved. Please try again.']);
            }
            $data[$urlField] = $disk->url($path);

            $previous = $sermon?->{$urlField};
            $prefix = rtrim($disk->url(''), '/').'/';
            if ($previous && str_starts_with($previous, $prefix)) {
                $disk->delete(substr($previous, strlen($prefix)));
            }
        }

        return $data;
    }
}
