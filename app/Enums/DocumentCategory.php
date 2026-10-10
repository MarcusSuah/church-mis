<?php

namespace App\Enums;

enum DocumentCategory: string
{
    case Policy = 'Policy';
    case Minutes = 'Minutes';
    case Financial = 'Financial';
    case Legal = 'Legal';
    case Forms = 'Forms';
    case Bulletin = 'Bulletin';
    case Newsletter = 'Newsletter';
    case Other = 'Other';
}
