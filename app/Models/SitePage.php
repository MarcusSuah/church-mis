<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

/**
 * An editable website page (Privacy Policy, Terms & Conditions, Terms of Use…).
 *
 * The body is plain text with light formatting, rendered safely on the site:
 * blank lines separate paragraphs, lines starting with "## " are headings and
 * lines starting with "- " are bullet points. The slug is the page's address
 * (/pages/{slug}) and stays fixed when the title changes, so links never break.
 */
class SitePage extends Model
{
    /** Cache key for the footer links shared with every page. */
    public const FOOTER_CACHE_KEY = 'site-pages:footer';

    protected $fillable = ['slug', 'title', 'summary', 'body', 'is_published', 'show_in_footer', 'sort_order'];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'show_in_footer' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        $forget = fn () => Cache::forget(self::FOOTER_CACHE_KEY);
        static::saved($forget);
        static::deleted($forget);
    }

    /** @param  Builder<self>  $query */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    /** @return BelongsTo<User, $this> */
    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Published pages marked for the footer, as [title, url] pairs.
     *
     * @return list<array{title: string, url: string}>
     */
    public static function footerLinks(): array
    {
        return Cache::rememberForever(self::FOOTER_CACHE_KEY, fn () => self::published()
            ->where('show_in_footer', true)
            ->orderBy('sort_order')->orderBy('title')
            ->get(['slug', 'title'])
            ->map(fn (self $p) => ['title' => $p->title, 'url' => route('site.page', $p->slug)])
            ->all());
    }
}
