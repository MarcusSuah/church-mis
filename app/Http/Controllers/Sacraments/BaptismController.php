<?php

namespace App\Http\Controllers\Sacraments;

use App\Models\Baptism;
use App\Models\Member;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

class BaptismController extends RecordsController
{
    public const TYPES = ['immersion', 'sprinkling', 'pouring'];

    protected string $model = Baptism::class;

    protected string $page = 'baptisms/index';

    protected string $permission = 'baptisms';

    protected string $label = 'Baptism record';

    protected string $orderBy = 'baptism_date';

    protected function rules(): array
    {
        return [
            // "Not a member / Guest" is a valid choice in the picker, so the link itself stays optional.
            'member_id' => ['nullable', 'uuid', 'exists:members,id'],
            'candidate_name' => ['required', 'string', 'max:255'],
            'candidate_photo' => ['required', 'string', 'max:500'],
            'baptism_date' => ['required', 'date', 'before_or_equal:today'],
            'baptism_type' => ['required', Rule::in(self::TYPES)],
            'officiant' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'witnesses' => ['required', 'string', 'max:2000'],
            // The only optional field: left blank, a number is assigned when the certificate is issued.
            'certificate_number' => ['nullable', 'string', 'max:100'],
            'certificate_issued' => ['required', 'boolean'],
            'certificate_date' => ['required_if_accepted:certificate_issued', 'nullable', 'date', 'after_or_equal:baptism_date'],
            'notes' => ['required', 'string', 'max:5000'],
        ];
    }

    protected function messages(): array
    {
        return [
            'candidate_name.required' => 'Enter the full name of the person being baptized.',
            'candidate_photo.required' => 'Upload a photo of the candidate.',
            'baptism_date.required' => 'Choose the date of the baptism.',
            'baptism_date.before_or_equal' => 'The baptism date cannot be in the future.',
            'baptism_type.required' => 'Choose how the baptism was performed.',
            'officiant.required' => 'Enter the name of the pastor or minister who officiated.',
            'location.required' => 'Enter where the baptism took place.',
            'witnesses.required' => 'Enter at least one witness.',
            'certificate_date.required_if_accepted' => 'Choose the date the certificate was issued.',
            'certificate_date.after_or_equal' => 'The certificate cannot be issued before the baptism date.',
            'notes.required' => 'Add a short note about this baptism.',
        ];
    }

    protected function prepare(array $data, ?Model $record = null): array
    {
        if (! ($data['certificate_issued'] ?? false)) {
            $data['certificate_date'] = null;
        } elseif (empty($data['certificate_date'])) {
            $data['certificate_date'] = now()->toDateString();
        }

        // A baptism recorded for a member marks them baptized on their record.
        if (! empty($data['member_id'])) {
            Member::whereKey($data['member_id'])->update(['baptized' => true, 'baptism_date' => $data['baptism_date']]);
        }

        return $data;
    }

    protected function present(Model $r): array
    {
        return [
            ...$r->only(['id', 'member_id', 'candidate_name', 'candidate_photo', 'baptism_type', 'officiant', 'location', 'witnesses', 'certificate_number', 'certificate_issued', 'notes']),
            'baptism_date' => self::d($r->baptism_date),
            'certificate_date' => self::d($r->certificate_date),
        ];
    }

    protected function searchColumns(): array
    {
        return ['candidate_name', 'certificate_number'];
    }

    protected function filters(): array
    {
        return [
            'type' => ['values' => self::TYPES, 'apply' => fn ($q, $v) => $q->where('baptism_type', $v)],
            'certificate' => ['values' => ['Issued', 'Pending'], 'apply' => fn ($q, $v) => $q->where('certificate_issued', $v === 'Issued')],
        ];
    }

    protected function stats(Builder $all, Builder $filtered): array
    {
        return [
            'total' => (clone $all)->count(),
            'this_year' => (clone $all)->whereBetween('baptism_date', [now()->startOfYear()->toDateString(), now()->endOfYear()->toDateTimeString()])->count(),
            'issued' => (clone $all)->where('certificate_issued', true)->count(),
            'pending' => (clone $all)->where('certificate_issued', false)->count(),
        ];
    }

    /** Members are picked with the type-ahead lookup (/lookup/members) (F07). */
    protected function extraProps(): array
    {
        return ['types' => self::TYPES];
    }
}
