<?php

namespace App\Console\Commands;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Console\Command;

class EnsureBootstrapCommand extends Command
{
    protected $signature = 'app:ensure-bootstrap {--seed-demo : Create demo users when the users table is empty} {--force : Run without confirmation in production}';

    protected $description = 'Idempotently seed roles/permissions and (optionally) a demo system admin.';

    public function handle(): int
    {
        $this->callSilently(RolesAndPermissionsSeeder::class, ['--force' => $this->option('force')]);

        if (User::query()->count() === 0) {
            if ($this->option('seed-demo') || app()->environment('local', 'testing')) {
                $this->info('No users found — creating demo system administrator.');
                User::factory()->create([
                    'name' => 'System Administrator',
                    'email' => 'admin@example.com',
                    'role' => 'admin_system',
                ]);
            } else {
                $this->warn('No users found. Create an administrator manually:');
                $this->warn('  php artisan tinker --execute="App\\Models\\User::factory()->create([...])"');
            }
        }

        return self::SUCCESS;
    }
}
