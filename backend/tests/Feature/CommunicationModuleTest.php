<?php

namespace Tests\Feature;

use App\Models\Announcement;
use App\Models\Document;
use App\Models\School;
use App\Models\User;
use App\Models\UserNotification;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CommunicationModuleTest extends TestCase
{
    use RefreshDatabase;

    private School $schoolA;

    private School $schoolB;

    private User $systemAdmin;

    private User $schoolAdmin;

    private User $teacherUser;

    private User $studentUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->schoolA = School::create(['name' => 'School A', 'code' => 'A']);
        $this->schoolB = School::create(['name' => 'School B', 'code' => 'B']);

        $this->systemAdmin = User::factory()->create(['role' => 'admin_system']);
        $this->schoolAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolA->id]);
        $this->teacherUser = User::factory()->create(['role' => 'teacher', 'school_id' => $this->schoolA->id]);
        $this->studentUser = User::factory()->create(['role' => 'student', 'school_id' => $this->schoolA->id]);
    }

    public function test_school_admin_can_create_announcement(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/announcements', [
            'title' => 'Réunion',
            'content' => 'Réunion pédagogique vendredi.',
            'audience' => 'everyone',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Réunion')
            ->assertJsonPath('data.school_id', $this->schoolA->id)
            ->assertJsonPath('data.is_published', false);

        $this->assertDatabaseHas('announcements', ['title' => 'Réunion', 'school_id' => $this->schoolA->id]);
    }

    public function test_published_announcement_creates_notifications(): void
    {
        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->postJson('/api/v1/announcements', [
            'title' => 'Info importante',
            'content' => 'Cours annulés demain.',
            'audience' => 'everyone',
            'published_at' => now()->toDateTimeString(),
        ]);

        $response->assertStatus(201)->assertJsonPath('data.is_published', true);
        $announcementId = $response->json('data.id');

        // school staff (teacher + student have school_id = schoolA) receive notifications
        $this->assertDatabaseHas('user_notifications', [
            'announcement_id' => $announcementId,
            'user_id' => $this->teacherUser->id,
            'type' => 'announcement',
        ]);
        $this->assertDatabaseHas('user_notifications', [
            'announcement_id' => $announcementId,
            'user_id' => $this->studentUser->id,
            'type' => 'announcement',
        ]);
    }

    public function test_establishment_admin_only_sees_own_school_announcements(): void
    {
        Announcement::create(['school_id' => $this->schoolA->id, 'title' => 'Ann A', 'content' => 'x', 'published_at' => now()]);
        Announcement::create(['school_id' => $this->schoolB->id, 'title' => 'Ann B', 'content' => 'y', 'published_at' => now()]);

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->getJson('/api/v1/announcements');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('Ann A', $response->json('data.0.title'));
    }

    public function test_announcement_crud_full_flow_as_system_admin(): void
    {
        $store = $this->actingAs($this->systemAdmin, 'sanctum')->postJson('/api/v1/announcements', [
            'school_id' => $this->schoolA->id,
            'title' => 'Titre',
            'content' => 'Contenu',
        ]);
        $store->assertStatus(201);
        $id = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/announcements/{$id}", [
            'title' => 'Titre modifié',
        ])->assertOk()->assertJsonPath('data.title', 'Titre modifié');

        $this->actingAs($this->systemAdmin, 'sanctum')->getJson("/api/v1/announcements/{$id}")
            ->assertOk()->assertJsonPath('data.id', $id);

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/announcements/{$id}")
            ->assertOk();
        $this->assertDatabaseMissing('announcements', ['id' => $id]);
    }

    public function test_user_sees_only_own_notifications(): void
    {
        UserNotification::create(['user_id' => $this->teacherUser->id, 'type' => 'announcement', 'title' => 'N1']);
        UserNotification::create(['user_id' => $this->studentUser->id, 'type' => 'announcement', 'title' => 'N2']);

        $response = $this->actingAs($this->teacherUser, 'sanctum')->getJson('/api/v1/notifications');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('N1', $response->json('data.0.title'));
    }

    public function test_mark_read_and_mark_all_read(): void
    {
        $notification = UserNotification::create(['user_id' => $this->teacherUser->id, 'type' => 'announcement', 'title' => 'N1']);

        $this->actingAs($this->teacherUser, 'sanctum')->putJson("/api/v1/notifications/{$notification->id}/read")
            ->assertOk()->assertJsonPath('data.is_read', true);

        UserNotification::create(['user_id' => $this->teacherUser->id, 'type' => 'announcement', 'title' => 'N2']);

        $this->actingAs($this->teacherUser, 'sanctum')->putJson('/api/v1/notifications/read-all')
            ->assertOk();

        $this->assertSame(0, UserNotification::where('user_id', $this->teacherUser->id)->where('is_read', false)->count());
    }

    public function test_school_admin_cannot_view_other_users_notification(): void
    {
        $notification = UserNotification::create(['user_id' => $this->studentUser->id, 'type' => 'announcement', 'title' => 'Secret']);

        $this->actingAs($this->teacherUser, 'sanctum')->putJson("/api/v1/notifications/{$notification->id}/read")
            ->assertStatus(404);
    }

    public function test_upload_and_download_document_as_school_admin(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->create('note.pdf', 100, 'application/pdf');

        $response = $this->actingAs($this->schoolAdmin, 'sanctum')->post('/api/v1/documents', [
            'title' => 'Note de service',
            'file' => $file,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', 'Note de service')
            ->assertJsonPath('data.school_id', $this->schoolA->id);

        $documentId = $response->json('data.id');

        $this->actingAs($this->schoolAdmin, 'sanctum')->get("/api/v1/documents/{$documentId}/download")
            ->assertOk();
        Storage::disk('local')->assertExists(Document::find($documentId)->file_path);
    }

    public function test_private_document_not_visible_to_other_school(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->create('privé.pdf', 100, 'application/pdf');

        $store = $this->actingAs($this->schoolAdmin, 'sanctum')->post('/api/v1/documents', [
            'title' => 'Privé',
            'file' => $file,
            'is_private' => true,
        ]);
        $documentId = $store->json('data.id');

        $otherSchoolAdmin = User::factory()->create(['role' => 'admin_establishment', 'school_id' => $this->schoolB->id]);

        $this->actingAs($otherSchoolAdmin, 'sanctum')->getJson("/api/v1/documents/{$documentId}")
            ->assertStatus(404);

        $list = $this->actingAs($otherSchoolAdmin, 'sanctum')->getJson('/api/v1/documents');
        $list->assertOk();
        $this->assertEmpty($list->json('data'));
    }

    public function test_document_crud_full_flow_as_system_admin(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->create('rapport.pdf', 100, 'application/pdf');

        $store = $this->actingAs($this->systemAdmin, 'sanctum')->post('/api/v1/documents', [
            'school_id' => $this->schoolA->id,
            'title' => 'Rapport',
            'file' => $file,
        ]);
        $store->assertStatus(201);
        $id = $store->json('data.id');

        $this->actingAs($this->systemAdmin, 'sanctum')->putJson("/api/v1/documents/{$id}", [
            'title' => 'Rapport v2',
        ])->assertOk()->assertJsonPath('data.title', 'Rapport v2');

        $this->actingAs($this->systemAdmin, 'sanctum')->deleteJson("/api/v1/documents/{$id}")
            ->assertOk();
        $this->assertDatabaseMissing('documents', ['id' => $id]);
    }
}
