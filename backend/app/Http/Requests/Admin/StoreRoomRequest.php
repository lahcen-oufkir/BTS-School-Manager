<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_id' => [Rule::requiredIf(! $this->user()->isEstablishmentAdmin()), 'integer', 'exists:schools,id'],
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'capacity' => ['nullable', 'integer', 'min:0'],
            'type' => ['nullable', 'string', 'max:100'],
        ];
    }
}
