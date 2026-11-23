<?php

namespace App\Observers;

use App\Services\ActivityNotifier;
use Illuminate\Database\Eloquent\Model;

/** One observer shared by every model listed in config/activity.php. */
class ActivityObserver
{
    public function created(Model $model): void
    {
        ActivityNotifier::modelEvent($model, 'created');
    }

    public function updated(Model $model): void
    {
        ActivityNotifier::modelEvent($model, 'updated');
    }

    public function deleted(Model $model): void
    {
        ActivityNotifier::modelEvent($model, 'deleted');
    }

    public function restored(Model $model): void
    {
        ActivityNotifier::modelEvent($model, 'restored');
    }
}