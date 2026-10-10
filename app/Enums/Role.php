<?php

namespace App\Enums;

enum Role: string
{
    case SUPERADMIN = 'Superadmin';
    case ADMIN = 'Admin';
    case PASTOR = 'Pastor';
    case FINANCEOFFICER = 'Finance Officer';
    case SUPERVISOR = 'Supervisor';
    case DEPARTMENTLEADER = 'Department Leader';
    case CASHIER = 'Cashier';
    case MEMBER = 'Member';


    public function label(): string
    {
        return match ($this) {
            self::SUPERADMIN => 'Super Admin',
            self::ADMIN => 'Admin',
            self::FINANCEOFFICER => 'Finance Officer',
            self::DEPARTMENTLEADER => 'Department Leader',
            self::SUPERVISOR => 'Supervisor',
            self::CASHIER => 'Cashier',
            self::MEMBER => 'Member',
            self::PASTOR => 'Pastor',
        };
    }

    public static function protected(): array
    {
        return [self::SUPERADMIN->value, self::ADMIN->value];
    }

    public static function values(): array
    {
        return array_map(fn(self $role) => $role->value, self::cases());
    }
}
