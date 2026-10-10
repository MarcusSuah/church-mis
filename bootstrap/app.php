<?php

use App\Exceptions\ApiExceptionRenderer;
use App\Http\Middleware\EnsurePasswordChanged;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\GuardAccess;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RedirectMembersToPortal;
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

        $middleware->web(append: [
            HandleAppearance::class,
            GuardAccess::class,
            HandleInertiaRequests::class,
            EnsurePasswordChanged::class,
            TrackActivity::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
        $middleware->alias([
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
            if ($request->isMethod('GET') && in_array($status, [403, 404, 500, 503], true)) {
                return Inertia::render('error', ['status' => $status, 'message' => $custom])
                    ->toResponse($request)->setStatusCode($status);
            }

            return $response;
        });
    })->create();
