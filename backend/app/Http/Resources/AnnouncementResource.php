<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnnouncementResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'school_id' => $this->school_id,
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
            'user_id' => $this->user_id,
            'author' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ]),
            'title' => $this->title,
            'content' => $this->content,
            'audience' => $this->audience,
            'class_id' => $this->class_id,
            'class' => $this->whenLoaded('schoolClass', fn () => [
                'id' => $this->schoolClass->id,
                'name' => $this->schoolClass->name,
            ]),
            'program_id' => $this->program_id,
            'program' => $this->whenLoaded('program', fn () => [
                'id' => $this->program->id,
                'name' => $this->program->name,
            ]),
            'published_at' => $this->published_at?->toISOString(),
            'expires_at' => $this->expires_at?->toISOString(),
            'is_published' => $this->is_published,
            'is_archived' => $this->is_archived,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
