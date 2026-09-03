<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StudentResource extends JsonResource
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
            'user_id' => $this->user_id,
            'school_id' => $this->school_id,
            'school' => $this->whenLoaded('school', fn () => [
                'id' => $this->school->id,
                'name' => $this->school->name,
            ]),
            'student_number' => $this->student_number,
            'cne' => $this->cne,
            'cin' => $this->cin,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'birth_date' => $this->birth_date?->toDateString(),
            'birth_place' => $this->birth_place,
            'gender' => $this->gender,
            'address' => $this->address,
            'city' => $this->city,
            'phone' => $this->phone,
            'email' => $this->email,
            'photo_path' => $this->photo_path,
            'status' => $this->status,
            'guardians' => StudentGuardianResource::collection($this->whenLoaded('guardians')),
            'current_class' => $this->when($this->currentClass, function () {
                return $this->currentClass
                    ? [
                        'id' => $this->currentClass->id,
                        'name' => $this->currentClass->name,
                        'code' => $this->currentClass->code,
                    ]
                    : null;
            }),
            'guardians_count' => $this->whenCounted('guardians'),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
