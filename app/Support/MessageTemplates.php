<?php

namespace App\Support;

/**
 * Ready-made celebration messages for Birthdays & Celebrations.
 *
 * Placeholders: {first_name}, {full_name}, {age} and {church_name}. The
 * birthdays page previews them and BirthdayController fills them per member.
 */
final class MessageTemplates
{
    /** @var array<string, array{subject: string, messages: list<string>}> */
    public const OCCASIONS = [
        'Birthday' => [
            'subject' => 'Happy Birthday, {first_name}!',
            'messages' => [
                "Dear {first_name},\n\nHappy birthday from all of us at {church_name}! We thank God for your life and pray that this new year brings you joy, good health and a deeper walk with Him.\n\n\"The Lord bless you and keep you; the Lord make His face shine on you.\" (Numbers 6:24-25)\n\nWith love,\n{church_name}",
                "Happy birthday, {first_name}! Today we celebrate the gift of your life. May God crown this year with His goodness and fill your days with His peace.\n\nYour church family at {church_name}",
                "Dear {full_name},\n\nCongratulations on turning {age}! We are grateful to share life and faith with you. May the Lord continue to guide, protect and bless you.\n\nWarm wishes,\n{church_name}",
            ],
        ],
        'Wedding Anniversary' => [
            'subject' => 'Happy Anniversary, {first_name}!',
            'messages' => [
                "Dear {first_name},\n\nHappy wedding anniversary! We rejoice with you and pray that God continues to strengthen your marriage with love, patience and faithfulness.\n\n\"A cord of three strands is not quickly broken.\" (Ecclesiastes 4:12)\n\n{church_name}",
                "Congratulations on another year of marriage, {first_name}! May your home keep growing in love and in the grace of our Lord.\n\nWith love,\n{church_name}",
            ],
        ],
        'Graduation' => [
            'subject' => 'Congratulations on your graduation, {first_name}!',
            'messages' => [
                "Dear {first_name},\n\nCongratulations on your graduation! Your hard work has paid off, and we are proud of you. May God direct your next steps.\n\n\"For I know the plans I have for you,\" declares the Lord. (Jeremiah 29:11)\n\n{church_name}",
                "Well done, {first_name}! The whole church family celebrates this milestone with you. Keep trusting God as you begin this new chapter.\n\n{church_name}",
            ],
        ],
        'New Baby' => [
            'subject' => 'Congratulations on your new baby, {first_name}!',
            'messages' => [
                "Dear {first_name},\n\nCongratulations on the arrival of your little one! Children are a heritage from the Lord. We pray for health, rest and joy for your growing family.\n\n{church_name}",
            ],
        ],
        'Promotion / New Job' => [
            'subject' => 'Congratulations, {first_name}!',
            'messages' => [
                "Dear {first_name},\n\nCongratulations on your new role! We celebrate God's faithfulness with you and pray for wisdom and favour in this new season.\n\n{church_name}",
            ],
        ],
        'Baptism Anniversary' => [
            'subject' => 'Celebrating your baptism anniversary, {first_name}',
            'messages' => [
                "Dear {first_name},\n\nToday we remember the day you publicly declared your faith in Christ through baptism. May you keep growing in grace and in the knowledge of our Lord.\n\n\"Therefore, if anyone is in Christ, the new creation has come.\" (2 Corinthians 5:17)\n\n{church_name}",
            ],
        ],
        'Get Well Soon' => [
            'subject' => 'Praying for you, {first_name}',
            'messages' => [
                "Dear {first_name},\n\nWe are praying for your quick and full recovery. May the Lord, our healer, give you strength and peace. Please let the church office know if we can help in any way.\n\nWith love,\n{church_name}",
            ],
        ],
        'Congratulations' => [
            'subject' => 'Congratulations, {first_name}!',
            'messages' => [
                "Dear {first_name},\n\nCongratulations! We rejoice with you and give thanks to God for this blessing.\n\n{church_name}",
            ],
        ],
    ];

    /**
     * Replace placeholders in a subject or message. Unknown placeholders stay as typed.
     *
     * @param  array<string, string|int|null>  $vars
     */
    public static function fill(string $template, array $vars): string
    {
        $vars['church_name'] ??= (string) config('church.name');

        $replacements = [];
        foreach ($vars as $key => $value) {
            $replacements['{'.$key.'}'] = (string) ($value ?? '');
        }

        return strtr($template, $replacements);
    }
}
