<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreTeacherRequest;
use App\Http\Requests\Admin\UpdateTeacherRequest;
use App\Http\Resources\TeacherResource;
use App\Models\Teacher;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        $query = Teacher::query()
            ->with(['school', 'subjects'])
            ->withCount('assignments')
            ->when($request->filled('specialization'), fn ($q) => $q->where('specialization', 'like', '%'.$request->input('specialization').'%'))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(fn ($sub) => $sub->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('internal_identifier', 'like', "%{$search}%"));
            })
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        return TeacherResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreTeacherRequest $request)
    {
        if ($request->user()->isEstablishmentAdmin() && $request->input('school_id') !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();
        $subjectIds = $data['subject_ids'] ?? [];
        unset($data['subject_ids']);

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $teacher = Teacher::create($data);

        if (! empty($subjectIds)) {
            $this->syncAssignments($teacher, $subjectIds);
        }

        return (new TeacherResource(
            $teacher->load(['school', 'subjects'])->loadCount('assignments')
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Teacher $teacher)
    {
        if ($request->user()->isEstablishmentAdmin() && $teacher->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $teacher->load(['school', 'subjects', 'assignments.subject', 'assignments.schoolClass'])->loadCount('assignments');

        return new TeacherResource($teacher);
    }

    public function update(UpdateTeacherRequest $request, Teacher $teacher)
    {
        if ($request->user()->isEstablishmentAdmin() && $teacher->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();
        $subjectIds = $data['subject_ids'] ?? null;
        unset($data['subject_ids']);

        if ($request->user()->isEstablishmentAdmin()) {
            unset($data['school_id']);
        }

        $teacher->update($data);

        if ($subjectIds !== null) {
            $this->syncAssignments($teacher, $subjectIds);
        }

        return new TeacherResource(
            $teacher->fresh()->load(['school', 'subjects'])->loadCount('assignments')
        );
    }

    public function destroy(Request $request, Teacher $teacher)
    {
        if ($request->user()->isEstablishmentAdmin() && $teacher->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $teacher->delete();

        return response()->json(['message' => 'Enseignant supprimé.']);
    }

    private function syncAssignments(Teacher $teacher, array $subjectIds): void
    {
        $existing = $teacher->assignments()->pluck('subject_id')->all();
        $toAdd = array_diff($subjectIds, $existing);
        $toRemove = array_diff($existing, $subjectIds);

        if (! empty($toRemove)) {
            $teacher->assignments()->whereIn('subject_id', $toRemove)->delete();
        }

        foreach ($toAdd as $subjectId) {
            $teacher->assignments()->firstOrCreate([
                'subject_id' => $subjectId,
            ]);
        }
    }
}
