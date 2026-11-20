// ============================================================================
// SPRINT 8 - LTJ-39: GIAO DIỆN XUẤT EXCEL (F11) & REVIEW MISSION UI (F17)
// Dev 4: Nguyễn Trường An (Quatrungvoon)
// ============================================================================

import type {
  FlightMonitorStatus,
  MissionNoteCategory,
  MissionNotePriority,
} from './flightMonitor';

/**
 * 5 Phân hệ dữ liệu hỗ trợ trích xuất ra Excel / CSV / JSON / Báo cáo in (F11)
 * Đồng bộ với LTJ-37 (Dev 2 - Apache POI Excel / PDF cho Data & Alert)
 */
export type ExportDatasetType =
  | 'SENSOR_TELEMETRY'
  | 'ALERT_REPORT'
  | 'UAV_OFFLINE_SYNC'
  | 'MISSION_FLIGHT_NOTES'
  | 'FULL_WORKBOOK';

/**
 * Định dạng file tải xuống (F11)
 */
export type ExportFileFormat = 'XLSX' | 'CSV' | 'JSON' | 'HTML_PRINT';

/**
 * Khoảng thời gian lọc dữ liệu xuất báo cáo
 */
export type ExportTimeRange = '24H' | '7D' | '30D' | 'ALL';

/**
 * Trạng thái nghiệm thu nhiệm vụ bay sau chuyến bay (F17 - Review Mission)
 */
export type MissionReviewDecision =
  | 'APPROVED'
  | 'PENDING_REVIEW'
  | 'NEEDS_REFLIGHT'
  | 'ARCHIVED';

/**
 * Xếp hạng chất lượng chuyến bay tổng hợp
 */
export type MissionQualityGrade = 'S' | 'A' | 'B' | 'C' | 'D';

/**
 * Cấu hình hiển thị cho từng loại tập dữ liệu xuất Excel (F11)
 */
export interface ExportDatasetMeta {
  type: ExportDatasetType;
  label: string;
  shortLabel: string;
  sheetName: string;
  /** Đường dẫn tương đối so với API_BASE_URL (đã gồm /api/v1) — KHÔNG lặp lại tiền tố /api/v1 */
  apiEndpoint: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  defaultColumns: ExportColumnDefinition[];
}

/**
 * Định nghĩa cột dữ liệu trong bảng Preview & File Excel
 */
export interface ExportColumnDefinition {
  key: string;
  header: string;
  widthPx: number;
  align?: 'left' | 'center' | 'right';
  enabledByDefault: boolean;
}

/**
 * Bộ lọc cấu hình Xuất Báo cáo Excel (F11)
 */
export interface ExcelExportFilterConfig {
  datasetType: ExportDatasetType;
  fileFormat: ExportFileFormat;
  timeRange: ExportTimeRange;
  zoneFilter: string;
  missionIdFilter: string;
  alertSeverityFilter: 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO';
  searchKeyword: string;
  includeSummaryHeader: boolean;
  includeTelemetrySnapshot: boolean;
  selectedColumnKeys: string[];
  customFileNamePrefix: string;
}

/**
 * Dòng dữ liệu chuẩn hóa hiển thị trên bảng Xem trước (Preview Table) và xuất Excel
 */
export interface NormalizedExportRow {
  id: string;
  datasetType: ExportDatasetType;
  timestamp: string;
  zoneName: string;
  sourceCode: string;
  categoryLabel: string;
  primaryMetric: string;
  secondaryMetric: string;
  statusLabel: string;
  severityLevel: 'CRITICAL' | 'WARNING' | 'NORMAL' | 'INFO';
  operatorOrNote: string;
  gpsCoordinates: string;
  rawValues: Record<string, string | number>;
}

/**
 * Lịch sử các lần xuất file Excel / CSV / Báo cáo trong phiên làm việc
 */
export interface ExportExecutionHistoryItem {
  id: string;
  fileName: string;
  datasetType: ExportDatasetType;
  datasetLabel: string;
  fileFormat: ExportFileFormat;
  rowCount: number;
  sheetCount: number;
  fileSizeKb: number;
  zoneFilter: string;
  timeRange: ExportTimeRange;
  exportedBy: string;
  exportedAt: string;
  executionSource: 'BACKEND_POI_API' | 'HYBRID_CLIENT_ENGINE';
}

/**
 * Dữ liệu đối soát thực thi từng điểm bay Waypoint trong màn hình Review Mission (F17)
 */
export interface WaypointReviewAuditItem {
  waypointId: number;
  sequenceNumber: number;
  label: string;
  plannedLat: number;
  plannedLng: number;
  actualLat: number;
  actualLng: number;
  gpsDriftMeters: number; // Sai số lệch quỹ đạo tính bằng Haversine (m)
  plannedAltitudeM: number;
  actualAltitudeM: number;
  plannedSpeedMS: number;
  actualSpeedMS: number;
  hoverDurationSec: number;
  actionRequired: string;
  executionStatus: 'REACHED' | 'ACTIVE' | 'PENDING' | 'SKIPPED_ERROR';
  sensorPacketsCollected: number;
  packetLossPercent: number;
  batteryAtWaypointPercent: number;
  signalRssiDbm: number;
  reachedTimestamp: string | null;
  auditRemark: string;
}

/**
 * Bộ 5 tiêu chí chấm điểm nghiệm thu chuyến bay (Thang điểm 0 - 100 cho mỗi tiêu chí)
 */
export interface MissionReviewRubricScores {
  flightPathAccuracy: number; // Độ chính xác bám quỹ đạo Waypoint (0-100)
  sensorDataCompleteness: number; // Tỷ lệ thu thập gói tin cảm biến & đa phổ (0-100)
  batteryEfficiencyRating: number; // Hiệu suất năng lượng Pin & quản lý dòng xả (0-100)
  commLinkStability: number; // Độ ổn định truyền thông Lora / GPS RTK (0-100)
  safetyCompliance: number; // Tuân thủ quy trình an toàn bay & RTH (0-100)
}

/**
 * Bản ghi Tổng kết & Nghiệm thu Nhiệm vụ Bay (F17 - Mission Review Record)
 */
export interface MissionReviewRecord {
  missionId: string;
  missionCode: string;
  missionTitle: string;
  farmName: string;
  zoneId: string;
  zoneName: string;
  uavId: string;
  uavName: string;
  uavModel: string;
  pilotName: string;
  operationalState: FlightMonitorStatus;
  reviewDecision: MissionReviewDecision;
  overallScore: number; // Điểm chất lượng tổng hợp (0 - 100)
  qualityGrade: MissionQualityGrade;
  startedAt: string;
  completedAt: string;
  plannedDurationMin: number;
  actualDurationMin: number;
  plannedDistanceM: number;
  actualDistanceM: number;
  avgSpeedMS: number;
  maxAltitudeM: number;
  startBatteryPercent: number;
  endBatteryPercent: number;
  batteryConsumedPercent: number;
  energyEfficiencyWhPerKm: number;
  totalWaypoints: number;
  completedWaypoints: number;
  errorWaypoints: number;
  totalSensorPackets: number;
  averageLatencyMs: number;
  averageRssiDbm: number;
  maxGpsDriftMeters: number;
  avgGpsDriftMeters: number;
  waypointAudits: WaypointReviewAuditItem[];
  fieldNotesSummary: {
    id: string;
    title: string;
    category: MissionNoteCategory;
    severity: MissionNotePriority;
    content: string;
    waypointLabel: string | null;
    createdAt: string;
    authorName: string;
    gpsSnapshot: string;
    batterySnapshotPercent: number | null;
  }[];
  rubricScores: MissionReviewRubricScores;
  reviewerName: string;
  reviewerRole: string;
  reviewedAt: string | null;
  reviewSummaryNote: string;
  correctiveActionPlan: string;
  weatherCondition: string;
  windSpeedKmh: number;
}

/**
 * Payload gửi lên khi Kỹ thuật viên trưởng phê duyệt / cập nhật Review Mission (F17)
 */
export interface SubmitMissionReviewPayload {
  missionId: string;
  reviewDecision: MissionReviewDecision;
  rubricScores: MissionReviewRubricScores;
  reviewerName: string;
  reviewerRole: string;
  reviewSummaryNote: string;
  correctiveActionPlan: string;
}

/**
 * Metadata hiển thị cho Trạng thái Nghiệm thu Mission (F17)
 */
export const MISSION_REVIEW_DECISION_META: Record<
  MissionReviewDecision,
  {
    label: string;
    shortLabel: string;
    badgeColor: string;
    badgeBg: string;
    borderColor: string;
    description: string;
  }
> = {
  APPROVED: {
    label: 'Đạt chuẩn nghiệm thu',
    shortLabel: 'Đã duyệt (Approved)',
    badgeColor: '#22c55e',
    badgeBg: 'rgba(34, 197, 94, 0.16)',
    borderColor: 'rgba(34, 197, 94, 0.45)',
    description:
      'Chuyến bay hoàn thành tốt lộ trình, dữ liệu cảm biến đạt độ tin cậy cao và được phê duyệt đưa vào báo cáo chính thức.',
  },
  PENDING_REVIEW: {
    label: 'Chờ nghiệm thu',
    shortLabel: 'Chờ duyệt (Pending)',
    badgeColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.16)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
    description:
      'Chuyến bay đã ghi nhận dữ liệu Telemetry và Note Mission, đang chờ Kỹ thuật viên trưởng đối soát và ký duyệt.',
  },
  NEEDS_REFLIGHT: {
    label: 'Yêu cầu bay bù / Khảo sát lại',
    shortLabel: 'Cần bay lại (Reflight)',
    badgeColor: '#ef4444',
    badgeBg: 'rgba(239, 68, 68, 0.18)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    description:
      'Phát hiện điểm bay bị bỏ qua do lỗi thu thập hoặc mất gói tin vượt ngưỡng cho phép, cần lập lịch bay khảo sát bổ sung.',
  },
  ARCHIVED: {
    label: 'Đã đóng hồ sơ & Lưu trữ',
    shortLabel: 'Lưu trữ (Archived)',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.16)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
    description:
      'Hồ sơ nhiệm vụ bay đã hoàn tất chu kỳ đối soát và được đóng gói vào kho lưu trữ lịch sử dài hạn.',
  },
};

/**
 * Metadata cấu hình cho 5 phân hệ xuất báo cáo Excel (F11)
 */
export const EXPORT_DATASET_CATALOG: Record<ExportDatasetType, ExportDatasetMeta> = {
  SENSOR_TELEMETRY: {
    type: 'SENSOR_TELEMETRY',
    label: 'Dữ liệu Cảm biến & Lịch sử Quan trắc (Sensor Telemetry)',
    shortLabel: 'Cảm biến & Môi trường',
    sheetName: 'DuLieuCamBien_F11',
    apiEndpoint: '/reports/export/sensors',
    description:
      'Trích xuất dữ liệu 6 chỉ số cảm biến (Nhiệt độ, Độ ẩm KK, Độ ẩm Đất, Ánh sáng, CO₂, pH) theo từng Zone và khung thời gian.',
    accentColor: '#38bdf8',
    badgeBg: 'rgba(56, 189, 248, 0.15)',
    defaultColumns: [
      { key: 'id', header: 'Mã bản ghi', widthPx: 110, enabledByDefault: true },
      { key: 'timestamp', header: 'Thời gian đo', widthPx: 155, enabledByDefault: true },
      { key: 'zoneName', header: 'Phân khu (Zone)', widthPx: 170, enabledByDefault: true },
      { key: 'sourceCode', header: 'Mã Cảm biến', widthPx: 130, enabledByDefault: true },
      { key: 'categoryLabel', header: 'Loại chỉ số', widthPx: 140, enabledByDefault: true },
      { key: 'primaryMetric', header: 'Giá trị đo', widthPx: 120, align: 'right', enabledByDefault: true },
      { key: 'secondaryMetric', header: 'Ngưỡng chuẩn', widthPx: 140, align: 'center', enabledByDefault: true },
      { key: 'statusLabel', header: 'Đánh giá', widthPx: 130, align: 'center', enabledByDefault: true },
      { key: 'gpsCoordinates', header: 'Tọa độ GPS Node', widthPx: 165, enabledByDefault: true },
      { key: 'operatorOrNote', header: 'Ghi chú kỹ thuật', widthPx: 220, enabledByDefault: true },
    ],
  },
  ALERT_REPORT: {
    type: 'ALERT_REPORT',
    label: 'Danh sách Cảnh báo Vượt ngưỡng & Biên bản xử lý (Alert Report F08/F11)',
    shortLabel: 'Cảnh báo & Ngưỡng (Alert)',
    sheetName: 'DanhSachCanhBao_F08',
    apiEndpoint: '/reports/export/alerts',
    description:
      'Trích xuất toàn bộ lịch sử cảnh báo vượt ngưỡng (CRITICAL, WARNING, INFO), trạng thái xử lý (OPEN, RESOLVED) và biên bản kỹ thuật viên.',
    accentColor: '#f87171',
    badgeBg: 'rgba(248, 113, 113, 0.15)',
    defaultColumns: [
      { key: 'id', header: 'Mã Cảnh báo', widthPx: 115, enabledByDefault: true },
      { key: 'timestamp', header: 'Thời điểm phát sinh', widthPx: 155, enabledByDefault: true },
      { key: 'zoneName', header: 'Phân khu (Zone)', widthPx: 170, enabledByDefault: true },
      { key: 'sourceCode', header: 'Thiết bị / Node', widthPx: 135, enabledByDefault: true },
      { key: 'categoryLabel', header: 'Loại Cảnh báo', widthPx: 145, enabledByDefault: true },
      { key: 'primaryMetric', header: 'Giá trị Vượt ngưỡng', widthPx: 135, align: 'right', enabledByDefault: true },
      { key: 'secondaryMetric', header: 'Giới hạn Cho phép', widthPx: 145, align: 'center', enabledByDefault: true },
      { key: 'statusLabel', header: 'Trạng thái Xử lý', widthPx: 135, align: 'center', enabledByDefault: true },
      { key: 'operatorOrNote', header: 'Biên bản Xử lý (Resolution)', widthPx: 250, enabledByDefault: true },
    ],
  },
  UAV_OFFLINE_SYNC: {
    type: 'UAV_OFFLINE_SYNC',
    label: 'Lịch sử Đồng bộ Offline UAV SQLite → MQTT Bulk (Sync History)',
    shortLabel: 'Đồng bộ Offline UAV',
    sheetName: 'LichSuSyncUAV_F20',
    apiEndpoint: '/reports/export/uav-sync',
    description:
      'Trích xuất biên bản đồng bộ dữ liệu ngoại tuyến từ bộ nhớ SQLite trên UAV qua giao thức Handshake MQTT Bulk (10 bản ghi/lô).',
    accentColor: '#a78bfa',
    badgeBg: 'rgba(167, 139, 250, 0.15)',
    defaultColumns: [
      { key: 'id', header: 'Mã Phiên Sync', widthPx: 120, enabledByDefault: true },
      { key: 'timestamp', header: 'Thời gian Handshake', widthPx: 155, enabledByDefault: true },
      { key: 'zoneName', header: 'Khu vực Bay', widthPx: 170, enabledByDefault: true },
      { key: 'sourceCode', header: 'Mã UAV / Gateway', widthPx: 140, enabledByDefault: true },
      { key: 'categoryLabel', header: 'Giao thức MQTT', widthPx: 150, enabledByDefault: true },
      { key: 'primaryMetric', header: 'Bản ghi Thành công', widthPx: 135, align: 'right', enabledByDefault: true },
      { key: 'secondaryMetric', header: 'Số lô Bulk / Trùng lặp', widthPx: 145, align: 'center', enabledByDefault: true },
      { key: 'statusLabel', header: 'Kết quả Sync', widthPx: 130, align: 'center', enabledByDefault: true },
      { key: 'operatorOrNote', header: 'Tệp SQLite & Checksum', widthPx: 230, enabledByDefault: true },
    ],
  },
  MISSION_FLIGHT_NOTES: {
    type: 'MISSION_FLIGHT_NOTES',
    label: 'Nhật ký Giám sát Chuyến bay & Note Mission Thủ công (F15/F16/F17)',
    shortLabel: 'Nhật ký & Note Mission',
    sheetName: 'NhatKyMission_F16_F17',
    apiEndpoint: '/reports/export/missions',
    description:
      'Trích xuất tiến độ điểm bay Waypoint, thông số % Pin / Telemetry và toàn bộ Note Mission thủ công kèm tọa độ GPS Snapshot.',
    accentColor: '#34d399',
    badgeBg: 'rgba(52, 211, 153, 0.15)',
    defaultColumns: [
      { key: 'id', header: 'Mã Note / WP', widthPx: 115, enabledByDefault: true },
      { key: 'timestamp', header: 'Thời gian Ghi nhận', widthPx: 155, enabledByDefault: true },
      { key: 'zoneName', header: 'Nhiệm vụ & Phân khu', widthPx: 180, enabledByDefault: true },
      { key: 'sourceCode', header: 'UAV & Điểm bay', widthPx: 145, enabledByDefault: true },
      { key: 'categoryLabel', header: 'Danh mục Ghi chú', widthPx: 150, enabledByDefault: true },
      { key: 'primaryMetric', header: '% Pin & Độ cao AGL', widthPx: 135, align: 'right', enabledByDefault: true },
      { key: 'secondaryMetric', header: 'Sai số GPS / Tín hiệu', widthPx: 145, align: 'center', enabledByDefault: true },
      { key: 'statusLabel', header: 'Trạng thái Bay', widthPx: 135, align: 'center', enabledByDefault: true },
      { key: 'gpsCoordinates', header: 'Tọa độ GPS Snapshot', widthPx: 170, enabledByDefault: true },
      { key: 'operatorOrNote', header: 'Nội dung Ghi chú Hiện trường', widthPx: 260, enabledByDefault: true },
    ],
  },
  FULL_WORKBOOK: {
    type: 'FULL_WORKBOOK',
    label: 'Báo cáo Tổng hợp Toàn Hệ thống Đa Sheet (Multi-Sheet Master Excel)',
    shortLabel: 'Tổng hợp Đa Sheet (All-in-One)',
    sheetName: 'TongHop_SmartFarm_Master',
    apiEndpoint: '/reports/export/full-workbook',
    description:
      'Đóng gói toàn bộ 5 Sheet chuyên sâu trong một tệp Excel (.xlsx) duy nhất: Tổng quan Nghiệm thu Mission (F17), Cảm biến, Cảnh báo (F08), Sync UAV và Note Mission (F16).',
    accentColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.16)',
    defaultColumns: [
      { key: 'id', header: 'Mã Định danh', widthPx: 115, enabledByDefault: true },
      { key: 'datasetType', header: 'Phân hệ Dữ liệu', widthPx: 140, enabledByDefault: true },
      { key: 'timestamp', header: 'Thời gian', widthPx: 155, enabledByDefault: true },
      { key: 'zoneName', header: 'Phân khu (Zone)', widthPx: 165, enabledByDefault: true },
      { key: 'sourceCode', header: 'Nguồn Thiết bị', widthPx: 135, enabledByDefault: true },
      { key: 'categoryLabel', header: 'Hạng mục', widthPx: 145, enabledByDefault: true },
      { key: 'primaryMetric', header: 'Chỉ số Chính', widthPx: 135, align: 'right', enabledByDefault: true },
      { key: 'statusLabel', header: 'Trạng thái', widthPx: 130, align: 'center', enabledByDefault: true },
      { key: 'gpsCoordinates', header: 'Tọa độ GPS', widthPx: 160, enabledByDefault: true },
      { key: 'operatorOrNote', header: 'Chi tiết / Biên bản nghiệm thu', widthPx: 250, enabledByDefault: true },
    ],
  },
};
