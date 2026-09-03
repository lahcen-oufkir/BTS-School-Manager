<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAssessmentRequest;
use App\Http\Requests\Admin\UpdateAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Assessment::query()
            ->with(['schoolClass', 'subject', 'teacher'])
            ->withCount('grades')
            ->when($request->filled('class_id'), fn ($q) => $q->where('class_id', $request->input('class_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->input('subject_id')))
            ->when($request->filled('school_id'), fn ($q) => $q->whereHas('schoolClass.program', fn ($p) => $p->where('school_id', $request->input('school_id'))))
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'like', '%'.$request->input('search').'%'))
            ->orderByDesc('date')
            ->orderByDesc('id');

        $this->applyScope($request, $query);

        return AssessmentResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreAssessmentRequest $request)
    {
        $class = SchoolClass::find($request->input('class_id'));
        $subject = Subject::find($request->input('subject_id'));

        if (! $this->canAccessResource($request, $class?->program?->school_id, $subject?->program?->school_id)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if (! $teacher) {
                return response()->json(['message' => 'Aucun profil enseignant n\'est associé à votre compte.'], 422);
            }
            $data['teacher_id'] = $teacher->id;
        }

        $assessment = Assessment::create($data);

        return (new AssessmentResource(
            $assessment->load(['schoolClass', 'subject', 'teacher'])
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Assessment $assessment)
    {
        if (! $this->canView($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $assessment->load(['schoolClass.program', 'subject', 'teacher']);
        $assessment->loadCount('grades');
        $assessment->setAttribute('average', $assessment->grades()->avg('score'));

        return new AssessmentResource($assessment);
    }

    public function update(UpdateAssessmentRequest $request, Assessment $assessment)
    {
        if (! $this->canManage($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($assessment->is_locked) {
            return response()->json(['message' => 'Cet examen est verrouillé et ne peut plus être modifié.'], 422);
        }

        $assessment->update($request->validated());

        return new AssessmentResource(
            $assessment->fresh()->load(['schoolClass', 'subject', 'teacher'])->loadCount('grades')
        );
    }

    public function destroy(Request $request, Assessment $assessment)
    {
        if (! $this->canManage($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $assessment->delete();

        return response()->json(['message' => 'Évaluation supprimée.']);
    }

    public function publish(Request $request, Assessment $assessment)
    {
        if (! $this->canManage($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($assessment->is_locked) {
            return response()->json(['message' => 'Cet examen est verrouillé.'], 422);
        }

        $assessment->update(['is_published' => true]);
        $assessment->grades()->whereNull('published_at')->update(['published_at' => now()]);

        return new AssessmentResource(
            $assessment->fresh()->load(['schoolClass', 'subject', 'teacher'])->loadCount('grades')
        );
    }

    public function lock(Request $request, Assessment $assessment)
    {
        if (! $this->canManage($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $assessment->update(['is_locked' => true, 'is_published' => true]);

        return new AssessmentResource(
            $assessment->fresh()->load(['schoolClass', 'subject', 'teacher'])->loadCount('grades')
        );
    }

    private function canView(Request $request, Assessment $assessment): bool
    {
        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if ($teacher) {
                return $assessment->teacher_id === null || $assessment->teacher_id === $teacher->id;
            }
        }

        return true;
    }

    private function canManage(Request $request, Assessment $assessment): bool
    {
        $schoolId = $assessment->schoolClass?->program?->school_id;

        if ($request->user()->isEstablishmentAdmin()) {
            return $schoolId === $request->user()->school_id;
        }

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if ($teacher) {
                return $assessment->teacher_id === $teacher->id;
            }

            return false;
        }

        return true;
    }

    private function canAccessResource(Request $request, $classSchoolId, $subjectSchoolId): bool
    {
        if (! $request->user()->isEstablishmentAdmin()) {
            return true;
        }

        return $classSchoolId === $request->user()->school_id
            && $subjectSchoolId === $request->user()->school_id;
    }

    private function applyScope(Request $request, $query): void
    {
        if ($request->user()->isEstablishmentAdmin()) {
            $query->whereHas('schoolClass.program', fn ($p) => $p->where('school_id', $request->user()->school_id));

            return;
        }

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if ($teacher) {
                $query->where(fn ($q) => $q->where('teacher_id', $teacher->id)->orWhereNull('teacher_id'));
            }
        }
    }
}
