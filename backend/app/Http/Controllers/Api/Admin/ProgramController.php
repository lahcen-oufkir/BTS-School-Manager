<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreProgramRequest;
use App\Http\Requests\Admin\UpdateProgramRequest;
use App\Http\Resources\ProgramResource;
use App\Models\Program;
use Illuminate\Http\Request;

class ProgramController extends Controller
{
    public function index(Request $request)
    {
        $query = Program::query()
            ->with('school')
            ->withCount(['subjects', 'classes'])
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->input('search').'%'))
            ->orderBy('name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        return ProgramResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreProgramRequest $request)
    {
        if ($request->user()->isEstablishmentAdmin() && $request->input('school_id') !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $program = Program::create($data);

        return (new ProgramResource($program->load('school')))->response()->setStatusCode(201);
    }

    public function show(Request $request, Program $program)
    {
        if ($request->user()->isEstablishmentAdmin() && $program->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new ProgramResource($program->load('school')->loadCount(['subjects', 'classes']));
    }

    public function update(UpdateProgramRequest $request, Program $program)
    {
        if ($request->user()->isEstablishmentAdmin() && $program->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $program->update($request->validated());

        return new ProgramResource($program->fresh()->load('school'));
    }

    public function destroy(Request $request, Program $program)
    {
        if ($request->user()->isEstablishmentAdmin() && $program->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($program->subjects()->exists() || $program->classes()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une filière qui contient des matières ou des classes.'], 422);
        }

        $program->delete();

        return response()->json(['message' => 'Filière supprimée.']);
    }
}
