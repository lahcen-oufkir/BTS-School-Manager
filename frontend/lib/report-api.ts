import { api, getErrorMessage, ApiError } from "./api";
import type {
  AttendanceAnalytics,
  GradeAnalytics,
  ReportSummary,
  StudentDistribution,
} from "./types";

interface Envelope<T> {
  data: T;
}

function handleError(error: unknown): never {
  throw new ApiError(getErrorMessage(error), 0);
}

export interface ReportFilters {
  school_id?: number;
  academic_year_id?: number;
}

export async function fetchReportSummary(filters: ReportFilters = {}): Promise<ReportSummary> {
  try {
    const { data } = await api.get("/reports/summary", { params: filters });
    return { ...data.data, grades: data.grades, attendance: data.attendance };
  } catch (error) {
    return handleError(error);
  }
}

export async function fetchStudentDistribution(filters: ReportFilters = {}): Promise<StudentDistribution> {
  try {
    const { data } = await api.get<Envelope<StudentDistribution>>("/reports/students", { params: filters });
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function fetchGradeAnalytics(filters: ReportFilters = {}): Promise<GradeAnalytics> {
  try {
    const { data } = await api.get<Envelope<GradeAnalytics>>("/reports/grades", { params: filters });
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function fetchAttendanceAnalytics(filters: ReportFilters = {}): Promise<AttendanceAnalytics> {
  try {
    const { data } = await api.get<Envelope<AttendanceAnalytics>>("/reports/attendance", { params: filters });
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}