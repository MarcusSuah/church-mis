<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\Api\GuardApiAccess;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\EnsureScreenUnlocked;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\GuardAccess;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectMembersToPortal;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\TrackActivity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        // Clickjacking, MIME-sniffing, referrer and HTTPS headers on every response.
        $middleware->append(SecurityHeaders::class);

        $middleware->web(append: [
            HandleAppearance::class,
            GuardAccess::class,
            HandleInertiaRequests::class,
            EnsurePasswordChanged::class,
            EnsureScreenUnlocked::class,
            TrackActivity::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        // Phase 4 API: cookie sessions (with CSRF) for the church's own frontends,
        // Bearer tokens for everything else; rate limits and blocked IPs/accounts.
        $middleware->statefulApi();
        $middleware->throttleApi('api');
        $middleware->api(append: [GuardApiAccess::class]);

        // F09: a browser session ends once its password changes on another device.
        $middleware->authenticateSessions();

        $middleware->alias([
            'password.changed' => EnsurePasswordChanged::class,
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'hasRole' => EnsureUserHasRole::class,
            'redirect.members' => RedirectMembersToPortal::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // /api/* errors use the standard JSON envelope and never expose exception details (Phase 4).
        $exceptions->render(fn (Throwable $e, Request $request) => $request->is('api/*')
            ? ApiExceptionRenderer::render($e, $request)
            : null);

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Errors stay on the page: in-app (Inertia) requests get a toast and are
        // sent back to where they were; full page loads get a friendly error page.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();
            $debug500 = $status >= 500 && config('app.debug');
            $messages = [
                401 => 'Please sign in to continue.',
                402 => 'This feature is not available.',
                403 => 'You do not have permission to do that.',
                404 => 'That page or record could not be found.',
                405 => 'That action is not allowed.',
                419 => 'Your session expired. Please try again.',
                422 => 'That request could not be completed.',
                429 => 'Too many requests. Please wait a moment and try again.',
                500 => 'Something went wrong on our side. Please try again.',
                503 => 'The system is under maintenance. Please try again shortly.',
            ];
            if (! isset($messages[$status]) || $debug500 || $request->expectsJson()) {
                return $response;
            }
            $custom = $e instanceof HttpExceptionInterface && $e->getMessage() !== '' && $status !== 404
                ? $e->getMessage() : $messages[$status];

            if ($request->header('X-Inertia') && $request->hasSession()) {
                Inertia::flash('toast', ['type' => 'error', 'message' => $custom]);

                return redirect()->back(302, [], url('/dashboard'));
            }
            // Full page loads get the friendly error page (resources/js/pages/error.tsx) for every
            // status above; other requests (e.g. a form post outside Inertia) get the matching
            // resources/views/errors/{status}.blade.php page.
            if ($request->isMethod('GET')) {
                $page = Inertia::render('error', ['status' => $status, 'message' => $custom])
                    ->toResponse($request)->setStatusCode($status);
                // Keep "try again after N seconds" (429) and maintenance (503) hints.
                if ($response->headers->has('Retry-After')) {
                    $page->headers->set('Retry-After', $response->headers->get('Retry-After'));
                }

                return $page;
            }

            return $response;
        });
    })->create();
