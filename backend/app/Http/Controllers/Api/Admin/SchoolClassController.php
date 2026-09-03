<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolClassRequest;
use App\Http\Requests\Admin\UpdateSchoolClassRequest;
use App\Http\Resources\SchoolClassResource;
use App\Models\Program;
use App\Models\SchoolClass;
use Illuminate\Http\Request;

class SchoolClassController extends Controller
{
    public function index(Request $request)
    {
        $query = SchoolClass::query()
            ->with(['program', 'academicYear'])
            ->withCount('students')
            ->when($request->filled('program_id'), fn ($q) => $q->where('program_id', $request->input('program_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->input('academic_year_id')))
            ->when($request->filled('school_id'), fn ($q) => $q->whereHas('program', fn ($p) => $p->where('school_id', $request->input('school_id'))))
            ->orderBy('name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->whereHas('program', fn ($p) => $p->where('school_id', $request->user()->school_id));
        }

        return SchoolClassResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreSchoolClassRequest $request)
    {
        $program = Program::find($request->input('program_id'));

        if ($request->user()->isEstablishmentAdmin()
            && ($program === null || $program->school_id !== $request->user()->school_id)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $class = SchoolClass::create($request->validated());

        return (new SchoolClassResource($class->load(['program', 'academicYear'])))->response()->setStatusCode(201);
    }

    public function show(Request $request, SchoolClass $schoolClass)
    {
        if ($request->user()->isEstablishmentAdmin()
            && $schoolClass->program?->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new SchoolClassResource($schoolClass->load(['program', 'academicYear'])->loadCount('students'));
    }

    public function update(UpdateSchoolClassRequest $request, SchoolClass $schoolClass)
    {
        if ($request->user()->isEstablishmentAdmin()
            && $schoolClass->program?->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $schoolClass->update($request->validated());

        return new SchoolClassResource($schoolClass->fresh()->load(['program', 'academicYear']));
    }

    public function destroy(Request $request, SchoolClass $schoolClass)
    {
        if ($request->user()->isEstablishmentAdmin()
            && $schoolClass->program?->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($schoolClass->students()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une classe qui contient des étudiants.'], 422);
        }

        $schoolClass->delete();

        return response()->json(['message' => 'Classe supprimée.']);
    }
}
