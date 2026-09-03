import { api, getErrorMessage, ApiError } from "./api";
import type { DayOfWeek, Paginated, Room, Schedule } from "./types";

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

export interface RoomFilters {
  page?: number;
  per_page?: number;
  search?: string;
  type?: string;
  school_id?: number;
}

export interface RoomPayload {
  school_id?: number;
  name: string;
  code?: string | null;
  capacity?: number | null;
  type?: string | null;
}

export async function fetchRooms(filters: RoomFilters = {}): Promise<Paginated<Room>> {
  try {
    const { data } = await api.get<PaginatedResource<Room>>("/rooms", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function createRoom(payload: RoomPayload): Promise<Room> {
  try {
    const { data } = await api.post<SingleResource<Room>>("/rooms", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateRoom(id: number, payload: Partial<RoomPayload>): Promise<Room> {
  try {
    const { data } = await api.put<SingleResource<Room>>(`/rooms/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteRoom(id: number): Promise<void> {
  try {
    await api.delete(`/rooms/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

export interface ScheduleFilters {
  page?: number;
  per_page?: number;
  class_id?: number;
  subject_id?: number;
  teacher_id?: number;
  room_id?: number;
  academic_year_id?: number;
  day_of_week?: DayOfWeek;
  school_id?: number;
}

export interface SchedulePayload {
  class_id: number;
  subject_id: number;
  teacher_id?: number | null;
  room_id?: number | null;
  academic_year_id: number;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
}

export async function fetchSchedules(filters: ScheduleFilters = {}): Promise<Paginated<Schedule>> {
  try {
    const { data } = await api.get<PaginatedResource<Schedule>>("/schedules", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function createSchedule(payload: SchedulePayload): Promise<Schedule> {
  try {
    const { data } = await api.post<SingleResource<Schedule>>("/schedules", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateSchedule(id: number, payload: Partial<SchedulePayload>): Promise<Schedule> {
  try {
    const { data } = await api.put<SingleResource<Schedule>>(`/schedules/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteSchedule(id: number): Promise<void> {
  try {
    await api.delete(`/schedules/${id}`);
  } catch (error) {
    return handleError(error);
  }
}
