/**
 * Alert & Threshold Hybrid Service — SmartFarm IoT Platform
 * Task: LTJ-29 - Sprint 6
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * Cung cấp tầng dịch vụ Hybrid REST API + Graceful Mock Fallback cho:
 * 1. Cấu hình Ngưỡng Cảnh báo theo từng Zone (F09 - phối hợp Dev 1 LTJ-26)
 * 2. Quản lý & Đóng/Xử lý Danh sách Alert (F08 - phối hợp Dev 2 LTJ-27)
 * 3. Mô phỏng Bắn Data Cực đoan (Nhiệt độ 60°C, Pin UAV 5%) (phối hợp Dev 5 LTJ-30)
 */

import axios from 'axios';
import type { SensorType, Zone } from '../types';
import {
  SENSOR_THRESHOLD_PRESETS,
  type AlertItem,
  type BackendAlertLevel,
  type ThresholdRule,
  type ThresholdUpdatePayload,
  type ThresholdValidationResult,
} from '../types/alert';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  timeout: 3500,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const ALL_SENSOR_TYPES: SensorType[] = [
  'TEMPERATURE',
  'HUMIDITY',
  'SOIL_MOISTURE',
  'LIGHT',
  'CO2',
];

// ==================== Kiểm định Toán học Dải Ngưỡng 4 Mốc ====================

/**
 * Kiểm tra tính hợp lệ của quy tắc ngưỡng 4 mốc:
 * physicalMin <= criticalMin < minValue < maxValue < criticalMax <= physicalMax
 */
export function validateThresholdRule(
  rule: Pick<ThresholdRule, 'sensorType' | 'minValue' | 'maxValue' | 'criticalMin' | 'criticalMax'>
): ThresholdValidationResult {
  const preset = SENSOR_THRESHOLD_PRESETS[rule.sensorType];

  if (
    Number.isNaN(rule.criticalMin) ||
    Number.isNaN(rule.minValue) ||
    Number.isNaN(rule.maxValue) ||
    Number.isNaN(rule.criticalMax)
  ) {
    return { valid: false, errorMessage: 'Giá trị ngưỡng không được để trống.' };
  }

  if (rule.criticalMin < preset.physicalMin || rule.criticalMax > preset.physicalMax) {
    return {
      valid: false,
      errorMessage: `Giới hạn vật lý của ${preset.label} nằm trong khoảng [${preset.physicalMin}, ${preset.physicalMax}] ${preset.unit}.`,
    };
  }

  if (rule.criticalMin >= rule.minValue) {
    return {
      valid: false,
      errorMessage: `Ngưỡng nguy hiểm dưới (${rule.criticalMin}) phải nhỏ hơn ngưỡng cảnh báo dưới (${rule.minValue}).`,
    };
  }

  if (rule.minValue >= rule.maxValue) {
    return {
      valid: false,
      errorMessage: `Ngưỡng tối thiểu (${rule.minValue}) phải nhỏ hơn ngưỡng tối đa (${rule.maxValue}).`,
    };
  }

  if (rule.maxValue >= rule.criticalMax) {
    return {
      valid: false,
      errorMessage: `Ngưỡng tối đa (${rule.maxValue}) phải nhỏ hơn ngưỡng nguy hiểm trên (${rule.criticalMax}).`,
    };
  }

  return { valid: true };
}

/**
 * Đánh giá một giá trị đo thực tế so với quy tắc ngưỡng của Zone (mô phỏng Alert Engine LTJ-27)
 */
export function evaluateReadingAgainstRule(
  value: number,
  rule: ThresholdRule
): BackendAlertLevel | 'NORMAL' {
  if (!rule.enabled) return 'NORMAL';
  if (value <= rule.criticalMin || value >= rule.criticalMax) {
    return 'CRITICAL';
  }
  if (value < rule.minValue || value > rule.maxValue) {
    return 'WARNING';
  }
  return 'NORMAL';
}

// ==================== Kho dữ liệu Mock Chuẩn hóa (Hybrid Fallback) ====================

function createInitialThresholds(): ThresholdRule[] {
  const defaultZones: Array<{
    zoneId: number;
    zoneName: string;
    farmId: number;
    farmName: string;
    tempOffset: number;
    humOffset: number;
  }> = [
    {
      zoneId: 1,
      zoneName: 'Khu A — Cánh đồng Lúa Nước',
      farmId: 1,
      farmName: 'Nông trại Thông minh Thủ Đức',
      tempOffset: 2,
      humOffset: 5,
    },
    {
      zoneId: 2,
      zoneName: 'Khu B — Nhà Màng Thủy Canh',
      farmId: 1,
      farmName: 'Nông trại Thông minh Thủ Đức',
      tempOffset: -2,
      humOffset: 0,
    },
    {
      zoneId: 3,
      zoneName: 'Khu C — Vườn Cây Ăn Trái',
      farmId: 1,
      farmName: 'Nông trại Thông minh Thủ Đức',
      tempOffset: 1,
      humOffset: -3,
    },
    {
      zoneId: 4,
      zoneName: 'Khu D — Vườn Dâu Tây Công Nghệ Cao',
      farmId: 2,
      farmName: 'Nông trại Công nghệ cao Đà Lạt',
      tempOffset: -4,
      humOffset: 3,
    },
    {
      zoneId: 5,
      zoneName: 'Khu E — Nhà Kính Hoa Lan',
      farmId: 2,
      farmName: 'Nông trại Công nghệ cao Đà Lạt',
      tempOffset: -3,
      humOffset: 5,
    },
    {
      zoneId: 6,
      zoneName: 'Khu F — Đồi Chè Ô Long',
      farmId: 2,
      farmName: 'Nông trại Công nghệ cao Đà Lạt',
      tempOffset: -1,
      humOffset: 0,
    },
  ];

  const rules: ThresholdRule[] = [];
  let nextId = 1;

  for (const z of defaultZones) {
    for (const type of ALL_SENSOR_TYPES) {
      const preset = SENSOR_THRESHOLD_PRESETS[type];
      const delta =
        type === 'TEMPERATURE'
          ? z.tempOffset
          : type === 'HUMIDITY'
            ? z.humOffset
            : 0;

      rules.push({
        id: nextId++,
        zoneId: z.zoneId,
        zoneName: z.zoneName,
        farmId: z.farmId,
        farmName: z.farmName,
        sensorType: type,
        minValue: preset.minValue + delta,
        maxValue: preset.maxValue + delta,
        criticalMin: preset.criticalMin + delta,
        criticalMax: preset.criticalMax + delta,
        enabled: true,
        updatedAt: new Date(Date.now() - nextId * 1800000).toISOString(),
      });
    }
  }

  return rules;
}

function createInitialAlerts(): AlertItem[] {
  const now = Date.now();
  return [
    {
      id: 501,
      alertCode: 'ALT-20261112-001',
      zoneId: 2,
      zoneName: 'Khu B — Nhà Màng Thủy Canh',
      sensorId: 5,
      sensorCode: 'DEV-Z2-001-TEMP',
      sensorType: 'TEMPERATURE',
      alertLevel: 'CRITICAL',
      status: 'OPEN',
      isRead: false,
      measuredValue: 46.8,
      unit: '°C',
      thresholdMin: 16,
      thresholdMax: 33,
      message:
        'Nhiệt độ Khu B vượt ngưỡng nguy hiểm (46.8°C > Critical Max 40°C). Cần bật quạt thông gió và phun sương khẩn cấp!',
      createdAt: new Date(now - 4 * 60 * 1000).toISOString(),
    },
    {
      id: 502,
      alertCode: 'ALT-20261112-002',
      zoneId: 1,
      zoneName: 'Khu A — Cánh đồng Lúa Nước',
      sensorId: null,
      sensorCode: 'UAV-03',
      sensorType: 'UAV_BATTERY',
      alertLevel: 'CRITICAL',
      status: 'OPEN',
      isRead: false,
      measuredValue: 8,
      unit: '%',
      thresholdMin: 20,
      thresholdMax: 100,
      message:
        'Dung lượng pin UAV-03 giảm xuống mức cực hạn (8% < 15%) khi đang bay khảo sát Khu A. Đã kích hoạt chế độ Return-To-Home!',
      createdAt: new Date(now - 9 * 60 * 1000).toISOString(),
    },
    {
      id: 503,
      alertCode: 'ALT-20261112-003',
      zoneId: 3,
      zoneName: 'Khu C — Vườn Cây Ăn Trái',
      sensorId: 3,
      sensorCode: 'SOIL-001',
      sensorType: 'SOIL_MOISTURE',
      alertLevel: 'WARNING',
      status: 'OPEN',
      isRead: false,
      measuredValue: 26.4,
      unit: '%',
      thresholdMin: 35,
      thresholdMax: 80,
      message:
        'Độ ẩm đất tại Khu C giảm thấp hơn ngưỡng tối ưu (26.4% < 35%). Khuyến nghị kích hoạt van tưới nhỏ giọt tuyến số 3.',
      createdAt: new Date(now - 22 * 60 * 1000).toISOString(),
    },
    {
      id: 504,
      alertCode: 'ALT-20261112-004',
      zoneId: 2,
      zoneName: 'Khu B — Nhà Màng Thủy Canh',
      sensorId: 8,
      sensorCode: 'CO2-001',
      sensorType: 'CO2',
      alertLevel: 'WARNING',
      status: 'ACKNOWLEDGED',
      isRead: true,
      measuredValue: 1380,
      unit: 'ppm',
      thresholdMin: 350,
      thresholdMax: 1200,
      message:
        'Nồng độ CO₂ trong Nhà Màng Thủy Canh tăng cao (1380 ppm > 1200 ppm). Kỹ thuật viên đã tiếp nhận kiểm tra cửa gió.',
      createdAt: new Date(now - 48 * 60 * 1000).toISOString(),
    },
    {
      id: 505,
      alertCode: 'ALT-20261112-005',
      zoneId: 1,
      zoneName: 'Khu A — Cánh đồng Lúa Nước',
      sensorId: 2,
      sensorCode: 'HUMI-001',
      sensorType: 'HUMIDITY',
      alertLevel: 'INFO',
      status: 'RESOLVED',
      isRead: true,
      measuredValue: 89.5,
      unit: '%',
      thresholdMin: 50,
      thresholdMax: 90,
      message:
        'Độ ẩm không khí Khu A tiệm cận ngưỡng trên sau cơn mưa chiều (89.5%). Đã tự động ổn định về mức 74%.',
      resolvedNote: 'Đã kiểm tra trạm thời tiết nội khu, độ ẩm giảm tự nhiên về ngưỡng an toàn.',
      createdAt: new Date(now - 130 * 60 * 1000).toISOString(),
      resolvedAt: new Date(now - 95 * 60 * 1000).toISOString(),
    },
    {
      id: 506,
      alertCode: 'ALT-20261112-006',
      zoneId: 4,
      zoneName: 'Khu D — Vườn Dâu Tây Công Nghệ Cao',
      sensorId: 9,
      sensorCode: 'LIGHT-002',
      sensorType: 'LIGHT',
      alertLevel: 'WARNING',
      status: 'RESOLVED',
      isRead: true,
      measuredValue: 72400,
      unit: 'lux',
      thresholdMin: 1500,
      thresholdMax: 65000,
      message:
        'Cường độ bức xạ mặt trời vượt ngưỡng tối ưu buổi trưa (72,400 lux > 65,000 lux).',
      resolvedNote: 'Hệ thống rèm che nắng tự động đã đóng 60% diện tích mái vòm.',
      createdAt: new Date(now - 210 * 60 * 1000).toISOString(),
      resolvedAt: new Date(now - 185 * 60 * 1000).toISOString(),
    },
  ];
}

let mockThresholds: ThresholdRule[] = createInitialThresholds();
let mockAlerts: AlertItem[] = createInitialAlerts();

function ensureZoneThresholdsExist(zone: Zone): ThresholdRule[] {
  const existing = mockThresholds.filter((r) => r.zoneId === zone.id);
  if (existing.length === ALL_SENSOR_TYPES.length) {
    return existing;
  }

  let maxId = mockThresholds.reduce((m, r) => Math.max(m, r.id), 100);
  const created: ThresholdRule[] = [];

  for (const type of ALL_SENSOR_TYPES) {
    const found = existing.find((e) => e.sensorType === type);
    if (found) {
      created.push(found);
      continue;
    }
    const preset = SENSOR_THRESHOLD_PRESETS[type];
    const rule: ThresholdRule = {
      id: ++maxId,
      zoneId: zone.id,
      zoneName: zone.name,
      farmId: zone.farmId,
      farmName: zone.farmName,
      sensorType: type,
      minValue: preset.minValue,
      maxValue: preset.maxValue,
      criticalMin: preset.criticalMin,
      criticalMax: preset.criticalMax,
      enabled: true,
      updatedAt: new Date().toISOString(),
    };
    mockThresholds.push(rule);
    created.push(rule);
  }

  return created;
}

// ==================== Adapter Chuẩn hóa DTO Backend (Dev 1) <-> Frontend (Dev 4) ====================

interface BackendThresholdRaw {
  id: number;
  zoneId: number;
  zoneName?: string;
  farmId?: number;
  farmName?: string;
  sensorType: SensorType;
  minValue?: number;
  maxValue?: number;
  criticalMin?: number;
  criticalMax?: number;
  enabled?: boolean;
  updatedAt?: string;
  createdAt?: string;
}

interface BackendAlertRaw {
  id: number;
  alertCode?: string;
  zoneId?: number;
  zoneName?: string;
  sensorId?: number | null;
  sensorCode?: string;
  sensorName?: string;
  sensorType?: AlertItem['sensorType'];
  alertLevel?: BackendAlertLevel;
  status?: AlertItem['status'];
  isRead?: boolean;
  measuredValue?: number;
  unit?: string;
  thresholdMin?: number;
  thresholdMax?: number;
  message?: string;
  resolvedNote?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

function normalizeThresholdRule(
  raw: BackendThresholdRaw,
  fallbackZone?: Zone,
  overrides?: Partial<ThresholdUpdatePayload>,
): ThresholdRule {
  const sensorType: SensorType = ALL_SENSOR_TYPES.includes(raw.sensorType)
    ? raw.sensorType
    : 'TEMPERATURE';
  const preset = SENSOR_THRESHOLD_PRESETS[sensorType];

  const minVal =
    typeof raw.minValue === 'number' && Number.isFinite(raw.minValue)
      ? raw.minValue
      : (overrides?.minValue ?? preset.minValue);
  const maxVal =
    typeof raw.maxValue === 'number' && Number.isFinite(raw.maxValue)
      ? raw.maxValue
      : (overrides?.maxValue ?? preset.maxValue);

  const safeMin = Math.max(preset.physicalMin + preset.step, Math.min(minVal, preset.physicalMax - preset.step * 2));
  const safeMax = Math.max(safeMin + preset.step, Math.min(maxVal, preset.physicalMax - preset.step));

  const rawCritMin = overrides?.criticalMin ?? raw.criticalMin;
  const computedCritMin =
    typeof rawCritMin === 'number' && Number.isFinite(rawCritMin) && rawCritMin < safeMin && rawCritMin >= preset.physicalMin
      ? rawCritMin
      : Math.max(preset.physicalMin, Number((safeMin - Math.max(preset.step, (safeMax - safeMin) * 0.25)).toFixed(2)));

  const rawCritMax = overrides?.criticalMax ?? raw.criticalMax;
  const computedCritMax =
    typeof rawCritMax === 'number' && Number.isFinite(rawCritMax) && rawCritMax > safeMax && rawCritMax <= preset.physicalMax
      ? rawCritMax
      : Math.min(preset.physicalMax, Number((safeMax + Math.max(preset.step, (safeMax - safeMin) * 0.25)).toFixed(2)));

  return {
    id: raw.id,
    zoneId: raw.zoneId ?? fallbackZone?.id ?? 1,
    zoneName: raw.zoneName || fallbackZone?.name || `Khu vực #${raw.zoneId}`,
    farmId: raw.farmId ?? fallbackZone?.farmId ?? 1,
    farmName: raw.farmName || fallbackZone?.farmName || 'Nông trại Công nghệ cao Đà Lạt',
    sensorType,
    minValue: safeMin,
    maxValue: safeMax,
    criticalMin: computedCritMin,
    criticalMax: computedCritMax,
    enabled: overrides?.enabled ?? raw.enabled ?? true,
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
  };
}

function inferAlertSourceType(raw: BackendAlertRaw): AlertItem['sensorType'] {
  if (raw.sensorType) return raw.sensorType;
  const text = `${raw.sensorName ?? ''} ${raw.sensorCode ?? ''} ${raw.message ?? ''}`.toUpperCase();
  if (text.includes('UAV') || text.includes('PIN') || text.includes('BATTERY')) return 'UAV_BATTERY';
  if (text.includes('SOIL') || text.includes('ẨM ĐẤT')) return 'SOIL_MOISTURE';
  if (text.includes('HUMI') || text.includes('ĐỘ ẨM')) return 'HUMIDITY';
  if (text.includes('LIGHT') || text.includes('LUX') || text.includes('ÁNH SÁNG')) return 'LIGHT';
  if (text.includes('CO2') || text.includes('PPM')) return 'CO2';
  return 'TEMPERATURE';
}

function normalizeAlertItem(raw: BackendAlertRaw, fallback?: Partial<AlertItem>): AlertItem {
  const sensorType = raw.sensorType ?? fallback?.sensorType ?? inferAlertSourceType(raw);
  const preset =
    sensorType !== 'UAV_BATTERY' ? SENSOR_THRESHOLD_PRESETS[sensorType] : null;
  const unit = raw.unit || fallback?.unit || (sensorType === 'UAV_BATTERY' ? '%' : preset?.unit ?? '');

  let measuredValue =
    typeof raw.measuredValue === 'number' && Number.isFinite(raw.measuredValue)
      ? raw.measuredValue
      : fallback?.measuredValue;
  if (measuredValue === undefined && raw.message) {
    const match = raw.message.match(/(-?\d+(?:\.\d+)?)\s*(?:°C|%|lux|ppm)/i);
    if (match) measuredValue = Number(match[1]);
  }

  const isRead = raw.isRead ?? fallback?.isRead ?? false;
  const status: AlertItem['status'] =
    raw.status ??
    fallback?.status ??
    (raw.resolvedAt ? 'RESOLVED' : isRead ? 'ACKNOWLEDGED' : 'OPEN');

  return {
    id: raw.id,
    alertCode: raw.alertCode || fallback?.alertCode || `ALT-BE-${String(raw.id).padStart(4, '0')}`,
    zoneId: raw.zoneId ?? fallback?.zoneId ?? 1,
    zoneName: raw.zoneName || fallback?.zoneName || `Khu vực #${raw.zoneId ?? 1}`,
    sensorId: raw.sensorId ?? fallback?.sensorId ?? null,
    sensorCode:
      raw.sensorCode ||
      raw.sensorName ||
      fallback?.sensorCode ||
      (raw.sensorId ? `SENSOR-${raw.sensorId}` : `DEV-${raw.id}`),
    sensorType,
    alertLevel: raw.alertLevel ?? fallback?.alertLevel ?? 'WARNING',
    status,
    isRead,
    measuredValue: measuredValue ?? 0,
    unit,
    thresholdMin: raw.thresholdMin ?? fallback?.thresholdMin ?? (sensorType === 'UAV_BATTERY' ? 20 : preset?.minValue ?? 0),
    thresholdMax: raw.thresholdMax ?? fallback?.thresholdMax ?? (sensorType === 'UAV_BATTERY' ? 100 : preset?.maxValue ?? 100),
    message: raw.message || fallback?.message || 'Cảnh báo vượt ngưỡng từ hệ thống giám sát.',
    resolvedNote: raw.resolvedNote ?? fallback?.resolvedNote ?? undefined,
    createdAt: raw.createdAt || fallback?.createdAt || new Date().toISOString(),
    resolvedAt: raw.resolvedAt ?? fallback?.resolvedAt ?? undefined,
  };
}

// ==================== API Dịch vụ Ngưỡng Cảnh báo (F09) ====================

export const thresholdApi = {
  async getByZone(zone: Zone): Promise<ThresholdRule[]> {
    try {
      const res = await apiClient.get<{ data?: BackendThresholdRaw[] }>(`/thresholds/zone/${zone.id}`);
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data.map((item) => normalizeThresholdRule(item, zone));
      }
    } catch {
      // Fallback sang dữ liệu nội bộ khi Backend LTJ-26 chưa khởi chạy
    }
    return ensureZoneThresholdsExist(zone).map((r) => ({
      ...r,
      zoneName: zone.name,
      farmId: zone.farmId,
      farmName: zone.farmName,
    }));
  },

  async getAll(): Promise<ThresholdRule[]> {
    try {
      const res = await apiClient.get<{ data?: BackendThresholdRaw[] }>('/thresholds');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data.map((item) => normalizeThresholdRule(item));
      }
    } catch {
      // Fallback
    }
    return [...mockThresholds];
  },

  async saveRule(payload: ThresholdUpdatePayload, zone: Zone): Promise<ThresholdRule> {
    try {
      const backendBody = {
        zoneId: payload.zoneId,
        sensorType: payload.sensorType,
        minValue: payload.minValue,
        maxValue: payload.maxValue,
        criticalMin: payload.criticalMin,
        criticalMax: payload.criticalMax,
        enabled: payload.enabled,
      };
      let savedRaw: BackendThresholdRaw | undefined;
      if (payload.id) {
        try {
          const res = await apiClient.put<{ data?: BackendThresholdRaw }>(
            `/thresholds/${payload.id}`,
            backendBody
          );
          savedRaw = res.data?.data;
        } catch (err) {
          // Nếu ID chỉ mới nằm trên Mock (404 trên DB) thì chuyển sang POST tạo mới
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            const created = await apiClient.post<{ data?: BackendThresholdRaw }>(
              '/thresholds',
              backendBody
            );
            savedRaw = created.data?.data;
          } else {
            throw err;
          }
        }
      } else {
        const res = await apiClient.post<{ data?: BackendThresholdRaw }>('/thresholds', backendBody);
        savedRaw = res.data?.data;
      }

      if (savedRaw) {
        const normalized = normalizeThresholdRule(savedRaw, zone, payload);
        const existingIdx = mockThresholds.findIndex(
          (r) =>
            r.id === normalized.id ||
            (r.zoneId === normalized.zoneId && r.sensorType === normalized.sensorType)
        );
        if (existingIdx !== -1) {
          mockThresholds = [
            ...mockThresholds.slice(0, existingIdx),
            normalized,
            ...mockThresholds.slice(existingIdx + 1),
          ];
        } else {
          mockThresholds = [...mockThresholds, normalized];
        }
        return normalized;
      }
    } catch {
      // Fallback cập nhật vào bộ nhớ nội bộ
    }

    const nowIso = new Date().toISOString();
    const idx = mockThresholds.findIndex(
      (r) =>
        (payload.id && r.id === payload.id) ||
        (r.zoneId === payload.zoneId && r.sensorType === payload.sensorType)
    );

    if (idx !== -1) {
      const updated: ThresholdRule = {
        ...mockThresholds[idx],
        minValue: payload.minValue,
        maxValue: payload.maxValue,
        criticalMin: payload.criticalMin,
        criticalMax: payload.criticalMax,
        enabled: payload.enabled,
        zoneName: zone.name,
        farmId: zone.farmId,
        farmName: zone.farmName,
        updatedAt: nowIso,
      };
      mockThresholds = [
        ...mockThresholds.slice(0, idx),
        updated,
        ...mockThresholds.slice(idx + 1),
      ];
      return updated;
    }

    const newRule: ThresholdRule = {
      id: Date.now(),
      zoneId: zone.id,
      zoneName: zone.name,
      farmId: zone.farmId,
      farmName: zone.farmName,
      sensorType: payload.sensorType,
      minValue: payload.minValue,
      maxValue: payload.maxValue,
      criticalMin: payload.criticalMin,
      criticalMax: payload.criticalMax,
      enabled: payload.enabled,
      updatedAt: nowIso,
    };
    mockThresholds = [...mockThresholds, newRule];
    return newRule;
  },

  async resetZoneToDefaults(zone: Zone): Promise<ThresholdRule[]> {
    try {
      const existingRes = await apiClient.get<{ data?: BackendThresholdRaw[] }>(
        `/thresholds/zone/${zone.id}`
      );
      const existingByType = new Map<SensorType, BackendThresholdRaw>();
      if (Array.isArray(existingRes.data?.data)) {
        for (const item of existingRes.data.data) {
          existingByType.set(item.sensorType, item);
        }
      }

      const settled = await Promise.allSettled(
        ALL_SENSOR_TYPES.map(async (sensorType) => {
          const preset = SENSOR_THRESHOLD_PRESETS[sensorType];
          const body = {
            zoneId: zone.id,
            sensorType,
            minValue: preset.minValue,
            maxValue: preset.maxValue,
            criticalMin: preset.criticalMin,
            criticalMax: preset.criticalMax,
            enabled: true,
          };
          const existing = existingByType.get(sensorType);
          const res = existing
            ? await apiClient.put<{ data?: BackendThresholdRaw }>(`/thresholds/${existing.id}`, body)
            : await apiClient.post<{ data?: BackendThresholdRaw }>('/thresholds', body);
          if (!res.data?.data) {
            throw new Error(`Không nhận được dữ liệu ngưỡng mặc định cho ${sensorType}`);
          }
          return normalizeThresholdRule(res.data.data, zone, body);
        })
      );

      const savedRules = settled
        .filter((r): r is PromiseFulfilledResult<ThresholdRule> => r.status === 'fulfilled')
        .map((r) => r.value);

      if (savedRules.length > 0) {
        const savedByType = new Map(savedRules.map((r) => [r.sensorType, r]));
        mockThresholds = [
          ...mockThresholds.filter((r) => r.zoneId !== zone.id),
          ...savedRules,
        ];
        return ALL_SENSOR_TYPES.map((t) => savedByType.get(t)).filter(
          (r): r is ThresholdRule => Boolean(r)
        );
      }
    } catch {
      // Fallback
    }

    const nowIso = new Date().toISOString();
    ensureZoneThresholdsExist(zone);

    mockThresholds = mockThresholds.map((r) => {
      if (r.zoneId !== zone.id) return r;
      const preset = SENSOR_THRESHOLD_PRESETS[r.sensorType];
      return {
        ...r,
        minValue: preset.minValue,
        maxValue: preset.maxValue,
        criticalMin: preset.criticalMin,
        criticalMax: preset.criticalMax,
        enabled: true,
        updatedAt: nowIso,
      };
    });

    return mockThresholds.filter((r) => r.zoneId === zone.id);
  },
};

// ==================== API Dịch vụ Quản lý Cảnh báo (F08) ====================

export const alertApi = {
  async getAll(): Promise<AlertItem[]> {
    try {
      const res = await apiClient.get<{ data?: BackendAlertRaw[] }>('/alerts');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const normalized = res.data.data.map((item) => normalizeAlertItem(item));
        mockAlerts = normalized;
        return normalized.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    } catch {
      // Fallback
    }
    return [...mockAlerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async acknowledge(alertId: number): Promise<AlertItem> {
    const existing = mockAlerts.find((a) => a.id === alertId);
    try {
      const res = await apiClient.patch<{ data?: BackendAlertRaw }>(`/alerts/${alertId}/read`);
      if (res.data?.data) {
        const normalized = normalizeAlertItem(res.data.data, {
          ...existing,
          isRead: true,
          status: existing?.status === 'RESOLVED' ? 'RESOLVED' : 'ACKNOWLEDGED',
        });
        mockAlerts = mockAlerts.map((a) => (a.id === alertId ? normalized : a));
        return normalized;
      }
    } catch {
      // Fallback
    }

    const idx = mockAlerts.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      throw new Error(`Không tìm thấy cảnh báo #${alertId}`);
    }
    const current = mockAlerts[idx];
    const updated: AlertItem = {
      ...current,
      isRead: true,
      status: current.status === 'OPEN' ? 'ACKNOWLEDGED' : current.status,
    };
    mockAlerts = [...mockAlerts.slice(0, idx), updated, ...mockAlerts.slice(idx + 1)];
    return updated;
  },

  async resolve(alertId: number, resolvedNote: string): Promise<AlertItem> {
    const nowIso = new Date().toISOString();
    const existing = mockAlerts.find((a) => a.id === alertId);
    try {
      const res = await apiClient.patch<{ data?: BackendAlertRaw }>(`/alerts/${alertId}/resolve`, {
        resolvedNote,
        status: 'RESOLVED',
      });
      if (res.data?.data) {
        const normalized = normalizeAlertItem(res.data.data, {
          ...existing,
          status: 'RESOLVED',
          isRead: true,
          resolvedNote:
            resolvedNote.trim() ||
            existing?.resolvedNote ||
            'Đã kiểm tra và xử lý đưa chỉ số về ngưỡng an toàn.',
          resolvedAt: nowIso,
        });
        mockAlerts = mockAlerts.map((a) => (a.id === alertId ? normalized : a));
        return normalized;
      }
    } catch {
      // Fallback
    }

    const idx = mockAlerts.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      throw new Error(`Không tìm thấy cảnh báo #${alertId}`);
    }
    const updated: AlertItem = {
      ...mockAlerts[idx],
      status: 'RESOLVED',
      isRead: true,
      resolvedNote:
        resolvedNote.trim() || 'Đã kiểm tra và xử lý đưa chỉ số về ngưỡng an toàn.',
      resolvedAt: nowIso,
    };
    mockAlerts = [...mockAlerts.slice(0, idx), updated, ...mockAlerts.slice(idx + 1)];
    return updated;
  },

  async resolveAllOpen(zoneId?: number | 'ALL'): Promise<AlertItem[]> {
    const nowIso = new Date().toISOString();
    const defaultNote = 'Đóng hàng loạt sau khi kiểm tra hệ thống an toàn.';
    const targets = mockAlerts.filter((item) => {
      const matchZone = !zoneId || zoneId === 'ALL' || item.zoneId === zoneId;
      return matchZone && item.status !== 'RESOLVED';
    });

    if (targets.length > 0) {
      await Promise.allSettled(
        targets.map((item) =>
          apiClient.patch(`/alerts/${item.id}/resolve`, {
            resolvedNote: item.resolvedNote || defaultNote,
            status: 'RESOLVED',
          })
        )
      );
    }

    mockAlerts = mockAlerts.map((item) => {
      const matchZone = !zoneId || zoneId === 'ALL' || item.zoneId === zoneId;
      if (matchZone && item.status !== 'RESOLVED') {
        return {
          ...item,
          status: 'RESOLVED',
          isRead: true,
          resolvedNote: item.resolvedNote || defaultNote,
          resolvedAt: nowIso,
        };
      }
      return item;
    });
    return [...mockAlerts];
  },

  async deleteAlert(alertId: number): Promise<number> {
    try {
      await apiClient.delete(`/alerts/${alertId}`);
    } catch {
      // Fallback
    }
    mockAlerts = mockAlerts.filter((a) => a.id !== alertId);
    return alertId;
  },

  /**
   * Mô phỏng kịch bản Bắn Data Cực đoan của Dev 5 (Task LTJ-30):
   * - Nhiệt độ tăng vọt lên 60.0°C (vượt ngưỡng Critical Max)
   * - Pin UAV tụt xuống 5% (vượt ngưỡng an toàn tối thiểu 15%)
   * Đối chiếu trực tiếp với quy tắc Threshold đang cấu hình của Zone hiện tại.
   */
  async simulateExtremeDataBurst(zone: Zone): Promise<AlertItem[]> {
    const zoneRules = ensureZoneThresholdsExist(zone);
    const tempRule =
      zoneRules.find((r) => r.sensorType === 'TEMPERATURE') ||
      ({
        minValue: 18,
        maxValue: 35,
        criticalMin: 12,
        criticalMax: 42,
        enabled: true,
      } as ThresholdRule);

    const now = Date.now();
    const seq = Math.floor((now % 899) + 100);
    const extremeTemp = 60.0;
    const evaluatedLevel = evaluateReadingAgainstRule(extremeTemp, tempRule);
    const alertLevel: BackendAlertLevel =
      evaluatedLevel === 'NORMAL' ? 'CRITICAL' : evaluatedLevel;

    const tempAlert: AlertItem = {
      id: now,
      alertCode: `ALT-EXT-${seq}A`,
      zoneId: zone.id,
      zoneName: zone.name,
      sensorId: 101,
      sensorCode: `DEV-Z${zone.id}-EXT-TEMP`,
      sensorType: 'TEMPERATURE',
      alertLevel,
      status: 'OPEN',
      isRead: false,
      measuredValue: extremeTemp,
      unit: '°C',
      thresholdMin: tempRule.minValue,
      thresholdMax: tempRule.maxValue,
      message: `[LTJ-30 Extreme Spike] Cảm biến nhiệt độ tại ${zone.name} ghi nhận mức cực đoan 60.0°C (vượt ngưỡng nguy hiểm ${tempRule.criticalMax}°C). Kích hoạt báo động đỏ toàn khu!`,
      createdAt: new Date(now).toISOString(),
    };

    const batteryAlert: AlertItem = {
      id: now + 1,
      alertCode: `ALT-EXT-${seq}B`,
      zoneId: zone.id,
      zoneName: zone.name,
      sensorId: null,
      sensorCode: 'UAV-02',
      sensorType: 'UAV_BATTERY',
      alertLevel: 'CRITICAL',
      status: 'OPEN',
      isRead: false,
      measuredValue: 5,
      unit: '%',
      thresholdMin: 20,
      thresholdMax: 100,
      message: `[LTJ-30 Extreme Battery] Thiết bị bay UAV-02 báo mức pin nguy cấp 5% (< 15%) khi đang tuần tra ${zone.name}. Yêu cầu hạ cánh khẩn cấp!`,
      createdAt: new Date(now + 500).toISOString(),
    };

    const persistAlertToBackend = async (fallbackAlert: AlertItem): Promise<AlertItem> => {
      try {
        const res = await apiClient.post<{ data?: BackendAlertRaw }>('/alerts', {
          zoneId: zone.id,
          sensorId: null,
          alertLevel: fallbackAlert.alertLevel,
          message: fallbackAlert.message,
        });
        if (res.data?.data) {
          return normalizeAlertItem(res.data.data, fallbackAlert);
        }
      } catch {
        // Fallback cục bộ khi Backend offline
      }
      return fallbackAlert;
    };

    const [persistedTempAlert, persistedBatteryAlert] = await Promise.all([
      persistAlertToBackend(tempAlert),
      persistAlertToBackend(batteryAlert),
    ]);

    const createdIds = new Set([persistedBatteryAlert.id, persistedTempAlert.id]);
    mockAlerts = [
      persistedBatteryAlert,
      persistedTempAlert,
      ...mockAlerts.filter((a) => !createdIds.has(a.id)),
    ];
    return [persistedBatteryAlert, persistedTempAlert];
  },
};
