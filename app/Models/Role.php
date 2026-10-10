<?php

namespace App\Models;

use App\Enums\Role as RoleEnum;
use Spatie\Permission\Models\Role as SpatieRole;

class Role extends SpatieRole
{
    public function isProtected(): bool
    {
        return in_array($this->name, RoleEnum::protected(), true);
    }
}
