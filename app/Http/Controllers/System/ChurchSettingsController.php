<?php

namespace App\Http\Controllers\System;

use App\Http\Controllers\Controller;
use App\Support\ChurchSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Church profile (used on reports & PDFs), default currency and exchange rate. */
class ChurchSettingsController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('church-settings/index', ['settings' => ChurchSettings::all()]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'short_name' => ['required', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:60'],
            'logo_url' => ['nullable', 'string', 'max:500'],
            'currency' => ['required', Rule::in(ChurchSettings::CURRENCIES)],
            'exchange_rate' => ['required', 'numeric', 'min:0.0001', 'max:1000000'],
            'birthday_notifications' => ['boolean'],
            // Idle minutes before the screen locks; 0 turns the automatic lock off.
            'lock_screen_minutes' => ['required', 'integer', 'min:0', 'max:480'],
        ]);
        ChurchSettings::save($data);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Church settings saved.']);

        return back();
    }
}
