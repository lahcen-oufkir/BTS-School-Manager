<?php

namespace Database\Seeders;

use App\Models\AcademicYear;
use App\Models\Assessment;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\Program;
use App\Models\School;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\StudentGuardian;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TeacherSubjectAssignment;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $school = School::firstOrCreate(
            ['code' => 'CHELLAHDEMO'],
            [
                'name' => 'Institut Supérieur de Technologie - Démo',
                'address' => 'Avenue Mohammed V',
                'city' => 'Rabat',
                'phone' => '+212 5 37 00 00 00',
                'email' => 'contact@ist-demo.ma',
                'website' => 'https://ist-demo.ma',
                'is_active' => true,
            ]
        );

        $year = AcademicYear::firstOrCreate(
            ['school_id' => $school->id, 'name' => '2026-2027'],
            [
                'start_date' => '2026-09-01',
                'end_date' => '2027-07-15',
                'is_current' => true,
            ]
        );

        $programs = [
            ['code' => 'IDA', 'name' => 'BTS Informatique Développeur d\'Applications', 'description' => 'Développement d\'applications desktop, web et mobile.'],
            ['code' => 'GI', 'name' => 'BTS Génie Informatique', 'description' => 'Administration des systèmes et réseaux.'],
            ['code' => 'TCE', 'name' => 'BTS Techniques de Commercialisation et d\'Études', 'description' => 'Commerce et gestion commerciale.'],
            ['code' => 'MG', 'name' => 'BTS Management de la Gestion', 'description' => 'Gestion comptable et financière.'],
        ];

        $createdPrograms = [];
        foreach ($programs as $program) {
            $createdPrograms[$program['code']] = Program::firstOrCreate(
                ['school_id' => $school->id, 'code' => $program['code']],
                $program + ['school_id' => $school->id],
            );
        }

        $subjectNames = [
            'IDA' => ['Framework Backend', 'Base de Données', 'Développement Mobile', 'Génie Logiciel'],
            'GI' => ['Réseaux Informatiques', 'Systèmes d\'Exploitation', 'Sécurité', 'Administration Serveurs'],
            'TCE' => ['Marketing', 'Droit Commercial', 'Économie'],
            'MG' => ['Comptabilité Générale', 'Gestion Financière', 'Calcul Commercial'],
        ];

        foreach ($subjectNames as $code => $names) {
            foreach ($names as $index => $name) {
                Subject::firstOrCreate(
                    ['program_id' => $createdPrograms[$code]->id, 'name' => $name],
                    [
                        'code' => strtoupper($code).'-'.($index + 1),
                        'coefficient' => $index === 0 ? 3 : 2,
                    ],
                );
            }
        }

        $idaClass = SchoolClass::firstOrCreate(
            ['program_id' => $createdPrograms['IDA']->id, 'academic_year_id' => $year->id, 'code' => 'IDA-1A'],
            [
                'name' => 'IDA 1ère année',
                'year_level' => 1,
                'is_active' => true,
            ],
        );

        $demographic = [
            ['S-2026-001', 'A001234567', 'AB123456', 'Yassine', 'El Amrani', 'male', '2004-03-15', 'Rabat'],
            ['S-2026-002', 'A009871234', 'CD789012', 'Salma', 'Benjelloun', 'female', '2003-11-08', 'Casablanca'],
            ['S-2026-003', 'A004455667', 'EF345678', 'Omar', 'Tazi', 'male', '2004-06-22', 'Fès'],
            ['S-2026-004', 'A007788990', 'GH901234', 'Imane', 'Berrada', 'female', '2003-02-17', 'Rabat'],
            ['S-2026-005', 'A003322110', 'IJ567890', 'Karim', 'Chraibi', 'male', '2004-09-30', 'Tanger'],
        ];

        $guardianTemplates = [
            ['Nadia', 'El Amrani', 'parent', '+212 661 234 567', 'nadia.elamrani@example.ma'],
            ['Rachid', 'Benjelloun', 'parent', '+212 662 345 678', 'rachid.benjelloun@example.ma'],
            ['Fatima', 'Tazi', 'parent', '+212 663 456 789', 'fatima.tazi@example.ma'],
            ['Hassan', 'Berrada', 'parent', '+212 664 567 890', 'hassan.berrada@example.ma'],
            ['Leila', 'Chraibi', 'parent', '+212 665 678 901', 'leila.chraibi@example.ma'],
        ];

        $demoStudentIds = [];

        foreach ($demographic as $index => $row) {
            [$number, $cne, $cin, $first, $last, $gender, $birth, $place] = $row;
            [$gf, $gl, $rel, $gphone, $gemail] = $guardianTemplates[$index];

            $student = Student::firstOrCreate(
                ['school_id' => $school->id, 'cne' => $cne],
                [
                    'student_number' => $number,
                    'cin' => $cin,
                    'first_name' => $first,
                    'last_name' => $last,
                    'gender' => $gender,
                    'birth_date' => $birth,
                    'birth_place' => $place,
                    'city' => 'Rabat',
                    'status' => 'active',
                ],
            );

            StudentGuardian::firstOrCreate(
                ['student_id' => $student->id, 'first_name' => $gf, 'last_name' => $gl],
                ['relationship' => $rel, 'phone' => $gphone, 'email' => $gemail],
            );

            $student->classes()->syncWithoutDetaching([$idaClass->id]);

            Enrollment::firstOrCreate(
                ['student_id' => $student->id, 'class_id' => $idaClass->id, 'academic_year_id' => $year->id],
                ['enrollment_date' => '2026-09-01', 'status' => 'active'],
            );

            $demoStudentIds[] = $student->id;
        }

        User::where('email', 'student@example.com')->first()?->update([
            'school_id' => $school->id,
        ]);

        $studentUser = User::where('email', 'student@example.com')->first();

        if ($studentUser) {
            Student::updateOrCreate(
                ['user_id' => $studentUser->id],
                [
                    'school_id' => $school->id,
                    'first_name' => 'Amina',
                    'last_name' => 'El Idrissi',
                    'student_number' => 'S-2026-006',
                    'cne' => 'A001122334',
                    'gender' => 'female',
                    'city' => 'Rabat',
                    'status' => 'active',
                ],
            );
        }

        User::where('role', 'admin_establishment')
            ->orWhere('role', 'teacher')
            ->orWhere('role', 'student')
            ->update(['school_id' => $school->id]);

        $teacherUser = User::where('email', 'teacher@example.com')->first();

        $teacher = Teacher::firstOrCreate(
            ['email' => 'teacher@example.com'],
            [
                'user_id' => $teacherUser?->id,
                'school_id' => $school->id,
                'internal_identifier' => 'T-DEMO-001',
                'first_name' => 'Professor',
                'last_name' => 'Demo',
                'specialization' => 'Informatique',
                'is_active' => true,
            ],
        );

        $idaSubjects = Subject::whereIn('id', $createdPrograms['IDA']->subjects()->pluck('id'))->get();

        foreach ($idaSubjects as $subject) {
            TeacherSubjectAssignment::firstOrCreate(
                ['teacher_id' => $teacher->id, 'subject_id' => $subject->id, 'class_id' => $idaClass->id],
            );
        }

        $firstSubject = $idaSubjects->first();

        if ($firstSubject && ! empty($demoStudentIds)) {
            $assessment = Assessment::firstOrCreate(
                ['class_id' => $idaClass->id, 'subject_id' => $firstSubject->id, 'title' => 'Contrôle continu 1'],
                [
                    'teacher_id' => $teacher->id,
                    'academic_year_id' => $year->id,
                    'type' => 'continuous',
                    'date' => '2026-10-12',
                    'max_score' => 20.00,
                    'weight' => 1.00,
                    'is_published' => true,
                ],
            );

            $sampleScores = [15.5, 18, 12, 16.25, 14];

            foreach ($demoStudentIds as $i => $studentId) {
                Grade::firstOrCreate(
                    ['assessment_id' => $assessment->id, 'student_id' => $studentId],
                    [
                        'score' => $sampleScores[$i % count($sampleScores)],
                        'published_at' => now(),
                    ],
                );
            }
        }
    }
}
