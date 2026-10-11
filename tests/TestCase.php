<?php

namespace Tests;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Fortify\Features;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Pages render without a compiled Vite build in CI and local test runs.
        $this->withoutVite();
    }

    /**
     * A real browser has one session per person; a test reuses one session
     * while switching users. Forget the previous user's password hash so
     * AuthenticateSession (Phase 4, F09) doesn't sign the next user out.
     */
    public function actingAs(Authenticatable $user, $guard = null)
    {
        if ($this->app->bound('session.store')) {
            $this->app['session.store']->forget('password_hash_web');
        }

        return parent::actingAs($user, $guard);
    }

    protected function skipUnlessFortifyHas(string $feature, ?string $message = null): void
    {
        if (! Features::enabled($feature)) {
            $this->markTestSkipped($message ?? "Fortify feature [{$feature}] is not enabled.");
        }
    }
}
