<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class DocumentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'school_id' => $this->school_id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'category' => $this->category,
            'file_name' => $this->file_name,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'size_human' => $this->when($this->file_size !== null, fn () => $this->humanFileSize($this->file_size)),
            'is_private' => $this->is_private,
            'is_archived' => $this->is_archived,
            'download_url' => $this->when(Storage::disk('local')->exists($this->file_path), route('api.document.download', ['document' => $this->id])),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function humanFileSize(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        $size = (float) $bytes;

        while ($size >= 1024 && $i < count($units) - 1) {
            $size /= 1024;
            $i++;
        }

        return round($size, 1).' '.$units[$i];
    }
}
