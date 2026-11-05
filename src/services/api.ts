/**
 * API Service Layer — SmartFarm Frontend
 * Task: LTJ-9 (Sprint 2) → Nâng cấp đồng bộ Backend & Hybrid Fallback
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Cơ chế hoạt động (Hybrid Real API + Resilient Mock Fallback):
 * - Tự động gọi REST API thật tại http://localhost:8080/api/v1 (khi Backend Spring Boot đang chạy).
 * - Nếu Backend chưa bật hoặc endpoint chưa có trên Backend (VD: /uavs, /gateways của Dev 2),
 *   hệ thống tự động chuyển mượt mà sang dữ liệu Mock chuẩn trong bộ nhớ (8 UAV, 5 Gateway, 10 Sensor).
 */

import type { UAV, Gateway, SensorNode, SensorType, Farm, Zone } from '../types';

export interface ApiResponse<T> {
  status?: number;
  success?: boolean;
  message: string;
  data: T;
  timestamp?: string;
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

// ==================== DỮ LIỆU MOCK CHUẨN (8 UAV, 5 GATEWAY, 10 SENSOR) ====================

const MOCK_FARMS: Farm[] = [
  {
    id: 1,
    name: 'Trang Trại Công Nghệ Cao Đà Lạt',
    location: 'Phường 7, TP. Đà Lạt, Lâm Đồng',
    areaSquareMeters: 50000,
    ownerId: 2,
    ownerName: 'Chủ Trang Trại Nguyễn Văn A',
    totalZones: 3,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Trang Trại Nông Nghiệp Thông Minh Khu Đông',
    location: 'Khu Công Nghệ Cao, TP. Thủ Đức',
    areaSquareMeters: 35000,
    ownerId: 2,
    ownerName: 'Chủ Trang Trại Nguyễn Văn A',
    totalZones: 2,
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-05T00:00:00Z',
  },
];

const MOCK_ZONES: Zone[] = [
  {
    id: 1,
    name: 'Khu Vực A - Dâu Tây Thủy Canh',
    cropType: 'Dâu Tây Nhật Bản',
    farmId: 1,
    farmName: 'Trang Trại Công Nghệ Cao Đà Lạt',
    totalSensors: 3,
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
  },
  {
    id: 2,
    name: 'Khu Vực B - Rau Xà Lách Thủy Canh',
    cropType: 'Xà Lách Romaine',
    farmId: 1,
    farmName: 'Trang Trại Công Nghệ Cao Đà Lạt',
    totalSensors: 2,
    createdAt: '2026-09-02T00:00:00Z',
    updatedAt: '2026-09-02T00:00:00Z',
  },
  {
    id: 3,
    name: 'Khu Vực C - Cà Chua Bi Nhà Kính',
    cropType: 'Cà Chua Cherry',
    farmId: 1,
    farmName: 'Trang Trại Công Nghệ Cao Đà Lạt',
    totalSensors: 2,
    createdAt: '2026-09-03T00:00:00Z',
    updatedAt: '2026-09-03T00:00:00Z',
  },
  {
    id: 4,
    name: 'Khu Vực D - Cây Ăn Quả Công Nghệ Cao',
    cropType: 'Dưa Lưới Hoàng Kim',
    farmId: 2,
    farmName: 'Trang Trại Nông Nghiệp Thông Minh Khu Đông',
    totalSensors: 2,
    createdAt: '2026-09-06T00:00:00Z',
    updatedAt: '2026-09-06T00:00:00Z',
  },
  {
    id: 5,
    name: 'Khu Vực E - Vườn Ươm Thí Nghiệm IoT',
    cropType: 'Hoa Lan Hồ Điệp',
    farmId: 2,
    farmName: 'Trang Trại Nông Nghiệp Thông Minh Khu Đông',
    totalSensors: 1,
    createdAt: '2026-09-06T00:00:00Z',
    updatedAt: '2026-09-06T00:00:00Z',
  },
];

const MOCK_UAVS: UAV[] = [
  {
    id: 'UAV-001',
    name: 'UAV Trinh sát 01',
    model: 'DJI Matrice 300 RTK',
    battery: 92,
    signal: 95,
    status: 'ACTIVE',
    location: 'Khu A - Zone 1',
    lastSeen: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'UAV-002',
    name: 'UAV Phun thuốc 01',
    model: 'DJI Agras T40',
    battery: 78,
    signal: 88,
    status: 'ACTIVE',
    location: 'Khu B - Zone 2',
    lastSeen: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'UAV-003',
    name: 'UAV Giám sát 02',
    model: 'DJI Mavic 3 Enterprise',
    battery: 45,
    signal: 72,
    status: 'IDLE',
    location: 'Trạm sạc C',
    lastSeen: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'UAV-004',
    name: 'UAV Khảo sát 01',
    model: 'DJI Matrice 350 RTK',
    battery: 15,
    signal: 30,
    status: 'MAINTENANCE',
    location: 'Xưởng bảo trì',
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'UAV-005',
    name: 'UAV Phun thuốc 02',
    model: 'DJI Agras T25',
    battery: 0,
    signal: 0,
    status: 'OFFLINE',
    location: 'Không xác định',
    lastSeen: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'UAV-006',
    name: 'UAV Gieo hạt 01',
    model: 'XAG P100',
    battery: 88,
    signal: 91,
    status: 'ACTIVE',
    location: 'Khu D - Zone 4',
    lastSeen: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'UAV-007',
    name: 'UAV Trinh sát 03',
    model: 'Autel EVO II Pro',
    battery: 63,
    signal: 85,
    status: 'IDLE',
    location: 'Khu A - Zone 1',
    lastSeen: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'UAV-008',
    name: 'UAV Vận chuyển 01',
    model: 'DJI FlyCart 30',
    battery: 55,
    signal: 78,
    status: 'ACTIVE',
    location: 'Khu C - Zone 3',
    lastSeen: new Date(Date.now() - 90000).toISOString(),
  },
];

const MOCK_GATEWAYS: Gateway[] = [
  {
    id: 'GW-001',
    name: 'Gateway Trung tâm A',
    ipAddress: '192.168.1.100',
    status: 'ONLINE',
    connectedSensors: 12,
    firmwareVersion: 'v2.1.0',
    lastPing: new Date(Date.now() - 5000).toISOString(),
  },
  {
    id: 'GW-002',
    name: 'Gateway Khu vực B',
    ipAddress: '192.168.1.101',
    status: 'ONLINE',
    connectedSensors: 8,
    firmwareVersion: 'v2.1.0',
    lastPing: new Date(Date.now() - 8000).toISOString(),
  },
  {
    id: 'GW-003',
    name: 'Gateway Nhà kính C',
    ipAddress: '192.168.1.102',
    status: 'OFFLINE',
    connectedSensors: 0,
    firmwareVersion: 'v2.0.3',
    lastPing: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'GW-004',
    name: 'Gateway Khu thí nghiệm D',
    ipAddress: '192.168.2.50',
    status: 'ONLINE',
    connectedSensors: 15,
    firmwareVersion: 'v2.2.0-beta',
    lastPing: new Date(Date.now() - 3000).toISOString(),
  },
  {
    id: 'GW-005',
    name: 'Gateway Dự phòng E',
    ipAddress: '192.168.2.51',
    status: 'ERROR',
    connectedSensors: 3,
    firmwareVersion: 'v2.0.1',
    lastPing: new Date(Date.now() - 3600000).toISOString(),
  },
];

const MOCK_SENSORS: SensorNode[] = [
  { id: 1, sensorCode: 'TEMP-001', sensorType: 'TEMPERATURE', status: 'ACTIVE', installedAt: '2026-09-15T08:00:00Z', zoneId: 1, zoneName: 'Khu Vực A - Dâu Tây Thủy Canh' },
  { id: 2, sensorCode: 'HUMI-001', sensorType: 'HUMIDITY', status: 'ACTIVE', installedAt: '2026-09-15T08:30:00Z', zoneId: 1, zoneName: 'Khu Vực A - Dâu Tây Thủy Canh' },
  { id: 3, sensorCode: 'SOIL-001', sensorType: 'SOIL_MOISTURE', status: 'ACTIVE', installedAt: '2026-09-16T09:00:00Z', zoneId: 2, zoneName: 'Khu Vực B - Rau Xà Lách Thủy Canh' },
  { id: 4, sensorCode: 'LIGHT-001', sensorType: 'LIGHT', status: 'INACTIVE', installedAt: '2026-09-17T10:00:00Z', zoneId: 2, zoneName: 'Khu Vực B - Rau Xà Lách Thủy Canh' },
  { id: 5, sensorCode: 'CO2-001', sensorType: 'CO2', status: 'ACTIVE', installedAt: '2026-09-18T11:00:00Z', zoneId: 3, zoneName: 'Khu Vực C - Cà Chua Bi Nhà Kính' },
  { id: 6, sensorCode: 'TEMP-002', sensorType: 'TEMPERATURE', status: 'ERROR', installedAt: '2026-09-20T07:00:00Z', zoneId: 3, zoneName: 'Khu Vực C - Cà Chua Bi Nhà Kính' },
  { id: 7, sensorCode: 'HUMI-002', sensorType: 'HUMIDITY', status: 'ACTIVE', installedAt: '2026-09-20T07:30:00Z', zoneId: 1, zoneName: 'Khu Vực A - Dâu Tây Thủy Canh' },
  { id: 8, sensorCode: 'SOIL-002', sensorType: 'SOIL_MOISTURE', status: 'MAINTENANCE', installedAt: '2026-09-22T14:00:00Z', zoneId: 4, zoneName: 'Khu Vực D - Cây Ăn Quả Công Nghệ Cao' },
  { id: 9, sensorCode: 'TEMP-003', sensorType: 'TEMPERATURE', status: 'ACTIVE', installedAt: '2026-09-25T06:00:00Z', zoneId: 4, zoneName: 'Khu Vực D - Cây Ăn Quả Công Nghệ Cao' },
  { id: 10, sensorCode: 'CO2-002', sensorType: 'CO2', status: 'ACTIVE', installedAt: '2026-09-26T09:00:00Z', zoneId: 5, zoneName: 'Khu Vực E - Vườn Ươm Thí Nghiệm IoT' },
];

// ==================== Farm API (Backend Real + Fallback) ====================
export const farmApi = {
  getAll: async (): Promise<Farm[]> => {
    try {
      const result = await apiRequest<Farm[]>('/farms');
      if (Array.isArray(result.data) && result.data.length > 0) {
        return result.data;
      }
    } catch {
      // Fallback khi Backend offline hoặc chưa đăng nhập JWT
    }
    return [...MOCK_FARMS];
  },

  getById: async (id: number): Promise<Farm | undefined> => {
    try {
      const result = await apiRequest<Farm>(`/farms/${id}`);
      if (result.data) return result.data;
    } catch {
      // Fallback
    }
    return MOCK_FARMS.find(f => f.id === id);
  },
};

// ==================== Zone API (Backend Real + Fallback) ====================
export const zoneApi = {
  getAll: async (): Promise<Zone[]> => {
    try {
      const result = await apiRequest<Zone[]>('/zones');
      if (Array.isArray(result.data) && result.data.length > 0) {
        return result.data;
      }
    } catch {
      // Fallback
    }
    return [...MOCK_ZONES];
  },

  getByFarmId: async (farmId: number): Promise<Zone[]> => {
    try {
      const result = await apiRequest<Zone[]>(`/zones/farm/${farmId}`);
      if (Array.isArray(result.data) && result.data.length > 0) {
        return result.data;
      }
    } catch {
      // Fallback
    }
    return MOCK_ZONES.filter(z => z.farmId === farmId);
  },

  getById: async (id: number): Promise<Zone | undefined> => {
    try {
      const result = await apiRequest<Zone>(`/zones/${id}`);
      if (result.data) return result.data;
    } catch {
      // Fallback
    }
    return MOCK_ZONES.find(z => z.id === id);
  },
};

// ==================== UAV API (Hybrid + Mock Fallback) ====================
let nextUavSeq = MOCK_UAVS.length + 1;

export const uavApi = {
  getAll: async (): Promise<UAV[]> => {
    try {
      const result = await apiRequest<UAV[]>('/uavs');
      if (Array.isArray(result.data)) return result.data;
    } catch {
      // Backend chưa có /api/v1/uavs -> dùng Mock chuẩn
    }
    return [...MOCK_UAVS];
  },

  getById: async (id: string): Promise<UAV | undefined> => {
    return MOCK_UAVS.find(u => u.id === id);
  },

  create: async (data: Omit<UAV, 'id' | 'lastSeen'>): Promise<UAV> => {
    try {
      const result = await apiRequest<UAV>('/uavs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.data) return result.data;
    } catch {
      // Fallback thêm vào Mock store
    }
    const newUav: UAV = {
      ...data,
      id: `UAV-${String(nextUavSeq++).padStart(3, '0')}`,
      lastSeen: new Date().toISOString(),
    };
    MOCK_UAVS.push(newUav);
    return newUav;
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiRequest(`/uavs/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      // Fallback xóa trên Mock store
    }
    const idx = MOCK_UAVS.findIndex(u => u.id === id);
    if (idx !== -1) MOCK_UAVS.splice(idx, 1);
  },
};

// ==================== Gateway API (Hybrid + Mock Fallback) ====================
let nextGwSeq = MOCK_GATEWAYS.length + 1;

export const gatewayApi = {
  getAll: async (): Promise<Gateway[]> => {
    try {
      const result = await apiRequest<Gateway[]>('/gateways');
      if (Array.isArray(result.data)) return result.data;
    } catch {
      // Backend chưa có /api/v1/gateways -> dùng Mock chuẩn
    }
    return [...MOCK_GATEWAYS];
  },

  getById: async (id: string): Promise<Gateway | undefined> => {
    return MOCK_GATEWAYS.find(g => g.id === id);
  },

  create: async (data: Omit<Gateway, 'id' | 'lastPing'>): Promise<Gateway> => {
    try {
      const result = await apiRequest<Gateway>('/gateways', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (result.data) return result.data;
    } catch {
      // Fallback thêm vào Mock store
    }
    const newGw: Gateway = {
      ...data,
      id: `GW-${String(nextGwSeq++).padStart(3, '0')}`,
      lastPing: new Date().toISOString(),
    };
    MOCK_GATEWAYS.push(newGw);
    return newGw;
  },

  delete: async (id: string): Promise<void> => {
    try {
      await apiRequest(`/gateways/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {
      // Fallback xóa trên Mock store
    }
    const idx = MOCK_GATEWAYS.findIndex(g => g.id === id);
    if (idx !== -1) MOCK_GATEWAYS.splice(idx, 1);
  },
};

// ==================== Sensor API (Hybrid Real Backend + Mock Fallback) ====================
let nextSensorSeq = MOCK_SENSORS.length + 100;

function normalizeSensorNode(raw: Partial<SensorNode> & { id: number; sensorCode: string; sensorType: SensorType; zoneId: number }): SensorNode {
  const matchedZone = MOCK_ZONES.find(z => z.id === raw.zoneId);
  return {
    id: raw.id,
    sensorCode: raw.sensorCode,
    sensorType: raw.sensorType,
    status: raw.status || 'ACTIVE',
    installedAt: raw.installedAt || new Date().toISOString(),
    zoneId: raw.zoneId,
    zoneName: raw.zoneName || matchedZone?.name || `Zone #${raw.zoneId}`,
  };
}

export const sensorApi = {
  getAll: async (): Promise<SensorNode[]> => {
    try {
      const result = await apiRequest<SensorNode[]>('/sensors');
      if (Array.isArray(result.data) && result.data.length > 0) {
        return result.data.map(normalizeSensorNode);
      }
    } catch {
      // Fallback khi Backend chưa chạy
    }
    return [...MOCK_SENSORS];
  },

  getByZoneId: async (zoneId: number): Promise<SensorNode[]> => {
    try {
      const result = await apiRequest<SensorNode[]>(`/sensors/zone/${zoneId}`);
      if (Array.isArray(result.data)) {
        return result.data.map(normalizeSensorNode);
      }
    } catch {
      // Fallback
    }
    return MOCK_SENSORS.filter(s => s.zoneId === zoneId);
  },

  /**
   * Tạo cảm biến mới — Tương thích 100% với SensorCreateRequest.java của Backend Dev 1:
   * { sensorCode, name, sensorType, zoneId, latitude, longitude }
   */
  create: async (data: {
    sensorCode: string;
    name?: string;
    sensorType: SensorType;
    zoneId: number;
    zoneName: string;
    status?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<SensorNode> => {
    const backendPayload = {
      sensorCode: data.sensorCode.trim(),
      name: data.name?.trim() || `Cảm biến ${data.sensorCode.trim()}`,
      sensorType: data.sensorType,
      zoneId: data.zoneId,
      latitude: data.latitude ?? 10.8505,
      longitude: data.longitude ?? 106.7730,
    };

    try {
      const result = await apiRequest<SensorNode>('/sensors', {
        method: 'POST',
        body: JSON.stringify(backendPayload),
      });
      if (result.data) {
        const created = normalizeSensorNode({
          ...result.data,
          zoneName: result.data.zoneName || data.zoneName,
        });
        MOCK_SENSORS.push(created);
        return created;
      }
    } catch {
      // Fallback lưu vào Mock store khi chạy độc lập Frontend
    }

    const newSensor: SensorNode = {
      id: nextSensorSeq++,
      sensorCode: data.sensorCode.trim(),
      sensorType: data.sensorType,
      status: (data.status as SensorNode['status']) || 'ACTIVE',
      installedAt: new Date().toISOString(),
      zoneId: data.zoneId,
      zoneName: data.zoneName,
    };
    MOCK_SENSORS.push(newSensor);
    return newSensor;
  },

  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/sensors/${id}`, {
        method: 'DELETE',
      });
    } catch {
      // Fallback xóa trên Mock store
    }
    const idx = MOCK_SENSORS.findIndex(s => s.id === id);
    if (idx !== -1) MOCK_SENSORS.splice(idx, 1);
  },
};
