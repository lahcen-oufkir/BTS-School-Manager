<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Program;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminModuleTest extends TestCase
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

    public function test_system_admin_can_list_roles(): void
    {
        $response = $this->actingAs($this->systemAdmin, 'sanctum')->getJson('/api/v1/admin/roles');

        $response->assertOk()
            ->assertJsonCount(4, 'data');
    }

    public function test_non_system_admin_cannot_list_roles(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/admin/roles');

        $response->assertStatus(403);
    }

    public function test_system_admin_can_create_school(): void
    {
        $response = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/admin/schools', [
            'name' => 'New School',
            'code' => 'NEW',
            'city' => 'Casablanca',
            'is_active' => true,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.code', 'NEW');
        $this->assertDatabaseHas('schools', ['code' => 'NEW']);
    }

    public function test_establishment_admin_cannot_create_school(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/admin/schools', [
            'name' => 'Another School',
        ]);

        $response->assertStatus(403);
    }

    public function test_school_with_data_cannot_be_deleted(): void
    {
        $response = $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/admin/schools/{$this->schoolA->id}");

        $response->assertStatus(422);
    }

    public function test_establishment_admin_admin_sees_only_own_school_users(): void
    {
        User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolA->id]);
        User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolB->id]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/admin/users');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->doesntContain(User::where('school_id', $this->schoolB->id)->first()->id));
    }

    public function test_establishment_admin_can_create_teacher_in_own_school(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/admin/users', [
            'name' => 'New Teacher',
            'email' => 'new.teacher@test.ma',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'teacher',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.school_id', $this->schoolA->id);
    }

    public function test_establishment_admin_cannot_create_admin_role(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/admin/users', [
            'name' => 'Wannabe Admin',
            'email' => 'wannabe@test.ma',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin_establishment',
            'school_id' => $this->schoolA->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_teacher_cannot_access_admin_users(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')->getJson('/api/v1/admin/users');

        $response->assertStatus(403);
    }

    public function test_user_cannot_delete_own_account(): void
    {
        $response = $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/admin/users/{$this->systemAdmin->id}");

        $response->assertStatus(422);
    }

    public function test_academic_year_is_current_exclusivity(): void
    {
        AcademicYear::create([
            'school_id' => $this->schoolA->id,
            'name' => '2025-2026',
            'start_date' => '2025-09-01',
            'end_date' => '2026-07-15',
            'is_current' => true,
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/admin/academic-years', [
            'school_id' => $this->schoolA->id,
            'name' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-15',
            'is_current' => true,
        ]);

        $response->assertStatus(201);
        $this->assertSame(0, AcademicYear::where('school_id', $this->schoolA->id)->where('is_current', true)->where('name', '!=', '2026-2027')->count());
    }

    public function test_establishment_admin_scope_blocked_on_other_school_year(): void
    {
        $year = AcademicYear::create([
            'school_id' => $this->schoolB->id,
            'name' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-15',
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson("/api/v1/admin/academic-years/{$year->id}");

        $response->assertStatus(404);
    }

    public function test_program_listing_is_scoped_to_school(): void
    {
        $this->createProgram($this->schoolA->id, 'IDA', 'Info A');
        $this->createProgram($this->schoolB->id, 'GEST', 'Gest B');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/programs');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('IDA', $response->json('data.0.code'));
    }

    public function test_class_store_rejects_program_from_other_school(): void
    {
        $programB = $this->createProgram($this->schoolB->id, 'B1', 'Program B');
        $yearA = AcademicYear::create([
            'school_id' => $this->schoolA->id,
            'name' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-15',
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/classes', [
            'program_id' => $programB->id,
            'academic_year_id' => $yearA->id,
            'name' => 'Class X',
        ]);

        $response->assertStatus(404);
    }

    public function test_subject_listing_requires_permission(): void
    {
        $student = User::factory()->create(['role' => 'student', 'school_id' => $this->schoolA->id]);

        $response = $this->actingAs($student, 'sanctum')->postJson('/api/v1/subjects', [
            'program_id' => 1,
            'name' => 'Hack',
        ]);

        $response->assertStatus(403);
    }

    public function test_class_listing_returns_resources_with_relations(): void
    {
        $programA = $this->createProgram($this->schoolA->id, 'IDA', 'Info A');
        $yearA = AcademicYear::create([
            'school_id' => $this->schoolA->id,
            'name' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-15',
        ]);
        SchoolClass::create([
            'program_id' => $programA->id,
            'academic_year_id' => $yearA->id,
            'name' => 'IDA 1ère année',
            'code' => 'IDA-1A',
            'year_level' => 1,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/classes');

        $response->assertOk()
            ->assertJsonPath('data.0.program.name', 'Info A')
            ->assertJsonPath('data.0.academic_year.name', '2026-2027')
            ->assertJsonPath('meta.total', 1);
    }

    public function test_subject_crud_flow(): void
    {
        $programA = $this->createProgram($this->schoolA->id, 'IDA', 'Info A');

        $store = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/subjects', [
            'program_id' => $programA->id,
            'name' => 'Base de Données',
            'code' => 'BDD',
            'coefficient' => 3,
        ]);

        $store->assertStatus(201)->assertJsonPath('data.coefficient', '3.00');
        $subjectId = $store->json('data.id');

        $this->actingAs($this->schoolAdmin, 'sanctum')->putJson("/api/v1/subjects/{$subjectId}", [
            'coefficient' => 4,
        ])->assertOk()->assertJsonPath('data.coefficient', '4.00');

        $this->actingAs($this->schoolAdmin, 'sanctum')->deleteJson("/api/v1/subjects/{$subjectId}")
            ->assertOk();
        $this->assertDatabaseMissing('subjects', ['id' => $subjectId]);
    }

    private function createProgram(int $schoolId, string $code, string $name)
    {
        return Program::create([
            'school_id' => $schoolId,
            'code' => $code,
            'name' => $name,
        ]);
    }
}
