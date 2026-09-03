<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_login(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'secret123',
            'role' => 'admin_system',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.email', 'admin@example.com')
            ->assertJsonStructure(['token', 'user' => ['id', 'role', 'permissions']]);
    }

    public function test_login_with_invalid_credentials_fails(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        User::factory()->create([
            'email' => 'admin@example.com',
            'password' => 'secret123',
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
    }

    public function test_deactivated_user_cannot_login(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => 'secret123',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'secret123',
        ]);

        $response->assertStatus(403);
    }

    public function test_authenticated_user_can_fetch_me(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create(['role' => 'teacher']);

        $response = $this->actingAs($user)->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('user.role', 'teacher')
            ->assertJsonPath('user.permissions.0', 'students.view');
    }

    public function test_unauthenticated_user_is_rejected(): void
    {
        $this->getJson('/api/v1/auth/me')->assertStatus(401);
    }

    public function test_user_can_change_password(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create(['password' => 'old-password']);

        $response = $this->actingAs($user)->putJson('/api/v1/auth/password', [
            'current_password' => 'old-password',
            'new_password' => 'new-password-123',
            'new_password_confirmation' => 'new-password-123',
        ]);

        $response->assertOk();
        $this->assertTrue(password_verify('new-password-123', $user->fresh()->password));
    }

    public function test_logout_revokes_token(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/v1/auth/logout')
            ->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_roles_have_permissions_seeded(): void
    {
        $this->seed(RolesAndPermissionsSeeder::class);

        $this->assertDatabaseHas('roles', ['name' => 'admin_system']);
        $this->assertDatabaseHas('roles', ['name' => 'teacher']);
        $this->assertDatabaseHas('roles', ['name' => 'student']);

        $teacher = Role::where('name', 'teacher')->first();
        $this->assertTrue($teacher->permissions()->where('name', 'grades.create')->exists());
    }
}
