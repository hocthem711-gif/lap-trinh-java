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

// ==================== API Dịch vụ Ngưỡng Cảnh báo (F09) ====================

export const thresholdApi = {
  async getByZone(zone: Zone): Promise<ThresholdRule[]> {
    try {
      const res = await apiClient.get<{ data?: ThresholdRule[] }>(`/thresholds/zone/${zone.id}`);
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data;
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
      const res = await apiClient.get<{ data?: ThresholdRule[] }>('/thresholds');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    return [...mockThresholds];
  },

  async saveRule(payload: ThresholdUpdatePayload, zone: Zone): Promise<ThresholdRule> {
    try {
      if (payload.id) {
        const res = await apiClient.put<{ data?: ThresholdRule }>(
          `/thresholds/${payload.id}`,
          payload
        );
        if (res.data?.data) return res.data.data;
      } else {
        const res = await apiClient.post<{ data?: ThresholdRule }>('/thresholds', payload);
        if (res.data?.data) return res.data.data;
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
      const res = await apiClient.post<{ data?: ThresholdRule[] }>(
        `/thresholds/zone/${zone.id}/reset`
      );
      if (res.data?.data && Array.isArray(res.data.data)) {
        return res.data.data;
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
      const res = await apiClient.get<{ data?: AlertItem[] }>('/alerts');
      if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch {
      // Fallback
    }
    return [...mockAlerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async acknowledge(alertId: number): Promise<AlertItem> {
    try {
      const res = await apiClient.patch<{ data?: AlertItem }>(`/alerts/${alertId}/read`);
      if (res.data?.data) return res.data.data;
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
    try {
      const res = await apiClient.patch<{ data?: AlertItem }>(`/alerts/${alertId}/resolve`, {
        resolvedNote,
        status: 'RESOLVED',
      });
      if (res.data?.data) return res.data.data;
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
    mockAlerts = mockAlerts.map((item) => {
      const matchZone = !zoneId || zoneId === 'ALL' || item.zoneId === zoneId;
      if (matchZone && item.status !== 'RESOLVED') {
        return {
          ...item,
          status: 'RESOLVED',
          isRead: true,
          resolvedNote:
            item.resolvedNote || 'Đóng hàng loạt sau khi kiểm tra hệ thống an toàn.',
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

    mockAlerts = [batteryAlert, tempAlert, ...mockAlerts];
    return [batteryAlert, tempAlert];
  },
};
