<?php

return [
    'enabled' => env('ACTIVITY_NOTIFICATIONS', true),

    // Seeders, queued jobs and artisan commands stay quiet unless this is on.
    'in_console' => env('ACTIVITY_IN_CONSOLE', false),

    // Changes to these fields never trigger an alert (counters, timestamps, tokens).
    'ignore_fields' => [
        'created_at', 'updated_at', 'deleted_at', 'remember_token', 'last_login_at',
        'view_count', 'two_factor_secret', 'two_factor_recovery_codes', 'two_factor_confirmed_at',
    ],

    /*
     * One entry per tracked model. Models that don't exist are skipped.
     *   label      – how it reads in the message ("updated sermon ...")
     *   name       – attribute(s) used to name the record; falls back to its id
     *   type       – a NotificationType value (info, member, event, finance, system ...)
     *   permission – who is alerted; if it doesn't exist in your permissions table,
     *                the Superadmin role is alerted instead
     *   link       – admin page opened when the alert is clicked
     *   details    – fields whose old → new values are shown (use for money)
     *   ignore     – extra fields to ignore for this model
     */
    'models' => [
        App\Models\Sermon::class => [
            'label' => 'sermon', 'name' => ['title'], 'type' => 'info',
            'permission' => 'sermons.update', 'link' => '/sermons',
        ],
        App\Models\GalleryAlbum::class => [
            'label' => 'gallery album', 'name' => ['title'], 'type' => 'info',
            'permission' => 'gallery.update', 'link' => '/gallery-albums',
        ],
        App\Models\Member::class => [
            'label' => 'member', 'name' => ['first_name', 'last_name'], 'type' => 'member',
            'permission' => 'members.update', 'link' => '/members',
        ],
        App\Models\User::class => [
            'label' => 'user account', 'name' => ['name'], 'type' => 'system',
            'permission' => 'users.update', 'link' => '/users',
        ],
        App\Models\Event::class => [
            'label' => 'event', 'name' => ['title'], 'type' => 'event',
            'permission' => 'events.update', 'link' => '/events',
        ],
        App\Models\Announcement::class => [
            'label' => 'announcement', 'name' => ['title'], 'type' => 'info',
            'permission' => 'announcements.update', 'link' => '/announcements',
        ],
        App\Models\Ministry::class => [
            'label' => 'ministry', 'name' => ['name'], 'type' => 'info',
            'permission' => 'ministries.update', 'link' => '/ministries',
        ],
        App\Models\Department::class => [
            'label' => 'department', 'name' => ['name'], 'type' => 'info',
            'permission' => 'departments.update', 'link' => '/departments',
        ],

        // Finance: show old → new amounts so every change is traceable.
        App\Models\Tithe::class => [
            'label' => 'tithe', 'name' => ['reference'], 'type' => 'finance',
            'permission' => 'tithes.update', 'link' => '/tithes', 'details' => ['amount'],
        ],
        App\Models\Offering::class => [
            'label' => 'offering', 'name' => ['reference'], 'type' => 'finance',
            'permission' => 'offerings.update', 'link' => '/offerings', 'details' => ['amount'],
        ],
        App\Models\Donation::class => [
            'label' => 'donation', 'name' => ['reference'], 'type' => 'finance',
            'permission' => 'donations.update', 'link' => '/donations', 'details' => ['amount'],
        ],
        App\Models\Expense::class => [
            'label' => 'expense', 'name' => ['title'], 'type' => 'finance',
            'permission' => 'expenses.update', 'link' => '/expenses', 'details' => ['amount'],
        ],
    ],
];