<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\SitePage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * System → Pages: edit the Privacy Policy, Terms & Conditions, Terms of Use
 * and any other simple website page. Published pages marked "show in footer"
 * are linked from the website footer.
 */
class SitePageController extends Controller
{
    /** Pages the website links to by fixed address; they can be edited and hidden but not deleted. */
    public const CORE = ['privacy-policy', 'terms-and-conditions', 'terms-of-use'];

    public function index(): Response
    {
        return Inertia::render('site-pages/index', [
            'pages' => SitePage::with('editor:id,name')->orderBy('sort_order')->orderBy('title')->get()
                ->map(fn (SitePage $p) => [
                    ...$p->only(['id', 'slug', 'title', 'summary', 'body', 'is_published', 'show_in_footer', 'sort_order']),
                    'url' => route('site.page', $p->slug),
                    'core' => in_array($p->slug, self::CORE, true),
                    'updated_by' => $p->editor?->name,
                    'updated_at' => $p->updated_at?->toIso8601String(),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['slug'] = $this->uniqueSlug($data['slug'] ?? '' ?: $data['title']);
        $page = new SitePage($data);
        $page->updated_by = $request->user()->id;
        $page->save();

        return $this->done("“{$page->title}” page created.");
    }

    public function update(Request $request, SitePage $page): RedirectResponse
    {
        $data = $this->validated($request, $page);
        // The fixed pages keep their address so links from the site and forms never break.
        if (in_array($page->slug, self::CORE, true) || blank($data['slug'] ?? null)) {
            unset($data['slug']);
        }
        $page->fill($data);
        $page->updated_by = $request->user()->id;
        $page->save();

        return $this->done("“{$page->title}” page saved.");
    }

    public function destroy(SitePage $page): RedirectResponse
    {
        abort_if(in_array($page->slug, self::CORE, true), 422, 'This page is linked from the website and forms. Hide it instead of deleting it.');
        $page->delete();

        return $this->done('Page deleted.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?SitePage $page = null): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'slug' => ['nullable', 'string', 'max:120', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('site_pages', 'slug')->ignore($page)],
            'summary' => ['nullable', 'string', 'max:300'],
            'body' => ['required', 'string', 'max:100000'],
            'is_published' => ['boolean'],
            'show_in_footer' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ], ['slug.regex' => 'Use lowercase letters, numbers and dashes only, e.g. "child-safeguarding".']);
    }

    private function uniqueSlug(string $source): string
    {
        $base = Str::limit(Str::slug($source), 110, '') ?: 'page';
        $slug = $base;
        for ($n = 2; SitePage::where('slug', $slug)->exists(); $n++) {
            $slug = "{$base}-{$n}";
        }

        return $slug;
    }

    private function done(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
