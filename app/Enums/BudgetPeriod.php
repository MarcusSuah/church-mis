<?php

namespace App\Enums;

enum BudgetPeriod: string
{
    case Monthly = 'monthly';
    case Quarterly = 'quarterly';
    case Annual = 'annual';
}
