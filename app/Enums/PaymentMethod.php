<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Check = 'check';
    case MobileMoney = 'momo';
    case BankTransfer = 'bank_transfer';
    case Card = 'card';
    case Other = 'other';
}
