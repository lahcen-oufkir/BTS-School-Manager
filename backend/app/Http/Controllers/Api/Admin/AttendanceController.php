<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAttendanceRecordsRequest;
use App\Http\Requests\Admin\StoreAttendanceSessionRequest;
use App\Http\Requests\Admin\UpdateAttendanceSessionRequest;
use App\Http\Resources\AttendanceRecordResource;
use App\Http\Resources\AttendanceSessionResource;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Models\Teacher;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = AttendanceSession::query()
            ->with(['schoolClass', 'subject', 'teacher'])
            ->when($request->filled('class_id'), fn ($q) => $q->where('class_id', $request->input('class_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->input('subject_id')))
            ->when($request->filled('date'), fn ($q) => $q->whereDate('date', $request->input('date')))
            ->when($request->filled('school_id'), fn ($q) => $q->whereHas('schoolClass.program', fn ($p) => $p->where('school_id', $request->input('school_id'))))
            ->orderByDesc('date')
            ->orderByDesc('id');

        $this->applyScope($request, $query);

        return AttendanceSessionResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreAttendanceSessionRequest $request)
    {
        $class = SchoolClass::find($request->input('class_id'));

        if (! $this->canAccessSchool($request, $class?->program?->school_id)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if (! $teacher) {
                return response()->json(['message' => "Aucun profil enseignant n'est associé à votre compte."], 422);
            }
            $data['teacher_id'] = $teacher->id;
        }

        $session = AttendanceSession::create($data);

        return (new AttendanceSessionResource(
            $session->load(['schoolClass', 'subject', 'teacher'])->loadCount(['records', 'presentRecords', 'absentRecords', 'lateRecords', 'justifiedRecords'])
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, AttendanceSession $session)
    {
        if (! $this->canView($request, $session)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $session->load(['schoolClass.program', 'subject', 'teacher', 'records.student'])
            ->loadCount(['records', 'presentRecords', 'absentRecords', 'lateRecords', 'justifiedRecords']);

        return new AttendanceSessionResource($session);
    }

    public function update(UpdateAttendanceSessionRequest $request, AttendanceSession $session)
    {
        if (! $this->canManage($request, $session)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $session->update($request->validated());

        return new AttendanceSessionResource(
            $session->fresh()->load(['schoolClass', 'subject', 'teacher'])
                ->loadCount(['records', 'presentRecords', 'absentRecords', 'lateRecords', 'justifiedRecords'])
        );
    }

    public function destroy(Request $request, AttendanceSession $session)
    {
        if (! $this->canManage($request, $session)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $session->delete();

        return response()->json(['message' => 'Séance d\'assiduité supprimée.']);
    }

    public function stream(Request $request, AttendanceSession $session)
    {
        if (! $this->canView($request, $session)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $class = $session->schoolClass;

        $expected = $class && $class->academic_year_id
            ? Enrollment::where('class_id', $class->id)
                ->where('academic_year_id', $class->academic_year_id)
                ->pluck('student_id')
            : collect();

        $existing = $session->records()->get()->keyBy('student_id');

        $students = $class
            ? $class->students()
                ->whereIn('students.id', $expected)
                ->get(['students.id', 'students.first_name', 'students.last_name', 'students.student_number'])
            : collect();

        $rows = $students->map(function ($student) use ($existing) {
            $record = $existing->get($student->id);

            return [
                'student_id' => $student->id,
                'first_name' => $student->first_name,
                'last_name' => $student->last_name,
                'student_number' => $student->student_number,
                'status' => $record?->status ?? 'present',
                'justification' => $record?->justification,
            ];
        });

        return response()->json(['data' => $rows->values()]);
    }

    public function updateRecords(StoreAttendanceRecordsRequest $request, AttendanceSession $session)
    {
        if (! $this->canManage($request, $session)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        foreach ($request->input('records') as $row) {
            AttendanceRecord::updateOrCreate(
                ['attendance_session_id' => $session->id, 'student_id' => $row['student_id']],
                ['status' => $row['status'], 'justification' => $row['justification'] ?? null],
            );
        }

        return response()->json(['message' => 'Présences enregistrées.']);
    }

    public function records(Request $request, AttendanceSession $session)
    {
        if (! $this->canView($request, $session)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $records = $session->records()->with('student')->orderBy('student_id')->get();

        return AttendanceRecordResource::collection($records);
    }

    private function canView(Request $request, AttendanceSession $session): bool
    {
        $schoolId = $session->schoolClass?->program?->school_id;

        if ($request->user()->isEstablishmentAdmin()) {
            return $schoolId === $request->user()->school_id;
        }

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if ($teacher) {
                return $session->teacher_id === null || $session->teacher_id === $teacher->id;
            }

            return false;
        }

        return $request->user()->isSystemAdmin();
    }

    private function canManage(Request $request, AttendanceSession $session): bool
    {
        $schoolId = $session->schoolClass?->program?->school_id;

        if ($request->user()->isEstablishmentAdmin()) {
            return $schoolId === $request->user()->school_id;
        }

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();
            if ($teacher) {
                return $session->teacher_id === $teacher->id;
            }

            return false;
        }

        return $request->user()->isSystemAdmin();
    }

    private function canAccessSchool(Request $request, $classSchoolId): bool
    {
        if (! $request->user()->isEstablishmentAdmin()) {
            return true;
        }

        return $classSchoolId === $request->user()->school_id;
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
