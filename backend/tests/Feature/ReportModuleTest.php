<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Assessment;
use App\Models\AttendanceRecord;
use App\Models\AttendanceSession;
use App\Models\Grade;
use App\Models\Program;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportModuleTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;

    private School $schoolB;

    private User $schoolAdmin;

    private User $systemAdmin;

    private AcademicYear $year;

    private Program $program;

    private SchoolClass $class;

    private Subject $subject;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->schoolA = School::create(['name' => 'School A', 'code' => 'A']);
        $this->schoolB = School::create(['name' => 'School B', 'code' => 'B']);

        $this->schoolAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolA->id]);
        $this->systemAdmin = User::factory()->create(['role' => 'admin_system']);

        $this->year = AcademicYear::create(['school_id' => $this->schoolA->id, 'name' => '2026-2027', 'start_date' => '2026-09-01', 'end_date' => '2027-06-30', 'is_current' => true]);
        $this->program = Program::create(['school_id' => $this->schoolA->id, 'name' => 'Génie Logiciel', 'code' => 'GL']);
        $this->class = SchoolClass::create(['program_id' => $this->program->id, 'academic_year_id' => $this->year->id, 'name' => 'BTS GL 1', 'code' => 'GL1']);
        $this->subject = Subject::create(['program_id' => $this->program->id, 'name' => 'Mathématiques', 'coefficient' => 2]);
    }

    private function makeStudent(string $first, string $last, string $status = 'active'): Student
    {
        $student = Student::create([
            'school_id' => $this->schoolA->id,
            'student_number' => uniqid(),
            'first_name' => $first,
            'last_name' => $last,
            'status' => $status,
        ]);
        $student->school = $this->schoolA;
        $this->class->students()->attach($student);

        return $student;
    }

    private function makeAssessmentWithGrade(Student $student, float $score): Assessment
    {
        $assessment = Assessment::create([
            'class_id' => $this->class->id,
            'subject_id' => $this->subject->id,
            'academic_year_id' => $this->year->id,
            'title' => 'Devoir 1',
            'type' => 'quiz',
            'max_score' => 20,
            'weight' => 1,
            'is_published' => true,
        ]);
        Grade::create(['assessment_id' => $assessment->id, 'student_id' => $student->id, 'score' => (string) $score, 'published_at' => now()]);

        return $assessment;
    }

    private function makeAttendance(Student $student, string $status): void
    {
        $session = AttendanceSession::create(['class_id' => $this->class->id, 'subject_id' => $this->subject->id, 'date' => '2026-10-01']);
        AttendanceRecord::create(['attendance_session_id' => $session->id, 'student_id' => $student->id, 'status' => $status]);
    }

    public function test_school_admin_can_view_summary(): void
    {
        $this->makeStudent('Ahmed', 'Benz');
        $this->makeStudent('Sara', 'Ali');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/reports/summary');

        $response->assertOk();
        $this->assertSame(2, $response->json('data.students'));
        $this->assertSame(2, $response->json('data.active_students'));
        $this->assertSame(1, $response->json('data.classes'));
        $this->assertSame(1, $response->json('data.programs'));
    }

    public function test_students_distribution(): void
    {
        $this->makeStudent('Ahmed', 'Benz', 'active');
        $this->makeStudent('Sara', 'Ali', 'active');
        $this->makeStudent('Kim', 'Doe', 'graduated');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/reports/students');

        $response->assertOk();
        $statuses = collect($response->json('data.status'));
        $this->assertSame(2, (int) $statuses->firstWhere('label', 'active')['count']);
        $this->assertSame(1, (int) $statuses->firstWhere('label', 'graduated')['count']);
        // 3 students attached to the class
        $this->assertSame(3, (int) collect($response->json('data.classes'))->sum('count'));
    }

    public function test_grades_analytics(): void
    {
        $s1 = $this->makeStudent('Ahmed', 'Benz');
        $s2 = $this->makeStudent('Sara', 'Ali');
        $this->makeAssessmentWithGrade($s1, 16);
        $this->makeAssessmentWithGrade($s2, 8);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/reports/grades');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertSame(2, $data['total_grades']);
        $this->assertSame(12, $data['average']);
        $this->assertSame(50, $data['pass_rate']);
        $this->assertCount(1, $data['by_class']);
        $this->assertSame(12, $data['by_class'][0]['average']);
    }

    public function test_attendance_analytics(): void
    {
        $s1 = $this->makeStudent('Ahmed', 'Benz');
        $s2 = $this->makeStudent('Sara', 'Ali');
        $this->makeAttendance($s1, 'present');
        $this->makeAttendance($s2, 'present');
        $this->makeAttendance($s2, 'absent');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/reports/attendance');

        $response->assertOk();
        $data = $response->json('data');
        $this->assertSame(3, $data['total_records']);
        $this->assertSame(2, $data['present']);
        $this->assertSame(round((2 / 3) * 100, 1), $data['present_rate']);
    }

    public function test_other_school_isolation(): void
    {
        $otherAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolB->id]);
        $s1 = $this->makeStudent('Ahmed', 'Benz');
        $this->makeAssessmentWithGrade($s1, 16);

        $this->actingAs($otherAdmin, 'sanctum')->getJson('/api/v1/reports/summary')
            ->assertOk()
            ->assertJsonPath('data.students', 0)
            ->assertJsonPath('data.classes', 0);
    }

    public function test_system_admin_can_scope_to_school(): void
    {
        $s1 = $this->makeStudent('Ahmed', 'Benz');
        $this->makeAssessmentWithGrade($s1, 16);

        $response = $this->actingAs($this->systemAdmin, 'sanctum')
            ->getJson("/api/v1/reports/grades?school_id={$this->schoolA->id}");

        $response->assertOk();
        $this->assertSame(1, $response->json('data.total_grades'));
    }

    public function test_report_routes_require_reports_view_permission(): void
    {
        $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/reports/summary')
            ->assertOk();
    }
}
