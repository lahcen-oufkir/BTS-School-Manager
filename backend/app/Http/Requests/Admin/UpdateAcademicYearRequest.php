<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAcademicYearRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $yearId = $this->route('academic_year') ?? $this->route('academicYear');

        return [
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'name' => [
                'sometimes', 'string', 'max:255',
                Rule::unique('academic_years', 'name')
                    ->where('school_id', $this->input('school_id', $this->route('academic_year')?->school_id))
                    ->ignore($yearId),
            ],
            'start_date' => ['sometimes', 'date'],
            'end_date' => ['sometimes', 'date', 'after_or_equal:start_date'],
            'is_current' => ['sometimes', 'boolean'],
        ];
    }
}
