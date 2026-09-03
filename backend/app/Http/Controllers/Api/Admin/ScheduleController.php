<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreScheduleRequest;
use App\Http\Requests\Admin\UpdateScheduleRequest;
use App\Http\Resources\ScheduleResource;
use App\Models\Schedule;
use App\Models\SchoolClass;
use App\Models\Teacher;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function index(Request $request)
    {
        $query = Schedule::query()
            ->with(['schoolClass', 'subject', 'teacher', 'room'])
            ->when($request->filled('class_id'), fn ($q) => $q->where('class_id', $request->input('class_id')))
            ->when($request->filled('subject_id'), fn ($q) => $q->where('subject_id', $request->input('subject_id')))
            ->when($request->filled('teacher_id'), fn ($q) => $q->where('teacher_id', $request->input('teacher_id')))
            ->when($request->filled('room_id'), fn ($q) => $q->where('room_id', $request->input('room_id')))
            ->when($request->filled('academic_year_id'), fn ($q) => $q->where('academic_year_id', $request->input('academic_year_id')))
            ->when($request->filled('day_of_week'), fn ($q) => $q->where('day_of_week', $request->input('day_of_week')))
            ->when($request->filled('school_id'), fn ($q) => $q->whereHas('schoolClass.program', fn ($p) => $p->where('school_id', $request->input('school_id'))))
            ->orderBy('day_of_week')
            ->orderBy('start_time');

        $this->applyScope($request, $query);

        return ScheduleResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreScheduleRequest $request)
    {
        $class = SchoolClass::find($request->input('class_id'));

        if ($this->cannotAccessClass($request, $class?->program?->school_id)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $schedule = Schedule::create($request->validated());

        return (new ScheduleResource(
            $schedule->load(['schoolClass', 'subject', 'teacher', 'room'])
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Schedule $schedule)
    {
        if (! $this->canView($request, $schedule)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $schedule->load(['schoolClass', 'subject', 'teacher', 'room']);

        return new ScheduleResource($schedule);
    }

    public function update(UpdateScheduleRequest $request, Schedule $schedule)
    {
        if (! $this->canManage($request, $schedule)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $schedule->update($request->validated());

        return new ScheduleResource(
            $schedule->fresh()->load(['schoolClass', 'subject', 'teacher', 'room'])
        );
    }

    public function destroy(Request $request, Schedule $schedule)
    {
        if (! $this->canManage($request, $schedule)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $schedule->delete();

        return response()->json(['message' => 'Créneau supprimé.']);
    }

    private function canView(Request $request, Schedule $schedule): bool
    {
        $schoolId = $schedule->schoolClass?->program?->school_id;

        if ($request->user()->isEstablishmentAdmin()) {
            return $schoolId === $request->user()->school_id;
        }

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();

            return $teacher && ($schedule->teacher_id === null || $schedule->teacher_id === $teacher->id);
        }

        return $request->user()->isSystemAdmin();
    }

    private function canManage(Request $request, Schedule $schedule): bool
    {
        $schoolId = $schedule->schoolClass?->program?->school_id;

        if ($request->user()->isEstablishmentAdmin()) {
            return $schoolId === $request->user()->school_id;
        }

        if ($request->user()->isTeacher()) {
            $teacher = Teacher::where('user_id', $request->user()->id)->first();

            return $teacher && $schedule->teacher_id === $teacher->id;
        }

        return $request->user()->isSystemAdmin();
    }

    private function cannotAccessClass(Request $request, $classSchoolId): bool
    {
        if (! $request->user()->isEstablishmentAdmin()) {
            return false;
        }

        return $classSchoolId !== $request->user()->school_id;
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
