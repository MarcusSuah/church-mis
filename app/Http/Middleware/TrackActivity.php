<?php

namespace App\Http\Middleware;

use App\Observers\AuditObserver;
use App\Services\ActivityLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logs what signed-in users do: every page they open and every change they
 * submit (create / update / delete). Runs after the response is sent.
 */
class TrackActivity
{
    /** Background / noisy routes that aren't worth recording. */
    private const IGNORE = ['login.store', 'logout', 'password.change.update', 'notifications.read', 'notifications.read-all', 'notifications.toggle-read', 'sermons.view', 'prayer-requests.pray', 'uploads.*', 'storage.*'];

    /** Exports, PDFs and file downloads: recorded in the audit log as EXPORT. */
    private const DOWNLOADS = ['*.export', '*.pdf', '*.download', 'finance.receipts'];

    /** Route name prefix => audit log module. */
    private const DOWNLOAD_MODULES = [
        'reports' => 'Reports', 'finance' => 'Finance', 'certificates' => 'Sacraments', 'documents' => 'Content',
        'members' => 'Members', 'member-directory' => 'Members', 'families' => 'Members', 'member' => 'Members',
        'audit-logs' => 'Security', 'activity' => 'Security',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    /** "Downloaded reports PDF (finance, this_year)" in the audit log, so exports of church data are traceable. */
    private function auditDownload(Request $request): void
    {
        $route = (string) $request->route()?->getName();
        $prefix = explode('.', $route)[0];
        $details = collect(['type', 'range', 'format'])
            ->map(fn (string $key) => $request->query($key))
            ->filter(fn ($value) => is_string($value) && $value !== '')
            ->implode(', ');

        AuditObserver::note(
            'EXPORT',
            self::DOWNLOAD_MODULES[$prefix] ?? 'System',
            'Downloaded '.str_replace(['.', '-'], ' ', $route).($details !== '' ? " ({$details})" : ''),
            // audit_logs.table_name is required: the area the data came from.
            $prefix !== '' ? $prefix : 'downloads',
            ['route' => $route, 'path' => $request->path()],
        );
    }

    public function terminate(Request $request, Response $response): void
    {
        $user = $request->user();
        if (! $user || $request->routeIs(...self::IGNORE) || $response->getStatusCode() >= 500) {
            return;
        }

        $method = $request->method();
        if ($method === 'GET' && $request->routeIs(...self::DOWNLOADS)) {
            if ($response->getStatusCode() < 400) {
                $this->auditDownload($request);
            }

            return;
        }
        if ($method === 'GET') {
            // Only real page visits — not partial reloads, prefetches or downloads.
            if ($request->header('X-Inertia-Partial-Data') || $request->header('Purpose') === 'prefetch' || $request->header('X-Inertia-Prefetch')) {
                return;
            }
            if (! $request->header('X-Inertia') && ! str_contains((string) $response->headers->get('Content-Type'), 'text/html')) {
                return;
            }
            ActivityLogger::log($request, 'page_view', 'Opened '.$request->path());

            return;
        }

        $event = match ($method) {
            'POST' => 'create',
            'PUT', 'PATCH' => 'update',
            'DELETE' => 'delete',
            default => strtolower($method),
        };
        $failed = $response->getStatusCode() >= 400 || session()->has('errors');
        $route = $request->route()?->getName() ?? $request->path();

        ActivityLogger::log($request, $event, ($failed ? 'Failed: ' : '').str_replace(['.', '-'], [' → ', ' '], $route));
    }
}
