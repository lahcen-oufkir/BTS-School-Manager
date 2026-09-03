<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Program;
use App\Models\Room;
use App\Models\Schedule;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScheduleModuleTest extends TestCase
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

    public function test_school_admin_can_create_room(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/rooms', [
            'name' => 'Amphi A',
            'code' => 'AMP-A',
            'capacity' => 120,
            'type' => 'amphitheater',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.name', 'Amphi A')
            ->assertJsonPath('data.school_id', $this->schoolA->id);

        $this->assertDatabaseHas('rooms', ['name' => 'Amphi A', 'school_id' => $this->schoolA->id]);
    }

    public function test_establishment_admin_only_sees_own_school_rooms(): void
    {
        Room::create(['school_id' => $this->schoolA->id, 'name' => 'Salle A']);
        Room::create(['school_id' => $this->schoolB->id, 'name' => 'Salle B']);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/rooms');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Salle A', $response->json('data.0.name'));
    }

    public function test_school_admin_can_create_schedule(): void
    {
        [$class, $year, $subject, $room] = $this->createData($this->schoolA->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/schedules', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'room_id' => $room->id,
            'academic_year_id' => $year->id,
            'day_of_week' => 'monday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.class_id', $class->id)
            ->assertJsonPath('data.day_of_week', 'monday')
            ->assertJsonPath('data.room.id', $room->id);

        $this->assertDatabaseHas('schedules', ['class_id' => $class->id, 'day_of_week' => 'monday']);
    }

    public function test_establishment_admin_cannot_create_schedule_for_other_school(): void
    {
        [$class] = $this->createData($this->schoolB->id);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/schedules', [
            'class_id' => $class->id,
            'subject_id' => $class->program->subjects()->first()->id,
            'academic_year_id' => $class->academic_year_id,
            'day_of_week' => 'monday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);

        $response->assertStatus(404);
    }

    public function test_establishment_admin_only_sees_own_school_schedules(): void
    {
        [$classA, $yearA, $subjectA, $roomA] = $this->createData($this->schoolA->id);
        [$classB, $yearB, $subjectB] = $this->createData($this->schoolB->id);

        Schedule::create([
            'class_id' => $classA->id,
            'subject_id' => $subjectA->id,
            'room_id' => $roomA->id,
            'academic_year_id' => $yearA->id,
            'day_of_week' => 'monday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);
        Schedule::create([
            'class_id' => $classB->id,
            'subject_id' => $subjectB->id,
            'academic_year_id' => $yearB->id,
            'day_of_week' => 'tuesday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/schedules');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('monday', $response->json('data.0.day_of_week'));
    }

    public function test_teacher_only_sees_own_or_unassigned_schedule(): void
    {
        $teacherProfile = $this->createTeacher($this->schoolA->id);
        $otherTeacher = Teacher::create(['school_id' => $this->schoolA->id, 'first_name' => 'Autre', 'last_name' => 'Prof']);

        [$class, $year, $subject, $room] = $this->createData($this->schoolA->id);

        Schedule::create([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $teacherProfile->id,
            'room_id' => $room->id,
            'academic_year_id' => $year->id,
            'day_of_week' => 'monday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);
        Schedule::create([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'teacher_id' => $otherTeacher->id,
            'academic_year_id' => $year->id,
            'day_of_week' => 'tuesday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);
        Schedule::create([
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'day_of_week' => 'wednesday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);

        $response = $this->actingAs($this->teacherUser, 'sanctum')->getJson('/api/v1/schedules');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
        $this->assertSame(['monday', 'wednesday'], collect($response->json('data'))->pluck('day_of_week')->sort()->values()->all());
    }

    public function test_room_crud_full_flow_as_system_admin(): void
    {
        $store = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/rooms', [
            'school_id' => $this->schoolA->id,
            'name' => 'Lab Info',
            'type' => 'laboratory',
        ]);
        $store->assertStatus(201);
        $roomId = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/rooms/{$roomId}", [
            'capacity' => 30,
        ])->assertOk()->assertJsonPath('data.capacity', 30);

        $this->actingAs($this->systemAdmin, 'sanctum')->getJson("/api/v1/rooms/{$roomId}")
            ->assertOk()
            ->assertJsonPath('data.id', $roomId);

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/rooms/{$roomId}")
            ->assertOk();
        $this->assertDatabaseMissing('rooms', ['id' => $roomId]);
    }

    public function test_schedule_crud_full_flow_as_system_admin(): void
    {
        [$class, $year, $subject] = $this->createData($this->schoolA->id);

        $store = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/schedules', [
            'class_id' => $class->id,
            'subject_id' => $subject->id,
            'academic_year_id' => $year->id,
            'day_of_week' => 'monday',
            'start_time' => '08:30',
            'end_time' => '10:00',
        ]);
        $store->assertStatus(201);
        $scheduleId = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/schedules/{$scheduleId}", [
            'day_of_week' => 'friday',
        ])->assertOk()->assertJsonPath('data.day_of_week', 'friday');

        $this->actingAs($this->systemAdmin, 'sanctum')->getJson("/api/v1/schedules/{$scheduleId}")
            ->assertOk()
            ->assertJsonPath('data.id', $scheduleId);

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/schedules/{$scheduleId}")
            ->assertOk();
        $this->assertDatabaseMissing('schedules', ['id' => $scheduleId]);
    }

    private function createData(int $schoolId): array
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
        $room = Room::create(['school_id' => $schoolId, 'name' => 'Salle', 'code' => 'S1', 'capacity' => 30]);

        return [$class, $year, $subject, $room];
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
