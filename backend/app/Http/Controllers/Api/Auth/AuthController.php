<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'message' => 'Invalid credentials.',
            ], 401);
        }

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Your account is deactivated. Contact an administrator.',
            ], 403);
        }

        $token = $user->createToken('api-token', [$user->role])->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'token' => $token,
            'user' => [
                ...$user->toArray(),
                'permissions' => $this->permissionsForRole($user->role),
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'message' => 'Logged out successfully.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'user' => [
                ...$user->toArray(),
                'role' => $user->role,
                'permissions' => $this->permissionsForRole($user->role),
            ],
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $user = $request->user();

        if (! Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->update(['password' => $validated['new_password']]);

        $user->tokens()->delete();

        return response()->json([
            'message' => 'Password updated successfully. Please log in again.',
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $status = Password::sendResetLink($validated);

        return response()->json([
            'message' => $status === Password::RESET_LINK_SENT
                ? 'Password reset link sent.'
                : 'Unable to send password reset link.',
        ], $status === Password::RESET_LINK_SENT ? 200 : 400);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password) {
                $user->forceFill(['password' => $password])->save();
                $user->tokens()->delete();
            }
        );

        return response()->json([
            'message' => $status === Password::PASSWORD_RESET
                ? 'Password reset successfully.'
                : 'Unable to reset password.',
        ], $status === Password::PASSWORD_RESET ? 200 : 400);
    }

    private function permissionsForRole(string $role): array
    {
        return match ($role) {
            'admin_system' => self::ALL_PERMISSIONS,
            'admin_establishment' => [
                'students.view', 'students.create', 'students.update', 'students.delete',
                'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
                'classes.view', 'classes.create', 'classes.update', 'classes.delete',
                'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete',
                'grades.view', 'grades.create', 'grades.update', 'grades.delete',
                'attendance.view', 'attendance.create', 'attendance.update',
                'users.view', 'users.create', 'users.update',
                'reports.view', 'reports.generate',
                'settings.view', 'settings.update',
            ],
            'teacher' => [
                'students.view',
                'classes.view',
                'subjects.view',
                'grades.view', 'grades.create', 'grades.update',
                'attendance.view', 'attendance.create', 'attendance.update',
                'reports.view',
            ],
            'student' => [
                'students.view',
                'classes.view',
                'subjects.view',
                'grades.view',
                'attendance.view',
                'reports.view',
            ],
            default => [],
        };
    }

    private const ALL_PERMISSIONS = [
        'students.view', 'students.create', 'students.update', 'students.delete',
        'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
        'classes.view', 'classes.create', 'classes.update', 'classes.delete',
        'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete',
        'grades.view', 'grades.create', 'grades.update', 'grades.delete',
        'attendance.view', 'attendance.create', 'attendance.update',
        'users.view', 'users.create', 'users.update', 'users.delete',
        'reports.view', 'reports.generate',
        'settings.view', 'settings.update',
    ];
}
