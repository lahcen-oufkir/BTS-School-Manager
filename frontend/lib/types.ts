export type UserRole = "admin_system" | "admin_establishment" | "teacher" | "student";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  email_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
  permissions?: string[];
  school_id?: number | null;
  school?: { id: number; name: string } | null;
}

export interface Role {
  id: number;
  name: string;
  label: string;
  description?: string;
  permissions: string[];
}

export interface School {
  id: number;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logo_path?: string | null;
  is_active: boolean;
  students_count?: number;
  teachers_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AcademicYear {
  id: number;
  school_id: number;
  school?: { id: number; name: string } | null;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Program {
  id: number;
  school_id: number;
  school?: { id: number; name: string } | null;
  name: string;
  code?: string | null;
  description?: string | null;
  subjects_count?: number;
  classes_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SchoolClass {
  id: number;
  program_id: number;
  program?: { id: number; name: string } | null;
  academic_year_id: number;
  academic_year?: { id: number; name: string } | null;
  name: string;
  code?: string | null;
  year_level?: number | null;
  is_active: boolean;
  students_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Subject {
  id: number;
  program_id: number;
  program?: { id: number; name: string } | null;
  name: string;
  code?: string | null;
  coefficient: string;
  created_at?: string;
  updated_at?: string;
}

export type StudentStatus =
  | "active"
  | "graduated"
  | "transferred"
  | "withdrawn"
  | "suspended"
  | "inactive";

export type AssessmentType =
  | "exam"
  | "quiz"
  | "homework"
  | "practical"
  | "project"
  | "continuous";

export interface StudentGuardian {
  id: number;
  first_name: string;
  last_name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface Student {
  id: number;
  user_id?: number | null;
  school_id: number;
  school?: { id: number; name: string } | null;
  student_number?: string | null;
  cne?: string | null;
  cin?: string | null;
  first_name: string;
  last_name: string;
  birth_date?: string | null;
  birth_place?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  photo_path?: string | null;
  status: StudentStatus;
  guardians: StudentGuardian[];
  current_class?: { id: number; name: string; code?: string } | null;
  guardians_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Teacher {
  id: number;
  user_id?: number | null;
  school_id: number;
  school?: { id: number; name: string } | null;
  internal_identifier?: string | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  specialization?: string | null;
  is_active: boolean;
  subjects?: Subject[];
  assignments?: TeacherSubjectAssignment[];
  assignments_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TeacherSubjectAssignment {
  id: number;
  teacher_id: number;
  subject_id: number;
  class_id?: number | null;
  subject?: Subject;
  schoolClass?: SchoolClass;
}

export interface Assessment {
  id: number;
  class_id: number;
  class?: { id: number; name: string; code?: string } | null;
  subject_id: number;
  subject?: { id: number; name: string; code?: string } | null;
  teacher_id?: number | null;
  teacher?: { id: number; first_name: string; last_name: string } | null;
  academic_year_id: number;
  title: string;
  type: AssessmentType;
  date?: string | null;
  max_score: string;
  weight: string;
  is_published: boolean;
  is_locked: boolean;
  grades_count?: number;
  average?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Grade {
  id: number;
  assessment_id: number;
  student_id: number;
  student?: { id: number; first_name: string; last_name: string; student_number?: string } | null;
  score: string | null;
  comment?: string | null;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GradeStreamRow {
  student_id: number;
  first_name: string;
  last_name: string;
  student_number?: string | null;
  score: string | null;
  comment?: string | null;
}

export type AttendanceStatus = "present" | "absent" | "late" | "justified";

export interface AttendanceRecord {
  id: number;
  attendance_session_id: number;
  student_id: number;
  student?: { id: number; first_name: string; last_name: string; student_number?: string } | null;
  status: AttendanceStatus;
  justification?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceSession {
  id: number;
  class_id: number;
  class?: { id: number; name: string; code?: string } | null;
  subject_id?: number | null;
  subject?: { id: number; name: string; code?: string } | null;
  teacher_id?: number | null;
  teacher?: { id: number; first_name: string; last_name: string } | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  records?: AttendanceRecord[];
  records_count?: number;
  present_count?: number;
  absent_count?: number;
  late_count?: number;
  justified_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceStreamRow {
  student_id: number;
  first_name: string;
  last_name: string;
  student_number?: string | null;
  status: AttendanceStatus;
  justification?: string | null;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface Room {
  id: number;
  school_id: number;
  school?: { id: number; name: string; code?: string } | null;
  name: string;
  code?: string | null;
  capacity?: number | null;
  type?: string | null;
  schedules_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Schedule {
  id: number;
  class_id: number;
  class?: { id: number; name: string; code?: string } | null;
  subject_id: number;
  subject?: { id: number; name: string; code?: string } | null;
  teacher_id?: number | null;
  teacher?: { id: number; first_name: string; last_name: string } | null;
  room_id?: number | null;
  room?: { id: number; name: string; code?: string } | null;
  academic_year_id: number;
  academic_year?: { id: number; name: string } | null;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  created_at?: string;
  updated_at?: string;
}

export type AnnouncementAudience = "everyone" | "teachers" | "students" | "class" | "program";

export interface Announcement {
  id: number;
  school_id: number;
  school?: { id: number; name: string } | null;
  user_id: number | null;
  author?: { id: number; name: string } | null;
  title: string;
  content: string;
  audience: AnnouncementAudience;
  class_id?: number | null;
  class?: { id: number; name: string } | null;
  program_id?: number | null;
  program?: { id: number; name: string } | null;
  published_at?: string | null;
  expires_at?: string | null;
  is_published: boolean;
  is_archived: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserNotification {
  id: number;
  user_id: number;
  announcement_id?: number | null;
  type: string;
  title: string;
  body?: string | null;
  action_url?: string | null;
  is_read: boolean;
  created_at?: string;
}

export interface Document {
  id: number;
  school_id: number;
  user_id: number | null;
  title: string;
  category?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  size_human?: string | null;
  is_private: boolean;
  is_archived: boolean;
  download_url?: string | null;
  created_at?: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface CountSlice {
  label: string;
  count: number;
}

export interface ClassCountSlice {
  id: number;
  label: string;
  count: number;
}

export interface ReportSummary {
  students: number;
  active_students: number;
  teachers: number;
  classes: number;
  programs: number;
  assessments: number;
  school_id: number;
  academic_year_id: number | null;
  grades: {
    total_grades: number;
    average: number;
  };
  attendance: {
    total_records: number;
    present: number;
    present_rate: number;
  };
}

export interface StudentDistribution {
  status: CountSlice[];
  gender: CountSlice[];
  classes: ClassCountSlice[];
  programs: { id: number; label: string; count: number }[];
}

export interface GradeRecord {
  id: number;
  label: string;
  total: number;
  average: number;
}

export interface GradeAnalytics {
  total_grades: number;
  average: number;
  pass_rate: number;
  by_class: GradeRecord[];
  by_subject: GradeRecord[];
}

export interface AttendanceClassSlice {
  id: number;
  label: string;
  total: number;
  present: number;
  absent: number;
  present_rate: number;
}

export interface AttendanceAnalytics {
  total_records: number;
  present: number;
  present_rate: number;
  by_status: CountSlice[];
  by_class: AttendanceClassSlice[];
}

export interface MeResponse {
  user: User;
}

export interface ApiErrorPayload {
  message: string;
  errors?: Record<string, string[]>;
}

export interface Paginated<T> {
  data: T[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}