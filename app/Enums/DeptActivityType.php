<?php

namespace App\Enums;

enum DeptActivityType: string
{
    case Meeting = 'meeting';
    case Event = 'event';
    case Training = 'training';
    case Outreach = 'outreach';
    case Other = 'other';
}
