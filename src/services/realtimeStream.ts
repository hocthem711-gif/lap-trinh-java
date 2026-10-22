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
import type { SensorType } from '../types';

// ==================== Dữ liệu Mock cảm biến Realtime ====================

const ZONE_LOCATIONS: Record<number, { name: string; center: { lat: number; lng: number } }> = {
  1: { name: 'Lúa nước - Zone A1', center: { lat: 10.8505, lng: 106.7720 } },
  2: { name: 'Rau màu - Zone B1', center: { lat: 10.8515, lng: 106.7735 } },
  3: { name: 'Nhà kính - Zone C1', center: { lat: 10.8498, lng: 106.7745 } },
  4: { name: 'Cây ăn quả - Zone D1', center: { lat: 10.8520, lng: 106.7710 } },
  5: { name: 'Thí nghiệm - Zone E1', center: { lat: 10.8490, lng: 106.7730 } },
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
export function generateInitialSensors(): RealtimeSensorNode[] {
  const sensorConfigs: { code: string; type: SensorType; zoneId: number }[] = [
    { code: 'TEMP-001', type: 'TEMPERATURE', zoneId: 1 },
    { code: 'HUMI-001', type: 'HUMIDITY', zoneId: 1 },
    { code: 'SOIL-001', type: 'SOIL_MOISTURE', zoneId: 2 },
    { code: 'LIGHT-001', type: 'LIGHT', zoneId: 2 },
    { code: 'CO2-001', type: 'CO2', zoneId: 3 },
    { code: 'TEMP-002', type: 'TEMPERATURE', zoneId: 3 },
    { code: 'HUMI-002', type: 'HUMIDITY', zoneId: 1 },
    { code: 'SOIL-002', type: 'SOIL_MOISTURE', zoneId: 4 },
    { code: 'TEMP-003', type: 'TEMPERATURE', zoneId: 4 },
    { code: 'CO2-002', type: 'CO2', zoneId: 5 },
  ];

  return sensorConfigs.map((config, index) => {
    const zone = ZONE_LOCATIONS[config.zoneId];
    const battery = 30 + Math.floor(Math.random() * 70);
    const signal = 40 + Math.floor(Math.random() * 60);

    return {
      id: index + 1,
      sensorCode: config.code,
      sensorType: config.type,
      status: generateStatus(battery, signal),
      zoneName: zone.name,
      zoneId: config.zoneId,
      location: {
        lat: randomOffset(zone.center.lat, 0.001),
        lng: randomOffset(zone.center.lng, 0.001),
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

// ==================== Export Zone Locations cho Map ====================
export { ZONE_LOCATIONS };
