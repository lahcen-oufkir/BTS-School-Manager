<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateAssessmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'class_id' => ['sometimes', 'integer', 'exists:classes,id'],
            'subject_id' => ['sometimes', 'integer', 'exists:subjects,id'],
            'academic_year_id' => ['sometimes', 'integer', 'exists:academic_years,id'],
            'title' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', Rule::in(['exam', 'quiz', 'homework', 'practical', 'project', 'continuous'])],
            'date' => ['nullable', 'date'],
            'max_score' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'weight' => ['sometimes', 'numeric', 'min:0', 'max:10'],
            'is_published' => ['sometimes', 'boolean'],
            'is_locked' => ['sometimes', 'boolean'],
        ];
    }
}
