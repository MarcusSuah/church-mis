<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Gives a model a unique, URL-friendly `slug` built from its title or name.
 *
 *  - The slug is created when the record is first saved, and filled in later
 *    for older records that have none. It does not change when the title is
 *    edited, so shared links keep working.
 *  - Duplicates get a numeric suffix: "youth-ministry", "youth-ministry-2".
 *  - Route model binding accepts the slug or, for older links, the id.
 *
 * Each model says what the slug is made from via slugSource().
 */
trait HasSlug
{
    /** Text the slug is generated from (e.g. the title or full name). */
    abstract public function slugSource(): string;

    public static function bootHasSlug(): void
    {
        static::saving(function (self $model): void {
            if (blank($model->getAttribute('slug'))) {
                $model->setAttribute('slug', static::uniqueSlug($model->slugSource(), $model->getKey()));
            }
        });
    }

    /** A slug for $source that no other record of this model uses. */
    public static function uniqueSlug(string $source, mixed $ignoreKey = null): string
    {
        $base = Str::limit(Str::slug($source), 180, '') ?: Str::lower(class_basename(static::class));
        $slug = $base;
        $suffix = 2;

        while (static::slugTaken($slug, $ignoreKey)) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private static function slugTaken(string $slug, mixed $ignoreKey): bool
    {
        $model = new static;

        return static::query()->withoutGlobalScopes()
            ->where('slug', $slug)
            ->when($ignoreKey !== null, fn (Builder $q) => $q->where($model->getKeyName(), '!=', $ignoreKey))
            ->exists();
    }

    /** @param  Builder<static>  $query */
    public function scopeWhereSlug(Builder $query, string $slug): Builder
    {
        return $query->where($this->qualifyColumn('slug'), $slug);
    }

    /**
     * {model} route parameters resolve by slug first, then by id, so links
     * built before slugs existed still work.
     */
    public function resolveRouteBinding($value, $field = null): ?Model
    {
        if ($field !== null) {
            return parent::resolveRouteBinding($value, $field);
        }

        return $this->newQuery()->where('slug', $value)->first()
            ?? $this->newQuery()->whereKey($value)->first();
    }
}
