<?php

namespace Database\Seeders;

use App\Models\Belief;
use App\Models\HeroSlide;
use App\Support\ChurchSettings;

/**
 * Public website starting content: "Our story", the About heading, the
 * contact page introduction, home-page hero slides and the statement of
 * faith. Only fills what is still empty, so text edited under
 * System → Website is never overwritten.
 */
class WebsiteContentSeeder extends DemoSeeder
{
    protected function allowedInProduction(): bool
    {
        return true;
    }

    protected function seed(): void
    {
        $name = (string) config('church.name');
        $current = ChurchSettings::all();

        $text = [
            'story' => "{$name} began as a small fellowship of believers gathering for prayer and the study of God's Word. Through the faithfulness of God and the dedication of generations of members, it has grown into a church family that serves its community through worship, discipleship and compassion.\n\nToday the church carries out its mission through departments and ministries for men, women, youth and children, a choir and praise team, outreach and missions, and a pastoral team that cares for members in every season of life.\n\nWe hold to the historic Baptist convictions: the authority of Scripture, salvation by grace through faith in Jesus Christ, believer's baptism, the priesthood of all believers, and the autonomy of the local church under the Lordship of Christ.",
            'about_heading' => 'A heritage of faith',
            'contact_intro' => 'We would love to hear from you. Send us a message and the church office will reply by email.',
        ];
        ChurchSettings::save(array_filter($text, fn ($value, $key) => blank($current[$key] ?? null) || $key === 'about_heading' && $current[$key] === config('church.about_heading'), ARRAY_FILTER_USE_BOTH));

        $slides = [
            ['eyebrow' => 'Welcome home', 'title' => $name, 'subtitle' => (string) config('church.description'), 'primary_label' => 'Become a member', 'primary_url' => '/public-member-registration', 'secondary_label' => 'Plan your visit', 'secondary_url' => '/about'],
            ['eyebrow' => 'Sunday Worship', 'title' => 'Come and worship with us', 'subtitle' => 'Join us every Sunday for Bible study, heartfelt praise and the preaching of God\'s Word.', 'primary_label' => 'Service times', 'primary_url' => '/contact', 'secondary_label' => 'Latest sermons', 'secondary_url' => '/church/sermons'],
            ['eyebrow' => 'Get involved', 'title' => 'Find your place to serve', 'subtitle' => 'Ministries and departments for every age — from the choir to youth, missions and benevolence.', 'primary_label' => 'Explore ministries', 'primary_url' => '/church/ministries', 'secondary_label' => 'Upcoming events', 'secondary_url' => '/church/events'],
        ];
        foreach ($slides as $order => $slide) {
            HeroSlide::firstOrCreate(['title' => $slide['title']], [...$slide, 'is_active' => true, 'sort_order' => $order]);
        }

        $beliefs = [
            ['The Scriptures', 'The Bible is the inspired, infallible Word of God and the final authority for faith and life.'],
            ['God', 'There is one God, eternally existing in three persons: Father, Son and Holy Spirit.'],
            ['Jesus Christ', 'Jesus Christ is fully God and fully man, born of a virgin, crucified for our sins, risen bodily and coming again.'],
            ['Salvation', 'Salvation is by grace alone through faith alone in Jesus Christ, not by works.'],
            ['Baptism & the Lord\'s Supper', 'Believer\'s baptism by immersion and the Lord\'s Supper are ordinances given by Christ to His church.'],
            ['The Church', 'The local church is a body of baptized believers, self-governing under the Lordship of Christ.'],
            ['The Christian Life', 'Believers are called to holy living, faithful stewardship, prayer and witness in the power of the Holy Spirit.'],
            ['The Last Things', 'Christ will return personally and visibly; the righteous will enjoy eternal life with God.'],
        ];
        foreach ($beliefs as $order => [$title, $body]) {
            Belief::firstOrCreate(['title' => $title], ['body' => $body, 'is_active' => true, 'sort_order' => $order]);
        }
    }
}
