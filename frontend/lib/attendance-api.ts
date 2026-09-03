import { api, getErrorMessage, ApiError } from "./api";
import type {
  AttendanceSession,
  AttendanceStatus,
  AttendanceStreamRow,
  Paginated,
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

export interface AttendanceFilters {
  page?: number;
  per_page?: number;
  class_id?: number;
  subject_id?: number;
  date?: string;
  school_id?: number;
}

export async function fetchAttendance(filters: AttendanceFilters = {}): Promise<Paginated<AttendanceSession>> {
  try {
    const { data } = await api.get<PaginatedResource<AttendanceSession>>("/attendance", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export interface AttendanceSessionPayload {
  class_id: number;
  subject_id?: number | null;
  teacher_id?: number | null;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
}

export async function createAttendanceSession(payload: AttendanceSessionPayload): Promise<AttendanceSession> {
  try {
    const { data } = await api.post<SingleResource<AttendanceSession>>("/attendance", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateAttendanceSession(
  id: number,
  payload: Partial<AttendanceSessionPayload>,
): Promise<AttendanceSession> {
  try {
    const { data } = await api.put<SingleResource<AttendanceSession>>(`/attendance/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteAttendanceSession(id: number): Promise<void> {
  try {
    await api.delete(`/attendance/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

export async function fetchAttendanceStream(id: number): Promise<AttendanceStreamRow[]> {
  try {
    const { data } = await api.get<ListResource<AttendanceStreamRow>>(`/attendance/${id}/stream`);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export interface AttendanceEntry {
  student_id: number;
  status: AttendanceStatus;
  justification?: string | null;
}

export async function saveAttendance(id: number, records: AttendanceEntry[]): Promise<void> {
  try {
    await api.put(`/attendance/${id}/records`, { records });
  } catch (error) {
    return handleError(error);
  }
}
