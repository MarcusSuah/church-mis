<?php

namespace App\Enums;

enum NotificationType: string
{
    case Info = 'info';
    case Success = 'success';
    case Warning = 'warning';
    case Error = 'error';
    case Prayer = 'prayer';
    case Event = 'event';
    case Finance = 'finance';
    case Member = 'member';
    case System = 'system';
}
