<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $audience = $this->input('audience', 'everyone');

        return [
            'school_id' => [Rule::requiredIf(! $this->user()->isEstablishmentAdmin()), 'integer', 'exists:schools,id'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'audience' => ['sometimes', 'string', 'in:everyone,teachers,students,class,program'],
            'class_id' => [Rule::requiredIf($audience === 'class'), 'nullable', 'integer', 'exists:classes,id'],
            'program_id' => [Rule::requiredIf($audience === 'program'), 'nullable', 'integer', 'exists:programs,id'],
            'published_at' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:published_at'],
        ];
    }
}
