<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Assessment;
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

class GradeModuleTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;

    private School $schoolB;

    private User $systemAdmin;

    private User $schoolAdmin;

    private User $teacherUser;

    private Teacher $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->schoolA = School::create(['name' => 'School A', 'code' => 'A']);
        $this->schoolB = School::create(['name' => 'School B', 'code' => 'B']);

        $this->systemAdmin = User::factory()->create(['role' => 'admin_system']);
        $this->schoolAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolA->id]);
        $this->teacherUser = User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolA->id]);
        $this->teacher = Teacher::create([
            'user_id' => $this->teacherUser->id,
            'school_id' => $this->schoolA->id,
            'first_name' => 'Prof',
            'last_name' => 'Demo',
        ]);
    }

    public function test_admin_can_create_assessment(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/assessments', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'title' => 'Contrôle 1',
            'type' => 'continuous',
            'date' => '2026-10-12',
            'max_score' => 20,
            'weight' => 1,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Contrôle 1')
            ->assertJsonPath('data.class.name', $class->name);
    }

    public function test_establishment_admin_cannot_create_assessment_for_other_school(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolB->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/assessments', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'title' => 'Hack',
            'type' => 'exam',
            'max_score' => 20,
            'weight' => 1,
        ]);

        $response->assertStatus(404);
    }

    public function test_teacher_can_create_assessment_and_is_auto_assigned(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);

        $response = $this->actingAs($this->teacherUser, 'sanctum')->postJson('/api/v1/assessments', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'title' => 'Devoir Prof',
            'type' => 'homework',
            'max_score' => 20,
            'weight' => 1,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.teacher.id', $this->teacher->id);
    }

    public function test_teacher_without_profile_cannot_create_assessment(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);
        $unlinked = User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolA->id]);

        $response = $this->actingAs($unlinked, 'sanctum')->postJson('/api/v1/assessments', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'title' => 'X',
            'type' => 'exam',
            'max_score' => 20,
            'weight' => 1,
        ]);

        $response->assertStatus(422);
    }

    public function test_teacher_cannot_manage_other_teachers_assessment(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);
        $otherTeacher = Teacher::create([
            'user_id' => null,
            'school_id' => $this->schoolA->id,
            'first_name' => 'Other',
            'last_name' => 'Teacher',
        ]);
        $assessment = Assessment::create([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $otherTeacher->id,
            'academic_year_id' => $year->id,
            'title' => 'Autre',
            'type' => 'exam',
        ]);

        $response = $this->actingAs($this->teacherUser, 'sanctum')->putJson("/api/v1/assessments/{$assessment->id}", [
            'title' => 'Ne doit pas passer',
        ]);

        $response->assertStatus(404);
    }

    public function test_grade_upsert_and_publish_lifecycle(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);
        $assessment = Assessment::create([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $this->teacher->id,
            'academic_year_id' => $year->id,
            'title' => 'Contrôle',
            'type' => 'quiz',
            'max_score' => 20,
        ]);
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Ali',
            'last_name' => 'Alaoui',
            'status' => 'active',
        ]);
        $student->enrollments()->create([
            'class_id' => $class->id,
            'academic_year_id' => $year->id,
            'status' => 'active',
        ]);
        $student->classes()->attach($class->id);

        $upsert = $this->actingAs($this->teacherUser, 'sanctum')->putJson(
            "/api/v1/assessments/{$assessment->id}/grades",
            ['grades' => [['student_id' => $student->id, 'score' => 17, 'comment' => 'Bien']]],
        );

        $upsert->assertOk();
        $this->assertDatabaseHas('grades', ['assessment_id' => $assessment->id, 'student_id' => $student->id, 'score' => '17.00']);

        $publish = $this->actingAs($this->teacherUser, 'sanctum')->postJson("/api/v1/assessments/{$assessment->id}/publish");
        $publish->assertOk()->assertJsonPath('data.is_published', true);

        $lockedOut = $this->actingAs($this->teacherUser, 'sanctum')->putJson(
            "/api/v1/assessments/{$assessment->id}/grades",
            ['grades' => [['student_id' => $student->id, 'score' => 18]]],
        );
        $lockedOut->assertStatus(422);

        $lock = $this->actingAs($this->teacherUser, 'sanctum')->postJson("/api/v1/assessments/{$assessment->id}/lock");
        $lock->assertOk()->assertJsonPath('data.is_locked', true);
    }

    public function test_grade_stream_lists_enrolled_students(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);
        $assessment = Assessment::create([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $this->teacher->id,
            'academic_year_id' => $year->id,
            'title' => 'Quiz',
            'type' => 'quiz',
        ]);
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'first_name' => 'Sara',
            'last_name' => 'Sefrioui',
            'status' => 'active',
        ]);
        $student->enrollments()->create(['class_id' => $class->id, 'academic_year_id' => $year->id, 'status' => 'active']);
        $student->classes()->attach($class->id);

        $response = $this->actingAs($this->teacherUser, 'sanctum')
            ->getJson("/api/v1/assessments/{$assessment->id}/grade-stream");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Sara', $response->json('data.0.first_name'));
    }

    public function test_permission_required_for_grade_creation(): void
    {
        [$class, $subject, $year] = $this->createContext($this->schoolA->id);
        $studentAccount = User::factory()->create(['role' => 'student', 'school_id' => $this->schoolA->id]);

        $response = $this->actingAs($studentAccount, 'sanctum')->postJson('/api/v1/assessments', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'title' => 'X',
            'type' => 'exam',
        ]);

        $response->assertStatus(403);
    }

    private function createContext(int $schoolId): array
    {
        $program = Program::create(['school_id' => $schoolId, 'code' => 'IDA', 'name' => 'Info']);
        $year = AcademicYear::create([
            'school_id' => $schoolId,
            'name' => '2026-2027',
            'start_date' => '2026-09-01',
            'end_date' => '2027-07-15',
        ]);
        $subject = Subject::create(['program_id' => $program->id, 'name' => 'Base de Données', 'coefficient' => 3]);
        $class = SchoolClass::create([
            'program_id' => $program->id,
            'academic_year_id' => $year->id,
            'name' => 'IDA 1ère année',
        ]);

        return [$class, $subject, $year];
    }
}
