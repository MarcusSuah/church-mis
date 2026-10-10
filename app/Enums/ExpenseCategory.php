<?php

namespace App\Enums;

enum ExpenseCategory: string
{
    case StaffSalaries = 'staff_salaries';
    case Utilities = 'utilities';
    case Maintenance = 'maintenance';
    case Outreach = 'outreach';
    case YouthPrograms = 'youth_programs';
    case MusicWorship = 'music_worship';
    case Administration = 'administration';
    case Events = 'events';
    case Missions = 'missions';
    case Other = 'other';
}
