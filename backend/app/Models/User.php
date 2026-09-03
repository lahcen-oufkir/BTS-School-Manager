<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password', 'role', 'is_active', 'school_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function role(): HasOne
    {
        return $this->hasOne(Role::class, 'name', 'role');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function isSystemAdmin(): bool
    {
        return $this->role === 'admin_system';
    }

    public function isEstablishmentAdmin(): bool
    {
        return $this->role === 'admin_establishment';
    }

    public function isTeacher(): bool
    {
        return $this->role === 'teacher';
    }

    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    public function isAdmin(): bool
    {
        return $this->isSystemAdmin() || $this->isEstablishmentAdmin();
    }

    public function hasPermission(string $permission): bool
    {
        $role = $this->role()->first();
        if (! $role) {
            return false;
        }

        return $role->permissions()->where('name', $permission)->exists();
    }
}
