/**
 * Analytics Service — Lấy dữ liệu So sánh 2 Zone (F07) & Lịch sử Sync UAV
 * Task: LTJ-24 - Sprint 5
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Cơ chế Hybrid giống api.ts:
 * 1. So sánh Zone: gọi API thật của Dev 1 (LTJ-16)
 *      GET /sensor-data/history/paged?zoneId=&start=&end=&page=0&size=1000
 *    rồi lọc theo loại cảm biến, gom nhóm theo giờ/ngày và tính trung bình.
 *    Nếu Backend tắt / lỗi / không có dữ liệu → sinh dữ liệu mô phỏng có seed cố định.
 * 2. Lịch sử Sync UAV: gọi endpoint dự kiến GET /uav-sync/sessions (chờ Dev 2 - LTJ-22).
 *    Khi chưa có → sinh lịch sử mô phỏng khớp đúng luồng đồng bộ của Dev 5 (LTJ-25).
 */

import { apiRequest } from './api';
import type { UAV } from '../types';
import type {
  ComparisonMetric,
  TimeRangePreset,
  ZoneTimeSeriesPoint,
  SeriesStats,
  ZoneSeries,
  ZoneOption,
  UavSyncSession,
  SyncRecord,
  BulkPayload,
  SyncStatus,
  SyncFailedStep,
} from '../types/analytics';
import { METRIC_CONFIG, SYNC_BATCH_SIZE } from '../types/analytics';

// ==================== TIỆN ÍCH CHUNG ====================

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/**
 * Bộ sinh số giả ngẫu nhiên có seed (thuật toán Mulberry32).
 * Cùng seed → cùng dãy số → biểu đồ ổn định, không nhảy số khi re-render.
 */
export function createSeededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Làm tròn theo số chữ số thập phân */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/** Định dạng LocalDateTime cho Spring Boot (không có hậu tố Z): yyyy-MM-ddTHH:mm:ss */
function toLocalDateTimeParam(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ==================== PHẦN 1: SO SÁNH 2 ZONE ====================

interface BucketPlan {
  start: Date;      // Mốc bắt đầu của khung đầu tiên
  bucketMs: number; // Độ dài 1 khung
  count: number;    // Số khung
  hourly: boolean;
}

/**
 * Chia khung thời gian:
 * - 24H → 24 khung 1 giờ, khung cuối là giờ hiện tại.
 * - 7D  → 7 khung 1 ngày, khung cuối là hôm nay.
 * - 30D → 30 khung 1 ngày.
 */
export function buildBucketPlan(range: TimeRangePreset, now: Date = new Date()): BucketPlan {
  if (range === '24H') {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    return { start: new Date(end.getTime() - 23 * HOUR_MS), bucketMs: HOUR_MS, count: 24, hourly: true };
  }
  const days = range === '7D' ? 7 : 30;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return { start: new Date(today.getTime() - (days - 1) * DAY_MS), bucketMs: DAY_MS, count: days, hourly: false };
}

function formatBucketLabel(d: Date, hourly: boolean): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return hourly ? `${p(d.getHours())}:00` : `${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

/** Tính thống kê, bỏ qua các điểm null (khung không có số đo) */
export function computeSeriesStats(points: ZoneTimeSeriesPoint[], decimals: number): SeriesStats {
  const values = points.map(p => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, latest: 0, count: 0 };
  }
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: roundTo(sum / values.length, decimals),
    min: roundTo(Math.min(...values), decimals),
    max: roundTo(Math.max(...values), decimals),
    latest: roundTo(values[values.length - 1], decimals),
    count: values.length,
  };
}

/**
 * Hồ sơ đặc trưng của từng Zone để dữ liệu mô phỏng có sự khác biệt hợp lý.
 * (Zone 3 là nhà kính: nóng hơn, CO₂ cao hơn, ánh sáng bị che bớt...)
 */
const ZONE_PROFILE: Record<number, Record<ComparisonMetric, number>> = {
  1: { temperature: 0,    airHumidity: 0,  soilMoisture: 0,   light: 1.0,  co2: 0 },
  2: { temperature: -1.5, airHumidity: 5,  soilMoisture: 8,   light: 0.85, co2: -30 },
  3: { temperature: 2.5,  airHumidity: -6, soilMoisture: -10, light: 0.6,  co2: 180 },
  4: { temperature: 1.0,  airHumidity: -2, soilMoisture: -4,  light: 1.1,  co2: 40 },
  5: { temperature: -0.8, airHumidity: 3,  soilMoisture: 5,   light: 0.75, co2: 90 },
};

const METRIC_INDEX: Record<ComparisonMetric, number> = {
  temperature: 1, airHumidity: 2, soilMoisture: 3, light: 4, co2: 5,
};

/** Giá trị mô phỏng của 1 chỉ số tại 1 giờ trong ngày (có dao động ngày/đêm) */
function simulateValue(metric: ComparisonMetric, zoneId: number, hour: number, rand: () => number, hourly: boolean): number {
  const profile = ZONE_PROFILE[zoneId] ?? ZONE_PROFILE[((zoneId - 1) % 5) + 1];
  // Dao động ngày/đêm: đỉnh lúc 14h, đáy lúc 2h (chỉ áp dụng khi xem theo giờ)
  const diurnal = hourly ? Math.sin((2 * Math.PI * (hour - 8)) / 24) : 0;
  const noise = (rand() - 0.5) * 2; // [-1, 1]

  switch (metric) {
    case 'temperature':
      return 27 + profile.temperature + diurnal * 4 + noise * (hourly ? 0.8 : 1.2);
    case 'airHumidity':
      return Math.min(98, Math.max(25, 70 + profile.airHumidity - diurnal * 8 + noise * 2.5));
    case 'soilMoisture':
      return Math.min(95, Math.max(10, 55 + profile.soilMoisture - diurnal * 2 + noise * 2.5));
    case 'light': {
      if (!hourly) {
        // Trung bình cả ngày (gồm cả ban đêm) ≈ 30–35% mức đỉnh
        return Math.max(0, 14000 * profile.light + noise * 1500);
      }
      const daylight = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12)); // 6h → 18h
      return Math.max(0, daylight * 42000 * profile.light + (daylight > 0 ? noise * 1800 : 0));
    }
    case 'co2':
      return Math.max(350, 650 + profile.co2 - diurnal * 80 + noise * 25);
  }
}

/** Sinh chuỗi mô phỏng có seed cố định theo (zone, chỉ số, khung thời gian) */
export function generateMockZoneSeries(
  zoneId: number,
  zoneName: string,
  metric: ComparisonMetric,
  range: TimeRangePreset,
  now: Date = new Date(),
): ZoneSeries {
  const plan = buildBucketPlan(range, now);
  const rangeIndex = range === '24H' ? 1 : range === '7D' ? 2 : 3;
  const rand = createSeededRandom(zoneId * 1000 + METRIC_INDEX[metric] * 100 + rangeIndex);
  const { decimals } = METRIC_CONFIG[metric];

  const points: ZoneTimeSeriesPoint[] = Array.from({ length: plan.count }, (_, i) => {
    const t = new Date(plan.start.getTime() + i * plan.bucketMs);
    return {
      timestamp: t.toISOString(),
      label: formatBucketLabel(t, plan.hourly),
      value: roundTo(simulateValue(metric, zoneId, t.getHours(), rand, plan.hourly), decimals),
    };
  });

  return { zoneId, zoneName, metric, timeRange: range, points, stats: computeSeriesStats(points, decimals), source: 'MOCK' };
}

/** DTO trả về từ Backend (SensorDataResponse.java) — chỉ lấy các trường cần dùng */
interface SensorDataRow {
  sensorType: string;
  zoneId: number;
  value: number;
  recordedAt: string;
}

interface PagedRows {
  content: SensorDataRow[];
}

/** Gom nhóm các bản ghi Backend vào từng khung và lấy trung bình */
export function bucketizeRows(rows: SensorDataRow[], plan: BucketPlan, decimals: number): ZoneTimeSeriesPoint[] {
  const sums = new Array<number>(plan.count).fill(0);
  const counts = new Array<number>(plan.count).fill(0);
  const startMs = plan.start.getTime();

  for (const row of rows) {
    const t = new Date(row.recordedAt).getTime();
    if (Number.isNaN(t) || typeof row.value !== 'number') continue;
    const idx = Math.floor((t - startMs) / plan.bucketMs);
    if (idx < 0 || idx >= plan.count) continue;
    sums[idx] += row.value;
    counts[idx] += 1;
  }

  return sums.map((sum, i) => {
    const t = new Date(startMs + i * plan.bucketMs);
    return {
      timestamp: t.toISOString(),
      label: formatBucketLabel(t, plan.hourly),
      value: counts[i] > 0 ? roundTo(sum / counts[i], decimals) : null,
    };
  });
}

/**
 * Lấy chuỗi dữ liệu của 1 Zone: ưu tiên Backend thật, tự động fallback sang mô phỏng.
 */
export async function fetchZoneSeries(
  zone: ZoneOption,
  metric: ComparisonMetric,
  range: TimeRangePreset,
): Promise<ZoneSeries> {
  const now = new Date();
  const plan = buildBucketPlan(range, now);
  const { decimals, sensorType } = METRIC_CONFIG[metric];
  const end = new Date(plan.start.getTime() + plan.count * plan.bucketMs);

  try {
    const query = new URLSearchParams({
      zoneId: String(zone.id),
      start: toLocalDateTimeParam(plan.start),
      end: toLocalDateTimeParam(end),
      page: '0',
      size: '1000',
    });
    const res = await apiRequest<PagedRows>(`/sensor-data/history/paged?${query.toString()}`);
    const rows = (res.data?.content ?? []).filter(r => r.sensorType === sensorType);
    if (rows.length === 0) throw new Error('Zone chưa có dữ liệu lịch sử cho chỉ số này');

    const points = bucketizeRows(rows, plan, decimals);
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      metric,
      timeRange: range,
      points,
      stats: computeSeriesStats(points, decimals),
      source: 'API',
    };
  } catch {
    return generateMockZoneSeries(zone.id, zone.name, metric, range, now);
  }
}

// ==================== PHẦN 2: LỊCH SỬ SYNC UAV ====================

/** Sinh mảng bản ghi cảm biến UAV thu gom trong 1 chuyến bay (định dạng LTJ-25) */
export function generateSyncRecords(
  zoneId: number,
  count: number,
  flightStartMs: number,
  flightDurationSeconds: number,
  seed: number,
): SyncRecord[] {
  const rand = createSeededRandom(seed);
  const step = count > 1 ? flightDurationSeconds / (count - 1) : 0;
  return Array.from({ length: count }, (_, i) => {
    const temperature = roundTo(25 + (ZONE_PROFILE[zoneId]?.temperature ?? 0) + rand() * 6, 1);
    const humidity = roundTo(60 + rand() * 20, 1);
    const soilMoisture = roundTo(45 + rand() * 25, 1);
    const light = roundTo(300 + rand() * 600, 0);
    const warning = temperature > 32 || soilMoisture < 48;
    return {
      deviceId: `DEV-Z${zoneId}-${String((i % 3) + 1).padStart(3, '0')}`,
      farmId: zoneId <= 3 ? 1 : 2,
      zoneId,
      temperature,
      humidity,
      soilMoisture,
      light,
      status: warning ? 'WARNING' : 'NORMAL',
      timestamp: Math.floor((flightStartMs + i * step * 1000) / 1000),
    };
  });
}

/** Mã phiên đồng bộ — cùng quy tắc với Dev 5: SYNC-{uavId}-{epochSeconds} */
export function buildSyncSessionId(uavId: string, at: Date): string {
  return `SYNC-${uavId}-${Math.floor(at.getTime() / 1000)}`;
}

interface SessionSeed {
  id: number;
  uav: { id: string; name: string };
  zone: ZoneOption;
  flightStart: Date;
  flightDurationSeconds: number;
  totalRecords: number;
  outcome: SyncStatus;
  syncedRecords: number;
  failedStep: SyncFailedStep | null;
  errorMessage: string | null;
}

/** Dựng 1 phiên đồng bộ hoàn chỉnh từ thông số đầu vào */
export function buildSyncSession(seed: SessionSeed): UavSyncSession {
  const flightEnd = new Date(seed.flightStart.getTime() + seed.flightDurationSeconds * 1000);
  // UAV về trạm, kết nối lại mạng sau ~2 phút → bắt đầu Handshake
  const handshake = new Date(flightEnd.getTime() + 2 * 60_000);
  const sentBatches = Math.ceil(seed.syncedRecords / SYNC_BATCH_SIZE);
  const lastBatch = sentBatches > 0 ? new Date(handshake.getTime() + sentBatches * 1500) : null;
  const handshakeOk = seed.failedStep !== 'HANDSHAKE';

  return {
    id: seed.id,
    syncSessionId: buildSyncSessionId(seed.uav.id, handshake),
    uavId: seed.uav.id,
    uavName: seed.uav.name,
    zoneId: seed.zone.id,
    zoneName: seed.zone.name,
    flightStartTime: seed.flightStart.toISOString(),
    flightEndTime: flightEnd.toISOString(),
    flightDurationSeconds: seed.flightDurationSeconds,
    totalRecords: seed.totalRecords,
    syncedRecords: seed.syncedRecords,
    batchSize: SYNC_BATCH_SIZE,
    batchCount: Math.ceil(seed.totalRecords / SYNC_BATCH_SIZE),
    status: seed.outcome,
    handshakeAt: handshakeOk ? handshake.toISOString() : null,
    lastBatchAt: lastBatch ? lastBatch.toISOString() : null,
    completedAt: seed.outcome === 'COMPLETED' && lastBatch ? new Date(lastBatch.getTime() + 500).toISOString() : null,
    failedStep: seed.failedStep,
    errorMessage: seed.errorMessage,
    records: generateSyncRecords(seed.zone.id, seed.totalRecords, seed.flightStart.getTime(), seed.flightDurationSeconds, seed.id * 7919),
  };
}

/**
 * Sinh lịch sử mô phỏng 10 phiên trong 7 ngày gần nhất.
 * Có đủ 3 kịch bản giống bộ test của Dev 5:
 * - Đồng bộ thành công 100% (COMPLETED)
 * - Rớt mạng giữa chừng: gửi được 1 lô rồi mất kết nối (PARTIAL — test rotMangGiuaChungKhongMatDuLieu)
 * - Không bắt tay được với Backend (FAILED)
 */
export function generateMockSyncHistory(uavs: Pick<UAV, 'id' | 'name'>[], zones: ZoneOption[], now: Date = new Date()): UavSyncSession[] {
  if (uavs.length === 0 || zones.length === 0) return [];
  const rand = createSeededRandom(20261105);

  const outcomes: SyncStatus[] = [
    'COMPLETED', 'COMPLETED', 'PARTIAL', 'COMPLETED', 'COMPLETED',
    'FAILED', 'COMPLETED', 'COMPLETED', 'PARTIAL', 'COMPLETED',
  ];

  return outcomes.map((outcome, i) => {
    const uav = uavs[i % uavs.length];
    const zone = zones[(i * 2) % zones.length];
    // Phiên mới nhất ở đầu: cách nhau ~16 giờ
    const flightStart = new Date(now.getTime() - (i * 16 + 3) * HOUR_MS - Math.floor(rand() * 40) * 60_000);
    const flightDurationSeconds = 600 + Math.floor(rand() * 1500); // 10–35 phút
    const totalRecords = 15 + Math.floor(rand() * 46);              // 15–60 bản ghi

    let syncedRecords = totalRecords;
    let failedStep: SyncFailedStep | null = null;
    let errorMessage: string | null = null;

    if (outcome === 'PARTIAL') {
      syncedRecords = SYNC_BATCH_SIZE; // gửi được đúng 1 lô
      failedStep = 'BULK';
      errorMessage = `Mất kết nối MQTT sau lô 1 — còn ${totalRecords - SYNC_BATCH_SIZE} bản ghi lưu trong SQLite (is_synced = 0), sẽ tự gửi lại ở chu kỳ sau.`;
    } else if (outcome === 'FAILED') {
      syncedRecords = 0;
      failedStep = 'HANDSHAKE';
      errorMessage = `Không nhận được phản hồi từ topic handshake (timeout 10s) — toàn bộ ${totalRecords} bản ghi vẫn an toàn trong SQLite.`;
    }

    return buildSyncSession({
      id: outcomes.length - i,
      uav,
      zone,
      flightStart,
      flightDurationSeconds,
      totalRecords,
      outcome,
      syncedRecords,
      failedStep,
      errorMessage,
    });
  });
}

/**
 * Lấy lịch sử Sync: thử endpoint dự kiến của Dev 2 (LTJ-22) trước,
 * chưa có thì sinh dữ liệu mô phỏng từ danh sách UAV & Zone hiện có trong hệ thống.
 */
export async function fetchUavSyncHistory(
  uavs: Pick<UAV, 'id' | 'name'>[],
  zones: ZoneOption[],
): Promise<{ sessions: UavSyncSession[]; source: 'API' | 'MOCK' }> {
  try {
    const res = await apiRequest<UavSyncSession[]>('/uav-sync/sessions');
    if (Array.isArray(res.data) && res.data.length > 0) {
      return { sessions: res.data, source: 'API' };
    }
    throw new Error('Chưa có dữ liệu Sync trên Backend');
  } catch {
    return { sessions: generateMockSyncHistory(uavs, zones), source: 'MOCK' };
  }
}

/** Dựng gói Bulk của 1 lô (mặc định lô đầu tiên) để hiển thị trong Modal chi tiết */
export function buildBulkPayload(session: UavSyncSession, batchIndex = 0): BulkPayload {
  const from = batchIndex * session.batchSize;
  const records = session.records.slice(from, from + session.batchSize);
  return {
    syncSessionId: session.syncSessionId,
    uavId: session.uavId,
    totalRecords: records.length,
    records,
  };
}

/** Định dạng thời lượng giây → "25 phút 08 giây" */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m} phút ${String(s).padStart(2, '0')} giây`;
}

