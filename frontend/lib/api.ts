import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from "axios";

export const TOKEN_KEY = "bts_access_token";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function isAxiosError(error: unknown): error is AxiosError<{ message?: string }> {
  return axios.isAxiosError(error);
}

export function getErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data?.message === "string") {
      return data.message;
    }
    if (typeof data === "string") {
      return data;
    }
    return error.message;
  }
  return "Une erreur inattendue est survenue.";
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await api.request<T>(config);
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      throw new ApiError(getErrorMessage(error), error.response?.status ?? 0);
    }
    throw error;
  }
}