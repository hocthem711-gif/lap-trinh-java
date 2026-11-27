/**
 * Realtime Sensor Stream Service — SmartFarm Frontend
 * Task: LTJ-14 - Sprint 3
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Mô phỏng dữ liệu cảm biến thời gian thực (realtime).
 * - Tạo dữ liệu ban đầu cho 10 nút cảm biến trên 5 Zone
 * - Cung cấp hàm tạo dao động (fluctuation) giả lập MQTT stream
 * - Sẵn sàng thay thế bằng WebSocket / MQTT thật khi Backend Dev hoàn thành
 */

import type {
  RealtimeSensorNode,
  SensorReading,
  RealtimeStatus,
  ThresholdConfig,
  SensorAlert,
  AlertLevel,
  RealtimeStats,
} from '../types/realtime';
import { DEFAULT_THRESHOLDS } from '../types/realtime';
import type { SensorType, SensorNode } from '../types';
import { apiRequest } from './api';

// ==================== Dữ liệu cảm biến Realtime (Đặt chuẩn vào các thung lũng/đồi canh tác Đà Lạt, tránh Quốc lộ) ====================

const ZONE_LOCATIONS: Record<number, { name: string; center: { lat: number; lng: number } }> = {
  1: { name: 'Khu Vực A - Dâu Tây Thủy Canh', center: { lat: 11.9396, lng: 108.4666 } },
  2: { name: 'Khu Vực B - Rau Xà Lách Thủy Canh', center: { lat: 11.9378, lng: 108.4665 } },
  3: { name: 'Khu Vực C - Cà Chua Bi Nhà Kính', center: { lat: 11.9358, lng: 108.4666 } },
};

function randomOffset(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range * 2;
}

function generateInitialReadings(sensorType: SensorType): SensorReading {
  const baseReadings: Record<SensorType, SensorReading> = {
    TEMPERATURE: {
      temperature: 28 + Math.random() * 6,
      airHumidity: 65 + Math.random() * 15,
      soilMoisture: 45 + Math.random() * 20,
      light: 15000 + Math.random() * 30000,
      co2: 400 + Math.random() * 200,
      ph: 6.2 + Math.random() * 0.8,
    },
    HUMIDITY: {
      temperature: 26 + Math.random() * 4,
      airHumidity: 70 + Math.random() * 20,
      soilMoisture: 50 + Math.random() * 25,
      light: 12000 + Math.random() * 20000,
      co2: 420 + Math.random() * 180,
      ph: 6.0 + Math.random() * 1.0,
    },
    SOIL_MOISTURE: {
      temperature: 25 + Math.random() * 5,
      airHumidity: 60 + Math.random() * 20,
      soilMoisture: 55 + Math.random() * 30,
      light: 10000 + Math.random() * 25000,
      co2: 380 + Math.random() * 220,
      ph: 6.5 + Math.random() * 0.5,
    },
    LIGHT: {
      temperature: 30 + Math.random() * 5,
      airHumidity: 55 + Math.random() * 15,
      soilMoisture: 40 + Math.random() * 20,
      light: 25000 + Math.random() * 50000,
      co2: 450 + Math.random() * 150,
      ph: 6.3 + Math.random() * 0.7,
    },
    CO2: {
      temperature: 27 + Math.random() * 4,
      airHumidity: 68 + Math.random() * 12,
      soilMoisture: 48 + Math.random() * 22,
      light: 18000 + Math.random() * 20000,
      co2: 500 + Math.random() * 400,
      ph: 6.1 + Math.random() * 0.9,
    },
  };
  return baseReadings[sensorType];
}

function generateStatus(battery: number, signal: number): RealtimeStatus {
  if (battery <= 10 || signal <= 15) return 'OFFLINE';
  if (battery <= 25 || signal <= 35) return 'WARNING';
  return 'ONLINE';
}

/**
 * Tạo danh sách 10 nút cảm biến ban đầu
 * Dùng để khởi tạo Redux Store, tương tự MOCK_SENSORS nhưng có thêm
 * chỉ số đo realtime, pin, tín hiệu, và tọa độ trên bản đồ.
 */
export const IOT_VALLEY_SENSOR_COORDS: Record<string, { lat: number; lng: number; zoneId: number }> = {
  // Khu A (Zone A1 — 4 cảm biến IoT chuẩn: TEMP, HUM, SOIL, LIGHT)
  'DEV-Z1-001-TEMP': { lat: 11.9401, lng: 108.4659, zoneId: 1 },
  'DEV-Z1-001-HUM': { lat: 11.9399, lng: 108.4674, zoneId: 1 },
  'DEV-Z1-001-SOIL': { lat: 11.9391, lng: 108.4658, zoneId: 1 },
  'DEV-Z1-001-LIGHT': { lat: 11.9392, lng: 108.4673, zoneId: 1 },

  // Khu B (Zone B1 — 4 cảm biến IoT chuẩn: TEMP, HUM, SOIL, LIGHT)
  'DEV-Z2-001-TEMP': { lat: 11.9382, lng: 108.4658, zoneId: 2 },
  'DEV-Z2-001-HUM': { lat: 11.9381, lng: 108.4674, zoneId: 2 },
  'DEV-Z2-001-SOIL': { lat: 11.9374, lng: 108.4657, zoneId: 2 },
  'DEV-Z2-001-LIGHT': { lat: 11.9373, lng: 108.4673, zoneId: 2 },

  // Khu C (Zone C1 — 4 cảm biến IoT chuẩn: TEMP, HUM, SOIL, LIGHT)
  'DEV-Z3-001-TEMP': { lat: 11.9363, lng: 108.4658, zoneId: 3 },
  'DEV-Z3-001-HUM': { lat: 11.9362, lng: 108.4676, zoneId: 3 },
  'DEV-Z3-001-SOIL': { lat: 11.9353, lng: 108.4657, zoneId: 3 },
  'DEV-Z3-001-LIGHT': { lat: 11.9354, lng: 108.4674, zoneId: 3 },
};

export function generateInitialSensors(): RealtimeSensorNode[] {
  const sensorConfigs: {
    code: string;
    type: SensorType;
    zoneId: number;
    lat: number;
    lng: number;
  }[] = [
    { code: 'DEV-Z1-001-TEMP', type: 'TEMPERATURE', zoneId: 1, lat: 11.9401, lng: 108.4659 },
    { code: 'DEV-Z1-001-HUM', type: 'HUMIDITY', zoneId: 1, lat: 11.9399, lng: 108.4674 },
    { code: 'DEV-Z1-001-SOIL', type: 'SOIL_MOISTURE', zoneId: 1, lat: 11.9391, lng: 108.4658 },
    { code: 'DEV-Z1-001-LIGHT', type: 'LIGHT', zoneId: 1, lat: 11.9392, lng: 108.4673 },

    { code: 'DEV-Z2-001-TEMP', type: 'TEMPERATURE', zoneId: 2, lat: 11.9382, lng: 108.4658 },
    { code: 'DEV-Z2-001-HUM', type: 'HUMIDITY', zoneId: 2, lat: 11.9381, lng: 108.4674 },
    { code: 'DEV-Z2-001-SOIL', type: 'SOIL_MOISTURE', zoneId: 2, lat: 11.9374, lng: 108.4657 },
    { code: 'DEV-Z2-001-LIGHT', type: 'LIGHT', zoneId: 2, lat: 11.9373, lng: 108.4673 },

    { code: 'DEV-Z3-001-TEMP', type: 'TEMPERATURE', zoneId: 3, lat: 11.9363, lng: 108.4658 },
    { code: 'DEV-Z3-001-HUM', type: 'HUMIDITY', zoneId: 3, lat: 11.9362, lng: 108.4676 },
    { code: 'DEV-Z3-001-SOIL', type: 'SOIL_MOISTURE', zoneId: 3, lat: 11.9353, lng: 108.4657 },
    { code: 'DEV-Z3-001-LIGHT', type: 'LIGHT', zoneId: 3, lat: 11.9354, lng: 108.4674 },
  ];

  return sensorConfigs.map((config, index) => {
    const zone = ZONE_LOCATIONS[config.zoneId];
    const battery = 45 + ((index * 11) % 52);
    const signal = 68 + ((index * 7) % 30);

    return {
      id: index + 1,
      sensorCode: config.code,
      sensorType: config.type,
      status: generateStatus(battery, signal),
      zoneName: zone.name,
      zoneId: config.zoneId,
      location: {
        lat: config.lat,
        lng: config.lng,
      },
      battery,
      signal,
      readings: generateInitialReadings(config.type),
      lastUpdated: new Date().toISOString(),
    };
  });
}

// ==================== Cập nhật dao động Realtime ====================

/**
 * Mô phỏng dao động nhỏ trên chỉ số đo — giả lập dữ liệu MQTT stream.
 * Được gọi theo chu kỳ (mỗi 3-5 giây) từ Redux thunk hoặc useEffect.
 */
export function fluctuateReadings(current: SensorReading): SensorReading {
  return {
    temperature: Math.max(10, Math.min(50, current.temperature + (Math.random() - 0.5) * 1.5)),
    airHumidity: Math.max(10, Math.min(100, current.airHumidity + (Math.random() - 0.5) * 3)),
    soilMoisture: Math.max(5, Math.min(100, current.soilMoisture + (Math.random() - 0.5) * 2)),
    light: Math.max(0, Math.min(100000, current.light + (Math.random() - 0.5) * 3000)),
    co2: Math.max(200, Math.min(2000, current.co2 + (Math.random() - 0.5) * 50)),
    ph: Math.max(3, Math.min(10, current.ph + (Math.random() - 0.5) * 0.15)),
  };
}

/**
 * Mô phỏng dao động pin & tín hiệu
 */
export function fluctuateBatterySignal(battery: number, signal: number): { battery: number; signal: number } {
  return {
    battery: Math.max(0, Math.min(100, battery + (Math.random() - 0.5) * 2)),
    signal: Math.max(0, Math.min(100, signal + (Math.random() - 0.5) * 5)),
  };
}

/**
 * Cập nhật toàn bộ danh sách cảm biến (1 tick của realtime stream).
 * Trả về danh sách sensor đã cập nhật + danh sách cảnh báo mới.
 */
export function tickRealtimeUpdate(sensors: RealtimeSensorNode[]): {
  updatedSensors: RealtimeSensorNode[];
  newAlerts: SensorAlert[];
} {
  const newAlerts: SensorAlert[] = [];

  const updatedSensors = sensors.map(sensor => {
    const newReadings = fluctuateReadings(sensor.readings);
    const { battery, signal } = fluctuateBatterySignal(sensor.battery, sensor.signal);
    const newStatus = generateStatus(battery, signal);

    // Kiểm tra ngưỡng cảnh báo
    const alerts = checkThresholds(sensor.id, sensor.sensorCode, newReadings, DEFAULT_THRESHOLDS);
    newAlerts.push(...alerts);

    return {
      ...sensor,
      readings: newReadings,
      battery: Math.round(battery),
      signal: Math.round(signal),
      status: newStatus,
      lastUpdated: new Date().toISOString(),
    };
  });

  return { updatedSensors, newAlerts };
}

// ==================== Kiểm tra ngưỡng cảnh báo ====================

function checkThresholds(
  sensorId: number,
  sensorCode: string,
  readings: SensorReading,
  thresholds: ThresholdConfig,
): SensorAlert[] {
  const alerts: SensorAlert[] = [];
  const metrics = Object.keys(readings) as (keyof SensorReading)[];

  for (const metric of metrics) {
    const value = readings[metric];
    const threshold = thresholds[metric];
    let level: AlertLevel = 'NORMAL';

    if (value < threshold.min * 0.8 || value > threshold.max * 1.2) {
      level = 'CRITICAL';
    } else if (value < threshold.min || value > threshold.max) {
      level = 'WARNING';
    }

    if (level !== 'NORMAL') {
      alerts.push({
        sensorId,
        sensorCode,
        metric,
        value: Math.round(value * 100) / 100,
        threshold,
        level,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return alerts;
}

// ==================== Tính toán thống kê ====================

export function computeRealtimeStats(sensors: RealtimeSensorNode[]): RealtimeStats {
  const onlineCount = sensors.filter(s => s.status === 'ONLINE').length;
  const warningCount = sensors.filter(s => s.status === 'WARNING').length;
  const offlineCount = sensors.filter(s => s.status === 'OFFLINE').length;

  const onlineSensors = sensors.filter(s => s.status !== 'OFFLINE');
  const avgTemperature = onlineSensors.length > 0
    ? onlineSensors.reduce((sum, s) => sum + s.readings.temperature, 0) / onlineSensors.length
    : 0;
  const avgHumidity = onlineSensors.length > 0
    ? onlineSensors.reduce((sum, s) => sum + s.readings.airHumidity, 0) / onlineSensors.length
    : 0;

  return {
    totalSensors: sensors.length,
    onlineCount,
    warningCount,
    offlineCount,
    avgTemperature: Math.round(avgTemperature * 10) / 10,
    avgHumidity: Math.round(avgHumidity * 10) / 10,
  };
}

export function createRealtimeSensorFromNode(node: SensorNode): RealtimeSensorNode {
  const fallbackZone = ZONE_LOCATIONS[node.zoneId] ?? ZONE_LOCATIONS[1];
  const battery = 88;
  const signal = 92;
  return {
    id: node.id,
    sensorCode: node.sensorCode,
    sensorType: node.sensorType,
    status: node.status === 'INACTIVE' || node.status === 'ERROR' ? 'OFFLINE' : 'ONLINE',
    zoneName: node.zoneName || fallbackZone.name,
    zoneId: node.zoneId,
    location: {
      lat: randomOffset(fallbackZone.center.lat, 0.0008),
      lng: randomOffset(fallbackZone.center.lng, 0.0008),
    },
    battery,
    signal,
    readings: generateInitialReadings(node.sensorType),
    lastUpdated: new Date().toISOString(),
  };
}

interface BackendLatestTelemetryDto {
  sensorId: number;
  sensorCode: string;
  name?: string;
  sensorType: SensorType;
  sensorStatus?: string;
  zoneId: number;
  zoneName: string;
  latestValue?: number | null;
  unit?: string;
  batteryLevel?: number | null;
  dataStatus?: string | null;
  lastUpdated?: string | null;
}

/**
 * Đồng bộ trực tiếp dữ liệu thật từ Backend (/api/v1/sensor-data/latest) do IoT Simulator bắn lên.
 * Nếu Backend tạm ngắt kết nối thì tự động fallback về bộ dao động mô phỏng cục bộ.
 */
export async function fetchBackendOrSimulateTick(
  currentSensors: RealtimeSensorNode[],
): Promise<{
  updatedSensors: RealtimeSensorNode[];
  newAlerts: SensorAlert[];
}> {
  try {
    const res = await apiRequest<BackendLatestTelemetryDto[]>('/sensor-data/latest');
    const list = Array.isArray(res.data) ? res.data : [];
    if (list.length > 0) {
      const baseList = currentSensors.length > 0 ? currentSensors : generateInitialSensors();
      const prevByCode = new Map(baseList.map((s) => [s.sensorCode, s]));

      // Gom chỉ số thực của từng Zone (TEMP, HUM, SOIL, LIGHT) để đồng bộ đầy đủ các cột
      const zoneMetrics = new Map<
        number,
        Partial<Pick<SensorReading, 'temperature' | 'airHumidity' | 'soilMoisture' | 'light' | 'co2'>>
      >();
      for (const item of list) {
        if (typeof item.latestValue !== 'number') continue;
        const bucket = zoneMetrics.get(item.zoneId) ?? {};
        if (item.sensorType === 'TEMPERATURE') bucket.temperature = item.latestValue;
        else if (item.sensorType === 'HUMIDITY') bucket.airHumidity = item.latestValue;
        else if (item.sensorType === 'SOIL_MOISTURE') bucket.soilMoisture = item.latestValue;
        else if (item.sensorType === 'LIGHT') bucket.light = item.latestValue;
        else if (item.sensorType === 'CO2') bucket.co2 = item.latestValue;
        zoneMetrics.set(item.zoneId, bucket);
      }

      const newAlerts: SensorAlert[] = [];
      const updatedSensors: RealtimeSensorNode[] = list.map((item, idx) => {
        const prev = prevByCode.get(item.sensorCode);
        const valley = IOT_VALLEY_SENSOR_COORDS[item.sensorCode];
        const fallbackZone = ZONE_LOCATIONS[item.zoneId] ?? ZONE_LOCATIONS[1];
        const zm = zoneMetrics.get(item.zoneId) ?? {};
        const prevReadings = prev?.readings ?? generateInitialReadings(item.sensorType);

        const nextReadings: SensorReading = {
          temperature: zm.temperature ?? prevReadings.temperature,
          airHumidity: zm.airHumidity ?? prevReadings.airHumidity,
          soilMoisture: zm.soilMoisture ?? prevReadings.soilMoisture,
          light: zm.light ?? prevReadings.light,
          co2: zm.co2 ?? prevReadings.co2,
          ph: prevReadings.ph,
        };
        if (typeof item.latestValue === 'number') {
          if (item.sensorType === 'TEMPERATURE') nextReadings.temperature = item.latestValue;
          else if (item.sensorType === 'HUMIDITY') nextReadings.airHumidity = item.latestValue;
          else if (item.sensorType === 'SOIL_MOISTURE') nextReadings.soilMoisture = item.latestValue;
          else if (item.sensorType === 'LIGHT') nextReadings.light = item.latestValue;
          else if (item.sensorType === 'CO2') nextReadings.co2 = item.latestValue;
        }

        const battery = Math.round(item.batteryLevel ?? prev?.battery ?? 95);
        const signal = prev?.signal ?? 88 + (idx % 10);
        const rawDataStatus = String(item.dataStatus ?? 'NORMAL').toUpperCase();
        const rawSensorStatus = String(item.sensorStatus ?? 'ACTIVE').toUpperCase();

        let status: RealtimeStatus = 'ONLINE';
        if (rawSensorStatus === 'INACTIVE' || rawSensorStatus === 'ERROR' || battery <= 10) {
          status = 'OFFLINE';
        } else if (
          rawDataStatus === 'WARNING' ||
          rawDataStatus === 'CRITICAL' ||
          rawDataStatus === 'ANOMALY' ||
          battery <= 25
        ) {
          status = 'WARNING';
        }

        const alerts = checkThresholds(
          item.sensorId ?? idx + 1,
          item.sensorCode,
          nextReadings,
          DEFAULT_THRESHOLDS,
        );
        newAlerts.push(...alerts);

        return {
          id: item.sensorId ?? prev?.id ?? idx + 1,
          sensorCode: item.sensorCode,
          sensorType: item.sensorType,
          status,
          zoneName: item.zoneName || fallbackZone.name,
          zoneId: item.zoneId,
          location: valley
            ? { lat: valley.lat, lng: valley.lng }
            : (prev?.location ?? { lat: fallbackZone.center.lat, lng: fallbackZone.center.lng }),
          battery,
          signal,
          readings: nextReadings,
          lastUpdated: item.lastUpdated || new Date().toISOString(),
        };
      });

      return { updatedSensors, newAlerts };
    }
  } catch {
    // Fallback khi Backend offline
  }

  return tickRealtimeUpdate(currentSensors);
}

// ==================== Export Zone Locations cho Map ====================
export { ZONE_LOCATIONS };
