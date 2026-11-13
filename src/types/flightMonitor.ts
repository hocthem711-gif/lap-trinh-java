/**
 * TypeScript Type Definitions — Sidebar Giám sát Chuyến bay & Note Mission (F16)
 * Task: LTJ-34 - Sprint 7
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * Đối chiếu chuẩn với đặc tả Jira Sprint 7:
 * - LTJ-31 (Dev 1): WebSocket/SSE Realtime Telemetry (F15)
 * - LTJ-32 (Dev 2): API Telemetry UAV (Tọa độ hiện tại, tốc độ, % pin) & Mission Progress
 * - LTJ-33 (Dev 3): WebSocket Client & Icon UAV Chuyển động trên Leaflet Map
 * - LTJ-34 (Dev 4): Sidebar giám sát chuyến bay (% Pin, Trạng thái: Đang bay, Về trạm, Thu thập lỗi) & Note cập nhật thủ công (F16)
 * - LTJ-35 (Dev 5): Nội suy tọa độ giữa các Waypoint đã tạo qua MQTT/Telemetry
 */

// ==================== 1. TRẠNG THÁI CHUYẾN BAY (FLIGHT MONITOR STATUS) ====================

/**
 * Trạng thái giám sát chuyến bay theo đặc tả LTJ-34:
 * - FLYING: Đang bay (Thực thi lộ trình Waypoints)
 * - RETURNING: Về trạm (Return-to-Home / RTH khi hoàn tất hoặc pin yếu)
 * - COLLECTION_ERROR: Thu thập lỗi (Mất gói tin MQTT / Lỗi cảm biến nút dưới đất)
 * - STANDBY: Chờ xuất phát tại trạm sạc
 * - COMPLETED: Đã hoàn thành toàn bộ điểm bay
 */
export type FlightMonitorStatus =
  | 'FLYING'
  | 'RETURNING'
  | 'COLLECTION_ERROR'
  | 'STANDBY'
  | 'COMPLETED';

export const FLIGHT_STATUS_CONFIG: Record<
  FlightMonitorStatus,
  {
    label: string;
    shortDesc: string;
    badgeClass: string;
    color: string;
    dotColor: string;
  }
> = {
  FLYING: {
    label: 'Đang bay',
    shortDesc: 'Đang bay tuần tra & thu thập dữ liệu dọc theo lộ trình Waypoints',
    badgeClass: 'status-flying',
    color: '#10b981',
    dotColor: '#34d399',
  },
  RETURNING: {
    label: 'Về trạm',
    shortDesc: 'Đang quay về trạm điều khiển trung tâm (Return To Home - RTH)',
    badgeClass: 'status-returning',
    color: '#f59e0b',
    dotColor: '#fbbf24',
  },
  COLLECTION_ERROR: {
    label: 'Thu thập lỗi',
    shortDesc: 'Phát hiện lỗi thu thập gói tin cảm biến hoặc nhiễu đường truyền tại Waypoint',
    badgeClass: 'status-error',
    color: '#ef4444',
    dotColor: '#f87171',
  },
  STANDBY: {
    label: 'Chờ lệnh tại trạm',
    shortDesc: 'UAV đang đỗ tại trạm Gateway, sẵn sàng nhận lộ trình bay mới',
    badgeClass: 'status-standby',
    color: '#6366f1',
    dotColor: '#818cf8',
  },
  COMPLETED: {
    label: 'Hoàn thành nhiệm vụ',
    shortDesc: 'Đã bay qua toàn bộ Waypoints và hạ cánh an toàn tại trạm',
    badgeClass: 'status-completed',
    color: '#06b6d4',
    dotColor: '#22d3ee',
  },
};

// ==================== 2. TIẾN ĐỘ ĐIỂM BAY (WAYPOINT PROGRESS - LTJ-32 & LTJ-35) ====================

export type WaypointVisitState = 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'ERROR';

export interface FlightWaypointNode {
  order: number;
  label: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  targetSpeedMs: number;
  visitState: WaypointVisitState;
  reachedAt: string | null;
  collectedPackets: number;
  errorPackets: number;
}

// ==================== 3. TELEMETRY CHUYẾN BAY TRỰC TIẾP (UAV LIVE TELEMETRY) ====================

export interface UavFlightSession {
  missionId: number;
  missionCode: string;
  missionName: string;
  uavId: string;
  uavName: string;
  uavModel: string;
  zoneId: number;
  zoneName: string;
  status: FlightMonitorStatus;
  batteryPercent: number;        // 0 - 100 %
  batteryVoltageV: number;       // Điện áp bộ pin (V)
  batteryTempC: number;          // Nhiệt độ pin (°C)
  signalStrength: number;        // 0 - 100 % (RSSI Link Quality)
  altitudeM: number;             // Độ cao hiện tại (m)
  speedMs: number;               // Vận tốc hiện tại (m/s)
  headingDeg: number;            // Góc phương vị mũi bay (0 - 360°)
  satellites: number;            // Số vệ tinh GPS khóa tín hiệu
  latitude: number;              // Vĩ độ hiện tại (nội suy giữa các Waypoints)
  longitude: number;             // Kinh độ hiện tại (nội suy giữa các Waypoints)
  homeLatitude: number;          // Vĩ độ trạm xuất phát (Home Base)
  homeLongitude: number;         // Kinh độ trạm xuất phát (Home Base)
  currentWaypointOrder: number;  // Waypoint đang hướng tới / đang xử lý
  completedWaypoints: number;    // Số Waypoint đã hoàn thành (LTJ-32)
  totalWaypoints: number;        // Tổng số Waypoint trong Mission
  segmentProgress: number;       // Hệ số nội suy đoạn hiện tại alpha in [0, 1] (LTJ-35)
  progressPercent: number;       // % Hoàn thành toàn chuyến bay (0 - 100%)
  distanceTraveledM: number;     // Quãng đường đã bay (m)
  totalRouteDistanceM: number;   // Tổng quãng đường lộ trình (m)
  elapsedSeconds: number;        // Thời gian đã bay (giây)
  estimatedRemainingSeconds: number; // Thời gian dự kiến còn lại (giây)
  packetsCollected: number;      // Tổng gói dữ liệu cảm biến thu thập được
  packetErrors: number;          // Số gói dữ liệu bị lỗi CRC / Timeout
  errorReason: string | null;    // Mô tả chi tiết nếu trạng thái là COLLECTION_ERROR
  startedAt: string;
  lastTelemetryAt: string;
  waypoints: FlightWaypointNode[];
}

// ==================== 4. GHI CHÚ NHIỆM VỤ THỦ CÔNG (MISSION NOTE - F16) ====================

export type MissionNoteCategory =
  | 'OBSERVATION'
  | 'INCIDENT'
  | 'BATTERY_LOG'
  | 'WEATHER'
  | 'MAINTENANCE';

export type MissionNotePriority = 'NORMAL' | 'IMPORTANT' | 'URGENT';

export const MISSION_NOTE_CATEGORY_LABELS: Record<
  MissionNoteCategory,
  { label: string; badgeClass: string; iconName: string }
> = {
  OBSERVATION: {
    label: 'Quan sát thực địa',
    badgeClass: 'cat-observation',
    iconName: 'Eye',
  },
  INCIDENT: {
    label: 'Sự cố thu thập / Lỗi',
    badgeClass: 'cat-incident',
    iconName: 'AlertTriangle',
  },
  BATTERY_LOG: {
    label: 'Cảnh báo Pin & Năng lượng',
    badgeClass: 'cat-battery',
    iconName: 'BatteryWarning',
  },
  WEATHER: {
    label: 'Thời tiết & Gió tại Zone',
    badgeClass: 'cat-weather',
    iconName: 'CloudRain',
  },
  MAINTENANCE: {
    label: 'Kỹ thuật & Bảo trì UAV',
    badgeClass: 'cat-maintenance',
    iconName: 'Wrench',
  },
};

export const MISSION_NOTE_PRIORITY_LABELS: Record<
  MissionNotePriority,
  { label: string; badgeClass: string }
> = {
  NORMAL: { label: 'Bình thường', badgeClass: 'prio-normal' },
  IMPORTANT: { label: 'Quan trọng', badgeClass: 'prio-important' },
  URGENT: { label: 'Khẩn cấp', badgeClass: 'prio-urgent' },
};

export interface MissionNote {
  id: number;
  missionId: number;
  missionCode: string;
  missionName: string;
  uavId: string;
  uavName: string;
  zoneId: number;
  zoneName: string;
  category: MissionNoteCategory;
  priority: MissionNotePriority;
  title: string;
  content: string;
  author: string;
  waypointOrder: number;
  latitude: number;
  longitude: number;
  batteryAtNote: number;
  flightStatusAtNote: FlightMonitorStatus;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MissionNoteDraft {
  missionId: number;
  uavId: string;
  category: MissionNoteCategory;
  priority: MissionNotePriority;
  title: string;
  content: string;
  author: string;
  waypointOrder: number;
  attachLiveTelemetry: boolean;
}

export interface MissionNoteFilter {
  uavId: string | 'ALL';
  category: MissionNoteCategory | 'ALL';
  priority: MissionNotePriority | 'ALL';
  flightStatus: FlightMonitorStatus | 'ALL';
  onlyPinned: boolean;
  searchQuery: string;
}

// ==================== 5. MẪU GHI CHÚ NHANH (QUICK NOTE TEMPLATES - F16) ====================

export interface QuickNoteTemplate {
  id: string;
  label: string;
  category: MissionNoteCategory;
  priority: MissionNotePriority;
  title: string;
  content: string;
}

export const QUICK_NOTE_TEMPLATES: QuickNoteTemplate[] = [
  {
    id: 'tpl-flying-ok',
    label: 'Bay ổn định qua Waypoint',
    category: 'OBSERVATION',
    priority: 'NORMAL',
    title: 'Tín hiệu thu thập cảm biến ổn định tại điểm bay',
    content:
      'UAV giữ độ cao và vận tốc chuẩn theo lộ trình, đã đồng bộ đầy đủ gói tin cảm biến nhiệt độ & độ ẩm đất tại Waypoint hiện tại.',
  },
  {
    id: 'tpl-collection-error',
    label: 'Báo lỗi thu thập gói tin',
    category: 'INCIDENT',
    priority: 'URGENT',
    title: 'Lỗi mất gói tin cảm biến dưới mặt đất (Timeout)',
    content:
      'Phát hiện nút cảm biến tại tọa độ Waypoint phản hồi chậm và lỗi CRC gói tin. Đề nghị giữ UAV bay treo (Hover) 15 giây để thu thập lại.',
  },
  {
    id: 'tpl-rth-battery',
    label: 'Kích hoạt Về trạm (RTH)',
    category: 'BATTERY_LOG',
    priority: 'IMPORTANT',
    title: 'Chuyển chế độ Về trạm (RTH) do dung lượng pin chạm ngưỡng an toàn',
    content:
      'Dung lượng pin giảm xuống ngưỡng dự phòng an toàn, người vận hành kích hoạt lệnh Return-To-Home đưa UAV quay về trạm sạc trung tâm.',
  },
  {
    id: 'tpl-wind-warning',
    label: 'Gió giật mạnh tại phân khu',
    category: 'WEATHER',
    priority: 'IMPORTANT',
    title: 'Gió ngang mạnh làm tăng mức tiêu hao pin của UAV',
    content:
      'Ghi nhận gió mạnh tại khu vực canh tác khiến góc nghiêng Pitch/Roll tăng nhẹ, đã giảm tốc độ bay xuống 6 m/s để ổn định đường bay.',
  },
];
