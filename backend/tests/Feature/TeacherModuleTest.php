<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\School;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TeacherModuleTest extends TestCase
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

    public function test_school_admin_can_create_teacher(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/teachers', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'Mohammed',
            'last_name' => 'Alami',
            'email' => 'mohammed@example.com',
            'specialization' => 'Informatique',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.first_name', 'Mohammed')
            ->assertJsonPath('data.specialization', 'Informatique');

        $this->assertDatabaseHas('teachers', ['first_name' => 'Mohammed', 'school_id' => $this->schoolA->id]);
    }

    public function test_establishment_admin_cannot_create_teacher_for_other_school(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/teachers', [
            'school_id' => $this->schoolB->id,
            'first_name' => 'Hack',
            'last_name' => 'User',
        ]);

        $response->assertStatus(404);
    }

    public function test_establishment_admin_only_sees_own_school_teachers(): void
    {
        Teacher::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'is_active' => true,
        ]);
        Teacher::create([
            'school_id' => $this->schoolB->id,
            'first_name' => 'Other',
            'last_name' => 'School',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/teachers');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Ali', $response->json('data.0.first_name'));
    }

    public function test_search_filter_matches_name_and_email(): void
    {
        Teacher::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Mohammed',
            'last_name' => 'Alami',
            'email' => 'mohammed@example.com',
            'is_active' => true,
        ]);
        Teacher::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Fatima',
            'last_name' => 'Benali',
            'email' => 'fatima@example.com',
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')
            ->getJson('/api/v1/teachers?search=Benali');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Fatima', $response->json('data.0.first_name'));
    }

    public function test_teacher_role_cannot_manage_or_view_teacher_list(): void
    {
        $response = $this->actingAs($this->teacherUser, 'sanctum')->getJson('/api/v1/teachers');

        $response->assertStatus(403);

        $response = $this->actingAs($this->teacherUser, 'sanctum')->postJson('/api/v1/teachers', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'No',
            'last_name' => 'Create',
        ]);

        $response->assertStatus(403);
    }

    public function test_update_teacher_updates_subject_assignments(): void
    {
        $program = Program::create(['school_id' => $this->schoolA->id, 'code' => 'IDA', 'name' => 'Info A']);
        $subject1 = Subject::create(['program_id' => $program->id, 'name' => 'Framework Backend', 'coefficient' => 3]);
        $subject2 = Subject::create(['program_id' => $program->id, 'name' => 'Base de Données', 'coefficient' => 2]);

        $teacher = Teacher::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Mohammed',
            'last_name' => 'Alami',
            'is_active' => true,
        ]);

        $this->actingAs($this->schoolAdmin, 'sanctum')->putJson("/api/v1/teachers/{$teacher->id}", [
            'first_name' => 'Mohammed',
            'last_name' => 'Alami',
            'subject_ids' => [$subject1->id, $subject2->id],
        ])->assertOk();

        $this->assertDatabaseHas('teacher_subject_assignments', [
            'teacher_id' => $teacher->id,
            'subject_id' => $subject1->id,
        ]);
        $this->assertDatabaseHas('teacher_subject_assignments', [
            'teacher_id' => $teacher->id,
            'subject_id' => $subject2->id,
        ]);

        $this->actingAs($this->schoolAdmin, 'sanctum')->putJson("/api/v1/teachers/{$teacher->id}", [
            'first_name' => 'Mohammed',
            'last_name' => 'Alami',
            'subject_ids' => [$subject1->id],
        ])->assertOk();

        $this->assertDatabaseMissing('teacher_subject_assignments', [
            'teacher_id' => $teacher->id,
            'subject_id' => $subject2->id,
        ]);
    }

    public function test_teacher_crud_full_flow_as_system_admin(): void
    {
        $teacherId = null;

        $store = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/teachers', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'Karim',
            'last_name' => 'Chraibi',
            'email' => 'karim@example.com',
            'specialization' => 'Mathématiques',
            'is_active' => true,
        ]);
        $store->assertStatus(201);
        $teacherId = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/teachers/{$teacherId}", [
            'first_name' => 'Karim',
            'last_name' => 'Chraibi',
            'specialization' => 'Physique',
        ])->assertOk()->assertJsonPath('data.specialization', 'Physique');

        $this->actingAs($this->systemAdmin, 'sanctum')->getJson("/api/v1/teachers/{$teacherId}")
            ->assertOk()
            ->assertJsonPath('data.first_name', 'Karim');

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/teachers/{$teacherId}")
            ->assertOk();
        $this->assertSoftDeleted('teachers', ['id' => $teacherId]);
    }

    public function test_system_admin_can_create_teacher_with_subjects(): void
    {
        $program = Program::create(['school_id' => $this->schoolA->id, 'code' => 'GI', 'name' => 'Génie Info']);
        $subject = Subject::create(['program_id' => $program->id, 'name' => 'Réseaux', 'coefficient' => 2]);

        $response = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/teachers', [
            'school_id' => $this->schoolA->id,
            'first_name' => 'Sara',
            'last_name' => 'Tazi',
            'subject_ids' => [$subject->id],
        ]);

        $response->assertStatus(201)
            ->assertJsonCount(1, 'data.subjects');

        $teacher = Teacher::where('first_name', 'Sara')->first();
        $this->assertDatabaseHas('teacher_subject_assignments', [
            'teacher_id' => $teacher->id,
            'subject_id' => $subject->id,
        ]);
    }
}
