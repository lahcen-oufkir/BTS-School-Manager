<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSchoolClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'program_id' => ['sometimes', 'integer', 'exists:programs,id'],
            'academic_year_id' => ['sometimes', 'integer', 'exists:academic_years,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'year_level' => ['sometimes', 'integer', 'min:1', 'max:10'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
