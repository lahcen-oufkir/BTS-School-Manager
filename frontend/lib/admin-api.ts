import { api, getErrorMessage, ApiError } from "./api";
import type {
  AcademicYear,
  Paginated,
  Program,
  Role,
  School,
  SchoolClass,
  Student,
  StudentStatus,
  Subject,
  Teacher,
  User,
  UserRole,
} from "./types";

interface PaginatedResource<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface SingleResource<T> {
  data: T;
}

interface ListResource<T> {
  data: T[];
}

function toPaginated<T>(payload: PaginatedResource<T>): Paginated<T> {
  return {
    data: payload.data,
    current_page: payload.meta.current_page,
    last_page: payload.meta.last_page,
    per_page: payload.meta.per_page,
    total: payload.meta.total,
  };
}

function handleError(error: unknown): never {
  throw new ApiError(getErrorMessage(error), 0);
}

// ---- Roles ----
export async function fetchRoles(): Promise<Role[]> {
  try {
    const { data } = await api.get<ListResource<Role>>("/admin/roles");
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

// ---- Users ----
export interface UserFilters {
  page?: number;
  per_page?: number;
  role?: UserRole;
  school_id?: number;
  search?: string;
}

export async function fetchUsers(filters: UserFilters = {}): Promise<Paginated<User>> {
  try {
    const { data } = await api.get<PaginatedResource<User>>("/admin/users", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface UserPayload {
  name: string;
  email: string;
  password?: string;
  password_confirmation?: string;
  role: UserRole;
  school_id?: number | null;
  is_active?: boolean;
}

export async function createUser(payload: UserPayload): Promise<User> {
  try {
    const { data } = await api.post<SingleResource<User>>("/admin/users", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateUser(id: number, payload: Partial<UserPayload>): Promise<User> {
  try {
    const { data } = await api.put<SingleResource<User>>(`/admin/users/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteUser(id: number): Promise<void> {
  try {
    await api.delete(`/admin/users/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Schools ----
export async function fetchSchools(filters: { page?: number; per_page?: number; search?: string } = {}): Promise<Paginated<School>> {
  try {
    const { data } = await api.get<PaginatedResource<School>>("/admin/schools", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface SchoolPayload {
  name: string;
  code?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  is_active?: boolean;
}

export async function createSchool(payload: SchoolPayload): Promise<School> {
  try {
    const { data } = await api.post<SingleResource<School>>("/admin/schools", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSchool(id: number, payload: Partial<SchoolPayload>): Promise<School> {
  try {
    const { data } = await api.put<SingleResource<School>>(`/admin/schools/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteSchool(id: number): Promise<void> {
  try {
    await api.delete(`/admin/schools/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Academic years ----
export async function fetchAcademicYears(filters: { page?: number; per_page?: number; school_id?: number; is_current?: boolean } = {}): Promise<Paginated<AcademicYear>> {
  try {
    const { data } = await api.get<PaginatedResource<AcademicYear>>("/admin/academic-years", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface AcademicYearPayload {
  school_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current?: boolean;
}

export async function createAcademicYear(payload: AcademicYearPayload): Promise<AcademicYear> {
  try {
    const { data } = await api.post<SingleResource<AcademicYear>>("/admin/academic-years", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateAcademicYear(id: number, payload: Partial<AcademicYearPayload>): Promise<AcademicYear> {
  try {
    const { data } = await api.put<SingleResource<AcademicYear>>(`/admin/academic-years/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteAcademicYear(id: number): Promise<void> {
  try {
    await api.delete(`/admin/academic-years/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Programs ----
export async function fetchPrograms(filters: { page?: number; per_page?: number; school_id?: number; search?: string } = {}): Promise<Paginated<Program>> {
  try {
    const { data } = await api.get<PaginatedResource<Program>>("/programs", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface ProgramPayload {
  school_id: number;
  name: string;
  code?: string;
  description?: string;
}

export async function createProgram(payload: ProgramPayload): Promise<Program> {
  try {
    const { data } = await api.post<SingleResource<Program>>("/programs", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateProgram(id: number, payload: Partial<ProgramPayload>): Promise<Program> {
  try {
    const { data } = await api.put<SingleResource<Program>>(`/programs/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteProgram(id: number): Promise<void> {
  try {
    await api.delete(`/programs/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Classes ----
export async function fetchClasses(filters: { page?: number; per_page?: number; program_id?: number; academic_year_id?: number; school_id?: number } = {}): Promise<Paginated<SchoolClass>> {
  try {
    const { data } = await api.get<PaginatedResource<SchoolClass>>("/classes", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface SchoolClassPayload {
  program_id: number;
  academic_year_id: number;
  name: string;
  code?: string;
  year_level?: number;
  is_active?: boolean;
}

export async function createSchoolClass(payload: SchoolClassPayload): Promise<SchoolClass> {
  try {
    const { data } = await api.post<SingleResource<SchoolClass>>("/classes", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSchoolClass(id: number, payload: Partial<SchoolClassPayload>): Promise<SchoolClass> {
  try {
    const { data } = await api.put<SingleResource<SchoolClass>>(`/classes/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteSchoolClass(id: number): Promise<void> {
  try {
    await api.delete(`/classes/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Subjects ----
export async function fetchSubjects(filters: { page?: number; per_page?: number; program_id?: number; school_id?: number; search?: string } = {}): Promise<Paginated<Subject>> {
  try {
    const { data } = await api.get<PaginatedResource<Subject>>("/subjects", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface SubjectPayload {
  program_id: number;
  name: string;
  code?: string;
  coefficient?: number;
}

export async function createSubject(payload: SubjectPayload): Promise<Subject> {
  try {
    const { data } = await api.post<SingleResource<Subject>>("/subjects", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSubject(id: number, payload: Partial<SubjectPayload>): Promise<Subject> {
  try {
    const { data } = await api.put<SingleResource<Subject>>(`/subjects/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteSubject(id: number): Promise<void> {
  try {
    await api.delete(`/subjects/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Students ----
export interface StudentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: StudentStatus;
  class_id?: number;
  school_id?: number;
}

export async function fetchStudents(filters: StudentFilters = {}): Promise<Paginated<Student>> {
  try {
    const { data } = await api.get<PaginatedResource<Student>>("/students", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface GuardianPayload {
  first_name?: string;
  last_name?: string;
  relationship?: string;
  phone?: string;
  email?: string;
}

export interface StudentPayload {
  school_id: number;
  first_name: string;
  last_name: string;
  student_number?: string;
  cne?: string;
  cin?: string;
  birth_date?: string;
  birth_place?: string;
  gender?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  status: StudentStatus;
  class_id?: number | null;
  guardian?: GuardianPayload | null;
}

export async function createStudent(payload: StudentPayload): Promise<Student> {
  try {
    const { data } = await api.post<SingleResource<Student>>("/students", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateStudent(id: number, payload: Partial<StudentPayload>): Promise<Student> {
  try {
    const { data } = await api.put<SingleResource<Student>>(`/students/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteStudent(id: number): Promise<void> {
  try {
    await api.delete(`/students/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// ---- Teachers ----
export interface TeacherFilters {
  page?: number;
  per_page?: number;
  search?: string;
  specialization?: string;
  is_active?: boolean;
  school_id?: number;
}

export async function fetchTeachers(filters: TeacherFilters = {}): Promise<Paginated<Teacher>> {
  try {
    const { data } = await api.get<PaginatedResource<Teacher>>("/teachers", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface TeacherPayload {
  school_id: number;
  first_name: string;
  last_name: string;
  internal_identifier?: string;
  email?: string;
  phone?: string;
  specialization?: string;
  is_active?: boolean;
  user_id?: number | null;
  subject_ids?: number[];
}

export async function createTeacher(payload: TeacherPayload): Promise<Teacher> {
  try {
    const { data } = await api.post<SingleResource<Teacher>>("/teachers", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateTeacher(id: number, payload: Partial<TeacherPayload>): Promise<Teacher> {
  try {
    const { data } = await api.put<SingleResource<Teacher>>(`/teachers/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteTeacher(id: number): Promise<void> {
  try {
    await api.delete(`/teachers/${id}`);
  } catch (error) {
    return handleError(error);
  }
}