<?php

namespace App\Enums;

enum LeadershipRole: string
{
    case SeniorPastor = 'senior_pastor';
    case AssociatePastor = 'associate_pastor';
    case Deacon = 'deacon';
    case Deaconess = 'deaconess';
    case Elder = 'elder';
    case Trustee = 'trustee';
    case Minister = 'minister';
    case Director = 'director';
    case Coordinator = 'coordinator';
    case Other = 'other';
}
