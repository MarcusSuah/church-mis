<?php

namespace App\Http\Controllers\Content;

use App\Enums\DocumentCategory;
use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\Document;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * Church documents. Uploaded files are kept on the private disk and served
 * through download(), which counts downloads and enforces visibility.
 */
class DocumentController extends RecordsController
{
    public const DEPARTMENTS = ['Administration', 'Finance Committee', 'Board of Trustees', 'Ministries', 'Youth', 'Music Ministry', 'Outreach'];

    protected string $model = Document::class;

    protected string $page = 'documents/index';

    protected string $permission = 'documents';

    protected string $label = 'Document';

    protected string $orderBy = 'created_at';

    protected function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'category' => ['required', Rule::enum(DocumentCategory::class)],
            'file' => ['nullable', 'file', 'max:25600', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,csv,txt,png,jpg,jpeg,webp,zip'],
            'file_url' => ['nullable', 'url', 'max:500'],
            'thumbnail_url' => ['nullable', 'string', 'max:500'],
            'version' => ['nullable', 'string', 'max:20'],
            'author_name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:120'],
            'is_public' => ['boolean'],
            'tags' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $file = request()->file('file');
        unset($data['file']);

        if ($file) {
            if ($record?->file_url && str_starts_with($record->file_url, 'documents/')) {
                Storage::disk('local')->delete($record->file_url);
            }
            $data['file_url'] = $file->store('documents', 'local');
            $data['file_name'] = $file->getClientOriginalName();
            $data['file_size_kb'] = (int) ceil($file->getSize() / 1024);
            $data['file_type'] = strtoupper($file->getClientOriginalExtension());
        } elseif ($record && empty($data['file_url'])) {
            unset($data['file_url']); // keep existing file
        } elseif (! empty($data['file_url'])) {
            $data['file_type'] = strtoupper(pathinfo(parse_url($data['file_url'], PHP_URL_PATH) ?? '', PATHINFO_EXTENSION)) ?: 'LINK';
        }

        $data['tags'] = collect(explode(',', (string) ($data['tags'] ?? '')))->map(fn ($t) => trim($t))->filter()->unique()->values()->all();
        $data['version'] = $data['version'] ?? null ?: '1.0';
        $data['author_name'] = $data['author_name'] ?? null ?: ($record?->author_name ?? auth()->user()?->name);

        return $data;
    }

    public function archive(string $id): RedirectResponse
    {
        $d = Document::findOrFail($id);
        $d->update(['is_archived' => ! $d->is_archived]);
        Inertia::flash('toast', ['type' => 'success', 'message' => $d->is_archived ? 'Document archived.' : 'Document restored.']);

        return back();
    }

    /** Staff with documents.view get everything; other signed-in users only public documents. */
    public function download(Request $request, string $id)
    {
        $d = Document::findOrFail($id);
        abort_unless($d->is_public || $request->user()->can('documents.view'), 403);
        $d->increment('download_count');

        if ($d->file_url && str_starts_with($d->file_url, 'documents/')) {
            abort_unless(Storage::disk('local')->exists($d->file_url), 404, 'File missing.');

            return Storage::disk('local')->download($d->file_url, $d->file_name ?: basename($d->file_url));
        }
        abort_unless($d->file_url, 404, 'This document has no file.');

        return redirect()->away($d->file_url);
    }

    public function destroy(string $id): RedirectResponse
    {
        $d = Document::findOrFail($id);
        if ($d->file_url && str_starts_with($d->file_url, 'documents/')) {
            Storage::disk('local')->delete($d->file_url);
        }

        return parent::destroy($id);
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'title', 'description', 'file_name', 'file_size_kb', 'file_type', 'thumbnail_url', 'version', 'author_name', 'department', 'is_public', 'is_archived', 'download_count']),
            'category' => self::v($r->category),
            'tags' => $r->tags ?? [],
            'has_file' => (bool) $r->file_url,
            'external_url' => $r->file_url && ! str_starts_with($r->file_url, 'documents/') ? $r->file_url : null,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }

    protected function searchColumns(): array
    {
        return ['title', 'description', 'author_name', 'department', 'tags'];
    }

    protected function filters(): array
    {
        return [
            'archived' => ['values' => ['yes', 'no'], 'apply' => fn ($q, $v) => $q->where('is_archived', $v === 'yes')],
            'category' => ['values' => array_map(fn ($c) => $c->value, DocumentCategory::cases()), 'apply' => fn ($q, $v) => $q->where('category', $v)],
        ];
    }

    protected function filterDefaults(): array
    {
        return ['archived' => 'no'];
    }

    protected int $perPage = 12;

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        // Category chips count documents matching the search and archive filter, before the category filter.
        $f = request();
        $base = (clone $all)->where('is_archived', $f->string('archived')->toString() === 'yes');
        \App\Support\ListQuery::search($base, mb_substr(trim($f->string('search')->toString()), 0, 100), $this->searchColumns());

        return [
            'total' => (clone $all)->where('is_archived', false)->count(),
            'public' => (clone $all)->where('is_archived', false)->where('is_public', true)->count(),
            'archived' => (clone $all)->where('is_archived', true)->count(),
            'downloads' => (int) (clone $all)->sum('download_count'),
            'categories' => (clone $base)->toBase()->selectRaw('category, count(*) as n')->groupBy('category')->pluck('n', 'category'),
            'base_total' => (clone $base)->count(),
        ];
    }

    protected function extraProps(): array
    {
        return ['categories' => array_map(fn ($c) => $c->value, DocumentCategory::cases()), 'departments' => self::DEPARTMENTS];
    }
}
