import { api, getErrorMessage, ApiError } from "./api";
import type {
  AcademicYear,
  Assessment,
  AssessmentType,
  Grade,
  GradeStreamRow,
  Paginated,
  SchoolClass,
  Student,
  Subject,
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

// ---- Assessments ----
export interface AssessmentFilters {
  page?: number;
  per_page?: number;
  class_id?: number;
  subject_id?: number;
  school_id?: number;
  search?: string;
}

export async function fetchAssessments(filters: AssessmentFilters = {}): Promise<Paginated<Assessment>> {
  try {
    const { data } = await api.get<PaginatedResource<Assessment>>("/assessments", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface AssessmentPayload {
  class_id: number;
  subject_id: number;
  academic_year_id: number;
  title: string;
  type: AssessmentType;
  date?: string;
  max_score: number;
  weight: number;
}

export async function createAssessment(payload: AssessmentPayload): Promise<Assessment> {
  try {
    const { data } = await api.post<SingleResource<Assessment>>("/assessments", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateAssessment(
  id: number,
  payload: Partial<AssessmentPayload>,
): Promise<Assessment> {
  try {
    const { data } = await api.put<SingleResource<Assessment>>(`/assessments/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteAssessment(id: number): Promise<void> {
  try {
    await api.delete(`/assessments/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

export async function publishAssessment(id: number): Promise<Assessment> {
  try {
    const { data } = await api.post<SingleResource<Assessment>>(`/assessments/${id}/publish`);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function lockAssessment(id: number): Promise<Assessment> {
  try {
    const { data } = await api.post<SingleResource<Assessment>>(`/assessments/${id}/lock`);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

// ---- Grades ----
export async function fetchGrades(assessmentId: number): Promise<Grade[]> {
  try {
    const { data } = await api.get<ListResource<Grade>>(`/assessments/${assessmentId}/grades`);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function fetchGradeStream(assessmentId: number): Promise<GradeStreamRow[]> {
  try {
    const { data } = await api.get<ListResource<GradeStreamRow>>(`/assessments/${assessmentId}/grade-stream`);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export interface GradeEntry {
  student_id: number;
  score: number | null;
  comment?: string | null;
}

export async function saveGrades(assessmentId: number, grades: GradeEntry[]): Promise<void> {
  try {
    await api.put(`/assessments/${assessmentId}/grades`, { grades });
  } catch (error) {
    return handleError(error);
  }
}

// ---- Reference data ----
export { fetchClasses, fetchSubjects, fetchAcademicYears } from "./admin-api";
export type { SchoolClass, Subject, AcademicYear, Student };
