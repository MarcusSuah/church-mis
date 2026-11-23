<?php

namespace App\Enums;

enum ServiceSession: string
{
    case FirstService = 'first_service';
    case SecondService = 'second_service';

    public function label(): string
    {
        return match ($this) {
            self::FirstService => '1st Service',
            self::SecondService => '2nd Service',
        };
    }

    public static function options(): array
    {
        return collect(self::cases())
            ->mapWithKeys(fn (self $session) => [
                $session->value => $session->label(),
            ])
            ->all();
    }
}