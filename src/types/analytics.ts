/**
 * Analytics Types — So sánh 2 Zone (F07) & Lịch sử Sync UAV
 * Task: LTJ-24 - Sprint 5
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * - Phần 1: Kiểu dữ liệu cho biểu đồ So sánh 2 Zone (chuỗi thời gian + thống kê).
 * - Phần 2: Kiểu dữ liệu cho Lịch sử đồng bộ Offline của UAV,
 *   khớp định dạng gói Bulk MQTT của Dev 5 (LTJ-25, docs/OFFLINE_SYNC_TEST_REPORT_SPRINT5.md).
 */

import type { SensorType } from './index';

// ==================== PHẦN 1: SO SÁNH 2 ZONE (F07) ====================

/** Các chỉ số môi trường có thể đem ra so sánh giữa 2 Zone */
export type ComparisonMetric = 'temperature' | 'airHumidity' | 'soilMoisture' | 'light' | 'co2';

/** Khung thời gian so sánh */
export type TimeRangePreset = '24H' | '7D' | '30D';

/** Kiểu biểu đồ hiển thị */
export type ChartMode = 'line' | 'bar';

/** Nguồn dữ liệu của chuỗi: Backend thật hay dữ liệu mô phỏng (khi Backend chưa bật / chưa có dữ liệu) */
export type DataSource = 'API' | 'MOCK';

/** Một điểm trên chuỗi thời gian. value = null nghĩa là khung giờ đó không có số đo. */
export interface ZoneTimeSeriesPoint {
  timestamp: string; // ISO string của mốc bắt đầu khung
  label: string;     // Nhãn trục X: "14:00" (24H) hoặc "05/11" (7D, 30D)
  value: number | null;
}

/** Thống kê tổng hợp của một chuỗi */
export interface SeriesStats {
  avg: number;
  min: number;
  max: number;
  latest: number;
  count: number; // Số điểm có dữ liệu (bỏ qua null)
}

/** Kết quả chuỗi dữ liệu của 1 Zone */
export interface ZoneSeries {
  zoneId: number;
  zoneName: string;
  metric: ComparisonMetric;
  timeRange: TimeRangePreset;
  points: ZoneTimeSeriesPoint[];
  stats: SeriesStats;
  source: DataSource;
}

/** Zone hiển thị trong dropdown */
export interface ZoneOption {
  id: number;
  name: string;
  cropType: string;
}

/** Cấu hình hiển thị cho từng chỉ số */
export interface MetricConfig {
  label: string;
  unit: string;
  icon: string;
  decimals: number;
  sensorType: SensorType; // Ánh xạ sang SensorType của Backend để lọc dữ liệu lịch sử
}

export const METRIC_CONFIG: Record<ComparisonMetric, MetricConfig> = {
  temperature:  { label: 'Nhiệt độ',          unit: '°C',  icon: '🌡️', decimals: 1, sensorType: 'TEMPERATURE' },
  airHumidity:  { label: 'Độ ẩm không khí',   unit: '%',   icon: '💧', decimals: 1, sensorType: 'HUMIDITY' },
  soilMoisture: { label: 'Độ ẩm đất',         unit: '%',   icon: '🌱', decimals: 1, sensorType: 'SOIL_MOISTURE' },
  light:        { label: 'Ánh sáng',          unit: 'lux', icon: '☀️', decimals: 0, sensorType: 'LIGHT' },
  co2:          { label: 'Nồng độ CO₂',       unit: 'ppm', icon: '💨', decimals: 0, sensorType: 'CO2' },
};

export const TIME_RANGE_LABELS: Record<TimeRangePreset, string> = {
  '24H': '24 giờ qua',
  '7D': '7 ngày qua',
  '30D': '30 ngày qua',
};

// ==================== PHẦN 2: LỊCH SỬ SYNC UAV ====================

/** Kích thước lô gửi Bulk — khớp UavOfflineSyncManager.java của Dev 5 (10 bản ghi/lô) */
export const SYNC_BATCH_SIZE = 10;

/** 3 MQTT topic của luồng đồng bộ — khớp thiết kế LTJ-25 */
export const SYNC_TOPICS = {
  HANDSHAKE_REQUEST: 'iot/ltj/sync/handshake/request',
  BULK: 'iot/ltj/sync/bulk',
  HANDSHAKE_COMPLETE: 'iot/ltj/sync/handshake/complete',
} as const;

/**
 * Trạng thái phiên đồng bộ:
 * - COMPLETED: gửi đủ 100% bản ghi tồn trong SQLite
 * - PARTIAL:   rớt mạng giữa chừng, phần chưa gửi vẫn nằm trong SQLite (is_synced = 0)
 * - SYNCING:   đang gửi các lô
 * - FAILED:    không bắt tay (Handshake) được, chưa gửi bản ghi nào
 */
export type SyncStatus = 'COMPLETED' | 'PARTIAL' | 'SYNCING' | 'FAILED';

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  COMPLETED: 'Hoàn tất',
  PARTIAL: 'Gián đoạn',
  SYNCING: 'Đang đồng bộ',
  FAILED: 'Thất bại',
};

/** Bước bị lỗi trong phiên (nếu có) */
export type SyncFailedStep = 'HANDSHAKE' | 'BULK';

/**
 * 1 bản ghi cảm biến UAV thu gom khi bay — cấu trúc giống hệt phần tử trong mảng "records"
 * của gói Bulk mẫu trong báo cáo LTJ-25 (timestamp là epoch giây).
 */
export interface SyncRecord {
  deviceId: string;
  farmId: number;
  zoneId: number;
  temperature: number;
  humidity: number;
  soilMoisture: number;
  light: number;
  status: 'NORMAL' | 'WARNING';
  timestamp: number;
}

/** Một phiên đồng bộ dữ liệu Offline (SQLite → MQTT) của UAV */
export interface UavSyncSession {
  id: number;
  syncSessionId: string;         // VD: SYNC-UAV-001-1793705190
  uavId: string;
  uavName: string;
  zoneId: number;
  zoneName: string;
  flightStartTime: string;       // ISO — lúc UAV cất cánh thu thập dữ liệu
  flightEndTime: string;         // ISO — lúc UAV về trạm
  flightDurationSeconds: number;
  totalRecords: number;          // Tổng bản ghi lưu trong SQLite iot_offline.db
  syncedRecords: number;         // Số bản ghi đã gửi thành công (is_synced = 1)
  batchSize: number;
  batchCount: number;            // Tổng số lô cần gửi = ceil(total / batchSize)
  status: SyncStatus;
  handshakeAt: string | null;    // Thời điểm gửi Handshake thành công
  lastBatchAt: string | null;    // Thời điểm gửi lô gần nhất
  completedAt: string | null;    // Thời điểm báo hoàn tất phiên
  failedStep: SyncFailedStep | null;
  errorMessage: string | null;
  records: SyncRecord[];
}

/** Gói Bulk JSON gửi lên topic iot/ltj/sync/bulk (định dạng LTJ-25) */
export interface BulkPayload {
  syncSessionId: string;
  uavId: string;
  totalRecords: number;
  records: SyncRecord[];
}

/** Bộ lọc bảng lịch sử Sync */
export interface SyncFilter {
  uavId: string;               // 'ALL' hoặc mã UAV
  status: SyncStatus | 'ALL';
  search: string;
}

/** Thống kê tổng hợp cho 4 thẻ KPI */
export interface SyncStats {
  totalSessions: number;
  totalRecords: number;
  syncedRecords: number;
  pendingRecords: number;
  successRate: number;         // % bản ghi đã đồng bộ / tổng bản ghi
  avgFlightSeconds: number;
}

