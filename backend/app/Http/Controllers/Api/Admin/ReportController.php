<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Assessment;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Grade;
use App\Models\Program;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function summary(Request $request)
    {
        $schoolId = $this->resolveSchoolId($request);
        $yearId = $this->resolveYearId($request, $schoolId);

        $activeStudents = Student::where('school_id', $schoolId)->where('status', 'active')->count();
        $students = Student::where('school_id', $schoolId)->count();
        $teachers = Teacher::where('school_id', $schoolId)->count();

        $programIds = Program::where('school_id', $schoolId)->pluck('id');
        $classIds = SchoolClass::query()->whereIn('program_id', $programIds)->pluck('id');

        $assessments = $this->scopeByClasses(
            Assessment::query(),
            $classIds,
            $yearId
        )->count();

        $gradeStats = $this->gradeAggregate($schoolId, $classIds, $yearId);

        $attendance = $this->attendanceAggregate($schoolId, $classIds);

        return response()->json(['data' => [
            'students' => $students,
            'active_students' => $activeStudents,
            'teachers' => $teachers,
            'classes' => $classIds->count(),
            'programs' => $programIds->count(),
            'assessments' => $assessments,
            'school_id' => $schoolId,
            'academic_year_id' => $yearId,
        ], 'grades' => $gradeStats, 'attendance' => $attendance]);
    }

    public function students(Request $request)
    {
        $schoolId = $this->resolveSchoolId($request);

        $byStatus = Student::where('school_id', $schoolId)
            ->selectRaw("coalesce(status, 'unknown') as label, count(*) as count")
            ->groupBy('status')
            ->orderByDesc('count')
            ->get();

        $byGender = Student::where('school_id', $schoolId)
            ->selectRaw("coalesce(gender, 'unknown') as label, count(*) as count")
            ->groupBy('gender')
            ->orderByDesc('count')
            ->get();

        $programIds = Program::where('school_id', $schoolId)->pluck('id');

        $byClass = DB::table('class_students')
            ->join('classes', 'classes.id', '=', 'class_students.class_id')
            ->whereIn('classes.program_id', $programIds)
            ->groupBy('classes.id', 'classes.name')
            ->orderByDesc(DB::raw('count(class_students.student_id)'))
            ->select('classes.id as id', 'classes.name as label', DB::raw('count(class_students.student_id) as count'))
            ->get();

        $byProgram = DB::table('class_students')
            ->join('classes', 'classes.id', '=', 'class_students.class_id')
            ->whereIn('classes.program_id', $programIds)
            ->groupBy('classes.program_id')
            ->select('classes.program_id as id', DB::raw('count(distinct class_students.student_id) as count'))
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'label' => Program::find($row->id)?->name ?? '—',
                'count' => (int) $row->count,
            ]);

        return response()->json(['data' => [
            'status' => $byStatus,
            'gender' => $byGender,
            'classes' => $byClass,
            'programs' => $byProgram,
        ]]);
    }

    public function grades(Request $request)
    {
        $schoolId = $this->resolveSchoolId($request);
        $yearId = $this->resolveYearId($request, $schoolId);

        $programIds = Program::where('school_id', $schoolId)->pluck('id');
        $classIds = SchoolClass::query()->whereIn('program_id', $programIds)->pluck('id');

        $query = Grade::query()
            ->join('assessments', 'assessments.id', '=', 'grades.assessment_id')
            ->join('classes', 'classes.id', '=', 'assessments.class_id')
            ->whereIn('classes.id', $classIds);

        if ($yearId) {
            $query->where('assessments.academic_year_id', $yearId);
        }

        $overall = $query->selectRaw('count(*) as total, avg(grades.score) as average')
            ->first();

        $perClass = $this->gradeRowsGrouped('classes.id', 'classes.name', $schoolId, $classIds, $yearId);
        $perSubject = $this->gradeRowsGrouped('assessments.subject_id', 'assessments.subject_id', $schoolId, $classIds, $yearId)
            ->map(function ($row) {
                $row['label'] = Subject::find($row['id'])?->name ?? '—';

                return $row;
            });

        $passRate = $this->computePassRate($schoolId, $classIds, $yearId);

        return response()->json(['data' => [
            'total_grades' => $overall->total ?? 0,
            'average' => round((float) ($overall->average ?? 0), 2),
            'pass_rate' => $passRate,
            'by_class' => $perClass,
            'by_subject' => $perSubject,
        ]]);
    }

    public function attendance(Request $request)
    {
        $schoolId = $this->resolveSchoolId($request);
        $yearId = $this->resolveYearId($request, $schoolId);

        $programIds = Program::where('school_id', $schoolId)->pluck('id');
        $classIds = SchoolClass::query()->whereIn('program_id', $programIds)->pluck('id');
        if ($classIds->isEmpty()) {
            return response()->json(['data' => ['total_absent' => 0, 'rates' => [], 'by_class' => []]]);
        }

        $sessionQuery = AttendanceSession::query()->whereIn('class_id', $classIds);
        $recordQuery = AttendanceRecord::query()
            ->join('attendance_sessions', 'attendance_sessions.id', '=', 'attendance_records.attendance_session_id')
            ->whereIn('attendance_sessions.class_id', $classIds)
            ->selectRaw('coalesce(attendance_records.status, \'unknown\') as status, count(*) as count')
            ->groupBy('attendance_records.status');

        $byStatus = $recordQuery->get();

        $total = 0;
        $present = 0;
        foreach ($byStatus as $row) {
            if ($row->status !== 'absent' && $row->status !== 'present') {
                $total += $row->count;
            } else {
                $total += $row->count;
                if ($row->status === 'present') {
                    $present += $row->count;
                }
            }
        }

        $byClass = DB::table('attendance_records')
            ->join('attendance_sessions', 'attendance_sessions.id', '=', 'attendance_records.attendance_session_id')
            ->join('classes', 'classes.id', '=', 'attendance_sessions.class_id')
            ->whereIn('classes.id', $classIds)
            ->groupBy('classes.id', 'classes.name')
            ->select(
                'classes.id as id',
                'classes.name as label',
                DB::raw('count(*) as total'),
                DB::raw('sum(case when attendance_records.status = \'present\' then 1 else 0 end) as present'),
                DB::raw('sum(case when attendance_records.status = \'absent\' then 1 else 0 end) as absent')
            )
            ->get()
            ->map(function ($row) {
                $total = (int) $row->total;

                return [
                    'id' => $row->id,
                    'label' => $row->label,
                    'total' => $total,
                    'present' => (int) $row->present,
                    'absent' => (int) $row->absent,
                    'present_rate' => $total > 0 ? round(((int) $row->present / $total) * 100, 1) : 0,
                ];
            });

        return response()->json(['data' => [
            'total_records' => $total,
            'present' => $present,
            'present_rate' => $total > 0 ? round(($present / $total) * 100, 1) : 0,
            'by_status' => $byStatus,
            'by_class' => $byClass,
        ]]);
    }

    private function gradeRowsGrouped(string $groupBy, string $labelExpr, int $schoolId, $classIds, ?int $yearId)
    {
        $query = Grade::query()
            ->join('assessments', 'assessments.id', '=', 'grades.assessment_id')
            ->join('classes', 'classes.id', '=', 'assessments.class_id')
            ->whereIn('classes.id', $classIds);

        if ($yearId) {
            $query->where('assessments.academic_year_id', $yearId);
        }

        return $query
            ->groupBy($groupBy)
            ->selectRaw("$groupBy as id, $labelExpr as label, count(*) as total, avg(grades.score) as average")
            ->orderByDesc(DB::raw('avg(grades.score)'))
            ->get()
            ->map(function ($row) {
                $total = (int) $row->total;

                return [
                    'id' => $row->id,
                    'label' => (string) $row->label ?: '—',
                    'total' => $total,
                    'average' => round((float) $row->average, 2),
                ];
            });
    }

    private function computePassRate(int $schoolId, $classIds, ?int $yearId): float
    {
        $query = Grade::query()
            ->join('assessments', 'assessments.id', '=', 'grades.assessment_id')
            ->join('classes', 'classes.id', '=', 'assessments.class_id')
            ->whereIn('classes.id', $classIds);

        if ($yearId) {
            $query->where('assessments.academic_year_id', $yearId);
        }

        $result = $query
            ->selectRaw('count(*) as total, sum(case when grades.score >= 10 then 1 else 0 end) as passed')
            ->first();

        $total = (int) ($result->total ?? 0);

        return $total > 0 ? round(((int) ($result->passed ?? 0) / $total) * 100, 1) : 0.0;
    }

    private function scopeByClasses($query, $classIds, ?int $yearId)
    {
        $query = $query->whereIn('class_id', $classIds);
        if ($yearId) {
            $query->where('academic_year_id', $yearId);
        }

        return $query;
    }

    private function gradeAggregate(int $schoolId, $classIds, ?int $yearId): array
    {
        $query = Grade::query()
            ->join('assessments', 'assessments.id', '=', 'grades.assessment_id')
            ->join('classes', 'classes.id', '=', 'assessments.class_id')
            ->whereIn('classes.id', $classIds);

        if ($yearId) {
            $query->where('assessments.academic_year_id', $yearId);
        }

        $result = $query->selectRaw('count(*) as total, avg(grades.score) as average')->first();

        return [
            'total_grades' => (int) ($result->total ?? 0),
            'average' => round((float) ($result->average ?? 0), 2),
        ];
    }

    private function attendanceAggregate(int $schoolId, $classIds): array
    {
        $query = AttendanceRecord::query()
            ->join('attendance_sessions', 'attendance_sessions.id', '=', 'attendance_records.attendance_session_id')
            ->whereIn('attendance_sessions.class_id', $classIds)
            ->selectRaw('count(*) as total, sum(case when attendance_records.status = \'present\' then 1 else 0 end) as present')
            ->first();

        $total = (int) ($query->total ?? 0);

        return [
            'total_records' => $total,
            'present' => (int) ($query->present ?? 0),
            'present_rate' => $total > 0 ? round(((int) $query->present / $total) * 100, 1) : 0,
        ];
    }

    private function resolveSchoolId(Request $request): int
    {
        $user = $request->user();

        if ($request->user()->isEstablishmentAdmin()) {
            return $user->school_id;
        }

        return (int) ($request->input('school_id') ?: $user->school_id);
    }

    private function resolveYearId(Request $request, int $schoolId): ?int
    {
        if ($request->filled('academic_year_id')) {
            return (int) $request->input('academic_year_id');
        }

        $current = AcademicYear::where('school_id', $schoolId)->where('is_current', true)->value('id');

        return $current ? (int) $current : null;
    }
}
