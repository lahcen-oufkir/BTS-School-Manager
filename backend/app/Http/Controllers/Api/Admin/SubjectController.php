<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSubjectRequest;
use App\Http\Requests\Admin\UpdateSubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Models\Program;
use App\Models\Subject;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    public function index(Request $request)
    {
        $query = Subject::query()
            ->with('program')
            ->when($request->filled('program_id'), fn ($q) => $q->where('program_id', $request->input('program_id')))
            ->when($request->filled('school_id'), fn ($q) => $q->whereHas('program', fn ($p) => $p->where('school_id', $request->input('school_id'))))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->input('search').'%'))
            ->orderBy('name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->whereHas('program', fn ($p) => $p->where('school_id', $request->user()->school_id));
        }

        return SubjectResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreSubjectRequest $request)
    {
        $program = Program::find($request->input('program_id'));

        if ($request->user()->isEstablishmentAdmin()
            && ($program === null || $program->school_id !== $request->user()->school_id)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $subject = Subject::create($request->validated());

        return (new SubjectResource($subject->load('program')))->response()->setStatusCode(201);
    }

    public function show(Request $request, Subject $subject)
    {
        if ($request->user()->isEstablishmentAdmin()
            && $subject->program?->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new SubjectResource($subject->load('program'));
    }

    public function update(UpdateSubjectRequest $request, Subject $subject)
    {
        if ($request->user()->isEstablishmentAdmin()
            && $subject->program?->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $subject->update($request->validated());

        return new SubjectResource($subject->fresh()->load('program'));
    }

    public function destroy(Request $request, Subject $subject)
    {
        if ($request->user()->isEstablishmentAdmin()
            && $subject->program?->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($subject->assignments()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une matière déjà assignée à des enseignants.'], 422);
        }

        $subject->delete();

        return response()->json(['message' => 'Matière supprimée.']);
    }
}
