<?php

use App\Models\Announcement;
use App\Models\AttendanceSession;
use App\Models\Baptism;
use App\Models\Board;
use App\Models\Budget;
use App\Models\Committee;
use App\Models\Communion;
use App\Models\Department;
use App\Models\Document;
use App\Models\Donation;
use App\Models\Event;
use App\Models\Expense;
use App\Models\Family;
use App\Models\FinanceFund;
use App\Models\Funeral;
use App\Models\GalleryAlbum;
use App\Models\Leader;
use App\Models\Member;
use App\Models\Ministry;
use App\Models\Offering;
use App\Models\Sermon;
use App\Models\SitePage;
use App\Models\Tithe;
use App\Models\User;
use App\Models\Wedding;

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
        Sermon::class => [
            'label' => 'sermon', 'name' => ['title'], 'type' => 'info',
            'permission' => 'sermons.update', 'link' => '/sermons',
        ],
        GalleryAlbum::class => [
            'label' => 'gallery album', 'name' => ['title'], 'type' => 'info',
            'permission' => 'website.manage', 'link' => '/gallery-albums',
        ],
        Member::class => [
            'label' => 'member', 'name' => ['first_name', 'last_name'], 'type' => 'member',
            'permission' => 'members.update', 'link' => '/member-management',
        ],
        User::class => [
            'label' => 'user account', 'name' => ['name'], 'type' => 'system',
            'permission' => 'users.update', 'link' => '/admin/users',
        ],
        Event::class => [
            'label' => 'event', 'name' => ['title'], 'type' => 'event',
            'permission' => 'events.update', 'link' => '/events',
        ],
        Announcement::class => [
            'label' => 'announcement', 'name' => ['title'], 'type' => 'info',
            'permission' => 'announcements.update', 'link' => '/announcements',
        ],
        Ministry::class => [
            'label' => 'ministry', 'name' => ['name'], 'type' => 'info',
            'permission' => 'ministries.update', 'link' => '/ministries',
        ],
        Department::class => [
            'label' => 'department', 'name' => ['name'], 'type' => 'info',
            'permission' => 'departments.update', 'link' => '/departments',
        ],

        // Finance: show old → new amounts so every change is traceable.
        Tithe::class => [
            'label' => 'tithe', 'name' => ['member_name', 'receipt_number'], 'type' => 'finance',
            'permission' => 'tithes.update', 'link' => '/tithes', 'details' => ['amount'],
        ],
        Offering::class => [
            'label' => 'offering', 'name' => ['member_name', 'receipt_number'], 'type' => 'finance',
            'permission' => 'offerings.update', 'link' => '/offerings', 'details' => ['amount'],
        ],
        Donation::class => [
            'label' => 'donation', 'name' => ['donor_name', 'receipt_number'], 'type' => 'finance',
            'permission' => 'donations.update', 'link' => '/donations', 'details' => ['amount'],
        ],
        Expense::class => [
            'label' => 'expense', 'name' => ['title'], 'type' => 'finance',
            'permission' => 'expenses.update', 'link' => '/expenses', 'details' => ['amount'],
        ],

        // Sacraments. Pastoral care and prayer requests are left out on purpose:
        // their alerts must not reveal confidential or private cases.
        Baptism::class => [
            'label' => 'baptism record', 'name' => ['candidate_name'], 'type' => 'info',
            'permission' => 'baptisms.update', 'link' => '/baptisms',
        ],
        Communion::class => [
            'label' => 'communion service', 'name' => ['service_name'], 'type' => 'info',
            'permission' => 'communions.update', 'link' => '/communions',
        ],
        Wedding::class => [
            'label' => 'wedding record', 'name' => ['groom_name', 'bride_name'], 'type' => 'info',
            'permission' => 'weddings.update', 'link' => '/weddings',
        ],
        Funeral::class => [
            'label' => 'funeral record', 'name' => ['deceased_name'], 'type' => 'info',
            'permission' => 'funerals.update', 'link' => '/funerals',
        ],

        // Church structure and people.
        Board::class => [
            'label' => 'board', 'name' => ['name'], 'type' => 'info',
            'permission' => 'boards.update', 'link' => '/boards',
        ],
        Committee::class => [
            'label' => 'committee', 'name' => ['name'], 'type' => 'info',
            'permission' => 'committees.update', 'link' => '/committees',
        ],
        Leader::class => [
            'label' => 'church leader', 'name' => ['first_name', 'last_name'], 'type' => 'info',
            'permission' => 'leadership.update', 'link' => '/leadership',
        ],
        Family::class => [
            'label' => 'family', 'name' => ['family_name'], 'type' => 'member',
            'permission' => 'members.update', 'link' => '/families',
        ],
        AttendanceSession::class => [
            'label' => 'attendance session', 'name' => ['title'], 'type' => 'info',
            'permission' => 'attendance.update', 'link' => '/attendance',
            'ignore' => ['total_present', 'total_absent', 'total_late', 'total_excused'],
        ],
        Document::class => [
            'label' => 'document', 'name' => ['title'], 'type' => 'info',
            'permission' => 'documents.update', 'link' => '/documents',
            'ignore' => ['download_count'],
        ],
        SitePage::class => [
            'label' => 'website page', 'name' => ['title'], 'type' => 'info',
            'permission' => 'website.manage', 'link' => '/site-pages',
        ],

        // Finance setup.
        Budget::class => [
            'label' => 'budget', 'name' => ['category', 'fiscal_year'], 'type' => 'finance',
            'permission' => 'budgets.update', 'link' => '/budgets', 'details' => ['allocated_amount'],
            'ignore' => ['spent_amount'],
        ],
        FinanceFund::class => [
            'label' => 'fund', 'name' => ['name'], 'type' => 'finance',
            'permission' => 'finance.update', 'link' => '/finance-management', 'details' => ['target_amount'],
            'ignore' => ['current_balance'],
        ],
    ],
];
