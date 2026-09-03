<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['class_id', 'subject_id', 'teacher_id', 'date', 'start_time', 'end_time'])]
class AttendanceSession extends Model
{
    protected function casts(): array
    {
        return [
            'date' => 'date',
            'start_time' => 'date:H:i',
            'end_time' => 'date:H:i',
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

    public function records(): HasMany
    {
        return $this->hasMany(AttendanceRecord::class, 'attendance_session_id');
    }

    public function presentRecords(): HasMany
    {
        return $this->records()->where('status', 'present');
    }

    public function absentRecords(): HasMany
    {
        return $this->records()->where('status', 'absent');
    }

    public function lateRecords(): HasMany
    {
        return $this->records()->where('status', 'late');
    }

    public function justifiedRecords(): HasMany
    {
        return $this->records()->where('status', 'justified');
    }
}
