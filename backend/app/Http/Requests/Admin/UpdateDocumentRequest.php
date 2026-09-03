<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'is_private' => ['sometimes', 'boolean'],
            'is_archived' => ['sometimes', 'boolean'],
            'file' => ['sometimes', 'file', 'max:20480', 'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,odt,jpg,jpeg,png',
            ],
        ];
    }
}
