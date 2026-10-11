# Saint Simon Baptist Church — Church Management System

A single, secure place to run the life of the church: members and families, giving and finance, worship and attendance, sacraments and certificates, pastoral care, communication, and the public church website.

This guide explains **how the system works** for church leadership and office staff. A short technical section for the IT person who maintains the system is at the end.

---

## 1. The big picture

The system has three "doors", one for each kind of user. They all share the same secure database, so information entered once is available everywhere it is needed.

```mermaid
flowchart LR
    subgraph Public["🌍 Public website (no login)"]
        V[Visitors]
    end
    subgraph Portal["🙋 Member portal (member login)"]
        M[Members]
    end
    subgraph Office["🏢 Church office (staff login)"]
        S[Pastors, Admins,<br/>Finance, Leaders]
    end

    V -->|Read about the church,<br/>events, sermons, news| WEB[Website pages]
    V -->|Join Our Family form| REG[Registration]
    V -->|Contact form| MSG[Messages inbox]

    M -->|View own profile, giving,<br/>certificates, prayer requests| PORTAL[Member portal]

    S --> ADMIN[Administration<br/>modules]

    WEB --> DB[(Church database)]
    REG --> DB
    MSG --> DB
    PORTAL --> DB
    ADMIN --> DB

    DB --> OUT1[📄 PDF certificates,<br/>letters & receipts]
    DB --> OUT2[📊 Reports — PDF,<br/>Excel, CSV]
    DB --> OUT3[🔔 Notifications<br/>& emails]
```

| Who          | How they get in                              | What they can do                                                                                                        |
| ------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Visitors** | Just open the website                        | Read about the church, see events, sermons and news, register as a member, send a message                               |
| **Members**  | Log in with the email the church has on file | See and update their own details, giving history and statements, request certificates and letters, send prayer requests |
| **Staff**    | Log in with a staff account                  | Everything their role allows — see section 3                                                                            |

---

## 2. What the system covers

```mermaid
mindmap
  root((Church<br/>Management<br/>System))
    Members
      All members
      Pending registrations
      Families
      Member directory
      Birthdays & celebrations
    Church structure
      Departments
      Ministries
      Boards
      Committees
      Leadership
    Worship & care
      Attendance
      Sermons
      Prayer requests
      Pastoral care
    Sacraments
      Baptisms
      Communion
      Weddings
      Funerals
      Certificates & letters
    Finance
      Tithes
      Offerings
      Donations
      Expenses
      Budgets & funds
      Finance overview
    Communication
      Events
      Announcements
      Documents
      Notifications
      Messages inbox
    Website
      Home page slides
      About page & photos
      Statement of faith
      Privacy & Terms pages
    Oversight
      Reports
      Audit log
      Activity log
      Users, roles & permissions
      Church settings
```

---

## 3. Roles and permissions

Every staff account has a **role**, and each role has a set of **permissions** (for example "view members", "record tithes", "approve certificates"). The menu only shows what a person is allowed to use, and the system checks permission again on every action, so hiding a button is never the only protection.

```mermaid
flowchart TD
    SA[Super Admin<br/><i>full control, cannot be locked out</i>]
    A[Admin<br/><i>day-to-day administration</i>]
    P[Pastor<br/><i>members, care, sacraments</i>]
    F[Finance Officer<br/><i>giving, expenses, budgets</i>]
    SU[Supervisor]
    DL[Department Leader<br/><i>own department</i>]
    C[Cashier]
    ME[Member<br/><i>member portal only</i>]

    SA --> A
    A --> P
    A --> F
    A --> SU
    SU --> DL
    F --> C
    A -.manages.-> ME
```

- Roles and their permissions are changed under **Users → Roles** and **Permissions**. Every change is recorded in the audit log.
- An Admin cannot change or remove the Super Admin or another Admin.
- Confidential pastoral care notes are visible only to people with the special _pastoral-care confidential_ permission.

---

## 4. How a new member joins

People can register themselves on the website, or the office can add them. **Both use the same five-step form**: Personal → Church → Family → Emergency & additional → Review.

```mermaid
sequenceDiagram
    autonumber
    actor P as Person
    participant W as Website
    participant Q as Pending Registrations
    actor O as Church office
    participant E as Email

    P->>W: Fills in the "Join Our Family" form
    W->>Q: Saves it with a reference number (SSBC-REG-…)
    W-->>P: Shows the reference number
    Q-->>O: 🔔 "New member registration" notification
    O->>Q: Opens the registration, reviews the details
    alt Approved
        O->>Q: Approve
        Q->>Q: Gives a Member ID (SSBC-M-…)
        Q->>E: Sends a "set your password" email
        E-->>P: Link to create a login
        P->>W: Signs in to the member portal
    else Needs more information
        O->>Q: Mark "Under review"
    else Not accepted
        O->>Q: Reject (kept under the Rejected tab)
    end
```

When the office adds a member directly (**Members → All Members → Add Member**), they use the same form, plus an _Office use_ box on the Church Info step for the Member ID, status, date joined, department and ministry.

---

## 5. Recording giving

```mermaid
flowchart LR
    G[Gift received] --> R{Type}
    R -->|Tithe| T[Tithes]
    R -->|Offering /<br/>basket collection| O[Offerings]
    R -->|Donation| D[Donations]
    T & O & D --> N[Receipt number<br/>REC-2026-0001…<br/>never repeats]
    N --> F[Fund<br/>General, Building, Missions…]
    F --> K[Finance overview<br/>& dashboard totals]
    F --> S[Member's annual<br/>giving statement]
    F --> RP[Finance report<br/>PDF / Excel / CSV]
    N --> PR[Printable receipt]
```

- Gifts can be in **US dollars or Liberian dollars**. Each gift keeps the exchange rate of the day it was recorded, so changing the rate later never changes past totals.
- Deleting a financial record does not erase it; it is kept for the audit trail.
- Expenses go through **Pending → Approved → Paid**, and are compared with the year's **budgets**.

---

## 6. Certificates, letters and reports

All printed documents use the **church letterhead** — the logo, the church name and tagline, address and contact details, and the gold and navy rules — with a faint logo in the background. Certificates (baptism, marriage) have the church logo softly blurred behind the text.

| Document                                                                | Where to find it                                                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Baptism and marriage certificates                                       | **Sacraments → Certificates**                                                      |
| Recommendation, transfer and good-standing letters                      | Requested by members in the portal, approved under **Certificates**                |
| Annual giving statements                                                | Member portal, or **Certificates** for the office                                  |
| Receipts                                                                | **Finance → Finance overview → Receipts**                                          |
| Reports (membership, finance, attendance, sacraments, ministry, events) | **Reports** — view or print on letterhead, download PDF, or export to Excel or CSV |

---

## 7. Messages from the website

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant C as Contact page
    participant I as Messages inbox
    actor S as Staff member
    participant E as Email

    V->>C: Sends a message
    C->>I: Saved as "New"
    I-->>S: 🔔 Notification + badge in the menu
    S->>I: Opens it (now "Read")
    S->>I: Writes a reply
    I->>E: Emails the reply to the visitor
    I->>I: Keeps the reply with the message ("Replied")
    S->>I: Closes it when done
```

---

## 8. Managing the website — no programming needed

Everything on the public website is edited from the admin menu:

| What                                                                                                        | Where                                                                    |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Home page slides (pictures, headings, buttons)                                                              | **Website → Hero slides**                                                |
| Statement of faith                                                                                          | **Website → Statement of faith**                                         |
| Mission, vision, story, service times, About page heading and three About photos, Contact page introduction | **Website → Text & service times**                                       |
| Privacy Policy, Terms & Conditions, Terms of Use (and any extra page)                                       | **Pages (Privacy & Terms)**                                              |
| Church name, logo, address, phone, email, currency and exchange rate                                        | **Church Settings**                                                      |
| Events, sermons, announcements, ministries, departments, leadership                                         | Their own menus; anything marked public/published appears on the website |

Each event, sermon, news item, ministry, department and leader gets its own web address based on its name — for example `/church/events/harvest-thanksgiving-service`.

Pages under **Pages** use simple formatting: leave a blank line between paragraphs, start a line with `## ` for a heading and `- ` for a bullet point. Use **Preview** before saving. Pages marked _Link in website footer_ appear at the bottom of every website page.

---

## 9. Keeping information safe

```mermaid
flowchart TD
    U[Someone opens a page<br/>or saves a change] --> L{Signed in?}
    L -->|No| X1[Sent to the login page]
    L -->|Yes| V{Email verified,<br/>account active?}
    V -->|No| X2[Blocked]
    V -->|Yes| P{Has permission<br/>for this action?}
    P -->|No| X3[“You do not have<br/>permission to do that”]
    P -->|Yes| R{Allowed to see<br/>this record?}
    R -->|No| X4[“Not found”]
    R -->|Yes| OK[Action done]
    OK --> AU[(Audit log:<br/>who, what, when,<br/>old → new values)]
```

- **Passwords** are stored encrypted. Too many wrong attempts temporarily blocks sign-in, and suspicious sign-ins alert administrators.
- **Every change** to church records, roles and settings is written to the **Audit log**. Sign-ins, devices and locations are in the **Activity log**.
- **Notifications** keep the right people informed: new registrations, expenses awaiting approval, pastoral cases, prayer requests, document requests, website messages and account role changes.
- **Uploads** are checked for type and size, and private documents are only released to people allowed to see them.
- **Backups**: ask your IT person to back up the database daily (see the technical section).

---

## 10. Everyday tips

- **Pages take a moment?** A "Loading…" indicator appears whenever a page or save takes longer than a moment. Please wait for it to finish rather than clicking again.
- **The bell** at the top shows your notifications; click one to go straight to the record.
- **Search** at the top finds members by name, email or Member ID.
- **Pending Registrations** shows everyone waiting for review; the number in the menu is how many.
- **Reports** open quickly after the first time each day, because figures are remembered until something changes.

---

## Technical section (for the IT administrator)

### Requirements

PHP 8.4 with OPcache enabled, MySQL 8, Node 22, Composer 2. Built with Laravel 13, Inertia 3 and React 19.

### First-time setup

```bash
composer install
cp .env.example .env        # then set DB_*, MAIL_*, APP_URL and CHURCH_* values
php artisan key:generate
php artisan migrate
php artisan db:seed         # roles, first admin, legal pages, website text, funds (+ demo data outside production)
php artisan storage:link
npm ci && npm run build
```

### Seeders

| Seeder                                                                                     | Purpose                                               | Runs in production          |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------- |
| `RolePermissionSeeder`                                                                     | Roles and permissions                                 | Yes                         |
| `AdminUserSeeder`                                                                          | First Super Admin account                             | Yes                         |
| `SitePageSeeder`                                                                           | Privacy Policy, Terms & Conditions, Terms of Use      | Yes                         |
| `WebsiteContentSeeder`                                                                     | Story, About heading, hero slides, statement of faith | Yes (fills only empty text) |
| `FinanceFundSeeder`                                                                        | General, Building, Missions, Benevolence, Youth funds | Yes                         |
| `DepartmentSeeder`, `MinistrySeeder`, `BoardSeeder`, `CommitteeSeeder`, `LeadershipSeeder` | Church structure samples                              | No                          |
| `MemberSeeder`                                                                             | 36 sample members, 6 families, memberships            | No                          |
| `EventSeeder`, `SermonSeeder`, `AnnouncementSeeder`                                        | Website and calendar samples                          | No                          |
| `GivingSeeder`, `ExpenseBudgetSeeder`                                                      | Six months of giving, expenses and budgets            | No                          |
| `PrayerRequestSeeder`, `AttendanceSeeder`                                                  | Prayer and attendance samples                         | No                          |

Load only the sample data with `php artisan db:seed --class=DemoDataSeeder`. All seeders can be run again safely; existing records are kept.

### After each update

```bash
php artisan down
# back up the database first
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force
php artisan optimize:clear && php artisan optimize
php artisan permission:cache-reset
php artisan up
```

### Scheduled tasks

Add the Laravel scheduler to cron (`* * * * * php artisan schedule:run`). It sends the daily birthday notice and removes expired API tokens.

### Performance settings

- **PHP:** enable OPcache in `php.ini` (`zend_extension=opcache`, `opcache.enable=1`).
- **MySQL:** set `innodb_buffer_pool_size` (for example `1G`) in the **MySQL** configuration file — `my.ini` on Windows, `my.cnf` on Linux — under `[mysqld]`, then restart MySQL. This setting is not in `php.ini`.
- `php artisan perf:purge --force` removes load-test data created by `perf:seed` (never use `perf:seed` on a live database).

### Useful commands

```bash
php artisan members:accounts --dry-run   # check member logins
php artisan test                          # run the automated tests
php artisan perf:explain                  # check database query speed
```
