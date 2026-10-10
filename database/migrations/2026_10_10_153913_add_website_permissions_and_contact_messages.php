<?php

use App\Enums\Role as RoleEnum;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\PermissionRegistrar;

/**
 * Website contact form messages, plus the permissions that guard the
 * Website admin and the new inbox. `website.manage` was used by the routes
 * but never created, so only the Superadmin could open the Website page.
 *
 * Permissions are added and granted to Admin without touching any other
 * grants, so role changes made in the app are kept.
 */
return new class extends Migration
{
    private const PERMISSIONS = [
        'website.manage' => 'Edit the public website: text, hero slides, beliefs and About images',
        'messages.view' => 'Read messages sent from the website contact form',
        'messages.respond' => 'Reply to, close and delete website contact messages',
    ];

    public function up(): void
    {
        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->string('name', 120);
            $table->string('email', 190);
            $table->string('phone', 40)->nullable();
            $table->string('subject', 150);
            $table->text('message');
            $table->string('status', 20)->default('new'); // new, read, replied, closed
            $table->text('response')->nullable();
            $table->foreignId('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('created_at');
        });

        if (! Schema::hasTable('permissions')) {
            return;
        }

        foreach (self::PERMISSIONS as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['module' => 'Website', 'description' => $description],
            );
        }

        Role::where('name', RoleEnum::ADMIN->value)->first()?->givePermissionTo(array_keys(self::PERMISSIONS));
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_messages');
        Permission::whereIn('name', ['messages.view', 'messages.respond'])->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
