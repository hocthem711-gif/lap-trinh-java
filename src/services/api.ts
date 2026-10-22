
import type { UAV, Gateway } from '../types';

export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
  timestamp: string;
}

const API_BASE_URL = 'http://localhost:8080/api/v1';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(result?.message || `Lỗi HTTP ${response.status}`);
  }

  return result as ApiResponse<T>;
}

async function requestData<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const result = await apiRequest<T[] | T>(path, options);
  return result.data as T;
}

// API cho UAV
export const uavApi = {
  getAll: () => requestData<UAV[]>('/uavs'),

  create: (data: Omit<UAV, 'id' | 'lastSeen'>) =>
    requestData<UAV>('/uavs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest(`/uavs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};

// API cho Gateway
export const gatewayApi = {
  getAll: () => requestData<Gateway[]>('/gateways'),

  create: (data: Omit<Gateway, 'id' | 'lastPing'>) =>
    requestData<Gateway>('/gateways', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest(`/gateways/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
import type { SensorNode, SensorType } from '../types';

export const sensorApi = {
  getAll: async (): Promise<SensorNode[]> => {
    const result = await apiRequest<SensorNode[]>('/sensors');
    return result.data;
  },

  getByZoneId: async (zoneId: number): Promise<SensorNode[]> => {
    const result = await apiRequest<SensorNode[]>(
      `/sensors/zone/${zoneId}`
    );
    return result.data;
  },

  create: async (
    data: {
      sensorCode: string;
      sensorType: SensorType;
      zoneId: number;
      zoneName: string;
      status: string;
    }
  ): Promise<SensorNode> => {
    const result = await apiRequest<SensorNode>('/sensors', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.data;
  },

  delete: (id: number) =>
    apiRequest(`/sensors/${id}`, {
      method: 'DELETE',
    }),
};