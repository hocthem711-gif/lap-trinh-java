/**
 * TypeScript Type Definitions — Threshold Configuration (F09) & Alert Management (F08)
 * Task: LTJ-29 - Sprint 6
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * Tương thích 100% với:
 * - Backend Entities (Dev 1 - LTJ-26): Threshold.java, Alert.java, AlertLevel.java
 * - Alert Engine Worker (Dev 2 - LTJ-27): Trạng thái Open / Acknowledged / Resolved
 * - Extreme Telemetry Simulator (Dev 5 - LTJ-30): Kịch bản Nhiệt độ 60°C & Pin UAV 5%
 */

import type { SensorType } from './index';

// ==================== Mức độ & Trạng thái Cảnh báo ====================

/** Khớp 100% với enum com.smartfarm.backend.entity.AlertLevel */
export type BackendAlertLevel = 'INFO' | 'WARNING' | 'CRITICAL';

/** Trạng thái vòng đời của Cảnh báo (LTJ-27 & LTJ-29) */
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';

/** Nguồn sinh cảnh báo: 5 loại cảm biến hoặc Pin thiết bị bay UAV (LTJ-30) */
export type AlertSourceType = SensorType | 'UAV_BATTERY';

// ==================== Cấu hình Ngưỡng theo Zone (F09) ====================

export interface ThresholdRule {
  id: number;
  zoneId: number;
  zoneName: string;
  farmId: number;
  farmName: string;
  sensorType: SensorType;
  /** Ngưỡng cảnh báo sớm dưới (Warning Low) — khớp cột min_value trong Threshold.java */
  minValue: number;
  /** Ngưỡng cảnh báo sớm trên (Warning High) — khớp cột max_value trong Threshold.java */
  maxValue: number;
  /** Ngưỡng nguy hiểm dưới (Critical Low) */
  criticalMin: number;
  /** Ngưỡng nguy hiểm trên (Critical High) */
  criticalMax: number;
  /** Bật / tắt kích hoạt Alert Engine cho chỉ số này trong Zone */
  enabled: boolean;
  updatedAt: string;
}

export interface ThresholdUpdatePayload {
  id?: number;
  zoneId: number;
  sensorType: SensorType;
  minValue: number;
  maxValue: number;
  criticalMin: number;
  criticalMax: number;
  enabled: boolean;
}

export interface ThresholdValidationResult {
  valid: boolean;
  errorMessage?: string;
}

// ==================== Thực thể Cảnh báo (F08) ====================

export interface AlertItem {
  id: number;
  alertCode: string;
  zoneId: number;
  zoneName: string;
  sensorId: number | null;
  sensorCode: string;
  sensorType: AlertSourceType;
  alertLevel: BackendAlertLevel;
  status: AlertStatus;
  /** Khớp cột is_read trong Alert.java */
  isRead: boolean;
  measuredValue: number;
  unit: string;
  thresholdMin: number;
  thresholdMax: number;
  /** Khớp cột message trong Alert.java */
  message: string;
  resolvedNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

// ==================== Bộ lọc & Thống kê ====================

export interface AlertFilterState {
  zoneId: number | 'ALL';
  level: BackendAlertLevel | 'ALL';
  status: AlertStatus | 'ALL';
  sensorType: AlertSourceType | 'ALL';
  onlyUnread: boolean;
  searchQuery: string;
}

export interface AlertSummaryStats {
  totalAlerts: number;
  openCount: number;
  acknowledgedCount: number;
  resolvedCount: number;
  criticalOpenCount: number;
  warningOpenCount: number;
  unreadCount: number;
  activeThresholdCount: number;
}

// ==================== Cấu hình Mặc định & Siêu dữ liệu ====================

export interface SensorThresholdPreset {
  sensorType: SensorType;
  label: string;
  unit: string;
  description: string;
  minValue: number;
  maxValue: number;
  criticalMin: number;
  criticalMax: number;
  physicalMin: number;
  physicalMax: number;
  step: number;
  color: string;
}

export const SENSOR_THRESHOLD_PRESETS: Record<SensorType, SensorThresholdPreset> = {
  TEMPERATURE: {
    sensorType: 'TEMPERATURE',
    label: 'Nhiệt độ không khí',
    unit: '°C',
    description: 'Dải nhiệt độ tối ưu cho cây trồng nhà màng & canh tác thông minh',
    minValue: 18,
    maxValue: 35,
    criticalMin: 12,
    criticalMax: 42,
    physicalMin: 0,
    physicalMax: 70,
    step: 0.5,
    color: '#ef4444',
  },
  HUMIDITY: {
    sensorType: 'HUMIDITY',
    label: 'Độ ẩm không khí',
    unit: '%',
    description: 'Kiểm soát thoát hơi nước và ngăn ngừa nấm bệnh lá',
    minValue: 45,
    maxValue: 85,
    criticalMin: 30,
    criticalMax: 95,
    physicalMin: 0,
    physicalMax: 100,
    step: 1,
    color: '#3b82f6',
  },
  SOIL_MOISTURE: {
    sensorType: 'SOIL_MOISTURE',
    label: 'Độ ẩm đất',
    unit: '%',
    description: 'Ngưỡng kích hoạt tưới nhỏ giọt tự động và chống ngập úng rễ',
    minValue: 35,
    maxValue: 80,
    criticalMin: 20,
    criticalMax: 92,
    physicalMin: 0,
    physicalMax: 100,
    step: 1,
    color: '#10b981',
  },
  LIGHT: {
    sensorType: 'LIGHT',
    label: 'Cường độ ánh sáng',
    unit: 'lux',
    description: 'Đảm bảo bức xạ quang hợp và điều khiển lưới che nắng tự động',
    minValue: 1500,
    maxValue: 65000,
    criticalMin: 300,
    criticalMax: 85000,
    physicalMin: 0,
    physicalMax: 100000,
    step: 100,
    color: '#f59e0b',
  },
  CO2: {
    sensorType: 'CO2',
    label: 'Nồng độ CO₂',
    unit: 'ppm',
    description: 'Giám sát thông gió nhà kính và hiệu suất quang hợp',
    minValue: 350,
    maxValue: 1200,
    criticalMin: 250,
    criticalMax: 1800,
    physicalMin: 100,
    physicalMax: 3000,
    step: 10,
    color: '#8b5cf6',
  },
};

export const ALERT_LEVEL_LABELS: Record<BackendAlertLevel, string> = {
  CRITICAL: 'Nguy hiểm (Critical)',
  WARNING: 'Cảnh báo (Warning)',
  INFO: 'Thông tin (Info)',
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  OPEN: 'Đang mở (Open)',
  ACKNOWLEDGED: 'Đã tiếp nhận',
  RESOLVED: 'Đã đóng (Closed)',
};

export const ALERT_SOURCE_LABELS: Record<AlertSourceType, string> = {
  TEMPERATURE: 'Nhiệt độ',
  HUMIDITY: 'Độ ẩm KK',
  SOIL_MOISTURE: 'Độ ẩm đất',
  LIGHT: 'Ánh sáng',
  CO2: 'Nồng độ CO₂',
  UAV_BATTERY: 'Pin UAV',
};
