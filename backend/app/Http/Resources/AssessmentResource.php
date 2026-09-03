<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssessmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'class_id' => $this->class_id,
            'class' => $this->whenLoaded('schoolClass', fn () => [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
                'code' => $this->schoolClass->code,
            ]),
            'subject_id' => $this->subject_id,
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
                'code' => $this->subject->code,
            ]),
            'teacher_id' => $this->teacher_id,
            'teacher' => $this->whenLoaded('teacher', fn () => [
                'id' => $this->teacher->id,
                'first_name' => $this->teacher->first_name,
                'last_name' => $this->teacher->last_name,
            ]),
            'academic_year_id' => $this->academic_year_id,
            'title' => $this->title,
            'type' => $this->type,
            'date' => $this->date?->toDateString(),
            'max_score' => $this->max_score,
            'weight' => $this->weight,
            'is_published' => $this->is_published,
            'is_locked' => $this->is_locked,
            'grades_count' => $this->whenCounted('grades'),
            'average' => $this->when($this->average !== null, fn () => $this->average),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
