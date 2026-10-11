<?php

namespace Database\Seeders;

use App\Enums\ServiceType;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Member;

/** The last eight Sunday services with attendance marked for sample members. */
class AttendanceSeeder extends DemoSeeder
{
    protected function seed(): void
    {
        $members = Member::where('email', 'like', '%@example.org')->whereIn('status', Member::ACCEPTED)->get();
        if ($members->isEmpty()) {
            return;
        }

        foreach (range(7, 0) as $weeksAgo) {
            $date = now()->previous('Sunday')->subWeeks($weeksAgo)->toDateString();
            if (AttendanceSession::whereDate('service_date', $date)->where('service_type', ServiceType::SundayWorship->value)->exists()) {
                continue;
            }

            $session = AttendanceSession::forceCreate([
                'service_type' => ServiceType::SundayWorship->value,
                'service_date' => $date,
                'title' => 'Sunday Worship Service',
                'preacher' => $weeksAgo % 3 === 0 ? 'Rev. Esther Kpoto' : 'Rev. Samuel Kollie',
                'total_present' => 0,
                'total_absent' => 0,
                'total_late' => 0,
                'total_excused' => 0,
            ]);

            $totals = ['present' => 0, 'absent' => 0, 'late' => 0, 'excused' => 0];
            foreach ($members as $n => $member) {
                $status = match (($n + $weeksAgo) % 9) {
                    0 => 'absent',
                    1 => 'late',
                    2 => 'excused',
                    default => 'present',
                };
                $totals[$status]++;
                AttendanceRecord::forceCreate([
                    'session_id' => $session->id,
                    'member_id' => $member->id,
                    'attendance_status' => $status,
                    'present' => in_array($status, ['present', 'late'], true),
                    'service_name' => 'Sunday Worship Service',
                    'service_date' => $date,
                    'service_time' => '10:00:00',
                    'check_in_time' => in_array($status, ['present', 'late'], true) ? $date.($status === 'late' ? ' 10:25:00' : ' 09:50:00') : null,
                ]);
            }

            $session->forceFill([
                'total_present' => $totals['present'] + $totals['late'],
                'total_absent' => $totals['absent'],
                'total_late' => $totals['late'],
                'total_excused' => $totals['excused'],
            ])->saveQuietly();
        }
    }
}
