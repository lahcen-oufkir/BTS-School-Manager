<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'class_id', 'subject_id', 'teacher_id', 'academic_year_id', 'title', 'type',
    'date', 'max_score', 'weight', 'is_published', 'is_locked',
])]
class Assessment extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'max_score' => 'decimal:2',
            'weight' => 'decimal:2',
            'is_published' => 'boolean',
            'is_locked' => 'boolean',
        ];
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class, 'class_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function grades(): HasMany
    {
        return $this->hasMany(Grade::class);
    }
}
