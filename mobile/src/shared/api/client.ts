import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { Activity, Category, Favorite, RecommendationHistory, RecommendationResult, SearchParams, UserInterests } from './types';

let deviceIdPromise: Promise<string> | undefined;

function createDeviceId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

async function getDeviceId() {
  if (Platform.OS === 'web') {
    const storageKey = 'chto-dalshe-device-id';
    const stored = globalThis.localStorage?.getItem(storageKey);
    if (stored) return stored;
    const value = createDeviceId();
    globalThis.localStorage?.setItem(storageKey, value);
    return value;
  }

  if (!deviceIdPromise) {
    deviceIdPromise = (async () => {
      const file = new File(Paths.document, 'chto-dalshe-device-id.txt');
      if (file.exists) {
        const stored = file.textSync().trim();
        if (stored) return stored;
      }
      const value = createDeviceId();
      if (!file.exists) file.create();
      await file.write(value);
      return value;
    })();
  }
  return deviceIdPromise;
}

function getApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const androidModel = Platform.OS === 'android'
    ? (Platform.constants as { Model?: string }).Model ?? ''
    : '';
  if (Platform.OS === 'android' && /emulator|sdk_gphone|android sdk|generic/i.test(androidModel)) {
    return 'http://10.0.2.2:8000';
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) return `http://${host}:8000`;

  if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
  return 'http://localhost:8000';
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const deviceId = await getDeviceId();
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    headers.set('Content-Type', 'application/json');
    headers.set('X-Device-ID', deviceId);
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers,
    });

    if (response.status === 204) return undefined as T;

    const responseText = await response.text();
    let payload: unknown;
    try {
      payload = responseText ? JSON.parse(responseText) : undefined;
    } catch {
      payload = responseText;
    }

    if (!response.ok) {
      const detail = typeof payload === 'object' && payload !== null && 'detail' in payload
        ? (payload as { detail: unknown }).detail
        : undefined;
      const message = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map(item => typeof item === 'object' && item !== null && 'msg' in item ? String(item.msg) : String(item)).join('\n')
          : detail !== undefined
            ? JSON.stringify(detail) ?? `Запрос не выполнен (${response.status})`
            : `Запрос не выполнен (${response.status})`;
      throw new ApiError(message, response.status);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Сервер долго не отвечает. Проверь подключение и попробуй ещё раз.');
    }
    throw new ApiError('Не удалось связаться с сервером. Проверь подключение к локальной сети.');
  } finally {
    clearTimeout(timeout);
  }
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const api = {
  getCategories: () => request<Category[]>('/categories'),
  getActivities: (skip = 0, limit = 100) =>
    request<Activity[]>(`/activities?skip=${skip}&limit=${limit}`),
  getActivity: (id: number) => request<Activity>(`/activities/${id}`),
  getInterests: () => request<UserInterests>('/users/me/interests'),
  updateInterests: (categoryIds: number[]) =>
    request<UserInterests>('/users/me/interests', json('PUT', { category_ids: categoryIds })),
  getSearchParams: () => request<SearchParams | null>('/users/me/search-params'),
  saveSearchParams: (params: SearchParams) =>
    request<SearchParams>('/users/me/search-params', json('PUT', params)),
  getRecommendation: (shownIds: number[], useSavedParams: boolean) =>
    request<RecommendationResult>('/users/me/recommendations', json('POST', {
      shown_ids: shownIds,
      use_saved_params: useSavedParams,
    })),
  getFavorites: () => request<Favorite[]>('/users/me/favorites'),
  addFavorite: (activityId: number) =>
    request<Favorite>('/users/me/favorites', json('POST', { activity_id: activityId })),
  removeFavorite: (activityId: number) =>
    request<void>(`/users/me/favorites/${activityId}`, json('DELETE')),
  getHistory: () => request<RecommendationHistory[]>('/users/me/history'),
  addHistory: (activityId: number, action: RecommendationHistory['action']) =>
    request<RecommendationHistory>('/users/me/history', json('POST', { activity_id: activityId, action })),
};

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Произошла ошибка. Попробуй ещё раз.';
}
