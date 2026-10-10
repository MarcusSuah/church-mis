<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Public website content: hero slides for the home page and the statement
 * of faith on the About page. Text such as mission, vision and service
 * times lives in church_settings (see ChurchSettings::KEYS).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_hero_slides', function (Blueprint $table) {
            $table->id();
            $table->string('eyebrow')->nullable();          // small line above the title
            $table->string('title');
            $table->text('subtitle')->nullable();
            $table->string('image_url', 500)->nullable();
            $table->string('primary_label')->nullable();
            $table->string('primary_url')->nullable();
            $table->string('secondary_label')->nullable();
            $table->string('secondary_url')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index(['is_active', 'sort_order']);
        });

        Schema::create('site_beliefs', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Starting statement of faith — editable afterwards.
        $now = now();
        $beliefs = [
            ['The Scriptures', 'The Bible is the inspired, infallible Word of God and our final authority for faith and practice.'],
            ['The Triune God', 'We worship one God eternally existing in three persons: Father, Son and Holy Spirit.'],
            ['Salvation by Grace', 'Salvation is the gift of God received through repentance and faith in Jesus Christ alone.'],
            ["Believer's Baptism", 'Baptism by immersion follows a personal confession of faith as an act of obedience.'],
            ['The Local Church', 'The church is a covenant community of baptised believers gathered for worship, discipleship and mission.'],
            ['The Return of Christ', 'We await the personal, visible return of our Lord Jesus Christ and the life everlasting.'],
        ];
        DB::table('site_beliefs')->insert(array_map(fn ($b, $i) => [
            'title' => $b[0], 'body' => $b[1], 'is_active' => true, 'sort_order' => $i,
            'created_at' => $now, 'updated_at' => $now,
        ], $beliefs, array_keys($beliefs)));

        DB::table('site_hero_slides')->insert([
            'eyebrow' => 'Welcome home',
            'title' => 'Saint Simon Baptist Church',
            'subtitle' => 'A Christ-centred Baptist family committed to worship, discipleship and service.',
            'primary_label' => 'Become a member',
            'primary_url' => '/public-member-registration',
            'secondary_label' => 'Plan your visit',
            'secondary_url' => '/about',
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('site_beliefs');
        Schema::dropIfExists('site_hero_slides');
    }
};
