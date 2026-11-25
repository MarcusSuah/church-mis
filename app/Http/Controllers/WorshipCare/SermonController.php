<?php

namespace App\Http\Controllers\WorshipCare;

use App\Enums\ServiceSession;
use App\Enums\ServiceType;
use App\Http\Controllers\Controller;
use App\Models\Sermon;
use App\Rules\SafeUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Stevebauman\Purify\Facades\Purify;

class SermonController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $sermons = Sermon::query()
            ->orderByDesc('sermon_date')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('sermons/index', [
            'sermons' => $sermons->map(fn (Sermon $sermon) => [
                ...$sermon->only([
                    'id',
                    'title',
                    'speaker_name',
                    'speaker_photo',
                    'series_name',
                    'scripture_reference',
                    'description',
                    'service_type',
                    'service_session',
                    'audio_url',
                    'video_url',
                    'notes_url',
                    'thumbnail_url',
                    'duration_minutes',
                    'is_published',
                    'view_count',
                ]),

                'service_label' => $sermon->service_label,
                'sermon_date' => $sermon->sermon_date->format('Y-m-d'),
                'tags' => $sermon->tags ?? [],
            ]),

            'stats' => [
                'total' => $sermons->count(),
                'published' => $sermons->where('is_published', true)->count(),
                'views' => (int) $sermons->sum('view_count'),
                'series' => $sermons
                    ->pluck('series_name')
                    ->filter()
                    ->unique()
                    ->count(),
            ],

            'seriesOptions' => $sermons
                ->pluck('series_name')
                ->filter()
                ->unique()
                ->sort()
                ->values(),

            'speakerOptions' => $sermons
                ->pluck('speaker_name')
                ->filter()
                ->unique()
                ->sort()
                ->values(),

            'serviceTypes' => ServiceType::options(),
            'serviceSessions' => ServiceSession::options(),

            'can' => [
                'create' => $user->can('sermons.create'),
                'update' => $user->can('sermons.update'),
                'delete' => $user->can('sermons.delete'),
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $sermon = Sermon::create([
            ...$this->withUploadedMedia(
                $request,
                $this->validated($request)
            ),
            'created_by' => $request->user()->id,
        ]);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "\"{$sermon->title}\" added.",
        ]);

        return back();
    }

    public function update(Request $request, Sermon $sermon): RedirectResponse
    {
        $sermon->update(
            $this->withUploadedMedia(
                $request,
                $this->validated($request),
                $sermon
            )
        );

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "\"{$sermon->title}\" updated.",
        ]);

        return back();
    }

    public function destroy(Sermon $sermon): RedirectResponse
    {
        $sermon->delete();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "\"{$sermon->title}\" deleted.",
        ]);

        return back();
    }

    public function recordView(
        Request $request,
        Sermon $sermon
    ): JsonResponse {
        $key = 'sermon_viewed.'.$sermon->id;

        if (! $request->session()->has($key)) {
            $sermon->increment('view_count');
            $request->session()->put($key, true);
        }

        return response()->json([
            'view_count' => $sermon->fresh()->view_count,
        ]);
    }

    private function validated(Request $request): array
    {
        $serviceType = $request->input('service_type');

        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'speaker_name' => ['required', 'string', 'max:150'],
            'speaker_photo' => ['nullable', 'string', 'max:500'],
            'series_name' => ['nullable', 'string', 'max:200'],
            'scripture_reference' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:20000'],
            'sermon_date' => ['required', 'date'],

            'service_type' => [
                'required',
                Rule::enum(ServiceType::class),
            ],

            'service_session' => [
                'nullable',
                Rule::enum(ServiceSession::class),
            ],

            'audio_url' => ['nullable', 'url:http,https', 'max:500'],
            'video_url' => ['nullable', 'url:http,https', 'max:500'],
            'notes_url' => ['nullable', 'url:http,https', 'max:500'],

            'audio_file' => [
                'nullable',
                'file',
                'mimes:mp3,m4a,aac,wav,ogg',
                'max:102400',
            ],

            'video_file' => [
                'nullable',
                'file',
                'mimes:mp4,webm,mov',
                'max:512000',
            ],

            'notes_file' => [
                'nullable',
                'file',
                'mimes:pdf,doc,docx',
                'max:20480',
            ],

            'thumbnail_url' => ['nullable', 'string', 'max:500', new SafeUrl],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
            'tags' => ['nullable', 'array', 'max:15'],
            'tags.*' => ['string', 'max:40'],
            'is_published' => ['boolean'],
        ]);

        if ($serviceType !== ServiceType::SundayWorship->value) {
            $data['service_session'] = null;
        }

        $data['description'] = filled($data['description'] ?? null)
            ? Purify::clean($data['description'])
            : null;

        $data['tags'] = collect($data['tags'] ?? [])
            ->map(fn ($tag) => mb_strtolower(trim($tag)))
            ->filter()
            ->unique()
            ->values()
            ->all();

        return $data;
    }

    private function withUploadedMedia(
        Request $request,
        array $data,
        ?Sermon $sermon = null
    ): array {
        $disk = Storage::disk('public');

        foreach (
            [
                'audio' => 'audio_url',
                'video' => 'video_url',
                'notes' => 'notes_url',
            ] as $kind => $urlField
        ) {
            unset($data["{$kind}_file"]);

            $file = $request->file("{$kind}_file");

            if (! $file) {
                continue;
            }

            $path = $file->store("sermons/{$kind}", 'public');

            if ($path === false) {
                throw ValidationException::withMessages([
                    "{$kind}_file" => 'The file could not be saved. Please try again.',
                ]);
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
