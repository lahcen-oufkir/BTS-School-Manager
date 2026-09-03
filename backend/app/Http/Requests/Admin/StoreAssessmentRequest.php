<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'subject_id' => ['required', 'integer', 'exists:subjects,id'],
            'academic_year_id' => ['required', 'integer', 'exists:academic_years,id'],
            'title' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::in(['exam', 'quiz', 'homework', 'practical', 'project', 'continuous'])],
            'date' => ['nullable', 'date'],
            'max_score' => ['required', 'numeric', 'min:0', 'max:100'],
            'weight' => ['required', 'numeric', 'min:0', 'max:10'],
            'is_published' => ['sometimes', 'boolean'],
            'is_locked' => ['sometimes', 'boolean'],
        ];
    }
}
