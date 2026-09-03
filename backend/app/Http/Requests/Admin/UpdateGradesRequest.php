<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateGradesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $assessment = $this->route('assessment');

        return [
            'grades' => ['required', 'array', 'min:1'],
            'grades.*.student_id' => ['required', 'integer', 'exists:students,id'],
            'grades.*.score' => ['required', 'numeric', 'min:0', 'max:'.$assessment->max_score],
            'grades.*.comment' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'grades.*.score.max' => 'La note ne peut pas dépasser le barème de '.$this->route('assessment')->max_score.'.',
        ];
    }
}
