<?php

namespace Database\Seeders;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;

/**
 * Base for the sample-data seeders.
 *
 *  - Runs with model events switched off, so seeding does not fill the audit
 *    log, send notifications or create member logins and invitation emails.
 *    (Slugs and Member IDs are therefore set explicitly by each seeder.)
 *  - Demo data never goes into production unless a seeder says it is safe
 *    there (e.g. the standard finance funds and website text).
 *  - Every seeder is safe to run more than once: existing records are kept.
 */
abstract class DemoSeeder extends Seeder
{
    abstract protected function seed(): void;

    /** Override to allow a seeder that only creates standard setup data in production. */
    protected function allowedInProduction(): bool
    {
        return false;
    }

    public function run(): void
    {
        if (app()->isProduction() && ! $this->allowedInProduction()) {
            $this->command?->warn(static::class.' skipped: demo data is never added in production.');

            return;
        }

        Model::withoutEvents(fn () => $this->seed());
    }

    /**
     * The record matching $match, or a new one with $values. Bypasses
     * $fillable (seeders also set slug, Member ID and similar fields).
     *
     * @template TModel of Model
     *
     * @param  class-string<TModel>  $model
     * @param  array<string, mixed>  $match
     * @param  array<string, mixed>  $values
     * @return TModel
     */
    protected function firstOrMake(string $model, array $match, array $values = []): Model
    {
        return $model::query()->where($match)->first() ?? $model::forceCreate([...$match, ...$values]);
    }

    /**
     * A unique slug for a model that uses HasSlug (needed because model
     * events — which normally create the slug — are off while seeding).
     *
     * @param  class-string  $model
     */
    protected function slug(string $model, string $source): string
    {
        return $model::uniqueSlug($source);
    }
}
