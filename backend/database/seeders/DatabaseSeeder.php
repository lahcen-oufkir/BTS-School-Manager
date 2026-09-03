<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
        ]);

        User::factory()->create([
            'name' => 'System Administrator',
            'email' => 'admin@example.com',
            'role' => 'admin_system',
        ]);

        User::factory()->create([
            'name' => 'School Administrator',
            'email' => 'admin.establishment@example.com',
            'role' => 'admin_establishment',
        ]);

        User::factory()->create([
            'name' => 'Teacher Account',
            'email' => 'teacher@example.com',
            'role' => 'teacher',
        ]);

        User::factory()->create([
            'name' => 'Student Account',
            'email' => 'student@example.com',
            'role' => 'student',
        ]);

        $this->call([
            DemoDataSeeder::class,
        ]);
    }
}
