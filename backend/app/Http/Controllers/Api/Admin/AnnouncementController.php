<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAnnouncementRequest;
use App\Http\Requests\Admin\UpdateAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use App\Models\Enrollment;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $query = Announcement::query()
            ->with(['school', 'user', 'schoolClass', 'program'])
            ->when($request->filled('school_id'), fn ($q) => $q->where('school_id', $request->input('school_id')))
            ->when($request->filled('audience'), fn ($q) => $q->where('audience', $request->input('audience')))
            ->when($request->filled('class_id'), fn ($q) => $q->where('class_id', $request->input('class_id')))
            ->when($request->filled('program_id'), fn ($q) => $q->where('program_id', $request->input('program_id')))
            ->when($request->filled('published'), fn ($q) => $request->boolean('published')
                ? $q->whereNotNull('published_at')
                : $q->whereNull('published_at'))
            ->orderByDesc('created_at');

        $this->applyListScope($request, $query);

        return AnnouncementResource::collection($query->paginate($request->integer('per_page', 15)));
    }

    public function store(StoreAnnouncementRequest $request)
    {
        $data = $request->validated();

        if ($request->user()->isEstablishmentAdmin()) {
            $data['school_id'] = $request->user()->school_id;
        }

        $data['user_id'] = $request->user()->id;

        $announcement = Announcement::create($data);

        $this->syncNotifications($announcement);

        return (new AnnouncementResource(
            $announcement->load(['school', 'user', 'schoolClass', 'program'])
        ))->response()->setStatusCode(201);
    }

    public function show(Request $request, Announcement $announcement)
    {
        if ($this->cannotAccess($request, $announcement)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $announcement->load(['school', 'user', 'schoolClass', 'program']);

        return new AnnouncementResource($announcement);
    }

    public function update(UpdateAnnouncementRequest $request, Announcement $announcement)
    {
        if ($this->cannotManage($request, $announcement)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        $data = $request->validated();
        if ($request->user()->isEstablishmentAdmin()) {
            unset($data['school_id']);
        }

        $announcement->update($data);

        $this->syncNotifications($announcement->fresh());

        return new AnnouncementResource(
            $announcement->fresh()->load(['school', 'user', 'schoolClass', 'program'])
        );
    }

    public function destroy(Request $request, Announcement $announcement)
    {
        if ($this->cannotManage($request, $announcement)) {
            return response()->json(['message' => 'Resource not found.'], 404);
        }

        UserNotification::where('announcement_id', $announcement->id)->delete();
        $announcement->delete();

        return response()->json(['message' => 'Annonce supprimée.']);
    }

    private function syncNotifications(Announcement $announcement): void
    {
        if (! $announcement->is_published) {
            UserNotification::where('announcement_id', $announcement->id)->delete();

            return;
        }

        UserNotification::where('announcement_id', $announcement->id)->delete();

        $userIds = $this->targetUserIds($announcement);

        foreach ($userIds as $userId) {
            UserNotification::create([
                'user_id' => $userId,
                'announcement_id' => $announcement->id,
                'type' => 'announcement',
                'title' => $announcement->title,
                'body' => mb_strimwidth($announcement->content, 0, 200, '…'),
                'action_url' => '/dashboard/announcements',
            ]);
        }
    }

    private function targetUserIds(Announcement $announcement): array
    {
        $schoolId = $announcement->school_id;

        return match ($announcement->audience) {
            'teachers' => User::where('school_id', $schoolId)->where('role', 'teacher')->pluck('id')->all(),
            'students' => User::where('school_id', $schoolId)->where('role', 'student')->pluck('id')->all(),
            'class' => $this->studentUserIdsForClasses([$announcement->class_id]),
            'program' => $this->studentUserIdsForProgram($announcement->program_id),
            default => User::where('school_id', $schoolId)->where('role', '!=', 'admin_system')->pluck('id')->all(),
        };
    }

    private function studentUserIdsForClasses(array $classIds): array
    {
        $classIds = array_values(array_filter($classIds));
        if (empty($classIds)) {
            return [];
        }

        $studentIds = Enrollment::whereIn('class_id', $classIds)->pluck('student_id')
            ->merge(DB::table('class_students')->whereIn('class_id', $classIds)->pluck('student_id'))
            ->unique();

        return Student::whereIn('id', $studentIds)->whereNotNull('user_id')->pluck('user_id')->all();
    }

    private function studentUserIdsForProgram($programId): array
    {
        $classIds = SchoolClass::where('program_id', $programId)->pluck('id')->all();

        return $this->studentUserIdsForClasses($classIds);
    }

    private function canView(Request $request, Announcement $announcement): bool
    {
        return $request->user()->isSystemAdmin()
            || $announcement->school_id === $request->user()->school_id;
    }

    private function cannotAccess(Request $request, Announcement $announcement): bool
    {
        return ! $this->canView($request, $announcement);
    }

    private function cannotManage(Request $request, Announcement $announcement): bool
    {
        if ($request->user()->isEstablishmentAdmin()) {
            return $announcement->school_id !== $request->user()->school_id;
        }

        return ! $request->user()->isSystemAdmin();
    }

    private function applyListScope(Request $request, $query): void
    {
        if ($request->user()->isEstablishmentAdmin()) {
            $query->where('school_id', $request->user()->school_id);

            return;
        }

        if ($request->user()->isTeacher() || $request->user()->isStudent()) {
            $query->where('school_id', $request->user()->school_id)
                ->whereNotNull('published_at')
                ->where('is_archived', false);
        }
    }
}
