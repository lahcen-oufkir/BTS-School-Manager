<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(['admin_system', 'admin_establishment', 'teacher', 'student'])],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            $role = $this->input('role');

            $requestingAsOwnSchool = $user && $user->isEstablishmentAdmin();

            if ($role !== 'admin_system' && ! $this->input('school_id') && ! $requestingAsOwnSchool) {
                $validator->errors()->add('school_id', 'Une école est requise pour ce rôle.');
            }

            if ($user && $user->isEstablishmentAdmin() && in_array($role, ['admin_system', 'admin_establishment'])) {
                $validator->errors()->add('role', 'Seul un administrateur système peut créer ces rôles.');
            }
        });
    }
}
