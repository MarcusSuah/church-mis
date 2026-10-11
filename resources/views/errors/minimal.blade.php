{{--
    Fallback error page, used when the React error page (resources/js/pages/error.tsx)
    can't be shown: server errors, maintenance mode, and requests that are not normal
    page loads. Self-contained (inline CSS and icons, no Vite, no database), so it
    still renders when the rest of the app is down. Each {status}.blade.php fills in
    the sections below.
--}}
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="robots" content="noindex">
        <title>@yield('title') · {{ config('church.name', config('app.name')) }}</title>
        <style>
            :root { --bg: #f8fafc; --card: #ffffff; --text: #0f172a; --muted: #64748b; --primary: #1e3a8a; --primary-text: #ffffff; --accent: #b45309; --border: #e2e8f0; }
            @media (prefers-color-scheme: dark) {
                :root { --bg: #0b1120; --card: #111827; --text: #f1f5f9; --muted: #94a3b8; --primary: #3b82f6; --primary-text: #0b1120; --accent: #f59e0b; --border: #1f2937; }
            }
            * { box-sizing: border-box; }
            body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
            main { max-width: 28rem; width: 100%; text-align: center; }
            .code-wrap { position: relative; display: flex; justify-content: center; margin-bottom: 24px; }
            .code { margin: 0; font-size: 8rem; line-height: 1; font-weight: 800; color: var(--primary); opacity: .18; user-select: none; }
            .icon { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
            .icon span { display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 16px; background: var(--card); box-shadow: 0 10px 25px -5px rgba(15, 23, 42, .15); color: var(--accent); }
            h2 { margin: 0 0 8px; font-size: 1.5rem; font-weight: 600; }
            p { margin: 0; color: var(--muted); line-height: 1.6; }
            .hint { margin-top: 8px; font-size: .875rem; }
            .actions { margin-top: 32px; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
            .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px; font-weight: 500; text-decoration: none; cursor: pointer; font-size: 1rem; border: 1px solid var(--border); background: var(--card); color: var(--text); }
            .btn-primary { background: var(--primary); border-color: var(--primary); color: var(--primary-text); }
            .btn:hover { opacity: .9; }
            .church { margin-top: 40px; font-size: .75rem; color: var(--muted); }
            svg { width: 30px; height: 30px; }
            .btn svg { width: 16px; height: 16px; }
        </style>
    </head>
    <body>
        <main role="main">
            <div class="code-wrap">
                <h1 class="code">@yield('code')</h1>
                <div class="icon">
                    <span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="@yield('icon', 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z')" />
                        </svg>
                    </span>
                </div>
            </div>

            <h2>@yield('title')</h2>
            <p>@yield('message')</p>
            @hasSection('hint')
                <p class="hint">@yield('hint')</p>
            @endif

            <div class="actions">
                @hasSection('primary-action')
                    @yield('primary-action')
                @else
                    @php($back = request()->headers->get('referer'))
                    <a href="{{ $back && $back !== request()->fullUrl() ? $back : url('/') }}" class="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>
                        Go Back
                    </a>
                @endif
                <a href="{{ url('/') }}" class="btn">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
                    Home
                </a>
            </div>

            <p class="church">{{ config('church.name', config('app.name')) }}</p>
        </main>
    </body>
</html>
