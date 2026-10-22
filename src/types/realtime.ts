/**
 * TypeScript Type Definitions — Sensor Realtime & Map Popup
 * Task: LTJ-14 - Sprint 3
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Mở rộng từ types/index.ts — Định nghĩa cấu trúc dữ liệu
 * cho chỉ số cảm biến thời gian thực và Popup bản đồ.
 */

import type { SensorType } from './index';

// ==================== Trạng thái kết nối Realtime ====================
export type RealtimeStatus = 'ONLINE' | 'WARNING' | 'OFFLINE';

// ==================== Chỉ số đo từ cảm biến ====================
export interface SensorReading {
  temperature: number;      // °C
  airHumidity: number;      // %
  soilMoisture: number;     // %
  light: number;            // lux
  co2: number;              // ppm
  ph: number;               // 0–14
}

// ==================== Nút cảm biến Realtime ====================
export interface RealtimeSensorNode {
  id: number;
  sensorCode: string;
  sensorType: SensorType;
  status: RealtimeStatus;
  zoneName: string;
  zoneId: number;
  location: {
    lat: number;
    lng: number;
  };
  battery: number;          // 0–100 %
  signal: number;           // 0–100 %
  readings: SensorReading;
  lastUpdated: string;      // ISO 8601
}

// ==================== Ngưỡng cảnh báo ====================
export interface ThresholdConfig {
  temperature: { min: number; max: number };
  airHumidity: { min: number; max: number };
  soilMoisture: { min: number; max: number };
  light: { min: number; max: number };
  co2: { min: number; max: number };
  ph: { min: number; max: number };
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  temperature: { min: 15, max: 40 },
  airHumidity: { min: 30, max: 90 },
  soilMoisture: { min: 20, max: 80 },
  light: { min: 200, max: 80000 },
  co2: { min: 300, max: 1500 },
  ph: { min: 5.5, max: 7.5 },
};

// ==================== Cảnh báo vượt ngưỡng ====================
export type AlertLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';

export interface SensorAlert {
  sensorId: number;
  sensorCode: string;
  metric: keyof SensorReading;
  value: number;
  threshold: { min: number; max: number };
  level: AlertLevel;
  timestamp: string;
}

// ==================== Bộ lọc Realtime ====================
export interface RealtimeFilter {
  zoneId: number | null;
  status: RealtimeStatus | 'ALL';
  sensorType: SensorType | 'ALL';
  searchQuery: string;
}

// ==================== Thống kê tổng hợp ====================
export interface RealtimeStats {
  totalSensors: number;
  onlineCount: number;
  warningCount: number;
  offlineCount: number;
  avgTemperature: number;
  avgHumidity: number;
}

// ==================== Nhãn đơn vị đo ====================
export const READING_LABELS: Record<keyof SensorReading, { label: string; unit: string; icon: string }> = {
  temperature: { label: 'Nhiệt độ', unit: '°C', icon: '🌡️' },
  airHumidity: { label: 'Độ ẩm KK', unit: '%', icon: '💧' },
  soilMoisture: { label: 'Độ ẩm đất', unit: '%', icon: '🌱' },
  light: { label: 'Ánh sáng', unit: 'lux', icon: '☀️' },
  co2: { label: 'CO₂', unit: 'ppm', icon: '🌫️' },
  ph: { label: 'pH', unit: '', icon: '🧪' },
};
