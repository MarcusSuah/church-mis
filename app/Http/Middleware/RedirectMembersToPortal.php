<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectMembersToPortal
{
    /**
     * Send a Member-only user to their portal instead of a staff route —
     * covers direct navigation/bookmarks, not just the moment right after
     * login (LoginResponse handles that case, but a Member could still type
     * /dashboard into the address bar any time in their session).
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isMemberOnly()) {
            return redirect()->route('member.portal');
        }

        return $next($request);
    }
}
