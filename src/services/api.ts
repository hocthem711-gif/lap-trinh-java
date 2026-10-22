/**
 * API Service Layer — SmartFarm Frontend
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Tầng trung gian giữa Frontend và Backend API.
 * - Farm/Zone: Gọi API thật (Backend Dev 1 đã hoàn thành)
 * - UAV/Gateway/Sensor: Mock Data (Backend Dev 2 chưa hoàn thành LTJ-7)
 *   → Khi Dev 2 hoàn thành, chỉ cần thay mock bằng axios call.
 */

import type { UAV, Gateway, SensorNode, Farm, Zone, ApiResponse } from '../types';

const API_BASE_URL = 'http://localhost:8080/api/v1';

// ==================== Helper ====================
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('accessToken');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...options?.headers },
  });
  if (!res.ok) throw new Error(`API Error ${res.status}: ${res.statusText}`);
  const json: ApiResponse<T> = await res.json();
  return json.data;
}

// ==================== Farm API (Backend REAL) ====================
export const farmApi = {
  getAll: () => apiFetch<Farm[]>('/farms'),
  getById: (id: number) => apiFetch<Farm>(`/farms/${id}`),
};

// ==================== Zone API (Backend REAL) ====================
export const zoneApi = {
  getAll: () => apiFetch<Zone[]>('/zones'),
  getByFarmId: (farmId: number) => apiFetch<Zone[]>(`/zones/farm/${farmId}`),
  getById: (id: number) => apiFetch<Zone>(`/zones/${id}`),
};

// ==================== MOCK DATA ====================

const MOCK_UAVS: UAV[] = [
  {
    id: 'UAV-001', name: 'UAV Trinh sát 01', model: 'DJI Matrice 300 RTK',
    battery: 92, signal: 95, status: 'ACTIVE', location: 'Khu A - Zone 1',
    lastSeen: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'UAV-002', name: 'UAV Phun thuốc 01', model: 'DJI Agras T40',
    battery: 78, signal: 88, status: 'ACTIVE', location: 'Khu B - Zone 3',
    lastSeen: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'UAV-003', name: 'UAV Giám sát 02', model: 'DJI Mavic 3 Enterprise',
    battery: 45, signal: 72, status: 'IDLE', location: 'Trạm sạc C',
    lastSeen: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'UAV-004', name: 'UAV Khảo sát 01', model: 'DJI Matrice 350 RTK',
    battery: 15, signal: 30, status: 'MAINTENANCE', location: 'Xưởng bảo trì',
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'UAV-005', name: 'UAV Phun thuốc 02', model: 'DJI Agras T25',
    battery: 0, signal: 0, status: 'OFFLINE', location: 'Không xác định',
    lastSeen: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'UAV-006', name: 'UAV Gieo hạt 01', model: 'XAG P100',
    battery: 88, signal: 91, status: 'ACTIVE', location: 'Khu D - Zone 5',
    lastSeen: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'UAV-007', name: 'UAV Trinh sát 03', model: 'Autel EVO II Pro',
    battery: 63, signal: 85, status: 'IDLE', location: 'Khu A - Zone 2',
    lastSeen: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'UAV-008', name: 'UAV Vận chuyển 01', model: 'DJI FlyCart 30',
    battery: 55, signal: 78, status: 'ACTIVE', location: 'Khu C - Zone 4',
    lastSeen: new Date(Date.now() - 90000).toISOString(),
  },
];

const MOCK_GATEWAYS: Gateway[] = [
  {
    id: 'GW-001', name: 'Gateway Trung tâm A', ipAddress: '192.168.1.100',
    status: 'ONLINE', connectedSensors: 12, firmwareVersion: 'v2.1.0',
    lastPing: new Date(Date.now() - 5000).toISOString(),
  },
  {
    id: 'GW-002', name: 'Gateway Khu vực B', ipAddress: '192.168.1.101',
    status: 'ONLINE', connectedSensors: 8, firmwareVersion: 'v2.1.0',
    lastPing: new Date(Date.now() - 8000).toISOString(),
  },
  {
    id: 'GW-003', name: 'Gateway Nhà kính C', ipAddress: '192.168.1.102',
    status: 'OFFLINE', connectedSensors: 0, firmwareVersion: 'v2.0.3',
    lastPing: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'GW-004', name: 'Gateway Khu thí nghiệm D', ipAddress: '192.168.2.50',
    status: 'ONLINE', connectedSensors: 15, firmwareVersion: 'v2.2.0-beta',
    lastPing: new Date(Date.now() - 3000).toISOString(),
  },
  {
    id: 'GW-005', name: 'Gateway Dự phòng E', ipAddress: '192.168.2.51',
    status: 'ERROR', connectedSensors: 3, firmwareVersion: 'v2.0.1',
    lastPing: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_SENSORS: SensorNode[] = [
  { id: 1, sensorCode: 'TEMP-001', sensorType: 'TEMPERATURE', status: 'ACTIVE', installedAt: '2026-09-15T08:00:00Z', zoneId: 1, zoneName: 'Lúa nước - Zone A1' },
  { id: 2, sensorCode: 'HUMI-001', sensorType: 'HUMIDITY', status: 'ACTIVE', installedAt: '2026-09-15T08:30:00Z', zoneId: 1, zoneName: 'Lúa nước - Zone A1' },
  { id: 3, sensorCode: 'SOIL-001', sensorType: 'SOIL_MOISTURE', status: 'ACTIVE', installedAt: '2026-09-16T09:00:00Z', zoneId: 2, zoneName: 'Rau màu - Zone B1' },
  { id: 4, sensorCode: 'LIGHT-001', sensorType: 'LIGHT', status: 'INACTIVE', installedAt: '2026-09-17T10:00:00Z', zoneId: 2, zoneName: 'Rau màu - Zone B1' },
  { id: 5, sensorCode: 'CO2-001', sensorType: 'CO2', status: 'ACTIVE', installedAt: '2026-09-18T11:00:00Z', zoneId: 3, zoneName: 'Nhà kính - Zone C1' },
  { id: 6, sensorCode: 'TEMP-002', sensorType: 'TEMPERATURE', status: 'ERROR', installedAt: '2026-09-20T07:00:00Z', zoneId: 3, zoneName: 'Nhà kính - Zone C1' },
  { id: 7, sensorCode: 'HUMI-002', sensorType: 'HUMIDITY', status: 'ACTIVE', installedAt: '2026-09-20T07:30:00Z', zoneId: 1, zoneName: 'Lúa nước - Zone A1' },
  { id: 8, sensorCode: 'SOIL-002', sensorType: 'SOIL_MOISTURE', status: 'MAINTENANCE', installedAt: '2026-09-22T14:00:00Z', zoneId: 4, zoneName: 'Cây ăn quả - Zone D1' },
  { id: 9, sensorCode: 'TEMP-003', sensorType: 'TEMPERATURE', status: 'ACTIVE', installedAt: '2026-09-25T06:00:00Z', zoneId: 4, zoneName: 'Cây ăn quả - Zone D1' },
  { id: 10, sensorCode: 'CO2-002', sensorType: 'CO2', status: 'ACTIVE', installedAt: '2026-09-26T09:00:00Z', zoneId: 5, zoneName: 'Thí nghiệm - Zone E1' },
];

// ==================== UAV API (MOCK — sẵn sàng swap sang API thật) ====================
export const uavApi = {
  getAll: (): Promise<UAV[]> => Promise.resolve([...MOCK_UAVS]),
  getById: (id: string): Promise<UAV | undefined> =>
    Promise.resolve(MOCK_UAVS.find(u => u.id === id)),
  create: (uav: Omit<UAV, 'id' | 'lastSeen'>): Promise<UAV> => {
    const newUav: UAV = {
      ...uav,
      id: `UAV-${String(MOCK_UAVS.length + 1).padStart(3, '0')}`,
      lastSeen: new Date().toISOString(),
    };
    MOCK_UAVS.push(newUav);
    return Promise.resolve(newUav);
  },
  delete: (id: string): Promise<void> => {
    const idx = MOCK_UAVS.findIndex(u => u.id === id);
    if (idx !== -1) MOCK_UAVS.splice(idx, 1);
    return Promise.resolve();
  },
};

// ==================== Gateway API (MOCK) ====================
export const gatewayApi = {
  getAll: (): Promise<Gateway[]> => Promise.resolve([...MOCK_GATEWAYS]),
  getById: (id: string): Promise<Gateway | undefined> =>
    Promise.resolve(MOCK_GATEWAYS.find(g => g.id === id)),
  create: (gw: Omit<Gateway, 'id' | 'lastPing'>): Promise<Gateway> => {
    const newGw: Gateway = {
      ...gw,
      id: `GW-${String(MOCK_GATEWAYS.length + 1).padStart(3, '0')}`,
      lastPing: new Date().toISOString(),
    };
    MOCK_GATEWAYS.push(newGw);
    return Promise.resolve(newGw);
  },
  delete: (id: string): Promise<void> => {
    const idx = MOCK_GATEWAYS.findIndex(g => g.id === id);
    if (idx !== -1) MOCK_GATEWAYS.splice(idx, 1);
    return Promise.resolve();
  },
};

// ==================== Sensor API (MOCK) ====================
export const sensorApi = {
  getAll: (): Promise<SensorNode[]> => Promise.resolve([...MOCK_SENSORS]),
  getByZoneId: (zoneId: number): Promise<SensorNode[]> =>
    Promise.resolve(MOCK_SENSORS.filter(s => s.zoneId === zoneId)),
  create: (sensor: Omit<SensorNode, 'id' | 'installedAt'>): Promise<SensorNode> => {
    const newSensor: SensorNode = {
      ...sensor,
      id: MOCK_SENSORS.length + 1,
      installedAt: new Date().toISOString(),
    };
    MOCK_SENSORS.push(newSensor);
    return Promise.resolve(newSensor);
  },
  delete: (id: number): Promise<void> => {
    const idx = MOCK_SENSORS.findIndex(s => s.id === id);
    if (idx !== -1) MOCK_SENSORS.splice(idx, 1);
    return Promise.resolve();
  },
};
