<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDocumentRequest;
use App\Http\Requests\Admin\UpdateDocumentRequest;
use App\Http\Resources\DocumentResource;
use App\Models\Document;
use App\Models\School;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        $query = Document::query()
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->filled('category'), fn ($q) => $q->where('category', $request->input('category')))
            ->when($request->filled('archived'), fn ($q) => $request->boolean('archived')
                ? $q->where('is_archived', true)
                : $q->where('is_archived', false))
            ->orderByDesc('created_at');

        $this->applyScope($request, $query);

        return DocumentResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreDocumentRequest $request)
    {
        $data = $request->validated();
        unset($data['file']);

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $file = $request->file('file');
        $path = $file->store('documents');

        $data['user_id'] = $request->user()->id;
        $data['file_path'] = $path;
        $data['file_name'] = $file->getClientOriginalName();
        $data['mime_type'] = $file->getMimeType();
        $data['file_size'] = $file->getSize();
        $data['is_private'] = $data['is_private'] ?? true;

        if (! empty($data['owner_type']) && ! empty($data['owner_id'])) {
            $morphMap = [
                'student' => Student::class,
                'teacher' => Teacher::class,
                'school' => School::class,
            ];
            $data['owner_type'] = $morphMap[$data['owner_type']] ?? $morphMap['school'];
        } else {
            $data['owner_type'] = null;
            $data['owner_id'] = null;
        }

        $document = Document::create($data);

        return (new DocumentResource($document))->response()->setStatusCode(201);
    }

    public function show(Request $request, Document $document)
    {
        if (! $this->canAccess($request, $document)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new DocumentResource($document);
    }

    public function update(UpdateDocumentRequest $request, Document $document)
    {
        if (! $this->canManage($request, $document)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->hasFile('file')) {
            Storage::delete($document->file_path);
            $file = $request->file('file');
            $data['file_path'] = $file->store('documents');
            $data['file_name'] = $file->getClientOriginalName();
            $data['mime_type'] = $file->getMimeType();
            $data['file_size'] = $file->getSize();
        } else {
            unset($data['file']);
        }

        $document->update($data);

        return new DocumentResource($document->fresh());
    }

    public function destroy(Request $request, Document $document)
    {
        if (! $this->canManage($request, $document)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        Storage::delete($document->file_path);
        $document->delete();

        return response()->json(['message' => 'Document supprimé.']);
    }

    public function download(Request $request, Document $document)
    {
        if (! $this->canAccess($request, $document)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if (! Storage::disk('local')->exists($document->file_path)) {
            return response()->json(['message' => 'Fichier introuvable.'], 404);
        }

        return Storage::disk('local')->download(
            $document->file_path,
            $document->file_name ?: Str::afterLast($document->file_path, '/')
        );
    }

    private function schoolShared(Document $document): bool
    {
        return $document->is_private === false;
    }

    private function canAccess(Request $request, Document $document): bool
    {
        $user = $request->user();

        if ($user->isSystemAdmin()) {
            return true;
        }

        if ($document->school_id !== $user->school_id) {
            return false;
        }

        if ($this->schoolShared($document) || $user->isEstablishmentAdmin() || $document->user_id === $user->id) {
            return true;
        }

        return false;
    }

    private function canManage(Request $request, Document $document): bool
    {
        $user = $request->user();

        if ($user->isSystemAdmin()) {
            return true;
        }

        return $document->school_id === $user->school_id && $user->isEstablishmentAdmin();
    }

    private function applyScope(Request $request, $query): void
    {
        $user = $request->user();

        if ($user->isSystemAdmin()) {
            return;
        }

        $query->where('school_id', $user->school_id);

        if (! $user->isEstablishmentAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('is_private', false)->orWhere('user_id', $user->id);
            });
        }
    }
}
