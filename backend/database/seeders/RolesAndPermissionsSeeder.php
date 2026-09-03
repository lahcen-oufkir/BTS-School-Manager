<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RolesAndPermissionsSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $permissions = [
            'students.view', 'students.create', 'students.update', 'students.delete',
            'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
            'classes.view', 'classes.create', 'classes.update', 'classes.delete',
            'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete',
            'grades.view', 'grades.create', 'grades.update', 'grades.delete',
            'attendance.view', 'attendance.create', 'attendance.update',
            'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete',
            'schedule.view', 'schedule.create', 'schedule.update', 'schedule.delete',
            'announcements.view', 'announcements.create', 'announcements.update', 'announcements.delete',
            'notifications.view', 'notifications.update',
            'documents.view', 'documents.create', 'documents.update', 'documents.delete',
            'users.view', 'users.create', 'users.update', 'users.delete',
            'reports.view', 'reports.generate',
            'settings.view', 'settings.update',
        ];

        $rolePermissions = [
            'admin_system' => $permissions,
            'admin_establishment' => [
                'students.view', 'students.create', 'students.update', 'students.delete',
                'teachers.view', 'teachers.create', 'teachers.update', 'teachers.delete',
                'classes.view', 'classes.create', 'classes.update', 'classes.delete',
                'subjects.view', 'subjects.create', 'subjects.update', 'subjects.delete',
                'grades.view', 'grades.create', 'grades.update', 'grades.delete',
                'attendance.view', 'attendance.create', 'attendance.update',
                'rooms.view', 'rooms.create', 'rooms.update', 'rooms.delete',
                'schedule.view', 'schedule.create', 'schedule.update', 'schedule.delete',
                'announcements.view', 'announcements.create', 'announcements.update', 'announcements.delete',
                'notifications.view', 'notifications.update',
                'documents.view', 'documents.create', 'documents.update', 'documents.delete',
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
                'rooms.view',
                'schedule.view',
                'announcements.view',
                'notifications.view', 'notifications.update',
                'documents.view', 'documents.create',
                'reports.view',
            ],
            'student' => [
                'students.view',
                'classes.view',
                'subjects.view',
                'grades.view',
                'attendance.view',
                'rooms.view',
                'schedule.view',
                'announcements.view',
                'notifications.view', 'notifications.update',
                'documents.view',
                'reports.view',
            ],
        ];

        foreach ($permissions as $name) {
            Permission::firstOrCreate(['name' => $name]);
        }

        foreach ($rolePermissions as $roleName => $permissionNames) {
            $role = Role::firstOrCreate(['name' => $roleName]);

            $permissionIds = Permission::whereIn('name', $permissionNames)->pluck('id');

            $role->permissions()->sync($permissionIds);
        }
    }
}
