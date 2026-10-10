<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->only(['search', 'action', 'module']);

        return Inertia::render('audit-logs/index', [
            'logs' => tap($this->query($filters)->latest('created_at')->paginate(20)->withQueryString(), function ($page) {
                // Older rows only stored the email — look the name up.
                $names = \App\Models\User::whereIn('email', collect($page->items())->whereNull('performed_by_name')->pluck('performed_by'))->pluck('name', 'email');
                $page->getCollection()->transform(function (AuditLog $l) use ($names) {
                    $l->performed_by_name ??= $names[$l->performed_by] ?? ($l->performed_by === 'system' ? 'System' : $l->performed_by);

                    return $l;
                });
            }),
            'filters' => $filters,
            'stats' => [
                'total' => AuditLog::count(),
                'creates' => AuditLog::where('action', 'CREATE')->count(),
                'updates' => AuditLog::where('action', 'UPDATE')->count(),
                'deletes' => AuditLog::where('action', 'DELETE')->count(),
            ],
            'modules' => AuditLog::query()->whereNotNull('module')->distinct()->orderBy('module')->pluck('module'),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $rows = $this->query($request->only(['search', 'action', 'module']))->latest('created_at')->limit(20000)->cursor();

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            \App\Support\Csv::put($out, ['Date', 'Action', 'Module', 'Table', 'Description', 'Performed By', 'Email', 'Role', 'IP Address']);
            foreach ($rows as $l) {
                \App\Support\Csv::put($out, [$l->created_at, $l->action, $l->module, $l->table_name, $l->description, $l->performed_by_name ?? $l->performed_by, $l->performed_by, $l->performed_by_role, $l->ip_address]);
            }
            fclose($out);
        }, 'audit_logs_'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv']);
    }

    private function query(array $f)
    {
        return AuditLog::query()
            ->when($f['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w->where('performed_by', 'like', "%{$s}%")
                ->orWhere('performed_by_name', 'like', "%{$s}%")->orWhere('description', 'like', "%{$s}%")->orWhere('table_name', 'like', "%{$s}%")->orWhere('module', 'like', "%{$s}%")))
            ->when($f['action'] ?? null, fn ($q, $a) => $q->where('action', $a))
            ->when($f['module'] ?? null, fn ($q, $m) => $q->where('module', $m));
    }
}
