<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateGradesRequest;
use App\Http\Resources\GradeResource;
use App\Models\Assessment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Teacher;
use Illuminate\Http\Request;

class GradeController extends Controller
{
    public function index(Request $request, Assessment $assessment)
    {
        if (! $this->canAccess($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $grades = $assessment->grades()->with('student')->orderBy('student_id')->get();

        return GradeResource::collection($grades);
    }

    public function stream(Request $request, Assessment $assessment)
    {
        if (! $this->canAccess($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $class = $assessment->schoolClass;

        $expected = $class && $class->academic_year_id
            ? Enrollment::where('class_id', $class->id)
                ->where('academic_year_id', $assessment->academic_year_id)
                ->pluck('student_id')
            : collect();

        $existing = $assessment->grades()->get()->keyBy('student_id');

        $students = $class
            ? $class->students()
                ->whereIn('students.id', $expected)
                ->get(['students.id', 'students.first_name', 'students.last_name', 'students.student_number'])
            : collect();

        $rows = $students->map(function ($student) use ($existing) {
            $grade = $existing->get($student->id);

            return [
                'student_id' => $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'student_number' => $student->student_number,
                'score' => $grade?->score,
                'comment' => $grade?->comment,
            ];
        });

        return response()->json(['data' => $rows->values()]);
    }

    public function update(UpdateGradesRequest $request, Assessment $assessment)
    {
        if (! $this->canAccess($request, $assessment)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        if ($assessment->is_published) {
            return response()->json(['message' => 'Les notes ont déjà été publiées et ne peuvent plus être modifiées.'], 422);
        }

        foreach ($request->input('grades') as $row) {
            Grade::updateOrCreate(
                ['assessment_id' => $assessment->id, 'student_id' => $row['student_id']],
                ['score' => $row['score'], 'comment' => $row['comment'] ?? null],
            );
        }

        return response()->json(['message' => 'Notes enregistrées.']);
    }

    private function canAccess(Request $request, Assessment $assessment): bool
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

        return $request->user()->isSystemAdmin();
    }
}
