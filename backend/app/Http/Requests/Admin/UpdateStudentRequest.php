<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $student = $this->route('student');

        return [
            'school_id' => ['sometimes', 'integer', 'exists:schools,id'],
            'student_number' => ['nullable', 'string', 'max:50', Rule::unique('students', 'student_number')->ignore($student->id)],
            'cne' => ['nullable', 'string', 'max:50', Rule::unique('students', 'cne')->ignore($student->id)],
            'cin' => ['nullable', 'string', 'max:50'],
            'first_name' => ['sometimes', 'string', 'max:255'],
            'last_name' => ['sometimes', 'string', 'max:255'],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'birth_place' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'other'])],
            'address' => ['nullable', 'string', 'max:1000'],
            'city' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'status' => ['nullable', Rule::in(['active', 'graduated', 'transferred', 'withdrawn', 'suspended', 'inactive'])],
            'class_id' => ['nullable', 'integer', 'exists:classes,id'],
            'guardian' => ['nullable', 'array'],
            'guardian.id' => ['nullable', 'integer', 'exists:student_guardians,id'],
            'guardian.first_name' => ['required_with:guardian', 'string', 'max:255'],
            'guardian.last_name' => ['required_with:guardian', 'string', 'max:255'],
            'guardian.relationship' => ['nullable', 'string', 'max:50'],
            'guardian.phone' => ['nullable', 'string', 'max:50'],
            'guardian.email' => ['nullable', 'string', 'email', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'guardian.first_name.required_with' => 'Le prénom du tuteur est requis.',
            'guardian.last_name.required_with' => 'Le nom du tuteur est requis.',
        ];
    }
}
