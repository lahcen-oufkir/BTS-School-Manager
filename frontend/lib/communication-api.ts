import { api, getErrorMessage, ApiError } from "./api";
import type { Announcement, AnnouncementAudience, Document, Paginated, UserNotification } from "./types";

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

// --- Announcements ---

export interface AnnouncementFilters {
  page?: number;
  per_page?: number;
  school_id?: number;
  audience?: AnnouncementAudience;
  class_id?: number;
  program_id?: number;
  published?: boolean;
}

export interface AnnouncementPayload {
  title: string;
  content: string;
  audience: AnnouncementAudience;
  class_id?: number | null;
  program_id?: number | null;
  published_at?: string | null;
  expires_at?: string | null;
  is_archived?: boolean;
}

export async function fetchAnnouncements(filters: AnnouncementFilters = {}): Promise<Paginated<Announcement>> {
  try {
    const { data } = await api.get<PaginatedResource<Announcement>>("/announcements", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function createAnnouncement(payload: AnnouncementPayload): Promise<Announcement> {
  try {
    const { data } = await api.post<SingleResource<Announcement>>("/announcements", payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateAnnouncement(id: number, payload: Partial<AnnouncementPayload>): Promise<Announcement> {
  try {
    const { data } = await api.put<SingleResource<Announcement>>(`/announcements/${id}`, payload);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteAnnouncement(id: number): Promise<void> {
  try {
    await api.delete(`/announcements/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

// --- Notifications ---

export interface UnreadCountResponse {
  data: {
    count: number;
  };
}

export async function fetchNotifications(filters: { page?: number; per_page?: number } = {}): Promise<Paginated<UserNotification>> {
  try {
    const { data } = await api.get<PaginatedResource<UserNotification>>("/notifications", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function fetchUnreadCount(): Promise<number> {
  try {
    const { data } = await api.get<UnreadCountResponse>("/notifications/unread-count");
    return data.data.count;
  } catch (error) {
    return handleError(error);
  }
}

export async function markNotificationRead(id: number): Promise<UserNotification> {
  try {
    const { data } = await api.put<SingleResource<UserNotification>>(`/notifications/${id}/read`);
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  try {
    await api.put("/notifications/read-all");
  } catch (error) {
    return handleError(error);
  }
}

// --- Documents ---

export interface DocumentFilters {
  page?: number;
  per_page?: number;
  school_id?: number;
  category?: string;
  archived?: boolean;
}

export async function fetchDocuments(filters: DocumentFilters = {}): Promise<Paginated<Document>> {
  try {
    const { data } = await api.get<PaginatedResource<Document>>("/documents", { params: filters });
    return toPaginated(data);
  } catch (error) {
    return handleError(error);
  }
}

export async function createDocument(payload: FormData): Promise<Document> {
  try {
    const { data } = await api.post<SingleResource<Document>>("/documents", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function updateDocument(id: number, payload: Partial<FormData | Record<string, unknown>>): Promise<Document> {
  try {
    const isForm = payload instanceof FormData;
    const { data } = await api.put<SingleResource<Document>>(`/documents/${id}`, payload as never, {
      headers: isForm ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return data.data;
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteDocument(id: number): Promise<void> {
  try {
    await api.delete(`/documents/${id}`);
  } catch (error) {
    return handleError(error);
  }
}

export async function downloadDocument(id: number, fileName: string): Promise<void> {
  try {
    const response = await api.get<Blob>(`/documents/${id}/download`, { responseType: "blob" });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    return handleError(error);
  }
}