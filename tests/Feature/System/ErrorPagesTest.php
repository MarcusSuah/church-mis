<?php

use Inertia\Testing\AssertableInertia as Assert;

test('a missing page renders the friendly error page with its status', function () {
    $this->get('/no-such-page')->assertNotFound()->assertInertia(fn (Assert $p) => $p
        ->component('error')
        ->where('status', 404));
});

test('a page opened with the wrong method renders the error page with 405', function () {
    $this->get('/lock-screen/unlock')->assertStatus(405)->assertInertia(fn (Assert $p) => $p
        ->component('error')
        ->where('status', 405));
});

test('requests that are not page loads get the branded error view with a home button', function () {
    $this->post('/no-such-page')->assertNotFound()
        ->assertSee('Page Not Found')
        ->assertSee("The page you're looking for doesn't exist or has been moved.")
        ->assertSee('Home')
        ->assertSee(config('church.name'));
});
