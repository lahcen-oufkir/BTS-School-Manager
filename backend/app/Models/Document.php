<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable([
    'school_id', 'user_id', 'owner_type', 'owner_id', 'title', 'category',
    'file_path', 'file_name', 'mime_type', 'file_size', 'is_private', 'is_archived',
])]
class Document extends Model
{
    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'is_private' => 'boolean',
            'is_archived' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function owner(): MorphTo
    {
        return $this->morphTo();
    }
}
