<?php

return [
    'name' => env('CHURCH_NAME', 'Saint Simon Baptist Church'),
    'short_name' => env('CHURCH_SHORT_NAME', 'SSBCMS'),
    'email' => env('CHURCH_EMAIL', 'info@saintsimonbaptistchurch.org'),
    'phone' => env('CHURCH_PHONE'),
    'address' => env('CHURCH_ADDRESS'),
    // Public website (all editable under System → Website).
    'tagline' => 'Established in faith',
    'description' => 'A Christ-centred Baptist family committed to worship, discipleship and service.',
    'mission' => 'To make disciples of Jesus Christ through faithful worship, sound teaching, sincere fellowship and compassionate service.',
    'vision' => 'A growing congregation where every member knows Christ, grows in grace and serves the community.',
    'story' => null,
    'pastor_message' => 'The church is not a building we visit but a family we belong to. Come as you are — and let us grow together into the fullness of Christ.',
    'city' => env('CHURCH_CITY'),
    'country' => env('CHURCH_COUNTRY', 'Liberia'),
    'service_sunday_school' => 'Sundays, 8:30 AM',
    'service_sunday_worship' => 'Sundays, 10:00 AM',
    'service_bible_study' => 'Wednesdays, 6:00 PM',
    'service_prayer_meeting' => 'Fridays, 6:00 PM',
    // Default currency (USD or LRD). Admins can change it under Church Settings.
    'currency' => env('CHURCH_CURRENCY', 'USD'),
    // How many Liberian dollars make one US dollar (editable in Church Settings).
    'exchange_rate' => env('CHURCH_EXCHANGE_RATE', 190),
    'logo_url' => env('CHURCH_LOGO_URL'),
    'birthday_notifications' => env('CHURCH_BIRTHDAY_NOTIFICATIONS', true),

    // Lock the screen after this many idle minutes (0 = never). Admins change it in Church Settings.
    'lock_screen_minutes' => (int) env('LOCK_SCREEN_MINUTES', 10),
    'senior_pastor' => env('CHURCH_SENIOR_PASTOR', 'Senior Pastor'),
    'church_secretary' => env('CHURCH_SECRETARY'),

    /*
    | Sign-in protection: attempts per minute (per email + IP) and per hour
    | (per IP), and how many devices one account may be signed in on at once.
    */
    'login_attempts_per_minute' => env('CHURCH_LOGIN_ATTEMPTS_PER_MINUTE', 5),
    'login_attempts_per_hour' => env('CHURCH_LOGIN_ATTEMPTS_PER_HOUR', 30),
    'max_sessions' => env('CHURCH_MAX_SESSIONS', 3),

    // API tokens (Phase 4). Tokens are for non-browser clients (a mobile app,
    // integrations); the church's own web app uses cookie sessions instead.
    'api_tokens_enabled' => (bool) env('CHURCH_API_TOKENS', true),
    'api_token_days' => (int) env('CHURCH_API_TOKEN_DAYS', 30),       // default lifetime
    'api_max_tokens' => (int) env('CHURCH_API_MAX_TOKENS', 10),       // per user; oldest are revoked

    /*
    | Member logins have no default password. An approved member is emailed a
    | one-time "set your password" link instead (see App\Support\MemberAccounts).
    |
    | Self sign-up at /register. When true, anyone can create a login, but they
    | must verify their email and only reach the member portal until staff
    | link them to an approved member record.
    */
    'self_registration' => (bool) env('CHURCH_SELF_REGISTRATION', true),

    /*
    | Activity monitoring: approximate location of sign-ins. Off by default
    | because it sends users' IP addresses to a third party. When enabled the
    | endpoint must be HTTPS; {ip} is replaced with the address. The response
    | must use ip-api.com's field names (status, country, regionName, city),
    | e.g. https://pro.ip-api.com/json/{ip}?key=YOUR_KEY&fields=status,country,regionName,city
    */
    'geoip_enabled' => (bool) env('CHURCH_GEOIP', false),
    'geoip_endpoint' => env('CHURCH_GEOIP_ENDPOINT'),
    'activity_retention_days' => env('CHURCH_ACTIVITY_RETENTION_DAYS', 180),
    // Failed sign-ins from one IP within 15 minutes before it is flagged suspicious.
    'suspicious_failed_logins' => env('CHURCH_SUSPICIOUS_FAILED_LOGINS', 5),
];
