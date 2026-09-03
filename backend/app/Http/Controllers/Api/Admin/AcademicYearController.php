<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAcademicYearRequest;
use App\Http\Requests\Admin\UpdateAcademicYearRequest;
use App\Http\Resources\AcademicYearResource;
use App\Models\AcademicYear;
use Illuminate\Http\Request;

class AcademicYearController extends Controller
{
    public function index(Request $request)
    {
        $query = AcademicYear::query()
            ->with('school')
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->boolean('is_current'), fn ($q) => $q->where('is_current', true))
            ->orderByDesc('start_date');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        return AcademicYearResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreAcademicYearRequest $request)
    {
        if ($request->user()->isEstablishmentAdmin() && $request->input('school_id') !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        if (! empty($data['is_current'])) {
            AcademicYear::where('school_id', $data['school_id'])->where('is_current', true)->update(['is_current' => false]);
        }

        $year = AcademicYear::create($data);

        return (new AcademicYearResource($year->load('school')))->response()->setStatusCode(201);
    }

    public function show(Request $request, AcademicYear $academicYear)
    {
        if ($request->user()->isEstablishmentAdmin() && $academicYear->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        return new AcademicYearResource($academicYear->load('school'));
    }

    public function update(UpdateAcademicYearRequest $request, AcademicYear $academicYear)
    {
        if ($request->user()->isEstablishmentAdmin() && $academicYear->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $academicYear->school_id;
        }

        if (! empty($data['is_current'])) {
            AcademicYear::where('school_id', $data['school_id'] ?? $academicYear->school_id)
                ->where('id', '!=', $academicYear->id)
                ->where('is_current', true)
                ->update(['is_current' => false]);
        }

        $academicYear->update($data);

        return new AcademicYearResource($academicYear->fresh()->load('school'));
    }

    public function destroy(Request $request, AcademicYear $academicYear)
    {
        if ($request->user()->isEstablishmentAdmin() && $academicYear->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($academicYear->classes()->exists()) {
            return response()->json(['message' => 'Impossible de supprimer une année qui contient des classes.'], 422);
        }

        $academicYear->delete();

        return response()->json(['message' => 'Année scolaire supprimée.']);
    }
}
