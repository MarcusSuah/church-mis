<?php

namespace App\Support;

/**
 * Certificate wording. Admins can pick a template and either type their own
 * message or let the system choose one of these. Placeholders:
 * {name}, {date}, {church_name}.
 */
class CertificateMessages
{
    public const TEMPLATES = [
        'classic' => ['label' => 'Classic', 'description' => 'Navy frame, scroll-work corners, crosses and doves'],
        'royal' => ['label' => 'Royal', 'description' => 'Blue & gold sweeps, ribbon seal and church logo'],
        'heritage' => ['label' => 'Heritage', 'description' => 'Ivory and gold double border with laurels'],
    ];

    public const TYPES = [
        'membership' => [
            'kicker' => 'Certificate of',
            'title' => 'Church Membership',
            'short' => 'Membership',
            'verse' => '"Now you are the body of Christ, and each one of you is a part of it." — 1 Corinthians 12:27',
            'signers' => ['Senior Pastor', 'Church Secretary'],
            'messages' => [
                'is a faithful and committed member in good standing of {church_name}, having demonstrated dedication to the fellowship and spiritual growth of the church.',
                'has been received into the fellowship of {church_name} and is recognised as a member in good standing, sharing in its worship, witness and service.',
                'is hereby recognised as a member of {church_name}, joined with us in the faith, love and mission of our Lord Jesus Christ.',
                'having confessed faith in Jesus Christ, is welcomed as a member of {church_name} with all the privileges and responsibilities of membership.',
            ],
        ],
        'baptism' => [
            'kicker' => 'Baptismal',
            'title' => 'Certificate',
            'short' => 'Baptism',
            'verse' => '"Therefore go and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit." — Matthew 28:19',
            'signers' => ['Senior Pastor', 'Baptism Coordinator'],
            'messages' => [
                'was baptized in the name of the Father, the Son, and the Holy Spirit on {date}, at {church_name}.',
                'having confessed Jesus Christ as Lord and Saviour, was buried with Him in baptism and raised to walk in newness of life on {date}, at {church_name}.',
                'publicly declared faith in Jesus Christ through believer’s baptism by immersion on {date}, at {church_name}.',
                'was baptized into Christ on {date} at {church_name}. "If anyone is in Christ, the new creation has come." — 2 Corinthians 5:17',
            ],
        ],
        'marriage' => [
            'kicker' => 'Holy Matrimony',
            'title' => 'Certificate of Marriage',
            'short' => 'Marriage',
            'verse' => '"Therefore what God has joined together, let no one separate." — Mark 10:9',
            'signers' => ['Officiating Minister', 'Church Secretary'],
            'messages' => [
                'were united in holy matrimony before God and these witnesses on {date}, at {church_name}.',
                'having made their vows before God and the church, were joined together as husband and wife on {date}, at {church_name}.',
                'entered into the covenant of marriage on {date} at {church_name}. "Love bears all things, believes all things, hopes all things, endures all things." — 1 Corinthians 13:7',
            ],
        ],
    ];

    public static function random(string $type): string
    {
        $list = self::TYPES[$type]['messages'] ?? self::TYPES['membership']['messages'];

        return $list[array_rand($list)];
    }

    public static function fill(string $text, string $name, ?string $date): string
    {
        return strtr($text, ['{name}' => $name, '{date}' => $date ?: 'this day', '{church_name}' => config('church.name')]);
    }

    /** Certificate type for a document request type, or null for letters/statements. */
    public static function typeFor(string $documentType): ?string
    {
        return match ($documentType) {
            'Membership Certificate' => 'membership',
            'Baptism Certificate' => 'baptism',
            'Marriage Certificate' => 'marriage',
            default => null,
        };
    }
}
