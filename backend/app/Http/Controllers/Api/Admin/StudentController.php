<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreStudentRequest;
use App\Http\Requests\Admin\UpdateStudentRequest;
use App\Http\Resources\StudentResource;
use App\Models\AcademicYear;
use App\Models\SchoolClass;
use App\Models\Student;
use Illuminate\Http\Request;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        $query = Student::query()
            ->with(['school', 'guardians'])
            ->withCount('guardians')
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->input('status')))
            ->when($request->filled('class_id'), fn ($q) => $q->whereHas('classes', fn ($c) => $c->where('classes.id', $request->input('class_id'))))
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = $request->input('search');
                $q->where(fn ($sub) => $sub->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%")
                    ->orWhere('cne', 'like', "%{$search}%")
                    ->orWhere('cin', 'like', "%{$search}%"));
            })
            ->orderBy('last_name')
            ->orderBy('first_name');

        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);
        }

        $students = $query->paginate($request->integer('per_page', 15));

        $this->attachCurrentClass($students->items(), $request);

        return StudentResource::collection($students);
    }

    public function store(StoreStudentRequest $request)
    {
        if ($request->user()->isEstablishmentAdmin() && $request->input('school_id') !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $this->guardianlessData($request->validated());

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $student = Student::create($data);

        if ($request->filled('guardian')) {
            $student->guardians()->create($request->input('guardian'));
        }

        $this->syncEnrollment($student, $request->input('class_id'));

        return (new StudentResource(
            $student->load(['school', 'guardians'])->loadCount('guardians')
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Student $student)
    {
        if ($request->user()->isEstablishmentAdmin() && $student->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $student->load(['school', 'guardians'])->loadCount('guardians');
        $this->attachCurrentClass([$student], $request);

        return new StudentResource($student);
    }

    public function update(UpdateStudentRequest $request, Student $student)
    {
        if ($request->user()->isEstablishmentAdmin() && $student->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $this->guardianlessData($request->validated());

        if ($request->user()->isEstablishmentAdmin()) {
            unset($data['school_id']);
        }

        $student->update($data);

        if ($request->filled('guardian')) {
            $guardian = $request->input('guardian');
            $fill = collect($guardian)->except('id')->all();

            if (! empty($guardian['id'])) {
                $student->guardians()
                    ->whereKey($guardian['id'])
                    ->update($fill);
            } elseif ($student->guardians()->exists()) {
                $student->guardians()->first()->update($fill);
            } else {
                $student->guardians()->create($fill);
            }
        } elseif ($request->has('guardian')) {
            $student->guardians()->delete();
        }

        if ($request->has('class_id')) {
            $this->syncEnrollment($student, $request->input('class_id'));
        }

        return new StudentResource(
            $student->fresh()->load(['school', 'guardians'])->loadCount('guardians')
        );
    }

    public function destroy(Request $request, Student $student)
    {
        if ($request->user()->isEstablishmentAdmin() && $student->school_id !== $request->user()->school_id) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $student->delete();

        return response()->json(['message' => 'Étudiant supprimé.']);
    }

    private function guardianlessData(array $data): array
    {
        unset($data['class_id'], $data['guardian']);

        return $data;
    }

    private function syncEnrollment(Student $student, ?int $classId): void
    {
        if (! $classId) {
            return;
        }

        $class = SchoolClass::find($classId);

        if (! $class) {
            return;
        }

        $academicYearId = $class->academic_year_id
            ?: AcademicYear::where('school_id', $student->school_id)->where('is_current', true)->value('id');

        $student->classes()->syncWithoutDetaching([$classId]);

        $student->enrollments()->updateOrCreate(
            ['class_id' => $classId, 'academic_year_id' => $academicYearId],
            ['enrollment_date' => now()->toDateString(), 'status' => 'active']
        );
    }

    private function attachCurrentClass(array $students, Request $request): void
    {
        $studentIds = collect($students)->filter()->map(fn ($s) => $s->id)->all();

        if (empty($studentIds)) {
            return;
        }

        $classes = SchoolClass::query()
            ->whereHas('students', fn ($q) => $q->whereIn('students.id', $studentIds))
            ->with('students:id')
            ->get();

        foreach ($students as $student) {
            $student->setRelation('currentClass', $classes->first(fn ($c) => $c->students->contains('id', $student->id)));
        }
    }
}
