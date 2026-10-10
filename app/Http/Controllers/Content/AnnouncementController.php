<?php

namespace App\Http\Controllers\Content;

use App\Http\Controllers\Sacraments\RecordsController;
use App\Models\Announcement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class AnnouncementController extends RecordsController
{
    public const CATEGORIES = ['General', 'Service Update', 'Finance', 'Ministry', 'Bereavement', 'Membership', 'Outreach', 'Youth', 'Events'];

    public const PRIORITIES = ['Normal', 'High', 'Urgent'];

    public const AUDIENCES = ['All Members', 'Leadership', 'Choir Members', 'Youth', 'Men', 'Women', 'Deacons'];

    protected string $model = Announcement::class;

    protected string $page = 'announcements/index';

    protected string $permission = 'announcements';

    protected string $label = 'Announcement';

    protected string $orderBy = 'is_pinned';

    protected function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'max:10000'],
            'category' => ['required', Rule::in(self::CATEGORIES)],
            'priority' => ['required', Rule::in(self::PRIORITIES)],
            'author_name' => ['nullable', 'string', 'max:255'],
            'banner_url' => ['nullable', 'string', 'max:500'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_pinned' => ['boolean'],
            'is_published' => ['boolean'],
            'target_audience' => ['required', Rule::in(self::AUDIENCES)],
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        $data['author_name'] = $data['author_name'] ?? null ?: ($record?->author_name ?? auth()->user()?->name);

        return $data;
    }

    public function toggle(Request $request, string $id): RedirectResponse
    {
        $field = $request->validate(['field' => ['required', Rule::in(['is_pinned', 'is_published'])]])['field'];
        $a = Announcement::findOrFail($id);
        $a->update([$field => ! $a->{$field}]);
        Inertia::flash('toast', ['type' => 'success', 'message' => $field === 'is_pinned'
            ? ($a->is_pinned ? 'Pinned to top.' : 'Unpinned.') : ($a->is_published ? 'Published.' : 'Moved to drafts.')]);

        return back();
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'title', 'content', 'category', 'priority', 'author_name', 'banner_url', 'is_pinned', 'is_published', 'target_audience']),
            'start_date' => self::d($r->start_date),
            'end_date' => self::d($r->end_date),
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }

    protected function searchColumns(): array
    {
        return ['title', 'content', 'author_name'];
    }

    protected function filters(): array
    {
        return [
            'category' => ['values' => self::CATEGORIES, 'apply' => fn ($q, $v) => $q->where('category', $v)],
            'priority' => ['values' => self::PRIORITIES, 'apply' => fn ($q, $v) => $q->where('priority', $v)],
        ];
    }

    /** Pinned first, then newest. */
    protected function sort(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->orderByDesc('is_pinned')->orderByDesc('created_at')->orderByDesc('id');
    }

    protected function stats(\Illuminate\Database\Eloquent\Builder $all, \Illuminate\Database\Eloquent\Builder $filtered): array
    {
        return [
            'total' => (clone $all)->count(),
            'pinned' => (clone $all)->where('is_pinned', true)->count(),
            'urgent' => (clone $all)->where('priority', 'Urgent')->count(),
            'published' => (clone $all)->where('is_published', true)->count(),
        ];
    }

    protected function extraProps(): array
    {
        return ['categories' => self::CATEGORIES, 'priorities' => self::PRIORITIES, 'audiences' => self::AUDIENCES];
    }
}
