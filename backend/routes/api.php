<?php

use App\Http\Controllers\Api\Admin\AcademicYearController;
use App\Http\Controllers\Api\Admin\AnnouncementController;
use App\Http\Controllers\Api\Admin\AssessmentController;
use App\Http\Controllers\Api\Admin\AttendanceController;
use App\Http\Controllers\Api\Admin\DocumentController;
use App\Http\Controllers\Api\Admin\GradeController;
use App\Http\Controllers\Api\Admin\ProgramController;
use App\Http\Controllers\Api\Admin\ReportController;
use App\Http\Controllers\Api\Admin\RoleController;
use App\Http\Controllers\Api\Admin\RoomController;
use App\Http\Controllers\Api\Admin\ScheduleController;
use App\Http\Controllers\Api\Admin\SchoolClassController;
use App\Http\Controllers\Api\Admin\SchoolController;
use App\Http\Controllers\Api\Admin\StudentController;
use App\Http\Controllers\Api\Admin\SubjectController;
use App\Http\Controllers\Api\Admin\TeacherController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\Admin\UserNotificationController;
use App\Http\Controllers\Api\Auth\AuthController;
use App\Http\Controllers\Api\HealthController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Health check
    Route::get('/health', [HealthController::class, 'index']);

    // Public authentication
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:5,1');
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware('throttle:3,5');
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware('throttle:3,5');

    // Authenticated routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::put('/auth/password', [AuthController::class, 'changePassword']);

        // --- Phase 2: Administration ---
        Route::get('/admin/roles', [RoleController::class, 'index'])
            ->middleware('permission:users.view');

        Route::get('/admin/users', [UserController::class, 'index'])
            ->middleware('permission:users.view');
        Route::post('/admin/users', [UserController::class, 'store'])
            ->middleware('permission:users.create');
        Route::get('/admin/users/{user}', [UserController::class, 'show'])
            ->middleware('permission:users.view');
        Route::put('/admin/users/{user}', [UserController::class, 'update'])
            ->middleware('permission:users.update');
        Route::delete('/admin/users/{user}', [UserController::class, 'destroy'])
            ->middleware('permission:users.delete');

        Route::get('/admin/schools', [SchoolController::class, 'index'])
            ->middleware('permission:settings.view');
        Route::post('/admin/schools', [SchoolController::class, 'store'])
            ->middleware('permission:settings.update');
        Route::get('/admin/schools/{school}', [SchoolController::class, 'show'])
            ->middleware('permission:settings.view');
        Route::put('/admin/schools/{school}', [SchoolController::class, 'update'])
            ->middleware('permission:settings.update');
        Route::delete('/admin/schools/{school}', [SchoolController::class, 'destroy'])
            ->middleware('permission:settings.update');

        Route::get('/admin/academic-years', [AcademicYearController::class, 'index'])
            ->middleware('permission:settings.view');
        Route::post('/admin/academic-years', [AcademicYearController::class, 'store'])
            ->middleware('permission:settings.update');
        Route::get('/admin/academic-years/{academic_year}', [AcademicYearController::class, 'show'])
            ->middleware('permission:settings.view');
        Route::put('/admin/academic-years/{academic_year}', [AcademicYearController::class, 'update'])
            ->middleware('permission:settings.update');
        Route::delete('/admin/academic-years/{academic_year}', [AcademicYearController::class, 'destroy'])
            ->middleware('permission:settings.update');

        Route::get('/programs', [ProgramController::class, 'index'])
            ->middleware('permission:settings.view');
        Route::post('/programs', [ProgramController::class, 'store'])
            ->middleware('permission:settings.update');
        Route::get('/programs/{program}', [ProgramController::class, 'show'])
            ->middleware('permission:settings.view');
        Route::put('/programs/{program}', [ProgramController::class, 'update'])
            ->middleware('permission:settings.update');
        Route::delete('/programs/{program}', [ProgramController::class, 'destroy'])
            ->middleware('permission:settings.update');

        Route::get('/subjects', [SubjectController::class, 'index'])
            ->middleware('permission:subjects.view');
        Route::post('/subjects', [SubjectController::class, 'store'])
            ->middleware('permission:subjects.create');
        Route::get('/subjects/{subject}', [SubjectController::class, 'show'])
            ->middleware('permission:subjects.view');
        Route::put('/subjects/{subject}', [SubjectController::class, 'update'])
            ->middleware('permission:subjects.update');
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy'])
            ->middleware('permission:subjects.delete');

        Route::get('/classes', [SchoolClassController::class, 'index'])
            ->middleware('permission:classes.view');
        Route::post('/classes', [SchoolClassController::class, 'store'])
            ->middleware('permission:classes.create');
        Route::get('/classes/{school_class}', [SchoolClassController::class, 'show'])
            ->middleware('permission:classes.view');
        Route::put('/classes/{school_class}', [SchoolClassController::class, 'update'])
            ->middleware('permission:classes.update');
        Route::delete('/classes/{school_class}', [SchoolClassController::class, 'destroy'])
            ->middleware('permission:classes.delete');

        // --- Phase 3: Students ---
        Route::get('/students', [StudentController::class, 'index'])
            ->middleware('permission:students.view');
        Route::post('/students', [StudentController::class, 'store'])
            ->middleware('permission:students.create');
        Route::get('/students/{student}', [StudentController::class, 'show'])
            ->middleware('permission:students.view');
        Route::put('/students/{student}', [StudentController::class, 'update'])
            ->middleware('permission:students.update');
        Route::delete('/students/{student}', [StudentController::class, 'destroy'])
            ->middleware('permission:students.delete');

        // --- Phase 5: Grades / Assessments ---
        Route::get('/assessments', [AssessmentController::class, 'index'])
            ->middleware('permission:grades.view');
        Route::post('/assessments', [AssessmentController::class, 'store'])
            ->middleware('permission:grades.create');
        Route::get('/assessments/{assessment}', [AssessmentController::class, 'show'])
            ->middleware('permission:grades.view');
        Route::put('/assessments/{assessment}', [AssessmentController::class, 'update'])
            ->middleware('permission:grades.update');
        Route::delete('/assessments/{assessment}', [AssessmentController::class, 'destroy'])
            ->middleware('permission:grades.delete');
        Route::post('/assessments/{assessment}/publish', [AssessmentController::class, 'publish'])
            ->middleware('permission:grades.update');
        Route::post('/assessments/{assessment}/lock', [AssessmentController::class, 'lock'])
            ->middleware('permission:grades.update');

        Route::get('/assessments/{assessment}/grades', [GradeController::class, 'index'])
            ->middleware('permission:grades.view');
        Route::get('/assessments/{assessment}/grade-stream', [GradeController::class, 'stream'])
            ->middleware('permission:grades.view');
        Route::put('/assessments/{assessment}/grades', [GradeController::class, 'update'])
            ->middleware('permission:grades.update');

        // --- Phase 4: Teachers ---
        Route::get('/teachers', [TeacherController::class, 'index'])
            ->middleware('permission:teachers.view');
        Route::post('/teachers', [TeacherController::class, 'store'])
            ->middleware('permission:teachers.create');
        Route::get('/teachers/{teacher}', [TeacherController::class, 'show'])
            ->middleware('permission:teachers.view');
        Route::put('/teachers/{teacher}', [TeacherController::class, 'update'])
            ->middleware('permission:teachers.update');
        Route::delete('/teachers/{teacher}', [TeacherController::class, 'destroy'])
            ->middleware('permission:teachers.delete');

        // --- Phase 6: Attendance ---
        Route::get('/attendance', [AttendanceController::class, 'index'])
            ->middleware('permission:attendance.view');
        Route::post('/attendance', [AttendanceController::class, 'store'])
            ->middleware('permission:attendance.create');
        Route::get('/attendance/{session}', [AttendanceController::class, 'show'])
            ->middleware('permission:attendance.view');
        Route::put('/attendance/{session}', [AttendanceController::class, 'update'])
            ->middleware('permission:attendance.update');
        Route::delete('/attendance/{session}', [AttendanceController::class, 'destroy'])
            ->middleware('permission:attendance.update');
        Route::get('/attendance/{session}/records', [AttendanceController::class, 'records'])
            ->middleware('permission:attendance.view');
        Route::get('/attendance/{session}/stream', [AttendanceController::class, 'stream'])
            ->middleware('permission:attendance.view');
        Route::put('/attendance/{session}/records', [AttendanceController::class, 'updateRecords'])
            ->middleware('permission:attendance.update');

        // --- Phase 7: Rooms ---
        Route::get('/rooms', [RoomController::class, 'index'])
            ->middleware('permission:rooms.view');
        Route::post('/rooms', [RoomController::class, 'store'])
            ->middleware('permission:rooms.create');
        Route::get('/rooms/{room}', [RoomController::class, 'show'])
            ->middleware('permission:rooms.view');
        Route::put('/rooms/{room}', [RoomController::class, 'update'])
            ->middleware('permission:rooms.update');
        Route::delete('/rooms/{room}', [RoomController::class, 'destroy'])
            ->middleware('permission:rooms.delete');

        // --- Phase 7: Schedules ---
        Route::get('/schedules', [ScheduleController::class, 'index'])
            ->middleware('permission:schedule.view');
        Route::post('/schedules', [ScheduleController::class, 'store'])
            ->middleware('permission:schedule.create');
        Route::get('/schedules/{schedule}', [ScheduleController::class, 'show'])
            ->middleware('permission:schedule.view');
        Route::put('/schedules/{schedule}', [ScheduleController::class, 'update'])
            ->middleware('permission:schedule.update');
        Route::delete('/schedules/{schedule}', [ScheduleController::class, 'destroy'])
            ->middleware('permission:schedule.delete');

        // --- Phase 8: Announcements ---
        Route::get('/announcements', [AnnouncementController::class, 'index'])
            ->middleware('permission:announcements.view');
        Route::post('/announcements', [AnnouncementController::class, 'store'])
            ->middleware('permission:announcements.create');
        Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show'])
            ->middleware('permission:announcements.view');
        Route::put('/announcements/{announcement}', [AnnouncementController::class, 'update'])
            ->middleware('permission:announcements.update');
        Route::delete('/announcements/{announcement}', [AnnouncementController::class, 'destroy'])
            ->middleware('permission:announcements.delete');

        // --- Phase 8: Notifications ---
        Route::get('/notifications', [UserNotificationController::class, 'index'])
            ->middleware('permission:notifications.view');
        Route::get('/notifications/unread-count', [UserNotificationController::class, 'unreadCount'])
            ->middleware('permission:notifications.view');
        Route::put('/notifications/read-all', [UserNotificationController::class, 'markAllRead'])
            ->middleware('permission:notifications.update');
        Route::put('/notifications/{notification}/read', [UserNotificationController::class, 'markRead'])
            ->middleware('permission:notifications.update');

        // --- Phase 8: Documents ---
        Route::get('/documents', [DocumentController::class, 'index'])
            ->middleware('permission:documents.view');
        Route::post('/documents', [DocumentController::class, 'store'])
            ->middleware('permission:documents.create');
        Route::get('/documents/{document}', [DocumentController::class, 'show'])
            ->middleware('permission:documents.view');
        Route::get('/documents/{document}/download', [DocumentController::class, 'download'])
            ->middleware('permission:documents.view')
            ->name('api.document.download');
        Route::put('/documents/{document}', [DocumentController::class, 'update'])
            ->middleware('permission:documents.update');
        Route::delete('/documents/{document}', [DocumentController::class, 'destroy'])
            ->middleware('permission:documents.delete');

        // --- Phase 9: Reports & analytics ---
        Route::get('/reports/summary', [ReportController::class, 'summary'])
            ->middleware('permission:reports.view');
        Route::get('/reports/students', [ReportController::class, 'students'])
            ->middleware('permission:reports.view');
        Route::get('/reports/grades', [ReportController::class, 'grades'])
            ->middleware('permission:reports.view');
        Route::get('/reports/attendance', [ReportController::class, 'attendance'])
            ->middleware('permission:reports.view');
    });
});
