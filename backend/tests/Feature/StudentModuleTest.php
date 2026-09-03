<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Program;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentModuleTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;

    private School $schoolB;

    private User $systemAdmin;

    private User $schoolAdmin;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->schoolA = School::create(['name' => 'School A', 'code' => 'A']);
        $this->schoolB = School::create(['name' => 'School B', 'code' => 'B']);

        $this->systemAdmin = User::factory()->create(['role' => 'admin_system']);
        $this->schoolAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolA->id]);
        $this->teacher = User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolA->id]);
    }

    public function test_school_admin_can_create_student_with_guardian_and_class(): void
    {
        [$class] = $this->createClass($this->schoolA->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/students', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'Yassine',
            'last_name' => 'El Amrani',
            'cne' => 'A001234567',
            'student_number' => 'S-2026-001',
            'gender' => 'male',
            'email' => 'yassine@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'class_id' => $class->id,
            'guardian' => [
                'first_name' => 'Nadia',
                'last_name' => 'El Amrani',
                'relationship' => 'parent',
                'phone' => '+212 661 234 567',
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.first_name', 'Yassine')
            ->assertJsonCount(1, 'data.guardians')
            ->assertJsonPath('data.guardians.0.relationship', 'parent');

        $student = Student::where('cne', 'A001234567')->first();
        $this->assertNotNull($student);
        $this->assertTrue($student->classes()->where('classes.id', $class->id)->exists());
        $this->assertDatabaseHas('enrollments', ['student_id' => $student->id, 'class_id' => $class->id]);
        $this->assertSame('student', $student->user->role);
        $this->assertSame('yassine@example.com', $student->user->email);
    }

    public function test_establishment_admin_cannot_create_student_for_other_school(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/students', [
            'school_id' => $this->schoolB->id,
            'first_name' => 'Hack',
            'last_name' => 'User',
            'email' => 'hack@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(404);
    }

    public function test_establishment_admin_only_sees_own_school_students(): void
    {
        Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        Student::create([
            'school_id' => $this->schoolB->id,
            'first_name' => 'Other',
            'last_name' => 'School',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/students');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Ali', $response->json('data.0.first_name'));
    }

    public function test_search_filter_matches_name_and_cne(): void
    {
        Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Yassine',
            'last_name' => 'El Amrani',
            'cne' => 'A001234567',
            'status' => 'active',
        ]);
        Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Salma',
            'last_name' => 'Benjelloun',
            'cne' => 'A009871234',
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/v1/students?search=Benjelloun');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Salma', $response->json('data.0.first_name'));
    }

    public function test_teacher_can_view_students_but_not_manage(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')->getJson('/api/v1/students');

        $response->assertOk();

        $response = $this->actingAs($this->teacher, 'sanctum')->postJson('/api/v1/students', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'No',
            'last_name' => 'Create',
        ]);

        $response->assertStatus(403);
    }

    public function test_update_student_replaces_guardian(): void
    {
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        $student->guardians()->create([
            'first_name' => 'Old',
            'last_name' => 'Guardian',
            'relationship' => 'parent',
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->putJson("/api/v1/students/{$student->id}", [
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'guardian' => [
                'first_name' => 'New',
                'last_name' => 'Guardian',
                'relationship' => 'tutor',
            ],
        ]);

        $response->assertOk()->assertJsonPath('data.guardians.0.first_name', 'New');
        $this->assertSame(1, $student->guardians()->count());
    }

    public function test_update_student_with_null_guardian_removes_guardians(): void
    {
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        $student->guardians()->create([
            'first_name' => 'Old',
            'last_name' => 'Guardian',
        ]);

        $this->actingAs($this->schoolAdmin, 'sanctum')->putJson("/api/v1/students/{$student->id}", [
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'guardian' => null,
        ])->assertOk();

        $this->assertSame(0, $student->guardians()->count());
    }

    public function test_student_crud_full_flow_as_system_admin(): void
    {
        [$class] = $this->createClass($this->schoolA->id);
        $studentId = null;

        $store = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/students', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'Karim',
            'last_name' => 'Chraibi',
            'cne' => 'A003322110',
            'status' => 'active',
            'email' => 'karim@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'class_id' => $class->id,
        ]);
        $store->assertStatus(201);
        $studentId = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/students/{$studentId}", [
            'first_name' => 'Karim',
            'last_name' => 'Chraibi',
            'status' => 'suspended',
        ])->assertOk()->assertJsonPath('data.status', 'suspended');

        $this->actingAs($this->systemAdmin, 'sanctum')->getJson("/api/v1/students/{$studentId}")
            ->assertOk()
            ->assertJsonPath('data.current_class.id', $class->id);

        $userId = Student::find($studentId)->user_id;
        $this->assertNotNull($userId);

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/students/{$studentId}")
            ->assertOk();
        $this->assertSoftDeleted('students', ['id' => $studentId]);
        $this->assertNull(User::find($userId));
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

        return [$class, $program, $year];
    }
}
