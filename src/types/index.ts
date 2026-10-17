/**
 * TypeScript Type Definitions — SmartFarm Frontend
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

// ==================== UAV ====================
export type UAVStatus = 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'OFFLINE';

export interface UAV {
  id: string;
  name: string;
  model: string;
  battery: number;
  signal: number;
  status: UAVStatus;
  location: string;
  lastSeen: string;
}

// ==================== Gateway ====================
export type GatewayStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';

export interface Gateway {
  id: string;
  name: string;
  ipAddress: string;
  status: GatewayStatus;
  connectedSensors: number;
  firmwareVersion: string;
  lastPing: string;
}

// ==================== Sensor ====================
export type SensorType = 'TEMPERATURE' | 'HUMIDITY' | 'SOIL_MOISTURE' | 'LIGHT' | 'CO2';
export type SensorStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'MAINTENANCE';

export interface SensorNode {
  id: number;
  sensorCode: string;
  sensorType: SensorType;
  status: SensorStatus;
  installedAt: string;
  zoneId: number;
  zoneName: string;
}

// ==================== Farm & Zone (from Backend API) ====================
export interface Farm {
  id: number;
  name: string;
  location: string;
  areaSquareMeters: number;
  ownerId: number;
  ownerName: string;
  totalZones: number;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: number;
  name: string;
  cropType: string;
  farmId: number;
  farmName: string;
  totalSensors: number;
  createdAt: string;
  updatedAt: string;
}

// ==================== API Response Wrapper ====================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ==================== Auth ====================
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

// ==================== Sensor Type Labels ====================
export const SENSOR_TYPE_LABELS: Record<SensorType, string> = {
  TEMPERATURE: 'Nhiệt độ',
  HUMIDITY: 'Độ ẩm',
  SOIL_MOISTURE: 'Độ ẩm đất',
  LIGHT: 'Ánh sáng',
  CO2: 'CO₂',
};

export const SENSOR_TYPE_UNITS: Record<SensorType, string> = {
  TEMPERATURE: '°C',
  HUMIDITY: '%',
  SOIL_MOISTURE: '%',
  LIGHT: 'lux',
  CO2: 'ppm',
};
