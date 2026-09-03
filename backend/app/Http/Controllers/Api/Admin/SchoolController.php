<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreSchoolRequest;
use App\Http\Requests\Admin\UpdateSchoolRequest;
use App\Http\Resources\SchoolResource;
use App\Models\School;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function index(Request $request)
    {
        $query = School::query()
            ->withCount(['students', 'teachers'])
            ->when($request->boolean('is_active'), fn ($q) => $q->where('is_active', true))
            ->when($request->filled('search'), fn ($q) => $q->where('name', 'like', '%'.$request->input('search').'%'))
            ->orderBy('name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('id', $request->user()->school_id);
        }

        return SchoolResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreSchoolRequest $request)
    {
        if (! $request->user()->isSystemAdmin()) {
            return response()->json(['message' => 'Seul l\'administrateur système peut créer un établissement.'], 403);
        }

        $school = School::create($request->validated());

        return (new SchoolResource($school))->response()->setStatusCode(201);
    }

    public function show(Request $request, School $school)
    {
        if ($request->user()->isEstablishmentAdmin() && $school->id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new SchoolResource($school->loadCount(['students', 'teachers']));
    }

    public function update(UpdateSchoolRequest $request, School $school)
    {
        if (! $request->user()->isSystemAdmin()) {
            return response()->json(['message' => 'Seul l\'administrateur système peut modifier un établissement.'], 403);
        }

        $school->update($request->validated());

        return new SchoolResource($school->refresh());
    }

    public function destroy(Request $request, School $school)
    {
        if (! $request->user()->isSystemAdmin()) {
            return response()->json(['message' => 'Seul l\'administrateur système peut supprimer un établissement.'], 403);
        }

        $hasData = $school->users()->exists()
            || $school->students()->exists()
            || $school->teachers()->exists()
            || $school->programs()->exists();

        if ($hasData) {
            return response()->json([
                'message' => 'Impossible de supprimer un établissement qui contient des données (utilisateurs, étudiants, enseignants, programmes).',
            ], 422);
        }

        $school->delete();

        return response()->json(['message' => 'Établissement supprimé.']);
    }
}
