<?php

namespace Database\Seeders;

use App\Models\SitePage;
use Illuminate\Database\Seeder;

/**
 * Starting text for the Privacy Policy, Terms & Conditions and Terms of Use.
 * Pages that already exist are left alone, so edits made under System → Pages
 * are never overwritten. The church should review this text with its own
 * advisers before relying on it.
 */
class SitePageSeeder extends Seeder
{
    public function run(): void
    {
        $church = (string) config('church.name', 'Our Church');
        $email = (string) config('church.email', 'the church office');
        $place = trim(collect([config('church.city'), config('church.country')])->filter()->implode(', '));

        $pages = [
            [
                'slug' => 'privacy-policy',
                'title' => 'Privacy Policy',
                'summary' => "How {$church} collects, uses and protects your personal information.",
                'sort_order' => 1,
                'body' => <<<TXT
{$church} ("the church", "we") respects your privacy. This policy explains what personal information we collect through our website and church management system, why we collect it, and how we keep it safe.

## Information we collect
- Details you give us when you register as a member: name, date of birth, gender, contact details, address, family details, emergency contact, church background and areas of service.
- Giving records (tithes, offerings and donations) so we can issue receipts and annual giving statements.
- Attendance, sacrament (baptism, communion, wedding, funeral) and pastoral care records kept by the church office.
- Messages you send through the contact form, and prayer requests you choose to share.
- Technical information when you sign in, such as the device, browser and approximate location, used to protect your account.

## How we use your information
- To manage your membership and keep in touch with you.
- To issue certificates, letters, receipts and giving statements.
- To organise ministries, departments, events and pastoral care.
- To keep the system secure and prevent misuse.

We do not sell your information, and we do not share it with anyone outside the church except where the law requires it or you ask us to.

## Who can see your information
Access is limited by role. Office staff see only what their work requires. Confidential pastoral notes are visible only to the pastoral team. Members who sign in to the member portal see their own records.

## How we protect your information
Passwords are stored in encrypted form, every change to church records is written to an audit log, sign-ins are monitored, and access is restricted by permission. Documents are stored privately and released only to people allowed to see them.

## How long we keep it
We keep membership and sacrament records for as long as they are part of the church's history. Sign-in activity is kept for a limited period. You may ask us to correct or remove information that is no longer needed.

## Your rights
You may ask to see the information we hold about you, ask us to correct it, or withdraw consent for anything that is optional. Contact the church office at {$email}.

## Changes to this policy
We may update this policy from time to time. The latest version is always published on this page.
TXT,
            ],
            [
                'slug' => 'terms-and-conditions',
                'title' => 'Terms & Conditions',
                'summary' => "The conditions that apply when you register with or give to {$church}.",
                'sort_order' => 2,
                'body' => <<<TXT
These terms apply when you register as a member, request a document or certificate, or record a gift with {$church}.

## Membership registration
- Registration is a request to join the church family. It is reviewed by the church office and may be approved, placed under review or declined.
- You agree that the information you provide is true and complete, and that you will tell the church office when it changes.
- A member portal login is created once your registration is approved. You are responsible for keeping your password private.

## Certificates, letters and documents
- Certificates (baptism, marriage) and letters (recommendation, transfer, good standing) are issued by the church office after verification.
- Documents remain the property of the church and may be withdrawn if they were issued on the basis of incorrect information.

## Giving
- Tithes, offerings and donations are voluntary gifts to the church. No goods or services are provided in exchange.
- Receipts and annual giving statements are issued from the church's records. Please report any error to the church office promptly.
- Gifts recorded in one currency are kept in that currency; totals may be shown in the church's default currency using the recorded exchange rate.

## Conduct
Members and visitors are expected to treat one another with respect, in keeping with the church's statement of faith. The church may suspend access to its systems in case of misuse.

## Contact
Questions about these terms can be sent to {$email}.
TXT,
            ],
            [
                'slug' => 'terms-of-use',
                'title' => 'Terms of Use',
                'summary' => "Rules for using the {$church} website and online services.",
                'sort_order' => 3,
                'body' => <<<TXT
By using this website and the {$church} online services, you agree to these terms.

## Using the website
- The website provides information about the church, its services, events, sermons and ministries{$this->placeSuffix($place)}.
- You may read, share and print pages for personal and church purposes. Please credit the church when sharing sermons or articles.
- Do not try to access parts of the system you are not authorised to use, interfere with its operation, or upload harmful content.

## Accounts
- Staff and member accounts are personal and must not be shared.
- Sign-in attempts are limited and monitored to protect everyone's information. Accounts may be blocked if misuse is detected.
- Report a lost password or suspicious activity to the church office straight away.

## Content you send us
Messages, prayer requests and registrations you submit are handled as described in our Privacy Policy. Please do not send information about other people without their permission.

## Availability
We aim to keep the website available at all times but cannot guarantee it. Content may change without notice.

## Links to other sites
Links to other websites (for example sermon video platforms) are provided for convenience. The church is not responsible for their content.

## Changes
These terms may be updated from time to time. Continued use of the website means you accept the current version. Contact {$email} with any questions.
TXT,
            ],
        ];

        foreach ($pages as $page) {
            SitePage::firstOrCreate(
                ['slug' => $page['slug']],
                [...$page, 'is_published' => true, 'show_in_footer' => true],
            );
        }
    }

    private function placeSuffix(string $place): string
    {
        return $place !== '' ? " in {$place}" : '';
    }
}
