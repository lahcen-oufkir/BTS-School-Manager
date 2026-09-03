<?php

namespace App\Http\Requests\Admin;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user');

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['sometimes', 'string', 'min:8', 'confirmed'],
            'role' => ['sometimes', Rule::in(['admin_system', 'admin_establishment', 'teacher', 'student'])],
            'school_id' => ['nullable', 'integer', 'exists:schools,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $user = $this->user();
            $targetId = $this->route('user');
            $target = is_numeric($targetId) ? User::find((int) $targetId) : null;

            $role = $this->input('role');

            if (! $role && $target) {
                $role = $target->role;
            }

            if ($role && $role !== 'admin_system') {
                $schoolId = $this->input('school_id', $target?->school_id);
                if (! $schoolId) {
                    $validator->errors()->add('school_id', 'Une école est requise pour ce rôle.');
                }
            }

            if ($user && $user->isEstablishmentAdmin() && in_array($role, ['admin_system', 'admin_establishment'])) {
                $validator->errors()->add('role', 'Seul un administrateur système peut gérer ces rôles.');
            }
        });
    }
}
