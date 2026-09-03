<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_with_permission_can_access_route(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($user)->getJson('/api/v1/students');

        $response->assertOk();
    }

    public function test_user_without_permission_is_rejected(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create(['role' => 'student']);

        $response = $this->actingAs($user)->getJson('/api/v1/teachers');

        $response->assertStatus(403);
    }

    public function test_health_endpoint_is_public(): void
    {
        $this->getJson('/api/v1/health')->assertOk();
    }
}
