<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserNotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'announcement_id' => $this->announcement_id,
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'action_url' => $this->action_url,
            'is_read' => $this->is_read,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
