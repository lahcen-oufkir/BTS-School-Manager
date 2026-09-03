<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'school_id' => [Rule::requiredIf(! $this->user()->isEstablishmentAdmin()), 'integer', 'exists:schools,id'],
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'is_private' => ['sometimes', 'boolean'],
            'owner_type' => ['nullable', 'string', 'in:student,teacher,school'],
            'owner_id' => ['nullable', 'integer'],
            'file' => ['required', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,jpg,jpeg,png',
            ],
        ];
    }
}
