/**
 * Flight Monitor & Mission Note Service — Hybrid REST API + Waypoint Interpolation Engine
 * Task: LTJ-34 - Sprint 7
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * Chức năng chính:
 * 1. Giao tiếp REST API với Backend (/api/missions, /api/v1/missions/...) kèm cơ chế Hybrid Fallback.
 * 2. Thuật toán Nội suy Tuyến tính (Linear Interpolation) tọa độ GPS giữa các Waypoints (khớp LTJ-35)
 *    và tính góc phương vị mũi bay (Forward Azimuth / Bearing) theo công thức lượng giác cầu.
 * 3. Quản lý CRUD & lưu trữ bền vững (localStorage) cho danh sách Ghi chú Nhiệm vụ thủ công (Note Mission - F16).
 */

import type {
  FlightMonitorStatus,
  FlightWaypointNode,
  MissionNote,
  MissionNoteDraft,
  UavFlightSession,
} from '../types/flightMonitor';
import { API_BASE_URL } from '../config/apiConfig';

const MISSION_API_URL = `${API_BASE_URL}/missions`;
const SESSIONS_STORAGE_KEY = 'smartfarm_flight_sessions_v5';
const NOTES_STORAGE_KEY = 'smartfarm_mission_notes_v1';

/** Đọc JWT theo đúng key mà authService lưu khi đăng nhập */
function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

/**
 * Gọi REST API kèm JWT + timeout, ném lỗi nếu HTTP 4xx/5xx để caller rơi về Hybrid Fallback
 * (không bao giờ parse JSON của response lỗi).
 */
async function missionApiRequest(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  timeoutMs = 2500,
): Promise<Response> {
  const token = getAccessToken();
  const response = await fetch(url, {
    method: init.method ?? 'GET',
    body: init.body,
    headers: {
      Accept: 'application/json',
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} khi gọi ${url}`);
  }
  return response;
}

/** Trừ pin và giữ 1 chữ số thập phân (tránh sai số dấu phẩy động & pin đứng im) */
function drainBattery(current: number, amount: number, floor: number): number {
  return Math.max(floor, Number((current - amount).toFixed(1)));
}

/** Nội suy tuyến tính một giá trị vô hướng (altitude, speed...) */
function lerpScalar(from: number, to: number, alpha: number): number {
  const t = Math.max(0, Math.min(1, alpha));
  return from + t * (to - from);
}

// ==================== 1. CÔNG THỨC TOÁN HỌC ĐỊA LÝ & NỘI SUY ĐƯỜNG BAY ====================

/**
 * Tính khoảng cách mặt cầu Haversine giữa 2 tọa độ GPS (đơn vị: mét)
 */
export function calculateHaversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rawA =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  // Kẹp a vào [0, 1] để sai số dấu phẩy động không làm Math.sqrt(1 - a) trả về NaN
  const a = Math.min(1, Math.max(0, rawA));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Tính góc phương vị mũi bay (Bearing / Heading: 0° -> 360°) từ điểm A đến điểm B
 */
export function calculateBearingDeg(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return Math.round((toDeg(theta) + 360) % 360);
}

/**
 * Nội suy tuyến tính tọa độ GPS giữa 2 điểm Waypoint theo hệ số alpha in [0, 1] (Khớp LTJ-35)
 */
export function interpolateCoordinate(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  alpha: number,
): { latitude: number; longitude: number } {
  const clamped = Math.max(0, Math.min(1, alpha));
  return {
    latitude: Number((lat1 + clamped * (lat2 - lat1)).toFixed(6)),
    longitude: Number((lng1 + clamped * (lng2 - lng1)).toFixed(6)),
  };
}

/**
 * Định dạng thời gian giây sang chuỗi mm:ss
 */
export function formatFlightTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ==================== 2. DỮ LIỆU MẶC ĐỊNH (SEED FLIGHT SESSIONS & MISSION NOTES) ====================

const INITIAL_FLIGHT_SESSIONS: UavFlightSession[] = [
  {
    missionId: 701,
    missionCode: 'MSN-2026-071',
    missionName: 'Tuần tra & Thu thập Viễn trắc Khu A (Ca sáng)',
    uavId: 'UAV-001',
    uavName: 'UAV Trinh sát 01',
    uavModel: 'DJI Matrice 300 RTK',
    zoneId: 1,
    zoneName: 'Khu A - Nhà Kính Cà Chua Công Nghệ Cao',
    status: 'FLYING',
    batteryPercent: 84,
    batteryVoltageV: 50.8,
    batteryTempC: 34.2,
    signalStrength: 96,
    altitudeM: 48,
    speedMs: 8.5,
    headingDeg: 58,
    satellites: 18,
    latitude: 11.9396,
    longitude: 108.4662,
    homeLatitude: 11.9389,
    homeLongitude: 108.4654,
    currentWaypointOrder: 3,
    completedWaypoints: 2,
    totalWaypoints: 5,
    segmentProgress: 0.45,
    progressPercent: 52,
    distanceTraveledM: 490,
    totalRouteDistanceM: 940,
    elapsedSeconds: 85,
    estimatedRemainingSeconds: 75,
    packetsCollected: 142,
    packetErrors: 0,
    errorReason: null,
    startedAt: '2026-11-13T08:15:00.000Z',
    lastTelemetryAt: new Date().toISOString(),
    waypoints: [
      {
        order: 1,
        label: 'WP-01 • Trạm Xuất phát Khu A (Takeoff)',
        latitude: 11.9389,
        longitude: 108.4654,
        altitudeM: 30,
        targetSpeedMs: 8,
        visitState: 'COMPLETED',
        reachedAt: '08:15:20',
        collectedPackets: 45,
        errorPackets: 0,
      },
      {
        order: 2,
        label: 'WP-02 • Cụm Cảm biến Nhiệt độ Bắc Khu A',
        latitude: 11.9402,
        longitude: 108.4658,
        altitudeM: 48,
        targetSpeedMs: 8.5,
        visitState: 'COMPLETED',
        reachedAt: '08:16:45',
        collectedPackets: 62,
        errorPackets: 0,
      },
      {
        order: 3,
        label: 'WP-03 • Trung tâm Nhà kính (Hover)',
        latitude: 11.9401,
        longitude: 108.4676,
        altitudeM: 50,
        targetSpeedMs: 8.5,
        visitState: 'ACTIVE',
        reachedAt: null,
        collectedPackets: 35,
        errorPackets: 0,
      },
      {
        order: 4,
        label: 'WP-04 • Trạm Bơm Tưới Đông Bắc',
        latitude: 11.9392,
        longitude: 108.4678,
        altitudeM: 45,
        targetSpeedMs: 8,
        visitState: 'PENDING',
        reachedAt: null,
        collectedPackets: 0,
        errorPackets: 0,
      },
      {
        order: 5,
        label: 'WP-05 • Bãi đáp Gateway Khu A (Landing)',
        latitude: 11.9390,
        longitude: 108.4664,
        altitudeM: 20,
        targetSpeedMs: 5,
        visitState: 'PENDING',
        reachedAt: null,
        collectedPackets: 0,
        errorPackets: 0,
      },
    ],
  },
  {
    missionId: 702,
    missionCode: 'MSN-2026-072',
    missionName: 'Quét Độ ẩm đất & Mực nước Cánh đồng Khu B',
    uavId: 'UAV-002',
    uavName: 'UAV Giám sát 02',
    uavModel: 'DJI Matrice 30T',
    zoneId: 2,
    zoneName: 'Khu B - Cánh Đồng Rau Thủy Canh',
    status: 'RETURNING',
    batteryPercent: 26,
    batteryVoltageV: 45.1,
    batteryTempC: 38.6,
    signalStrength: 82,
    altitudeM: 50,
    speedMs: 9.5,
    headingDeg: 238,
    satellites: 16,
    latitude: 11.9378,
    longitude: 108.4668,
    homeLatitude: 11.9374,
    homeLongitude: 108.4654,
    currentWaypointOrder: 4,
    completedWaypoints: 3,
    totalWaypoints: 4,
    segmentProgress: 0.6,
    progressPercent: 82,
    distanceTraveledM: 640,
    totalRouteDistanceM: 780,
    elapsedSeconds: 110,
    estimatedRemainingSeconds: 35,
    packetsCollected: 218,
    packetErrors: 1,
    errorReason: null,
    startedAt: '2026-11-13T08:05:00.000Z',
    lastTelemetryAt: new Date().toISOString(),
    waypoints: [
      {
        order: 1,
        label: 'WP-01 • Trạm Gateway Khu B (Takeoff)',
        latitude: 11.9374,
        longitude: 108.4654,
        altitudeM: 35,
        targetSpeedMs: 9,
        visitState: 'COMPLETED',
        reachedAt: '08:05:30',
        collectedPackets: 64,
        errorPackets: 0,
      },
      {
        order: 2,
        label: 'WP-02 • Cảm biến Độ ẩm đất Giữa Thung lũng',
        latitude: 11.9383,
        longitude: 108.4658,
        altitudeM: 50,
        targetSpeedMs: 9.5,
        visitState: 'COMPLETED',
        reachedAt: '08:07:15',
        collectedPackets: 78,
        errorPackets: 0,
      },
      {
        order: 3,
        label: 'WP-03 • Trạm Quan trắc Đông Khu B',
        latitude: 11.9382,
        longitude: 108.4676,
        altitudeM: 55,
        targetSpeedMs: 9.5,
        visitState: 'COMPLETED',
        reachedAt: '08:09:10',
        collectedPackets: 76,
        errorPackets: 1,
      },
      {
        order: 4,
        label: 'WP-04 • Bãi thu hồi Nam Khu B (Landing)',
        latitude: 11.9373,
        longitude: 108.4673,
        altitudeM: 25,
        targetSpeedMs: 6,
        visitState: 'ACTIVE',
        reachedAt: null,
        collectedPackets: 0,
        errorPackets: 0,
      },
    ],
  },
  {
    missionId: 703,
    missionCode: 'MSN-2026-073',
    missionName: 'Đồng bộ Dữ liệu Offline Vườn Cây Ăn Quả Khu C',
    uavId: 'UAV-003',
    uavName: 'UAV Tuần tra 03',
    uavModel: 'Autel EVO II Dual 640T',
    zoneId: 3,
    zoneName: 'Khu C - Vườn Cây Ăn Quả Đặc Sản',
    status: 'COLLECTION_ERROR',
    batteryPercent: 58,
    batteryVoltageV: 47.4,
    batteryTempC: 36.9,
    signalStrength: 46,
    altitudeM: 42,
    speedMs: 0.4,
    headingDeg: 112,
    satellites: 11,
    latitude: 11.9364,
    longitude: 108.4659,
    homeLatitude: 11.9352,
    homeLongitude: 108.4655,
    currentWaypointOrder: 2,
    completedWaypoints: 1,
    totalWaypoints: 4,
    segmentProgress: 0.35,
    progressPercent: 35,
    distanceTraveledM: 260,
    totalRouteDistanceM: 760,
    elapsedSeconds: 90,
    estimatedRemainingSeconds: 110,
    packetsCollected: 54,
    packetErrors: 14,
    errorReason:
      'Mất phản hồi ACK từ nút cảm biến DEV-Z3-001-SOIL (CRC Checksum Mismatch & RSSI suy hao xuống 46%)',
    startedAt: '2026-11-13T08:12:00.000Z',
    lastTelemetryAt: new Date().toISOString(),
    waypoints: [
      {
        order: 1,
        label: 'WP-01 • Bãi phóng Khu C (Takeoff)',
        latitude: 11.9352,
        longitude: 108.4655,
        altitudeM: 30,
        targetSpeedMs: 7,
        visitState: 'COMPLETED',
        reachedAt: '08:12:25',
        collectedPackets: 42,
        errorPackets: 0,
      },
      {
        order: 2,
        label: 'WP-02 • Cụm Cảm biến Độ ẩm đất Khu C',
        latitude: 11.9365,
        longitude: 108.4659,
        altitudeM: 42,
        targetSpeedMs: 7.5,
        visitState: 'ERROR',
        reachedAt: '08:14:30',
        collectedPackets: 12,
        errorPackets: 14,
      },
      {
        order: 3,
        label: 'WP-03 • Vườn Cây Ăn Quả Đông Nam',
        latitude: 11.9364,
        longitude: 108.4678,
        altitudeM: 50,
        targetSpeedMs: 7.5,
        visitState: 'PENDING',
        reachedAt: null,
        collectedPackets: 0,
        errorPackets: 0,
      },
      {
        order: 4,
        label: 'WP-04 • Trạm Thu hồi Khu C (Landing)',
        latitude: 11.9353,
        longitude: 108.4676,
        altitudeM: 25,
        targetSpeedMs: 5,
        visitState: 'PENDING',
        reachedAt: null,
        collectedPackets: 0,
        errorPackets: 0,
      },
    ],
  },
];

const INITIAL_MISSION_NOTES: MissionNote[] = [
  {
    id: 9001,
    missionId: 703,
    missionCode: 'MSN-2026-073',
    missionName: 'Đồng bộ Dữ liệu Offline Vườn Cây Ăn Quả Khu C',
    uavId: 'UAV-003',
    uavName: 'UAV Tuần tra 03',
    zoneId: 3,
    zoneName: 'Khu C - Vườn Cây Ăn Quả Đặc Sản',
    category: 'INCIDENT',
    priority: 'URGENT',
    title: 'Phát hiện lỗi thu thập gói tin cảm biến tại Waypoint #2 (Khu C)',
    content:
      'UAV-003 báo trạng thái "Thu thập lỗi" tại tọa độ (11.9334, 108.4625) do tán cây rậm làm suy hao RSSI xuống 46% và lỗi CRC 14 gói tin từ nút DEV-Z3-001-SOIL. Đã giữ UAV bay treo ở độ cao 42m để kích hoạt cơ chế truyền lại (Retry).',
    author: 'Nguyễn Trường An (Operator Ca 1)',
    waypointOrder: 2,
    latitude: 11.9334,
    longitude: 108.4625,
    batteryAtNote: 58,
    flightStatusAtNote: 'COLLECTION_ERROR',
    isPinned: true,
    createdAt: '2026-11-13T08:16:30.000Z',
    updatedAt: '2026-11-13T08:16:30.000Z',
  },
  {
    id: 9002,
    missionId: 702,
    missionCode: 'MSN-2026-072',
    missionName: 'Quét Độ ẩm đất & Mực nước Cánh đồng Khu B',
    uavId: 'UAV-002',
    uavName: 'UAV Giám sát 02',
    zoneId: 2,
    zoneName: 'Khu B - Cánh Đồng Lúa Chất Lượng Cao',
    category: 'BATTERY_LOG',
    priority: 'IMPORTANT',
    title: 'Kích hoạt chế độ Về trạm (RTH) khi pin chạm ngưỡng 26%',
    content:
      'Sau khi hoàn thành thu thập 218 gói dữ liệu qua 3/4 Waypoint tại Khu B, dung lượng pin UAV-002 giảm còn 26% (45.1V). Đã xác nhận chuyển trạng thái sang "Về trạm" ở độ cao an toàn 60m.',
    author: 'Nguyễn Trường An (Operator Ca 1)',
    waypointOrder: 4,
    latitude: 11.9374,
    longitude: 108.4555,
    batteryAtNote: 26,
    flightStatusAtNote: 'RETURNING',
    isPinned: true,
    createdAt: '2026-11-13T08:19:10.000Z',
    updatedAt: '2026-11-13T08:19:10.000Z',
  },
  {
    id: 9003,
    missionId: 701,
    missionCode: 'MSN-2026-071',
    missionName: 'Tuần tra & Thu thập Viễn trắc Khu A (Ca sáng)',
    uavId: 'UAV-001',
    uavName: 'UAV Trinh sát 01',
    zoneId: 1,
    zoneName: 'Khu A - Nhà Kính Cà Chua Công Nghệ Cao',
    category: 'OBSERVATION',
    priority: 'NORMAL',
    title: 'UAV-001 bay ổn định qua Waypoint #2, tín hiệu RSSI đạt 96%',
    content:
      'Đường truyền MQTT và Telemetry ổn định 100%, đã thu thập thành công 142 bản ghi nhiệt độ & độ ẩm từ cụm cảm biến Bắc Khu A mà không phát sinh gói lỗi.',
    author: 'Nguyễn Trường An (Operator Ca 1)',
    waypointOrder: 2,
    latitude: 11.9416,
    longitude: 108.4595,
    batteryAtNote: 84,
    flightStatusAtNote: 'FLYING',
    isPinned: false,
    createdAt: '2026-11-13T08:21:00.000Z',
    updatedAt: '2026-11-13T08:21:00.000Z',
  },
  {
    id: 9004,
    missionId: 701,
    missionCode: 'MSN-2026-071',
    missionName: 'Tuần tra & Thu thập Viễn trắc Khu A (Ca sáng)',
    uavId: 'UAV-001',
    uavName: 'UAV Trinh sát 01',
    zoneId: 1,
    zoneName: 'Khu A - Nhà Kính Cà Chua Công Nghệ Cao',
    category: 'WEATHER',
    priority: 'NORMAL',
    title: 'Ghi nhận sương nhẹ buổi sáng tại phân khu nhà kính A2',
    content:
      'Tầm nhìn quang học tốt, gió nhẹ 2.4 m/s hướng Đông Bắc. Không ảnh hưởng đến tốc độ hành trình 8.5 m/s của DJI Matrice 300 RTK.',
    author: 'Trần (QA / Kiểm thử thực địa)',
    waypointOrder: 3,
    latitude: 11.9422,
    longitude: 108.4601,
    batteryAtNote: 85,
    flightStatusAtNote: 'FLYING',
    isPinned: false,
    createdAt: '2026-11-13T08:22:45.000Z',
    updatedAt: '2026-11-13T08:22:45.000Z',
  },
];

// ==================== 3. LOCAL STORAGE HELPERS ====================

export function loadStoredSessions(): UavFlightSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UavFlightSession[];
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (s) =>
            s.uavId !== 'UAV-004' &&
            s.latitude >= 11.934 &&
            s.zoneId >= 1 &&
            s.zoneId <= 3 &&
            s.waypoints.every((w) => w.longitude >= 108.4645),
        )
      ) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial sessions
  }
  localStorage.setItem(
    SESSIONS_STORAGE_KEY,
    JSON.stringify(INITIAL_FLIGHT_SESSIONS),
  );
  return INITIAL_FLIGHT_SESSIONS;
}

export function saveStoredSessions(sessions: UavFlightSession[]): void {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota errors
  }
}

export interface PlannedMissionSyncPayload {
  uavId: string;
  uavName?: string;
  uavModel?: string;
  missionName: string;
  zoneId: number;
  totalDistanceM: number;
  estimatedTimeSeconds: number;
  backendMissionId?: number;
  waypoints: Array<{
    order: number;
    latitude: number;
    longitude: number;
    altitude: number;
    speed: number;
    type: string;
  }>;
}

const MONITOR_ZONE_NAMES: Record<number, string> = {
  1: 'Khu A - Nhà Kính Cà Chua Công Nghệ Cao',
  2: 'Khu B - Cánh Đồng Rau Thủy Canh',
  3: 'Khu C - Vườn Cây Ăn Quả Đặc Sản',
};

export function upsertPlannedRouteIntoSessions(
  currentSessions: UavFlightSession[],
  payload: PlannedMissionSyncPayload,
): UavFlightSession[] {
  const baseSessions =
    currentSessions.length > 0 ? currentSessions : loadStoredSessions();
  if (payload.waypoints.length < 2) {
    return baseSessions;
  }

  const nowIso = new Date().toISOString();
  const timeStr = new Date().toTimeString().slice(0, 8);

  const nodes: FlightWaypointNode[] = payload.waypoints.map((wp, idx) => ({
    order: idx + 1,
    label: `WP-${String(idx + 1).padStart(2, '0')} • Điểm hành trình (${wp.type})`,
    latitude: Number(wp.latitude.toFixed(6)),
    longitude: Number(wp.longitude.toFixed(6)),
    altitudeM: wp.altitude,
    targetSpeedMs: wp.speed,
    visitState: idx === 0 ? 'COMPLETED' : idx === 1 ? 'ACTIVE' : 'PENDING',
    reachedAt: idx === 0 ? timeStr : null,
    collectedPackets: idx === 0 ? 24 : 0,
    errorPackets: 0,
  }));

  const firstWp = nodes[0];
  const secondWp = nodes[1] ?? nodes[0];
  const heading = calculateBearingDeg(
    firstWp.latitude,
    firstWp.longitude,
    secondWp.latitude,
    secondWp.longitude,
  );
  const resolvedZoneName =
    MONITOR_ZONE_NAMES[payload.zoneId] ??
    `Khu vực #${payload.zoneId} - Trang Trại Công Nghệ Cao Đà Lạt`;
  const totalDist = Math.max(10, Math.round(payload.totalDistanceM));
  const estRemaining = Math.max(15, Math.round(payload.estimatedTimeSeconds));

  const existingIdx = baseSessions.findIndex((s) => s.uavId === payload.uavId);
  let nextSessions: UavFlightSession[];

  if (existingIdx !== -1) {
    nextSessions = baseSessions.map((s, idx) => {
      if (idx !== existingIdx) return s;
      const safeBattery = s.batteryPercent <= 25 ? 92 : s.batteryPercent;
      return {
        ...s,
        missionId: payload.backendMissionId ?? s.missionId,
        missionName: payload.missionName,
        uavName: payload.uavName || s.uavName,
        uavModel: payload.uavModel || s.uavModel,
        zoneId: payload.zoneId,
        zoneName: resolvedZoneName,
        status: 'FLYING',
        batteryPercent: safeBattery,
        batteryVoltageV: Number((42 + (safeBattery / 100) * 10.4).toFixed(1)),
        latitude: firstWp.latitude,
        longitude: firstWp.longitude,
        homeLatitude: firstWp.latitude,
        homeLongitude: firstWp.longitude,
        altitudeM: firstWp.altitudeM,
        speedMs: firstWp.targetSpeedMs,
        headingDeg: heading,
        currentWaypointOrder: nodes.length > 1 ? 2 : 1,
        completedWaypoints: 1,
        totalWaypoints: nodes.length,
        segmentProgress: 0,
        progressPercent: 0,
        distanceTraveledM: 0,
        totalRouteDistanceM: totalDist,
        elapsedSeconds: 0,
        estimatedRemainingSeconds: estRemaining,
        packetsCollected: 24,
        packetErrors: 0,
        errorReason: null,
        startedAt: nowIso,
        lastTelemetryAt: nowIso,
        waypoints: nodes,
      };
    });
  } else {
    const seqNum = 70 + baseSessions.length + 1;
    const newSession: UavFlightSession = {
      missionId: payload.backendMissionId ?? 700 + baseSessions.length + 1,
      missionCode: `MSN-2026-${String(seqNum).padStart(3, '0')}`,
      missionName: payload.missionName,
      uavId: payload.uavId,
      uavName: payload.uavName || `UAV ${payload.uavId}`,
      uavModel: payload.uavModel || 'DJI Matrice 300 RTK',
      zoneId: payload.zoneId,
      zoneName: resolvedZoneName,
      status: 'FLYING',
      batteryPercent: 95,
      batteryVoltageV: Number((42 + 0.95 * 10.4).toFixed(1)),
      batteryTempC: 31.5,
      signalStrength: 96,
      altitudeM: firstWp.altitudeM,
      speedMs: firstWp.targetSpeedMs,
      headingDeg: heading,
      satellites: 18,
      latitude: firstWp.latitude,
      longitude: firstWp.longitude,
      homeLatitude: firstWp.latitude,
      homeLongitude: firstWp.longitude,
      currentWaypointOrder: nodes.length > 1 ? 2 : 1,
      completedWaypoints: 1,
      totalWaypoints: nodes.length,
      segmentProgress: 0,
      progressPercent: 0,
      distanceTraveledM: 0,
      totalRouteDistanceM: totalDist,
      elapsedSeconds: 0,
      estimatedRemainingSeconds: estRemaining,
      packetsCollected: 24,
      packetErrors: 0,
      errorReason: null,
      startedAt: nowIso,
      lastTelemetryAt: nowIso,
      waypoints: nodes,
    };
    nextSessions = [...baseSessions, newSession];
  }

  saveStoredSessions(nextSessions);
  return nextSessions;
}

function loadStoredNotes(): MissionNote[] {
  try {
    const raw = localStorage.getItem(NOTES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MissionNote[];
      // Chấp nhận cả mảng rỗng: người dùng đã xóa hết Note thì KHÔNG tự nạp lại dữ liệu mẫu
      // (tránh lỗi Note đã xóa "sống lại" sau F5). Chỉ reset khi còn bản lưu tọa độ TP.HCM cũ.
      if (
        Array.isArray(parsed) &&
        parsed.every((n) => n.latitude >= 11.5)
      ) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial notes
  }
  localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(INITIAL_MISSION_NOTES));
  return INITIAL_MISSION_NOTES;
}

export function saveStoredNotes(notes: MissionNote[]): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // Ignore storage quota errors
  }
}

// ==================== 4. BỘ MÔ PHỎNG NỘI SUY TELEMETRY REALTIME (LTJ-32 & LTJ-35) ====================

/**
 * Tính toán bước nhảy Telemetry tiếp theo cho 1 phiên bay của UAV:
 * - Nếu FLYING: nội suy tuyến tính giữa Waypoint hiện tại và Waypoint kế tiếp
 * - Nếu RETURNING: nội suy tuyến tính hướng về tọa độ trạm Home
 * - Nếu COLLECTION_ERROR: giữ vị trí bay treo (Hover) tại Waypoint lỗi và tăng bộ đếm gói lỗi
 */
export function advanceFlightSessionTick(
  session: UavFlightSession,
): UavFlightSession {
  const nowIso = new Date().toISOString();
  const timeStr = new Date().toTimeString().slice(0, 8);

  if (session.status === 'STANDBY' || session.status === 'COMPLETED') {
    return {
      ...session,
      speedMs: 0,
      lastTelemetryAt: nowIso,
    };
  }

  // Trường hợp 1: UAV đang ở trạng thái THU THẬP LỖI (COLLECTION_ERROR)
  if (session.status === 'COLLECTION_ERROR') {
    // Hover tiêu thụ 0.2%/tick, giữ số thực 1 chữ số thập phân (không Math.round làm pin đứng im)
    const nextBattery = drainBattery(session.batteryPercent, 0.2, 5);
    const updatedWaypoints: FlightWaypointNode[] = session.waypoints.map((wp) =>
      wp.order === session.currentWaypointOrder
        ? {
            ...wp,
            visitState: 'ERROR',
            errorPackets: wp.errorPackets + 1,
          }
        : wp,
    );

    return {
      ...session,
      batteryPercent: nextBattery,
      batteryVoltageV: Number((42 + (nextBattery / 100) * 10.4).toFixed(1)),
      speedMs: 0.3,
      signalStrength: Math.max(35, Math.min(62, session.signalStrength + (Math.random() > 0.5 ? 1 : -1))),
      packetErrors: session.packetErrors + 1,
      elapsedSeconds: session.elapsedSeconds + 2,
      errorReason:
        session.errorReason ||
        `Mất gói tin MQTT tại Waypoint #${session.currentWaypointOrder} (CRC Timeout & suy hao tín hiệu)`,
      lastTelemetryAt: nowIso,
      waypoints: updatedWaypoints,
    };
  }

  // Trường hợp 2: UAV đang VỀ TRẠM (RETURNING - RTH)
  if (session.status === 'RETURNING') {
    // LERP thực trên đoạn thẳng [điểm bắt đầu RTH -> Home] theo alpha = segmentProgress.
    // Vị trí hiện tại P = O + alpha·(H - O) => bước kế tiếp P' = P + t·(H - P)
    // với t = (nextAlpha - alpha) / (1 - alpha), không cần lưu điểm gốc O.
    const alpha = Math.max(0, Math.min(1, session.segmentProgress));
    const nextAlpha = Math.min(1, Number((alpha + 0.12).toFixed(2)));
    const remaining = 1 - alpha;
    const localT = remaining > 1e-6 ? (nextAlpha - alpha) / remaining : 1;
    const interp = interpolateCoordinate(
      session.latitude,
      session.longitude,
      session.homeLatitude,
      session.homeLongitude,
      localT,
    );
    const distToHome = calculateHaversineMeters(
      interp.latitude,
      interp.longitude,
      session.homeLatitude,
      session.homeLongitude,
    );
    const stepDistance = calculateHaversineMeters(
      session.latitude,
      session.longitude,
      interp.latitude,
      interp.longitude,
    );
    const bearingHome = calculateBearingDeg(
      session.latitude,
      session.longitude,
      session.homeLatitude,
      session.homeLongitude,
    );
    const nextBattery = drainBattery(session.batteryPercent, 1, 8);
    // Nội suy altitude & speed về thông số Waypoint xuất phát (Home)
    const homeWp = session.waypoints[0];
    const homeAltitude = homeWp ? homeWp.altitudeM : session.altitudeM;
    const homeSpeed = homeWp ? homeWp.targetSpeedMs : session.speedMs;
    const nextAltitude = Number(lerpScalar(session.altitudeM, homeAltitude, localT).toFixed(1));
    const nextSpeed = Number(lerpScalar(session.speedMs, homeSpeed, localT).toFixed(1));

    if (distToHome <= 25 || nextAlpha >= 1) {
      return {
        ...session,
        status: 'COMPLETED',
        latitude: session.homeLatitude,
        longitude: session.homeLongitude,
        altitudeM: 0,
        speedMs: 0,
        batteryPercent: nextBattery,
        segmentProgress: 1,
        progressPercent: 100,
        completedWaypoints: session.totalWaypoints,
        estimatedRemainingSeconds: 0,
        elapsedSeconds: session.elapsedSeconds + 2,
        lastTelemetryAt: nowIso,
        waypoints: session.waypoints.map((wp) => ({
          ...wp,
          visitState: 'COMPLETED',
          reachedAt: wp.reachedAt || timeStr,
        })),
      };
    }

    return {
      ...session,
      latitude: interp.latitude,
      longitude: interp.longitude,
      headingDeg: bearingHome,
      speedMs: nextSpeed,
      altitudeM: nextAltitude,
      batteryPercent: nextBattery,
      batteryVoltageV: Number((42 + (nextBattery / 100) * 10.4).toFixed(1)),
      segmentProgress: nextAlpha,
      progressPercent: Math.max(session.progressPercent, Math.min(99, session.progressPercent + 3)),
      distanceTraveledM: session.distanceTraveledM + stepDistance,
      elapsedSeconds: session.elapsedSeconds + 2,
      estimatedRemainingSeconds: Math.max(5, Math.round(distToHome / Math.max(0.5, nextSpeed))),
      lastTelemetryAt: nowIso,
    };
  }

  // Trường hợp 3: UAV ĐANG BAY (FLYING) dọc theo các Waypoints (Nội suy tuyến tính LTJ-35)
  const wps = session.waypoints;
  if (wps.length < 2) {
    return { ...session, lastTelemetryAt: nowIso };
  }

  const targetIdx = Math.min(
    wps.length - 1,
    Math.max(1, session.currentWaypointOrder - 1),
  );
  const toWp = wps[targetIdx];

  let nextAlpha = Number((session.segmentProgress + 0.2).toFixed(2));
  let nextWpOrder = session.currentWaypointOrder;
  let nextCompleted = session.completedWaypoints;
  let nextStatus: FlightMonitorStatus = session.status;
  let updatedWaypoints = [...wps];
  let routeFinished = false;

  if (nextAlpha >= 1) {
    // Đã chạm tới Waypoint đích của đoạn hiện tại
    updatedWaypoints = updatedWaypoints.map((wp, idx) => {
      if (idx === targetIdx) {
        return {
          ...wp,
          visitState: 'COMPLETED',
          reachedAt: wp.reachedAt || timeStr,
          collectedPackets: wp.collectedPackets + 18,
        };
      }
      if (idx === targetIdx + 1) {
        return {
          ...wp,
          visitState: 'ACTIVE',
        };
      }
      return wp;
    });

    nextCompleted = Math.min(wps.length, targetIdx + 1);

    if (targetIdx + 1 < wps.length) {
      nextWpOrder = targetIdx + 2;
      nextAlpha = 0;
    } else {
      // Đã hoàn thành toàn bộ các điểm bay -> Chuyển sang Về trạm.
      // Reset alpha = 0 để nhánh RETURNING nội suy dần từ WP cuối về Home (không teleport trong 1 tick).
      nextAlpha = 0;
      nextStatus = 'RETURNING';
      routeFinished = true;
    }
  } else {
    updatedWaypoints = updatedWaypoints.map((wp, idx) =>
      idx === targetIdx
        ? { ...wp, collectedPackets: wp.collectedPackets + 6 }
        : wp,
    );
  }

  const activeFrom =
    nextStatus === 'RETURNING'
      ? toWp
      : updatedWaypoints[Math.max(0, nextWpOrder - 2)];
  const activeTo =
    nextStatus === 'RETURNING'
      ? updatedWaypoints[0]
      : updatedWaypoints[Math.min(updatedWaypoints.length - 1, nextWpOrder - 1)];

  const interp = interpolateCoordinate(
    activeFrom.latitude,
    activeFrom.longitude,
    activeTo.latitude,
    activeTo.longitude,
    nextAlpha,
  );
  const heading = calculateBearingDeg(
    activeFrom.latitude,
    activeFrom.longitude,
    activeTo.latitude,
    activeTo.longitude,
  );

  const totalSegments = Math.max(1, wps.length - 1);
  const completedSegs = Math.max(0, nextWpOrder - 2);
  // Khi đã chạm WP cuối, tiến độ tuyến bay = 100% dù alpha được reset về 0 cho chặng RTH
  const routeAlpha = routeFinished ? 1 : nextAlpha;
  const overallProgress = Math.min(
    100,
    Math.round(((completedSegs + routeAlpha) / totalSegments) * 100),
  );

  // Nội suy LERP đầy đủ cho altitude & speed giữa 2 Waypoint (không nhảy cóc sang giá trị WP đích)
  const nextAltitude = Number(
    lerpScalar(activeFrom.altitudeM, activeTo.altitudeM, nextAlpha).toFixed(1),
  );
  const nextSpeed = Number(
    lerpScalar(activeFrom.targetSpeedMs, activeTo.targetSpeedMs, nextAlpha).toFixed(1),
  );

  const nextBattery = drainBattery(session.batteryPercent, 0.4, 10);
  // Nếu pin tụt xuống <= 20% khi đang bay thì tự động chuyển sang Về trạm (RTH)
  if (nextBattery <= 20 && nextStatus === 'FLYING') {
    nextStatus = 'RETURNING';
  }
  // Bắt đầu chặng RTH luôn từ alpha = 0 tại vị trí hiện tại
  const nextSegmentProgress = nextStatus === 'RETURNING' ? 0 : nextAlpha;

  return {
    ...session,
    status: nextStatus,
    latitude: interp.latitude,
    longitude: interp.longitude,
    altitudeM: nextAltitude,
    speedMs: nextSpeed,
    headingDeg: heading,
    batteryPercent: nextBattery,
    batteryVoltageV: Number((42 + (nextBattery / 100) * 10.4).toFixed(1)),
    currentWaypointOrder: nextWpOrder,
    completedWaypoints: nextCompleted,
    segmentProgress: nextSegmentProgress,
    progressPercent: overallProgress,
    distanceTraveledM: Math.min(
      session.totalRouteDistanceM,
      Math.round((overallProgress / 100) * session.totalRouteDistanceM),
    ),
    elapsedSeconds: session.elapsedSeconds + 2,
    estimatedRemainingSeconds: Math.max(
      10,
      session.estimatedRemainingSeconds - 4,
    ),
    packetsCollected: session.packetsCollected + 8,
    lastTelemetryAt: nowIso,
    waypoints: updatedWaypoints,
  };
}

// ==================== 5. HYBRID API SERVICES CHO FLIGHT SESSIONS & MISSION NOTES ====================

/**
 * Lấy danh sách các phiên bay trực tiếp của đội bay UAV
 */
export async function fetchFlightSessions(): Promise<UavFlightSession[]> {
  const localSessions = loadStoredSessions();
  try {
    // missionApiRequest ném lỗi với 4xx/5xx => chỉ parse JSON khi response.ok
    const response = await missionApiRequest(`${API_BASE_URL}/uavs`);
    // Đồng bộ trạng thái kết nối thực tế từ Backend nếu có
    const backendUavs: unknown = await response.json();
    if (Array.isArray(backendUavs) && backendUavs.length > 0) {
      return localSessions;
    }
  } catch {
    // Hybrid Fallback về dữ liệu phiên bay local
  }
  return localSessions;
}

/**
 * Cập nhật trạng thái chuyến bay của UAV (Đang bay / Về trạm / Thu thập lỗi)
 * Đồng bộ với PATCH /api/v1/missions/{id}/status của Dev 2
 */
export async function updateMissionFlightStatusApi(
  missionId: number,
  newStatus: FlightMonitorStatus,
): Promise<{ missionId: number; status: FlightMonitorStatus }> {
  try {
    await missionApiRequest(`${MISSION_API_URL}/${missionId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
  } catch {
    // Hybrid fallback (mạng lỗi hoặc HTTP 4xx/5xx): xử lý ngay tại Redux store & localStorage
  }
  return { missionId, status: newStatus };
}

function normalizeMissionNote(raw: Partial<MissionNote>): MissionNote {
  const nowIso = new Date().toISOString();
  return {
    id: typeof raw.id === 'number' ? raw.id : Date.now(),
    missionId: typeof raw.missionId === 'number' ? raw.missionId : 701,
    missionCode: raw.missionCode || `MSN-${raw.missionId ?? 701}`,
    missionName: raw.missionName || 'Nhiệm vụ bay UAV',
    uavId: raw.uavId || 'UAV-001',
    uavName: raw.uavName || `UAV ${raw.uavId ?? '001'}`,
    zoneId: typeof raw.zoneId === 'number' ? raw.zoneId : 1,
    zoneName: raw.zoneName || `Khu vực #${raw.zoneId ?? 1}`,
    category: raw.category || 'OBSERVATION',
    priority: raw.priority || 'NORMAL',
    title: raw.title || 'Ghi chú thực địa',
    content: raw.content || '',
    author: raw.author || 'Nguyễn Trường An (Operator)',
    waypointOrder: typeof raw.waypointOrder === 'number' ? raw.waypointOrder : 1,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : 11.9396,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : 108.4662,
    batteryAtNote: typeof raw.batteryAtNote === 'number' ? raw.batteryAtNote : 80,
    flightStatusAtNote: raw.flightStatusAtNote || 'FLYING',
    isPinned: Boolean(raw.isPinned),
    createdAt: raw.createdAt || nowIso,
    updatedAt: raw.updatedAt || raw.createdAt || nowIso,
  };
}

/**
 * Lấy danh sách Ghi chú Nhiệm vụ (Note Mission - F16)
 */
export async function fetchMissionNotes(): Promise<MissionNote[]> {
  const localNotes = loadStoredNotes();
  try {
    const response = await missionApiRequest(`${MISSION_API_URL}/notes`);
    const json: unknown = await response.json();
    const list = Array.isArray(json)
      ? json
      : (json as { data?: unknown } | null)?.data;
    if (Array.isArray(list) && list.length > 0) {
      const normalized = (list as Partial<MissionNote>[]).map(normalizeMissionNote);
      saveStoredNotes(normalized);
      return normalized;
    }
  } catch {
    // Fallback local
  }
  return localNotes;
}

/**
 * Tạo mới một Ghi chú Nhiệm vụ thủ công (F16)
 */
export async function createMissionNoteApi(
  draft: MissionNoteDraft,
  session: UavFlightSession,
): Promise<MissionNote> {
  const nowIso = new Date().toISOString();
  const noteBase = {
    missionId: session.missionId,
    missionCode: session.missionCode,
    missionName: session.missionName,
    uavId: session.uavId,
    uavName: session.uavName,
    zoneId: session.zoneId,
    zoneName: session.zoneName,
    category: draft.category,
    priority: draft.priority,
    title: draft.title.trim(),
    content: draft.content.trim(),
    author: draft.author.trim() || 'Nguyễn Trường An (Operator)',
    waypointOrder: draft.waypointOrder || session.currentWaypointOrder,
    latitude: session.latitude,
    longitude: session.longitude,
    batteryAtNote: session.batteryPercent,
    flightStatusAtNote: session.status,
    isPinned: draft.priority === 'URGENT',
  };

  let createdNote: MissionNote = {
    id: Date.now(),
    ...noteBase,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    // Không gửi id & createdAt/updatedAt có đuôi Z để JPA @GeneratedValue & @PrePersist (LocalDateTime) xử lý chuẩn
    const response = await missionApiRequest(
      `${MISSION_API_URL}/${session.missionId}/notes`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteBase),
      },
      2500,
    );
    const json = (await response.json().catch(() => null)) as
      | { data?: Partial<MissionNote> }
      | Partial<MissionNote>
      | null;
    const saved =
      json && typeof json === 'object' && 'data' in json && json.data
        ? json.data
        : (json as Partial<MissionNote> | null);
    if (saved && typeof saved.id === 'number') {
      createdNote = normalizeMissionNote({ ...createdNote, ...saved });
    }
  } catch {
    // Hybrid fallback (mạng lỗi hoặc HTTP 4xx/5xx): persist in localStorage
  }

  const current = loadStoredNotes();
  const updated = [createdNote, ...current.filter((n) => n.id !== createdNote.id)];
  saveStoredNotes(updated);
  return createdNote;
}

/**
 * Cập nhật nội dung một Ghi chú Nhiệm vụ thủ công (F16)
 */
export async function updateMissionNoteApi(
  noteId: number,
  updates: Partial<
    Pick<
      MissionNote,
      'title' | 'content' | 'category' | 'priority' | 'waypointOrder' | 'author' | 'isPinned'
    >
  >,
): Promise<{ noteId: number; updates: Partial<MissionNote> }> {
  const nowIso = new Date().toISOString();
  const localPayload = { ...updates, updatedAt: nowIso };

  try {
    // Không gửi updatedAt dạng UTC Z để @PreUpdate LocalDateTime trên Spring Boot tự gán
    await missionApiRequest(
      `${MISSION_API_URL}/notes/${noteId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
      2500,
    );
  } catch {
    // Hybrid fallback
  }

  const current = loadStoredNotes();
  const next = current.map((n) => (n.id === noteId ? { ...n, ...localPayload } : n));
  saveStoredNotes(next);
  return { noteId, updates: localPayload };
}

/**
 * Xóa một Ghi chú Nhiệm vụ
 */
export async function deleteMissionNoteApi(noteId: number): Promise<number> {
  try {
    await missionApiRequest(`${MISSION_API_URL}/notes/${noteId}`, { method: 'DELETE' }, 2000);
  } catch {
    // Hybrid fallback
  }

  const current = loadStoredNotes();
  const next = current.filter((n) => n.id !== noteId);
  saveStoredNotes(next);
  return noteId;
}

let lastSyncedBackendSignature = '';

/**
 * Đồng bộ danh sách Waypoints hiện hành trên màn hình Giám sát lên Backend (/api/v1/missions)
 * để IoT Simulator (--flight-sim) luôn bay khớp 100% với lộ trình đang vẽ trên bản đồ Web.
 */
export async function syncSessionsWaypointsToBackend(
  sessions: UavFlightSession[],
): Promise<void> {
  const sig = sessions
    .map(
      (s) =>
        `${s.uavId}:${s.waypoints
          .map((w) => `${w.latitude.toFixed(5)},${w.longitude.toFixed(5)}`)
          .join('|')}`,
    )
    .join(';');
  if (!sig || sig === lastSyncedBackendSignature) return;
  lastSyncedBackendSignature = sig;

  for (const s of sessions) {
    if (!s.waypoints || s.waypoints.length < 2) continue;
    try {
      const wps = s.waypoints.map((w, idx) => ({
        order: idx + 1,
        latitude: w.latitude,
        longitude: w.longitude,
        altitude: w.altitudeM,
        speed: w.targetSpeedMs,
        type:
          idx === 0
            ? 'TAKEOFF'
            : idx === s.waypoints.length - 1
              ? 'LANDING'
              : 'NORMAL',
      }));
      await missionApiRequest(
        MISSION_API_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.missionName,
            missionName: s.missionName,
            uavId: s.uavId,
            zoneId: s.zoneId,
            waypoints: wps,
          }),
        },
        2000,
      );
    } catch {
      // Bỏ qua nếu Backend tạm ngắt
    }
  }
}

/**
 * Khôi phục dữ liệu mẫu ban đầu cho cả Phiên bay & Note Mission
 */
export function resetFlightMonitorDemoData(): {
  sessions: UavFlightSession[];
  notes: MissionNote[];
} {
  saveStoredSessions(INITIAL_FLIGHT_SESSIONS);
  saveStoredNotes(INITIAL_MISSION_NOTES);
  void syncSessionsWaypointsToBackend(INITIAL_FLIGHT_SESSIONS);
  return {
    sessions: INITIAL_FLIGHT_SESSIONS,
    notes: INITIAL_MISSION_NOTES,
  };
}
