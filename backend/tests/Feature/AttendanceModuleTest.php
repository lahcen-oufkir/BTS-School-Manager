<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Enrollment;
use App\Models\Program;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceModuleTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;

    private School $schoolB;

    private User $systemAdmin;

    private User $schoolAdmin;

    private User $teacherUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->schoolA = School::create(['name' => 'School A', 'code' => 'A']);
        $this->schoolB = School::create(['name' => 'School B', 'code' => 'B']);

        $this->systemAdmin = User::factory()->create(['role' => 'admin_system']);
        $this->schoolAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolA->id]);
        $this->teacherUser = User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolA->id]);
    }

    public function test_school_admin_can_create_attendance_session(): void
    {
        [$class, , , $subject] = $this->createClass($this->schoolA->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/attendance', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'date' => '2026-10-20',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.class_id', $class->id)
            ->assertJsonPath('data.date', '2026-10-20');

        $this->assertDatabaseHas('attendance_sessions', ['class_id' => $class->id, 'date' => '2026-10-20 00:00:00']);
    }

    public function test_establishment_admin_cannot_create_session_for_other_school(): void
    {
        [$class] = $this->createClass($this->schoolB->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/attendance', [
            'class_id' => $class->id,
            'date' => '2026-10-20',
        ]);

        $response->assertStatus(404);
    }

    public function test_establishment_admin_only_sees_own_school_sessions(): void
    {
        [$classA] = $this->createClass($this->schoolA->id);
        [$classB] = $this->createClass($this->schoolB->id);

        AttendanceSession::create(['class_id' => $classA->id, 'date' => '2026-10-20']);
        AttendanceSession::create(['class_id' => $classB->id, 'date' => '2026-10-21']);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/attendance');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('2026-10-20', $response->json('data.0.date'));
    }

    public function test_teacher_creates_session_auto_assigned_to_teacher(): void
    {
        $teacherProfile = $this->createTeacher($this->schoolA->id);
        [$class] = $this->createClass($this->schoolA->id);

        $response = $this->actingAs($this->teacherUser, 'sanctum')->postJson('/api/v1/attendance', [
            'class_id' => $class->id,
            'date' => '2026-10-22',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.teacher_id', $teacherProfile->id);
    }

    public function test_save_records_updates_attendance(): void
    {
        [$class] = $this->createClass($this->schoolA->id);
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        $class->students()->syncWithoutDetaching([$student->id]);
        Enrollment::firstOrCreate([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $class->academic_year_id,
        ], ['enrollment_date' => '2026-09-01', 'status' => 'active']);

        $session = AttendanceSession::create(['class_id' => $class->id, 'date' => '2026-10-20']);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->putJson("/api/v1/attendance/{$session->id}/records", [
            'records' => [
                ['student_id' => $student->id, 'status' => 'absent', 'justification' => 'Malade'],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('attendance_records', [
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'absent',
            'justification' => 'Malade',
        ]);
    }

    public function test_stream_returns_enrolled_students_with_status(): void
    {
        [$class] = $this->createClass($this->schoolA->id);
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        $class->students()->syncWithoutDetaching([$student->id]);
        Enrollment::firstOrCreate([
            'student_id' => $student->id,
            'class_id' => $class->id,
            'academic_year_id' => $class->academic_year_id,
        ], ['enrollment_date' => '2026-09-01', 'status' => 'active']);

        $session = AttendanceSession::create(['class_id' => $class->id, 'date' => '2026-10-20']);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson("/api/v1/attendance/{$session->id}/stream");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($student->id, $response->json('data.0.student_id'));
        $this->assertSame('present', $response->json('data.0.status'));
    }

    public function test_attendance_crud_full_flow_as_system_admin(): void
    {
        [$class] = $this->createClass($this->schoolA->id);

        $store = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/attendance', [
            'class_id' => $class->id,
            'date' => '2026-11-01',
        ]);
        $store->assertStatus(201);
        $sessionId = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/attendance/{$sessionId}", [
            'date' => '2026-11-05',
        ])->assertOk()->assertJsonPath('data.date', '2026-11-05');

        $this->actingAs($this->systemAdmin, 'sanctum')->getJson("/api/v1/attendance/{$sessionId}")
            ->assertOk()
            ->assertJsonPath('data.id', $sessionId);

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/attendance/{$sessionId}")
            ->assertOk();
        $this->assertDatabaseMissing('attendance_sessions', ['id' => $sessionId]);
    }

    public function test_deleting_session_deletes_records(): void
    {
        [$class] = $this->createClass($this->schoolA->id);
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        $session = AttendanceSession::create(['class_id' => $class->id, 'date' => '2026-10-20']);
        AttendanceRecord::create([
            'attendance_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => 'present',
        ]);

        $this->actingAs($this->schoolAdmin, 'sanctum')->deleteJson("/api/v1/attendance/{$session->id}")
            ->assertOk();

        $this->assertDatabaseMissing('attendance_records', ['attendance_session_id' => $session->id]);
    }

    private function createClass(int $schoolId): array
    {
        $program = Program::create(['school_id' => $schoolId, 'code' => 'IDA', 'name' => 'Info A']);
        $year = AcademicYear::create([
            'school_id' => $schoolId,
            'name' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-15',
        ]);
        $class = SchoolClass::create([
            'program_id' => $program->id,
            'academic_year_id' => $year->id,
            'name' => 'IDA 1ère année',
            'code' => 'IDA-1A',
        ]);
        $subject = Subject::create(['program_id' => $program->id, 'name' => 'Framework Backend', 'coefficient' => 3]);

        return [$class, $year, null, $subject];
    }

    private function createTeacher(int $schoolId)
    {
        return Teacher::create([
            'school_id' => $schoolId,
            'user_id' => $this->teacherUser->id,
            'first_name' => 'Prof',
            'last_name' => 'Demo',
            'is_active' => true,
        ]);
    }
}
