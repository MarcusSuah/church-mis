<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\Belief;
use App\Models\HeroSlide;
use App\Rules\SafeUrl;
use App\Support\ChurchSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** System → Website: hero slides, statement of faith and website text. */
class WebsiteController extends Controller
{
    private const TEXT_KEYS = [
        'tagline',
        'description',
        'mission',
        'vision',
        'story',
        'pastor_message',
        'city',
        'country',
        'service_sunday_school',
        'service_sunday_worship',
        'service_bible_study',
        'service_prayer_meeting',
        'about_heading',
        'about_image_1',
        'about_image_2',
        'about_image_3',
        'about_caption_1',
        'about_caption_2',
        'about_caption_3',
        'contact_intro',
    ];

    public function index(): Response
    {
        return Inertia::render('website/index', [
            'content' => array_intersect_key(ChurchSettings::all(), array_flip(self::TEXT_KEYS)),
            'slides' => HeroSlide::orderBy('sort_order')->orderBy('id')->get(),
            'beliefs' => Belief::orderBy('sort_order')->orderBy('id')->get(),
        ]);
    }

    public function updateContent(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'tagline' => ['nullable', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'mission' => ['nullable', 'string', 'max:1000'],
            'vision' => ['nullable', 'string', 'max:1000'],
            'story' => ['nullable', 'string', 'max:5000'],
            'pastor_message' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:120'],
            'country' => ['nullable', 'string', 'max:120'],
            'service_sunday_school' => ['nullable', 'string', 'max:120'],
            'service_sunday_worship' => ['nullable', 'string', 'max:120'],
            'service_bible_study' => ['nullable', 'string', 'max:120'],
            'service_prayer_meeting' => ['nullable', 'string', 'max:120'],
            'about_heading' => ['nullable', 'string', 'max:120'],
            'about_image_1' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/(?!/))\S+$#i'],
            'about_image_2' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/(?!/))\S+$#i'],
            'about_image_3' => ['nullable', 'string', 'max:500', 'regex:#^(https?://|/(?!/))\S+$#i'],
            'about_caption_1' => ['nullable', 'string', 'max:120'],
            'about_caption_2' => ['nullable', 'string', 'max:120'],
            'about_caption_3' => ['nullable', 'string', 'max:120'],
            'contact_intro' => ['nullable', 'string', 'max:300'],
        ]);
        ChurchSettings::save($data);

        return $this->done('Website content saved.');
    }

    public function storeSlide(Request $request): RedirectResponse
    {
        HeroSlide::create($this->slideData($request));

        return $this->done('Hero slide added.');
    }

    public function updateSlide(Request $request, HeroSlide $slide): RedirectResponse
    {
        $slide->update($this->slideData($request));

        return $this->done('Hero slide updated.');
    }

    public function destroySlide(HeroSlide $slide): RedirectResponse
    {
        $slide->delete();

        return $this->done('Hero slide deleted.');
    }

    public function storeBelief(Request $request): RedirectResponse
    {
        Belief::create($this->beliefData($request));

        return $this->done('Belief added.');
    }

    public function updateBelief(Request $request, Belief $belief): RedirectResponse
    {
        $belief->update($this->beliefData($request));

        return $this->done('Belief updated.');
    }

    public function destroyBelief(Belief $belief): RedirectResponse
    {
        $belief->delete();

        return $this->done('Belief deleted.');
    }

    private function slideData(Request $request): array
    {
        return $request->validate([
            'eyebrow' => ['nullable', 'string', 'max:120'],
            'title' => ['required', 'string', 'max:160'],
            'subtitle' => ['nullable', 'string', 'max:500'],
            'image_url' => ['nullable', 'string', 'max:500', new SafeUrl],
            'primary_label' => ['nullable', 'required_with:primary_url', 'string', 'max:60'],
            'primary_url' => ['nullable', 'string', 'max:255', new SafeUrl],
            'secondary_label' => ['nullable', 'required_with:secondary_url', 'string', 'max:60'],
            'secondary_url' => ['nullable', 'string', 'max:255', new SafeUrl],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]) + ['sort_order' => 0];
    }

    private function beliefData(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'body' => ['required', 'string', 'max:1000'],
            'is_active' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
        ]) + ['sort_order' => 0];
    }

    private function done(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
