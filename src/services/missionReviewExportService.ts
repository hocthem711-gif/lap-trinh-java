// ============================================================================
// SPRINT 8 - LTJ-39: DỊCH VỤ XUẤT BÁO CÁO EXCEL (F11) & REVIEW MISSION (F17)
// Dev 4: Nguyễn Trường An (Quatrungvoon)
// ============================================================================

import { apiRequest } from './api';
import {
  EXPORT_DATASET_CATALOG,
  MISSION_REVIEW_DECISION_META,
  type ExcelExportFilterConfig,
  type ExportColumnDefinition,
  type ExportDatasetType,
  type ExportExecutionHistoryItem,
  type MissionQualityGrade,
  type MissionReviewRecord,
  type MissionReviewRubricScores,
  type NormalizedExportRow,
  type SubmitMissionReviewPayload,
} from '../types/missionReviewExport';
import { fetchFlightSessions, fetchMissionNotes } from './flightMonitorService';
import { alertApi } from './alertService';
import type {
  FlightWaypointNode,
  MissionNote,
  UavFlightSession,
} from '../types/flightMonitor';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const STORAGE_KEY_MISSION_REVIEWS = 'smartfarm_mission_reviews_v1';
const STORAGE_KEY_EXPORT_HISTORY = 'smartfarm_excel_export_history_v1';

// ============================================================================
// 1. CÔNG THỨC TOÁN HỌC: HAVERSINE GPS DRIFT & CHẤM ĐIỂM NGHIỆM THU MISSION
// ============================================================================

/**
 * Tính khoảng cách trắc địa Haversine giữa 2 tọa độ GPS (đơn vị: mét)
 * Dùng để tính sai số lệch quỹ đạo Waypoint (GPS Drift Δd) và quãng đường bay
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Bán kính Trái Đất (m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const rawA =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  // Kẹp a vào [0, 1]: sai số dấu phẩy động có thể làm a > 1 => Math.sqrt(1 - a) = NaN
  const a = Math.min(1, Math.max(0, rawA));
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Number.isFinite(distance) ? Number(distance.toFixed(2)) : 0;
}

/**
 * Công thức chấm điểm chất lượng tổng hợp của nhiệm vụ bay (Overall Mission Score 0 - 100):
 * S = clamp(0.28*PathAcc + 0.25*DataComp + 0.18*BatEff + 0.15*CommLink + 0.14*Safety - 4*ErrorWP)
 */
export function calculateOverallMissionScore(
  rubric: MissionReviewRubricScores,
  errorWaypoints: number = 0
): number {
  const weighted =
    0.28 * rubric.flightPathAccuracy +
    0.25 * rubric.sensorDataCompleteness +
    0.18 * rubric.batteryEfficiencyRating +
    0.15 * rubric.commLinkStability +
    0.14 * rubric.safetyCompliance -
    4 * Math.max(0, errorWaypoints);

  return Math.max(0, Math.min(100, Math.round(weighted)));
}

/**
 * Xếp hạng chữ cái (S / A / B / C / D) từ điểm tổng hợp
 */
export function determineQualityGrade(score: number): MissionQualityGrade {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

// ============================================================================
// 2. DỮ LIỆU KHỞI TẠO CHUẨN CHO MÀN HÌNH REVIEW MISSION (F17)
// ============================================================================

const INITIAL_MISSION_REVIEWS: MissionReviewRecord[] = [
  {
    missionId: 'MSN-2026-071',
    missionCode: 'MSN-2026-071',
    missionTitle: 'Bay Khảo sát Đa phổ & Đo Vi Khí hậu Nhà kính Khu A',
    farmName: 'Nông trại Công nghệ cao Đà Lạt',
    zoneId: 'ZONE-A',
    zoneName: 'Khu A - Nhà kính Dâu tây Công nghệ cao',
    uavId: 'UAV-001',
    uavName: 'UAV Trinh sát 01',
    uavModel: 'DJI Matrice 300 RTK',
    pilotName: 'Nguyễn Trường An (Dev 4)',
    operationalState: 'FLYING',
    reviewDecision: 'APPROVED',
    overallScore: 93,
    qualityGrade: 'S',
    startedAt: '2026-11-18T08:15:00.000Z',
    completedAt: '2026-11-18T08:33:30.000Z',
    plannedDurationMin: 18,
    actualDurationMin: 18.5,
    plannedDistanceM: 1420,
    actualDistanceM: 1436,
    avgSpeedMS: 8.4,
    maxAltitudeM: 46.2,
    startBatteryPercent: 98,
    endBatteryPercent: 74,
    batteryConsumedPercent: 24,
    energyEfficiencyWhPerKm: 118.4,
    totalWaypoints: 6,
    completedWaypoints: 6,
    errorWaypoints: 0,
    totalSensorPackets: 360,
    averageLatencyMs: 36,
    averageRssiDbm: -61,
    maxGpsDriftMeters: 0.68,
    avgGpsDriftMeters: 0.42,
    weatherCondition: 'Nắng nhẹ, quang mây (23.5°C)',
    windSpeedKmh: 11.2,
    rubricScores: {
      flightPathAccuracy: 95,
      sensorDataCompleteness: 96,
      batteryEfficiencyRating: 91,
      commLinkStability: 90,
      safetyCompliance: 94,
    },
    reviewerName: 'Nguyễn Trường An',
    reviewerRole: 'Kỹ thuật viên Trưởng Giám sát UAV (Dev 4)',
    reviewedAt: '2026-11-18T09:10:00.000Z',
    reviewSummaryNote:
      'Chuyến bay MSN-2026-071 bám sát quỹ đạo 6 Waypoints với sai số RTK trung bình chỉ 0.42m. Thu thập đủ 360/360 gói tin đa phổ NDVI và đồng bộ thành công cảnh báo lá dâu tây khô mép tại phía Bắc WP-3.',
    correctiveActionPlan:
      'Duy trì cấu hình độ cao 45m AGL cho Khu A; thông báo bộ phận tưới nhỏ giọt tăng 12% lưu lượng tại luống B4-B6 theo ghi chú Note Mission.',
    waypointAudits: [
      {
        waypointId: 101,
        sequenceNumber: 1,
        label: 'WP-1: Trạm Cất cánh Trung tâm Khu A',
        plannedLat: 11.9404,
        plannedLng: 108.4583,
        actualLat: 11.940402,
        actualLng: 108.458301,
        gpsDriftMeters: 0.25,
        plannedAltitudeM: 25,
        actualAltitudeM: 25.1,
        plannedSpeedMS: 6.5,
        actualSpeedMS: 6.4,
        hoverDurationSec: 5,
        actionRequired: 'Khởi động cảm biến & Hiệu chuẩn La bàn RTK',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 45,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 98,
        signalRssiDbm: -56,
        reachedTimestamp: '2026-11-18T08:15:10.000Z',
        auditRemark: 'Hiệu chuẩn RTK Fix 18 vệ tinh, cất cánh ổn định.',
      },
      {
        waypointId: 102,
        sequenceNumber: 2,
        label: 'WP-2: Hành lang Đông Bắc Nhà kính A1',
        plannedLat: 11.9416,
        plannedLng: 108.4595,
        actualLat: 11.941603,
        actualLng: 108.459497,
        gpsDriftMeters: 0.47,
        plannedAltitudeM: 40,
        actualAltitudeM: 40.3,
        plannedSpeedMS: 8.0,
        actualSpeedMS: 8.1,
        hoverDurationSec: 12,
        actionRequired: 'Quét ảnh nhiệt Hồng ngoại & Bắt gói tin Lora Node A1',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 68,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 93,
        signalRssiDbm: -59,
        reachedTimestamp: '2026-11-18T08:18:40.000Z',
        auditRemark: 'Ảnh nhiệt rõ nét, nhiệt độ mái vòm 25.2°C.',
      },
      {
        waypointId: 103,
        sequenceNumber: 3,
        label: 'WP-3: Phân khu Dâu tây Thủy canh A2',
        plannedLat: 11.9428,
        plannedLng: 108.4608,
        actualLat: 11.942805,
        actualLng: 108.460796,
        gpsDriftMeters: 0.68,
        plannedAltitudeM: 45,
        actualAltitudeM: 44.8,
        plannedSpeedMS: 8.5,
        actualSpeedMS: 8.3,
        hoverDurationSec: 15,
        actionRequired: 'Chụp ảnh Đa phổ NDVI & Đo bức xạ PAR',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 74,
        packetLossPercent: 0.4,
        batteryAtWaypointPercent: 87,
        signalRssiDbm: -62,
        reachedTimestamp: '2026-11-18T08:22:15.000Z',
        auditRemark: 'Phát hiện 3 luống dâu tây phía Bắc giảm độ ẩm đất xuống 41.5%.',
      },
      {
        waypointId: 104,
        sequenceNumber: 4,
        label: 'WP-4: Trạm Bơm Dinh dưỡng & Hồ chứa A3',
        plannedLat: 11.9435,
        plannedLng: 108.4599,
        actualLat: 11.943503,
        actualLng: 108.459903,
        gpsDriftMeters: 0.46,
        plannedAltitudeM: 42,
        actualAltitudeM: 42.1,
        plannedSpeedMS: 7.5,
        actualSpeedMS: 7.6,
        hoverDurationSec: 10,
        actionRequired: 'Đồng bộ Gateway GW-DALAT-01 & Kiểm tra pH/EC',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 65,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 82,
        signalRssiDbm: -63,
        reachedTimestamp: '2026-11-18T08:26:05.000Z',
        auditRemark: 'Gateway GW-DALAT-01 phản hồi 100% gói tin.',
      },
      {
        waypointId: 105,
        sequenceNumber: 5,
        label: 'WP-5: Vành đai Chắn gió Tây Nam Khu A',
        plannedLat: 11.9421,
        plannedLng: 108.4586,
        actualLat: 11.942097,
        actualLng: 108.458602,
        gpsDriftMeters: 0.39,
        plannedAltitudeM: 35,
        actualAltitudeM: 35.2,
        plannedSpeedMS: 7.0,
        actualSpeedMS: 7.1,
        hoverDurationSec: 8,
        actionRequired: 'Đo tốc độ gió & Kiểm tra hàng rào an ninh',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 58,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 78,
        signalRssiDbm: -60,
        reachedTimestamp: '2026-11-18T08:29:50.000Z',
        auditRemark: 'Gió Tây Nam ổn định 11.2 km/h, không có vật cản.',
      },
      {
        waypointId: 106,
        sequenceNumber: 6,
        label: 'WP-6: Điểm Hạ cánh & Trạm Sạc Tự động Khu A',
        plannedLat: 11.9406,
        plannedLng: 108.4582,
        actualLat: 11.940601,
        actualLng: 108.458202,
        gpsDriftMeters: 0.24,
        plannedAltitudeM: 15,
        actualAltitudeM: 15.0,
        plannedSpeedMS: 4.5,
        actualSpeedMS: 4.4,
        hoverDurationSec: 6,
        actionRequired: 'Đóng gói SQLite Telemetry & Hạ cánh chính xác',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 50,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 74,
        signalRssiDbm: -55,
        reachedTimestamp: '2026-11-18T08:33:30.000Z',
        auditRemark: 'Hạ cánh chuẩn tâm đế sạc từ tính, hoàn tất đồng bộ.',
      },
    ],
    fieldNotesSummary: [
      {
        id: 'NOTE-701',
        title: 'Phát hiện lá dâu tây khô nhẹ tại luống B4-B6 gần WP-3',
        category: 'OBSERVATION',
        severity: 'IMPORTANT',
        content:
          'Camera đa phổ ghi nhận chỉ số NDVI tại luống B4-B6 đạt 0.61 (thấp hơn mức trung bình 0.78 của toàn Khu A). Đề xuất tăng chu kỳ phun sương thêm 10 phút vào khung 11h30.',
        waypointLabel: 'WP-3: Phân khu Dâu tây Thủy canh A2',
        createdAt: '2026-11-18T08:23:10.000Z',
        authorName: 'Nguyễn Trường An (Dev 4)',
        gpsSnapshot: '11.942800, 108.460800 (45.0m AGL)',
        batterySnapshotPercent: 87,
      },
      {
        id: 'NOTE-702',
        title: 'Tín hiệu Lora Gateway GW-DALAT-01 đạt ngưỡng rất tốt',
        category: 'MAINTENANCE',
        severity: 'NORMAL',
        content:
          'Đã kiểm tra kết nối từ độ cao 44m AGL, RSSI ổn định ở mức -61 dBm, độ trễ trung bình 36ms, không rớt gói tin nào khi bay qua mái vòm kim loại.',
        waypointLabel: 'WP-2: Hành lang Đông Bắc Nhà kính A1',
        createdAt: '2026-11-18T08:19:00.000Z',
        authorName: 'Đào Thiện Hiếu (Dev 2)',
        gpsSnapshot: '11.941600, 108.459500 (40.3m AGL)',
        batterySnapshotPercent: 93,
      },
    ],
  },
  {
    missionId: 'MSN-2026-072',
    missionCode: 'MSN-2026-072',
    missionTitle: 'Tuần tra Nhiệt độ Cực đoan & Đồng bộ Offline Khu B',
    farmName: 'Nông trại Công nghệ cao Đà Lạt',
    zoneId: 'ZONE-B',
    zoneName: 'Khu B - Cánh đồng Rau Thủy canh & Trạm Khí tượng',
    uavId: 'UAV-002',
    uavName: 'UAV Giám sát 02',
    uavModel: 'DJI Matrice 30T Thermal',
    pilotName: 'Nguyễn Trường An (Dev 4)',
    operationalState: 'RETURNING',
    reviewDecision: 'PENDING_REVIEW',
    overallScore: 84,
    qualityGrade: 'A',
    startedAt: '2026-11-18T14:00:00.000Z',
    completedAt: '2026-11-18T14:21:15.000Z',
    plannedDurationMin: 20,
    actualDurationMin: 21.2,
    plannedDistanceM: 1680,
    actualDistanceM: 1715,
    avgSpeedMS: 6.2,
    maxAltitudeM: 50.4,
    startBatteryPercent: 94,
    endBatteryPercent: 21,
    batteryConsumedPercent: 73,
    energyEfficiencyWhPerKm: 154.6,
    totalWaypoints: 5,
    completedWaypoints: 4,
    errorWaypoints: 0,
    totalSensorPackets: 295,
    averageLatencyMs: 52,
    averageRssiDbm: -70,
    maxGpsDriftMeters: 1.15,
    avgGpsDriftMeters: 0.78,
    weatherCondition: 'Gió Tây Bắc mạnh từng cơn (26.4°C)',
    windSpeedKmh: 24.5,
    rubricScores: {
      flightPathAccuracy: 85,
      sensorDataCompleteness: 86,
      batteryEfficiencyRating: 78,
      commLinkStability: 82,
      safetyCompliance: 90,
    },
    reviewerName: 'Nguyễn Trường An',
    reviewerRole: 'Kỹ thuật viên Trưởng Giám sát UAV (Dev 4)',
    reviewedAt: null,
    reviewSummaryNote:
      'UAV-002 hoàn thành 4/5 Waypoint chính và kích hoạt chế độ Về trạm tự động (RTH) khi Pin đạt 21% do ngược gió Tây Bắc 24.5 km/h. Dữ liệu ảnh nhiệt tại WP-3 đã được bảo toàn nguyên vẹn trong bộ nhớ đệm.',
    correctiveActionPlan:
      'Kiểm tra tình trạng nội trở bộ Pin TB30 số #02 trước ca bay chiều mai và hoàn tất ký duyệt hồ sơ.',
    waypointAudits: [
      {
        waypointId: 201,
        sequenceNumber: 1,
        label: 'WP-1: Bệ phóng Khu B - Trạm Khí tượng',
        plannedLat: 11.9365,
        plannedLng: 108.4521,
        actualLat: 11.936503,
        actualLng: 108.452102,
        gpsDriftMeters: 0.4,
        plannedAltitudeM: 28,
        actualAltitudeM: 28.2,
        plannedSpeedMS: 7.0,
        actualSpeedMS: 6.8,
        hoverDurationSec: 5,
        actionRequired: 'Cất cánh & Kết nối cảm biến gió Khu B',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 62,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 94,
        signalRssiDbm: -62,
        reachedTimestamp: '2026-11-18T14:01:00.000Z',
        auditRemark: 'Cất cánh an toàn.',
      },
      {
        waypointId: 202,
        sequenceNumber: 2,
        label: 'WP-2: Dãy Máng Thủy canh Rau Xà lách B1',
        plannedLat: 11.9378,
        plannedLng: 108.4534,
        actualLat: 11.937806,
        actualLng: 108.453394,
        gpsDriftMeters: 0.94,
        plannedAltitudeM: 48,
        actualAltitudeM: 48.5,
        plannedSpeedMS: 8.5,
        actualSpeedMS: 7.4,
        hoverDurationSec: 12,
        actionRequired: 'Quét nhiệt độ mặt nước máng thủy canh',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 78,
        packetLossPercent: 0.8,
        batteryAtWaypointPercent: 74,
        signalRssiDbm: -68,
        reachedTimestamp: '2026-11-18T14:06:15.000Z',
        auditRemark: 'Nhiệt độ dung dịch thủy canh ổn định 21.8°C.',
      },
      {
        waypointId: 203,
        sequenceNumber: 3,
        label: 'WP-3: Khu vực Cảm biến CO₂ & Ánh sáng B2',
        plannedLat: 11.9389,
        plannedLng: 108.4548,
        actualLat: 11.938908,
        actualLng: 108.454793,
        gpsDriftMeters: 1.15,
        plannedAltitudeM: 50,
        actualAltitudeM: 50.4,
        plannedSpeedMS: 8.5,
        actualSpeedMS: 6.9,
        hoverDurationSec: 15,
        actionRequired: 'Thu thập Bulk SQLite từ Node Offline B2',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 85,
        packetLossPercent: 1.2,
        batteryAtWaypointPercent: 48,
        signalRssiDbm: -73,
        reachedTimestamp: '2026-11-18T14:12:40.000Z',
        auditRemark: 'Đã hút 120 bản ghi SQLite từ Node Offline B2.',
      },
      {
        waypointId: 204,
        sequenceNumber: 4,
        label: 'WP-4: Hành lang Điện mặt trời Khu B3',
        plannedLat: 11.9374,
        plannedLng: 108.4555,
        actualLat: 11.937405,
        actualLng: 108.455504,
        gpsDriftMeters: 0.71,
        plannedAltitudeM: 40,
        actualAltitudeM: 38.6,
        plannedSpeedMS: 7.5,
        actualSpeedMS: 6.2,
        hoverDurationSec: 10,
        actionRequired: 'Kiểm tra tấm Pin năng lượng mặt trời',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 70,
        packetLossPercent: 0.5,
        batteryAtWaypointPercent: 26,
        signalRssiDbm: -71,
        reachedTimestamp: '2026-11-18T14:17:20.000Z',
        auditRemark: 'Kích hoạt cảnh báo Pin yếu, chuẩn bị RTH.',
      },
      {
        waypointId: 205,
        sequenceNumber: 5,
        label: 'WP-5: Trạm Thu hồi & Đế sạc Khu B',
        plannedLat: 11.9365,
        plannedLng: 108.4521,
        actualLat: 11.936504,
        actualLng: 108.452105,
        gpsDriftMeters: 0.69,
        plannedAltitudeM: 12,
        actualAltitudeM: 12.0,
        plannedSpeedMS: 5.0,
        actualSpeedMS: 5.5,
        hoverDurationSec: 5,
        actionRequired: 'Hạ cánh an toàn & Xả bộ nhớ đệm',
        executionStatus: 'ACTIVE',
        sensorPacketsCollected: 0,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 21,
        signalRssiDbm: -64,
        reachedTimestamp: '2026-11-18T14:21:15.000Z',
        auditRemark: 'Đang hạ cánh RTH tự động ở mức pin 21%.',
      },
    ],
    fieldNotesSummary: [
      {
        id: 'NOTE-703',
        title: 'Kích hoạt chế độ Về trạm (RETURNING) do gió ngược làm hao pin nhanh',
        category: 'BATTERY_LOG',
        severity: 'URGENT',
        content:
          'Gió Tây Bắc giật 24.5 km/h tại Khu B làm dòng xả tăng lên 16.8A. Đã chuyển trạng thái UAV-002 sang Về trạm (RETURNING) tại mốc pin 21% để bảo vệ tuổi thọ cell LiPo.',
        waypointLabel: 'WP-4: Hành lang Điện mặt trời Khu B3',
        createdAt: '2026-11-18T14:17:45.000Z',
        authorName: 'Nguyễn Trường An (Dev 4)',
        gpsSnapshot: '11.937400, 108.455500 (38.6m AGL)',
        batterySnapshotPercent: 21,
      },
    ],
  },
  {
    missionId: 'MSN-2026-073',
    missionCode: 'MSN-2026-073',
    missionTitle: 'Bay Kiểm tra Sự cố Mất Gói tin Cảm biến Đất Khu C',
    farmName: 'Nông trại Công nghệ cao Đà Lạt',
    zoneId: 'ZONE-C',
    zoneName: 'Khu C - Vườn Ươm Giống & Cảm biến Đất sâu',
    uavId: 'UAV-003',
    uavName: 'UAV Tuần tra 03',
    uavModel: 'Autel EVO II Dual 640T',
    pilotName: 'Nguyễn Trường An (Dev 4)',
    operationalState: 'COLLECTION_ERROR',
    reviewDecision: 'NEEDS_REFLIGHT',
    overallScore: 54,
    qualityGrade: 'D',
    startedAt: '2026-11-18T16:10:00.000Z',
    completedAt: '2026-11-18T16:28:40.000Z',
    plannedDurationMin: 22,
    actualDurationMin: 18.6,
    plannedDistanceM: 1850,
    actualDistanceM: 1120,
    avgSpeedMS: 3.1,
    maxAltitudeM: 36.0,
    startBatteryPercent: 85,
    endBatteryPercent: 16,
    batteryConsumedPercent: 69,
    energyEfficiencyWhPerKm: 210.5,
    totalWaypoints: 5,
    completedWaypoints: 2,
    errorWaypoints: 2,
    totalSensorPackets: 94,
    averageLatencyMs: 390,
    averageRssiDbm: -89,
    maxGpsDriftMeters: 3.45,
    avgGpsDriftMeters: 2.12,
    weatherCondition: 'Sương mù dày & Nhiễu từ trường cục bộ (18.2°C)',
    windSpeedKmh: 19.8,
    rubricScores: {
      flightPathAccuracy: 62,
      sensorDataCompleteness: 45,
      batteryEfficiencyRating: 52,
      commLinkStability: 48,
      safetyCompliance: 82,
    },
    reviewerName: 'Nguyễn Trường An',
    reviewerRole: 'Kỹ thuật viên Trưởng Giám sát UAV (Dev 4)',
    reviewedAt: '2026-11-18T17:00:00.000Z',
    reviewSummaryNote:
      'Phát hiện lỗi COLLECTION_ERROR (ERR_LORA_PACKET_LOSS_88) tại WP-3 Khu C do nhiễu sóng từ máy biến áp trạm bơm. Tỷ lệ mất gói tin vượt 38%, sai số quỹ đạo GPS lên tới 3.45m. Không đủ dữ liệu nghiệm thu Khu C.',
    correctiveActionPlan:
      'Yêu cầu đổi tần số kênh Lora Gateway GW-DALAT-03 sang 923.4 MHz, thay pin mới cho UAV-003 và thực hiện chuyến bay bù (Reflight) vào 08:00 sáng mai.',
    waypointAudits: [
      {
        waypointId: 301,
        sequenceNumber: 1,
        label: 'WP-1: Điểm Xuất phát Vườn Ươm Khu C',
        plannedLat: 11.9321,
        plannedLng: 108.4612,
        actualLat: 11.932104,
        actualLng: 108.461205,
        gpsDriftMeters: 0.7,
        plannedAltitudeM: 22,
        actualAltitudeM: 22.3,
        plannedSpeedMS: 6.0,
        actualSpeedMS: 5.9,
        hoverDurationSec: 5,
        actionRequired: 'Khởi tạo kết nối Gateway Khu C',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 48,
        packetLossPercent: 2.1,
        batteryAtWaypointPercent: 85,
        signalRssiDbm: -74,
        reachedTimestamp: '2026-11-18T16:10:15.000Z',
        auditRemark: 'Khởi hành bình thường.',
      },
      {
        waypointId: 302,
        sequenceNumber: 2,
        label: 'WP-2: Khu Đất Ươm Hạt giống C1',
        plannedLat: 11.9334,
        plannedLng: 108.4625,
        actualLat: 11.933412,
        actualLng: 108.462489,
        gpsDriftMeters: 1.79,
        plannedAltitudeM: 32,
        actualAltitudeM: 31.4,
        plannedSpeedMS: 7.0,
        actualSpeedMS: 6.1,
        hoverDurationSec: 10,
        actionRequired: 'Đọc cảm biến độ ẩm đất tầng sâu 30cm',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 34,
        packetLossPercent: 14.5,
        batteryAtWaypointPercent: 61,
        signalRssiDbm: -82,
        reachedTimestamp: '2026-11-18T16:15:30.000Z',
        auditRemark: 'Tín hiệu RSSI suy giảm mạnh xuống -82 dBm.',
      },
      {
        waypointId: 303,
        sequenceNumber: 3,
        label: 'WP-3: Trạm Cảm biến pH & Độ dẫn điện EC Đất C2',
        plannedLat: 11.9346,
        plannedLng: 108.4639,
        actualLat: 11.934625,
        actualLng: 108.463881,
        gpsDriftMeters: 3.45,
        plannedAltitudeM: 35,
        actualAltitudeM: 35.8,
        plannedSpeedMS: 7.0,
        actualSpeedMS: 2.4,
        hoverDurationSec: 25,
        actionRequired: 'Thu thập gói tin pH/EC & Chụp quang phổ lá non',
        executionStatus: 'SKIPPED_ERROR',
        sensorPacketsCollected: 12,
        packetLossPercent: 68.4,
        batteryAtWaypointPercent: 24,
        signalRssiDbm: -91,
        reachedTimestamp: '2026-11-18T16:22:10.000Z',
        auditRemark: 'LỖI ERR_LORA_PACKET_LOSS_88: Timeout kết nối Node SOIL-C2-09.',
      },
      {
        waypointId: 304,
        sequenceNumber: 4,
        label: 'WP-4: Khu Nhà Lưới Cách ly C3',
        plannedLat: 11.9338,
        plannedLng: 108.4648,
        actualLat: 11.9338,
        actualLng: 108.4648,
        gpsDriftMeters: 0,
        plannedAltitudeM: 35,
        actualAltitudeM: 0,
        plannedSpeedMS: 7.0,
        actualSpeedMS: 0,
        hoverDurationSec: 12,
        actionRequired: 'Quét vi khí hậu nhà lưới C3',
        executionStatus: 'SKIPPED_ERROR',
        sensorPacketsCollected: 0,
        packetLossPercent: 100,
        batteryAtWaypointPercent: 19,
        signalRssiDbm: -93,
        reachedTimestamp: null,
        auditRemark: 'Hủy điểm bay do lỗi thu thập & dung lượng pin chạm ngưỡng nguy hiểm.',
      },
      {
        waypointId: 305,
        sequenceNumber: 5,
        label: 'WP-5: Bãi Đáp Dự phòng Khu C',
        plannedLat: 11.9322,
        plannedLng: 108.4614,
        actualLat: 11.932215,
        actualLng: 108.461388,
        gpsDriftMeters: 2.12,
        plannedAltitudeM: 10,
        actualAltitudeM: 10.2,
        plannedSpeedMS: 4.5,
        actualSpeedMS: 4.8,
        hoverDurationSec: 5,
        actionRequired: 'Hạ cánh khẩn cấp & Trích xuất Log lỗi',
        executionStatus: 'REACHED',
        sensorPacketsCollected: 0,
        packetLossPercent: 0,
        batteryAtWaypointPercent: 16,
        signalRssiDbm: -78,
        reachedTimestamp: '2026-11-18T16:28:40.000Z',
        auditRemark: 'Đã hạ cánh khẩn cấp an toàn tại bãi đáp dự phòng.',
      },
    ],
    fieldNotesSummary: [
      {
        id: 'NOTE-704',
        title: 'Báo động Thu thập lỗi (COLLECTION_ERROR) tại Node SOIL-C2-09',
        category: 'INCIDENT',
        severity: 'URGENT',
        content:
          'UAV-003 treo tại WP-3 quá 20 giây nhưng không nhận được phản hồi ACK từ cảm biến pH đất SOIL-C2-09. RSSI tụt xuống -91 dBm. Yêu cầu cử kỹ thuật viên kiểm tra ăng-ten Node SOIL-C2-09 và lập lịch bay bù.',
        waypointLabel: 'WP-3: Trạm Cảm biến pH & Độ dẫn điện EC Đất C2',
        createdAt: '2026-11-18T16:23:00.000Z',
        authorName: 'Nguyễn Trường An (Dev 4)',
        gpsSnapshot: '11.934625, 108.463881 (35.8m AGL)',
        batterySnapshotPercent: 24,
      },
    ],
  },
];

// ============================================================================
// 3. QUẢN LÝ LƯU TRỮ LOCALSTORAGE & ĐỒNG BỘ DỮ LIỆU LIÊN SPRINT
// ============================================================================

function loadStoredMissionReviews(): MissionReviewRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MISSION_REVIEWS);
    if (!raw) {
      localStorage.setItem(
        STORAGE_KEY_MISSION_REVIEWS,
        JSON.stringify(INITIAL_MISSION_REVIEWS)
      );
      return INITIAL_MISSION_REVIEWS;
    }
    const parsed = JSON.parse(raw) as MissionReviewRecord[];
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : INITIAL_MISSION_REVIEWS;
  } catch {
    return INITIAL_MISSION_REVIEWS;
  }
}

/** Ánh xạ zoneId số của Sprint 7 sang mã Zone dùng trong bộ lọc Sprint 8 */
const ZONE_CODE_BY_ID: Record<number, string> = {
  1: 'ZONE-A',
  2: 'ZONE-B',
  3: 'ZONE-C',
};

/** Dung lượng 2 pin TB60 của DJI Matrice 300 RTK (2 x 274 Wh) dùng để tính Wh/km */
const UAV_BATTERY_CAPACITY_WH = 548;

/**
 * Chuyển 1 Note Mission (Sprint 7) sang định dạng Ghi chú hiện trường của hồ sơ nghiệm thu (Sprint 8)
 */
function mapLiveNoteToFieldNote(
  n: MissionNote
): MissionReviewRecord['fieldNotesSummary'][number] {
  return {
    id: `NOTE-${n.id}`,
    title: n.title,
    category: n.category,
    severity: n.priority,
    content: n.content,
    waypointLabel: `WP-${n.waypointOrder}`,
    createdAt: n.createdAt,
    authorName: n.author,
    gpsSnapshot: `${n.latitude.toFixed(6)}, ${n.longitude.toFixed(6)}`,
    batterySnapshotPercent: n.batteryAtNote,
  };
}

function mapVisitStateToAuditStatus(
  state: FlightWaypointNode['visitState']
): MissionReviewRecord['waypointAudits'][number]['executionStatus'] {
  if (state === 'COMPLETED') return 'REACHED';
  if (state === 'ERROR') return 'SKIPPED_ERROR';
  return state;
}

/**
 * Tạo hồ sơ nghiệm thu "Chờ duyệt" cho phiên bay Sprint 7 chưa có hồ sơ ở Sprint 8
 * (VD: UAV-004 / MSN-2026-074). Mọi chỉ số đều tạm tính từ Telemetry thực tế của phiên bay,
 * điểm rubric chỉ là gợi ý ban đầu để Kỹ thuật viên trưởng chấm lại khi ký duyệt.
 */
function buildPendingReviewFromSession(s: UavFlightSession): MissionReviewRecord {
  const totalWp = Math.max(1, s.totalWaypoints);
  const totalPackets = s.packetsCollected + s.packetErrors;
  const consumedBattery = Math.max(0, Math.round((100 - s.batteryPercent) * 10) / 10);
  const distanceKm = s.distanceTraveledM / 1000;
  const rssiDbm = Math.round(s.signalStrength / 2 - 100);

  const rubricScores: MissionReviewRubricScores = {
    flightPathAccuracy: Math.round((s.completedWaypoints / totalWp) * 100),
    sensorDataCompleteness:
      totalPackets > 0 ? Math.round((s.packetsCollected / totalPackets) * 100) : 0,
    batteryEfficiencyRating: Math.round(Math.max(0, Math.min(100, s.batteryPercent))),
    commLinkStability: Math.round(Math.max(0, Math.min(100, s.signalStrength))),
    safetyCompliance: Math.max(50, 100 - s.packetErrors),
  };
  const errorWaypoints = s.waypoints.filter((wp) => wp.visitState === 'ERROR').length;
  const overallScore = calculateOverallMissionScore(rubricScores, errorWaypoints);

  return {
    missionId: s.missionCode,
    missionCode: s.missionCode,
    missionTitle: s.missionName,
    farmName: 'Nông trại Công nghệ cao Đà Lạt',
    zoneId: ZONE_CODE_BY_ID[s.zoneId] ?? `ZONE-${s.zoneId}`,
    zoneName: s.zoneName,
    uavId: s.uavId,
    uavName: s.uavName,
    uavModel: s.uavModel,
    pilotName: 'Nguyễn Trường An (Dev 4)',
    operationalState: s.status,
    reviewDecision: 'PENDING_REVIEW',
    overallScore,
    qualityGrade: determineQualityGrade(overallScore),
    startedAt: s.startedAt,
    completedAt: s.lastTelemetryAt,
    plannedDurationMin: Number(((s.elapsedSeconds + s.estimatedRemainingSeconds) / 60).toFixed(1)),
    actualDurationMin: Number((s.elapsedSeconds / 60).toFixed(1)),
    plannedDistanceM: s.totalRouteDistanceM,
    actualDistanceM: Math.round(s.distanceTraveledM),
    avgSpeedMS:
      s.elapsedSeconds > 0 ? Number((s.distanceTraveledM / s.elapsedSeconds).toFixed(1)) : 0,
    maxAltitudeM: Math.max(0, ...s.waypoints.map((wp) => wp.altitudeM)),
    startBatteryPercent: 100,
    endBatteryPercent: s.batteryPercent,
    batteryConsumedPercent: consumedBattery,
    energyEfficiencyWhPerKm:
      distanceKm > 0
        ? Number((((consumedBattery / 100) * UAV_BATTERY_CAPACITY_WH) / distanceKm).toFixed(1))
        : 0,
    totalWaypoints: s.totalWaypoints,
    completedWaypoints: s.completedWaypoints,
    errorWaypoints,
    totalSensorPackets: s.packetsCollected,
    averageLatencyMs: 0,
    averageRssiDbm: rssiDbm,
    maxGpsDriftMeters: 0,
    avgGpsDriftMeters: 0,
    waypointAudits: s.waypoints.map((wp) => {
      const wpTotal = wp.collectedPackets + wp.errorPackets;
      return {
        waypointId: s.missionId * 100 + wp.order,
        sequenceNumber: wp.order,
        label: wp.label,
        plannedLat: wp.latitude,
        plannedLng: wp.longitude,
        actualLat: wp.latitude,
        actualLng: wp.longitude,
        gpsDriftMeters: 0,
        plannedAltitudeM: wp.altitudeM,
        actualAltitudeM: wp.altitudeM,
        plannedSpeedMS: wp.targetSpeedMs,
        actualSpeedMS: wp.targetSpeedMs,
        hoverDurationSec: 0,
        actionRequired: 'Thu thập dữ liệu cảm biến theo lộ trình đã lập (Sprint 4)',
        executionStatus: mapVisitStateToAuditStatus(wp.visitState),
        sensorPacketsCollected: wp.collectedPackets,
        packetLossPercent: wpTotal > 0 ? Math.round((wp.errorPackets / wpTotal) * 1000) / 10 : 0,
        batteryAtWaypointPercent: s.batteryPercent,
        signalRssiDbm: rssiDbm,
        reachedTimestamp:
          wp.reachedAt && !Number.isNaN(Date.parse(wp.reachedAt)) ? wp.reachedAt : null,
        auditRemark: 'Tự động tạo từ Telemetry phiên bay Sprint 7 — chờ đối soát thực địa.',
      };
    }),
    fieldNotesSummary: [],
    rubricScores,
    reviewerName: '',
    reviewerRole: '',
    reviewedAt: null,
    reviewSummaryNote:
      'Hồ sơ tự động tạo từ phiên bay Sprint 7 (Giám sát bay & Note Mission). Điểm hiện tại được tạm tính từ Telemetry, chờ Kỹ thuật viên trưởng đối soát và ký duyệt.',
    correctiveActionPlan: '',
    weatherCondition: 'Chưa ghi nhận',
    windSpeedKmh: 0,
  };
}

function saveStoredMissionReviews(records: MissionReviewRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MISSION_REVIEWS, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadStoredExportHistory(): ExportExecutionHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPORT_HISTORY);
    if (!raw) {
      const seedHistory: ExportExecutionHistoryItem[] = [
        {
          id: 'EXP-2026-001',
          fileName: 'SmartFarm_TongHop_Master_20261118.xls',
          datasetType: 'FULL_WORKBOOK',
          datasetLabel: 'Tổng hợp Đa Sheet (All-in-One)',
          fileFormat: 'XLSX',
          rowCount: 48,
          sheetCount: 5,
          fileSizeKb: 64.8,
          zoneFilter: 'ALL',
          timeRange: '7D',
          exportedBy: 'Nguyễn Trường An (Dev 4)',
          exportedAt: '2026-11-18T17:30:00.000Z',
          executionSource: 'HYBRID_CLIENT_ENGINE',
        },
        {
          id: 'EXP-2026-002',
          fileName: 'SmartFarm_CanhBao_Alert_F08_20261118.csv',
          datasetType: 'ALERT_REPORT',
          datasetLabel: 'Cảnh báo & Ngưỡng (Alert)',
          fileFormat: 'CSV',
          rowCount: 14,
          sheetCount: 1,
          fileSizeKb: 18.2,
          zoneFilter: 'ZONE-A',
          timeRange: '24H',
          exportedBy: 'Nguyễn Trường An (Dev 4)',
          exportedAt: '2026-11-18T15:10:00.000Z',
          executionSource: 'HYBRID_CLIENT_ENGINE',
        },
      ];
      localStorage.setItem(STORAGE_KEY_EXPORT_HISTORY, JSON.stringify(seedHistory));
      return seedHistory;
    }
    return JSON.parse(raw) as ExportExecutionHistoryItem[];
  } catch {
    return [];
  }
}

function appendExportHistoryItem(item: ExportExecutionHistoryItem): ExportExecutionHistoryItem[] {
  const current = loadStoredExportHistory();
  const updated = [item, ...current].slice(0, 25);
  try {
    localStorage.setItem(STORAGE_KEY_EXPORT_HISTORY, JSON.stringify(updated));
  } catch {
    // Ignore quota error
  }
  return updated;
}

// ============================================================================
// 4. TỔNG HỢP DỮ LIỆU BẢNG PREVIEW & XUẤT EXCEL ĐA PHÂN HỆ (F11)
// ============================================================================

/**
 * Sinh danh sách dòng dữ liệu chuẩn hóa cho bảng Preview & Xuất Excel (F11)
 * Tự động kết hợp dữ liệu thực tế từ Sprint 5 (Sync), Sprint 6 (Alert), Sprint 7 (Note Mission)
 */
export async function buildExportPreviewDataset(
  reviews: MissionReviewRecord[]
): Promise<NormalizedExportRow[]> {
  const rows: NormalizedExportRow[] = [];

  // 4.1. Dữ liệu Cảm biến Quan trắc (SENSOR_TELEMETRY)
  const sensorSamples: NormalizedExportRow[] = [
    {
      id: 'SEN-REC-801',
      datasetType: 'SENSOR_TELEMETRY',
      timestamp: '2026-11-18 16:40:00',
      zoneName: 'Khu A - Nhà kính Dâu tây Công nghệ cao',
      sourceCode: 'TEMP-A1-01',
      categoryLabel: 'Nhiệt độ Không khí (°C)',
      primaryMetric: '24.6 °C',
      secondaryMetric: '15.0 - 30.0 °C',
      statusLabel: 'An toàn (NORMAL)',
      severityLevel: 'NORMAL',
      gpsCoordinates: '11.9416, 108.4595',
      operatorOrNote: 'Vi khí hậu nhà kính A1 ổn định, quạt đối lưu chạy 60% công suất.',
      rawValues: { value: 24.6, unit: '°C', min: 15, max: 30 },
    },
    {
      id: 'SEN-REC-802',
      datasetType: 'SENSOR_TELEMETRY',
      timestamp: '2026-11-18 16:35:00',
      zoneName: 'Khu A - Nhà kính Dâu tây Công nghệ cao',
      sourceCode: 'SOIL-A2-04',
      categoryLabel: 'Độ ẩm Đất (%)',
      primaryMetric: '41.5 %',
      secondaryMetric: '45.0 - 80.0 %',
      statusLabel: 'Cảnh báo Thấp (WARNING)',
      severityLevel: 'WARNING',
      gpsCoordinates: '11.9428, 108.4608',
      operatorOrNote: 'Độ ẩm đất luống B4-B6 giảm nhẹ dưới ngưỡng 45%, khớp ảnh đa phổ UAV-001.',
      rawValues: { value: 41.5, unit: '%', min: 45, max: 80 },
    },
    {
      id: 'SEN-REC-803',
      datasetType: 'SENSOR_TELEMETRY',
      timestamp: '2026-11-18 16:30:00',
      zoneName: 'Khu B - Cánh đồng Rau Thủy canh & Trạm Khí tượng',
      sourceCode: 'TEMP-B1-02',
      categoryLabel: 'Nhiệt độ Dung dịch (°C)',
      primaryMetric: '21.8 °C',
      secondaryMetric: '18.0 - 26.0 °C',
      statusLabel: 'An toàn (NORMAL)',
      severityLevel: 'NORMAL',
      gpsCoordinates: '11.9378, 108.4534',
      operatorOrNote: 'Nhiệt độ máng thủy canh đạt chuẩn hấp thụ dinh dưỡng.',
      rawValues: { value: 21.8, unit: '°C', min: 18, max: 26 },
    },
    {
      id: 'SEN-REC-804',
      datasetType: 'SENSOR_TELEMETRY',
      timestamp: '2026-11-18 16:25:00',
      zoneName: 'Khu B - Cánh đồng Rau Thủy canh & Trạm Khí tượng',
      sourceCode: 'CO2-B2-07',
      categoryLabel: 'Nồng độ CO₂ (ppm)',
      primaryMetric: '1,180 ppm',
      secondaryMetric: '350 - 1,200 ppm',
      statusLabel: 'An toàn (NORMAL)',
      severityLevel: 'NORMAL',
      gpsCoordinates: '11.9389, 108.4548',
      operatorOrNote: 'Quang hợp buổi chiều diễn ra mạnh, nồng độ CO₂ trong ngưỡng tối ưu.',
      rawValues: { value: 1180, unit: 'ppm', min: 350, max: 1200 },
    },
    {
      id: 'SEN-REC-805',
      datasetType: 'SENSOR_TELEMETRY',
      timestamp: '2026-11-18 16:20:00',
      zoneName: 'Khu C - Vườn Ươm Giống & Cảm biến Đất sâu',
      sourceCode: 'PH-C2-09',
      categoryLabel: 'Độ pH Đất (pH)',
      primaryMetric: '5.1 pH',
      secondaryMetric: '5.5 - 7.0 pH',
      statusLabel: 'Cảnh báo Chua (WARNING)',
      severityLevel: 'WARNING',
      gpsCoordinates: '11.9346, 108.4639',
      operatorOrNote: 'Đất vườn ươm C2 hơi chua nhẹ, cần bổ sung vôi nông nghiệp CaCO₃.',
      rawValues: { value: 5.1, unit: 'pH', min: 5.5, max: 7.0 },
    },
    {
      id: 'SEN-REC-806',
      datasetType: 'SENSOR_TELEMETRY',
      timestamp: '2026-11-18 16:15:00',
      zoneName: 'Khu A - Nhà kính Dâu tây Công nghệ cao',
      sourceCode: 'LIGHT-A1-03',
      categoryLabel: 'Cường độ Ánh sáng (lux)',
      primaryMetric: '28,450 lux',
      secondaryMetric: '10,000 - 45,000 lux',
      statusLabel: 'An toàn (NORMAL)',
      severityLevel: 'NORMAL',
      gpsCoordinates: '11.9412, 108.4589',
      operatorOrNote: 'Hệ thống rèm che nắng tự động mở 75%.',
      rawValues: { value: 28450, unit: 'lux', min: 10000, max: 45000 },
    },
  ];
  rows.push(...sensorSamples);

  // 4.2. Dữ liệu Cảnh báo Vượt ngưỡng từ Sprint 6 (ALERT_REPORT - LTJ-29 / LTJ-37)
  try {
    const alerts = await alertApi.getAll();
    for (const al of alerts) {
      rows.push({
        id: al.alertCode || `ALT-${al.id}`,
        datasetType: 'ALERT_REPORT',
        timestamp: al.createdAt.replace('T', ' ').slice(0, 19),
        zoneName: al.zoneName,
        sourceCode: al.sensorCode,
        categoryLabel: `${al.sensorType} (${al.alertLevel})`,
        primaryMetric: `${al.measuredValue} ${al.unit}`,
        secondaryMetric: `${al.thresholdMin} - ${al.thresholdMax} ${al.unit}`,
        statusLabel:
          al.status === 'RESOLVED'
            ? 'Đã đóng (RESOLVED)'
            : al.status === 'ACKNOWLEDGED'
              ? 'Đã tiếp nhận (ACK)'
              : 'Đang mở (OPEN)',
        severityLevel:
          al.alertLevel === 'CRITICAL'
            ? 'CRITICAL'
            : al.alertLevel === 'WARNING'
              ? 'WARNING'
              : 'INFO',
        gpsCoordinates: '11.9415, 108.4592',
        operatorOrNote:
          al.resolvedNote ||
          al.message ||
          'Chờ kỹ thuật viên trực ca kiểm tra và đóng cảnh báo.',
        rawValues: {
          recordedValue: al.measuredValue,
          status: al.status,
          level: al.alertLevel,
        },
      });
    }
  } catch {
    // Fallback static alert rows if needed
  }

  // 4.3. Dữ liệu Lịch sử Đồng bộ Offline UAV từ Sprint 5 (UAV_OFFLINE_SYNC - LTJ-24 / LTJ-25)
  const syncSamples: NormalizedExportRow[] = [
    {
      id: 'SYNC-2026-101',
      datasetType: 'UAV_OFFLINE_SYNC',
      timestamp: '2026-11-18 14:22:10',
      zoneName: 'Khu B - Cánh đồng Rau Thủy canh & Trạm Khí tượng',
      sourceCode: 'UAV-002 → GW-DALAT-02',
      categoryLabel: 'iot/ltj/sync/bulk (10 rec/batch)',
      primaryMetric: '120 / 120 bản ghi',
      secondaryMetric: '12 lô Bulk (0 trùng lặp)',
      statusLabel: 'Thành công (COMPLETED)',
      severityLevel: 'NORMAL',
      gpsCoordinates: '11.9365, 108.4521',
      operatorOrNote: 'DB: iot_offline.db | SHA256: 9f4e2a8c...d17b | Thời gian đồng bộ: 1.84s',
      rawValues: { totalRecords: 120, batches: 12, duplicates: 0 },
    },
    {
      id: 'SYNC-2026-102',
      datasetType: 'UAV_OFFLINE_SYNC',
      timestamp: '2026-11-18 08:34:05',
      zoneName: 'Khu A - Nhà kính Dâu tây Công nghệ cao',
      sourceCode: 'UAV-001 → GW-DALAT-01',
      categoryLabel: 'iot/ltj/sync/handshake/complete',
      primaryMetric: '90 / 90 bản ghi',
      secondaryMetric: '9 lô Bulk (2 lọc trùng F20)',
      statusLabel: 'Thành công (COMPLETED)',
      severityLevel: 'NORMAL',
      gpsCoordinates: '11.9406, 108.4582',
      operatorOrNote: 'DB: iot_offline.db | SHA256: 4b8c1d3e...a920 | Deduplication F20 hoàn tất.',
      rawValues: { totalRecords: 90, batches: 9, duplicates: 2 },
    },
    {
      id: 'SYNC-2026-103',
      datasetType: 'UAV_OFFLINE_SYNC',
      timestamp: '2026-11-18 16:29:15',
      zoneName: 'Khu C - Vườn Ươm Giống & Cảm biến Đất sâu',
      sourceCode: 'UAV-003 → GW-DALAT-03',
      categoryLabel: 'iot/ltj/sync/bulk (Partial Retry)',
      primaryMetric: '42 / 70 bản ghi',
      secondaryMetric: '7 lô Bulk (28 lỗi CRC)',
      statusLabel: 'Cần đồng bộ lại (PARTIAL)',
      severityLevel: 'CRITICAL',
      gpsCoordinates: '11.9322, 108.4614',
      operatorOrNote: 'DB: iot_offline_c3.db | Nhiễu sóng Lora làm gián đoạn lô #5-#7.',
      rawValues: { totalRecords: 42, batches: 7, duplicates: 0 },
    },
  ];
  rows.push(...syncSamples);

  // 4.4. Dữ liệu Nhật ký Chuyến bay & Note Mission từ Sprint 7 & 8 (MISSION_FLIGHT_NOTES - LTJ-34 / LTJ-39)
  for (const rev of reviews) {
    for (const note of rev.fieldNotesSummary) {
      rows.push({
        id: note.id,
        datasetType: 'MISSION_FLIGHT_NOTES',
        timestamp: note.createdAt.replace('T', ' ').slice(0, 19),
        zoneName: `${rev.missionCode} · ${rev.zoneName}`,
        sourceCode: `${rev.uavId} (${note.waypointLabel ? note.waypointLabel.split(':')[0] : 'Toàn tuyến'})`,
        categoryLabel: `Note: ${note.title}`,
        primaryMetric: `Pin ${note.batterySnapshotPercent ?? rev.endBatteryPercent}% · Điểm ${rev.overallScore}/100`,
        secondaryMetric: `Sai số GPS: ±${rev.avgGpsDriftMeters}m`,
        statusLabel: MISSION_REVIEW_DECISION_META[rev.reviewDecision].shortLabel,
        severityLevel:
          note.severity === 'URGENT'
            ? 'CRITICAL'
            : note.severity === 'IMPORTANT'
              ? 'WARNING'
              : 'NORMAL',
        gpsCoordinates: note.gpsSnapshot,
        operatorOrNote: `[${note.authorName}] ${note.content}`,
        rawValues: {
          missionId: rev.missionId,
          score: rev.overallScore,
          battery: note.batterySnapshotPercent ?? rev.endBatteryPercent,
        },
      });
    }
  }

  return rows;
}

// ============================================================================
// 5. BỘ SINH FILE EXCEL ĐA SHEET (.XLS/.XLSX), CSV UTF-8 BOM, JSON & HTML PDF
// ============================================================================

const MAX_CLIENT_EXPORT_ROWS = 10000;
const FORMULA_INJECTION_PREFIX_REGEX = /^[=+\-@\t\r]/;

/**
 * Chống CSV/Excel Formula Injection (CWE-1236):
 * Thêm dấu nháy đơn (') trước các ô bắt đầu bằng =, +, -, @, tab hoặc CR.
 */
function sanitizeSpreadsheetCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  return FORMULA_INJECTION_PREFIX_REGEX.test(str) ? `'${str}` : str;
}

function escapeXml(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Tạo nội dung SpreadsheetML (Office Open XML Spreadsheet 2003/2007+) hỗ trợ Đa Sheet (Multi-Sheet)
 * Mở trực tiếp trong Microsoft Excel, LibreOffice Calc & Google Sheets với đầy đủ màu sắc, font tiếng Việt UTF-8
 */
function generateMultiSheetExcelXml(
  config: ExcelExportFilterConfig,
  filteredRows: NormalizedExportRow[],
  reviews: MissionReviewRecord[]
): { xmlContent: string; sheetCount: number } {
  const nowStr = new Date().toLocaleString('vi-VN');
  const resolveColumnsForDataset = (
    datasetType: ExportDatasetType,
    applySelectedKeys: boolean
  ): ExportColumnDefinition[] => {
    const defaultCols = EXPORT_DATASET_CATALOG[datasetType].defaultColumns;
    if (!applySelectedKeys || config.selectedColumnKeys.length === 0) {
      return defaultCols;
    }
    const matched = defaultCols.filter((col) =>
      config.selectedColumnKeys.includes(col.key)
    );
    return matched.length > 0 ? matched : defaultCols;
  };

  const buildDataWorksheetXml = (
    sheetName: string,
    bannerTitle: string,
    rowsForSheet: NormalizedExportRow[],
    sheetCols: ExportColumnDefinition[]
  ): string => {
    const colElements = sheetCols
      .map(
        (col) =>
          `<Column ss:AutoFitWidth="1" ss:Width="${Math.max(85, Math.round(col.widthPx * 0.85))}"/>`
      )
      .join('');

    const headerCells = sheetCols
      .map(
        (col) =>
          `<Cell ss:StyleID="sTableHeader"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>`
      )
      .join('');

    const dataRowsXml = rowsForSheet
      .map((row) => {
        const styleId =
          row.severityLevel === 'CRITICAL'
            ? 'sCellCritical'
            : row.severityLevel === 'WARNING'
              ? 'sCellWarning'
              : 'sCellNormal';

        const cells = sheetCols
          .map((col) => {
            const val = (row as unknown as Record<string, unknown>)[col.key] ?? '';
            const safeText = sanitizeSpreadsheetCell(String(val));
            return `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(safeText)}</Data></Cell>`;
          })
          .join('');
        return `<Row ss:Height="22">${cells}</Row>`;
      })
      .join('\n');

    return `
  <Worksheet ss:Name="${escapeXml(sheetName.slice(0, 31))}">
    <Table ss:DefaultRowHeight="20">
      ${colElements}
      <Row ss:Height="28">
        <Cell ss:MergeAcross="${Math.max(1, sheetCols.length - 1)}" ss:StyleID="sTitleBanner">
          <Data ss:Type="String">${escapeXml(bannerTitle)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="${Math.max(1, sheetCols.length - 1)}" ss:StyleID="sMetaRow">
          <Data ss:Type="String">Ngày xuất: ${escapeXml(nowStr)} | Người xuất: Nguyễn Trường An (Dev 4 - Quatrungvoon) | Khu vực: ${escapeXml(config.zoneFilter)} | Khung thời gian: ${escapeXml(config.timeRange)} | Tổng số dòng: ${rowsForSheet.length}</Data>
        </Cell>
      </Row>
      <Row ss:Height="24">${headerCells}</Row>
      ${dataRowsXml}
    </Table>
  </Worksheet>`;
  };

  // Sheet đặc biệt tổng kết Nghiệm thu Mission (F17)
  const buildMissionReviewWorksheetXml = (): string => {
    const headers = [
      'Mã Mission',
      'Tên Nhiệm vụ Bay',
      'Phân khu (Zone)',
      'Thiết bị UAV',
      'Trạng thái Bay',
      'Kết quả Nghiệm thu (F17)',
      'Điểm Chất lượng',
      'Hạng',
      'Waypoints Hoàn thành',
      'Quãng đường (m)',
      'Pin Tiêu thụ (%)',
      'Sai số GPS TB (m)',
      'Người Ký duyệt',
      'Nhận xét Nghiệm thu & Hành động Khắc phục',
    ];

    const headerCells = headers
      .map(
        (h) =>
          `<Cell ss:StyleID="sTableHeader"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`
      )
      .join('');

    const reviewRowsXml = reviews
      .map((rev) => {
        const styleId =
          rev.reviewDecision === 'NEEDS_REFLIGHT'
            ? 'sCellCritical'
            : rev.reviewDecision === 'PENDING_REVIEW'
              ? 'sCellWarning'
              : 'sCellNormal';
        const cells = [
          rev.missionCode,
          rev.missionTitle,
          rev.zoneName,
          `${rev.uavId} (${rev.uavName})`,
          rev.operationalState,
          MISSION_REVIEW_DECISION_META[rev.reviewDecision].label,
          `${rev.overallScore}/100`,
          rev.qualityGrade,
          `${rev.completedWaypoints}/${rev.totalWaypoints} (Lỗi: ${rev.errorWaypoints})`,
          `${rev.actualDistanceM}m (KH: ${rev.plannedDistanceM}m)`,
          `${rev.startBatteryPercent}% → ${rev.endBatteryPercent}% (-${rev.batteryConsumedPercent}%)`,
          `±${rev.avgGpsDriftMeters}m (Max: ${rev.maxGpsDriftMeters}m)`,
          `${rev.reviewerName} (${rev.reviewerRole})`,
          `${rev.reviewSummaryNote} | Khắc phục: ${rev.correctiveActionPlan}`,
        ]
          .map(
            (val) =>
              `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXml(sanitizeSpreadsheetCell(val))}</Data></Cell>`
          )
          .join('');
        return `<Row ss:Height="23">${cells}</Row>`;
      })
      .join('\n');

    return `
  <Worksheet ss:Name="1_NghiemThuMission_F17">
    <Table ss:DefaultRowHeight="20">
      <Column ss:Width="110"/><Column ss:Width="210"/><Column ss:Width="180"/><Column ss:Width="150"/>
      <Column ss:Width="115"/><Column ss:Width="165"/><Column ss:Width="105"/><Column ss:Width="65"/>
      <Column ss:Width="135"/><Column ss:Width="140"/><Column ss:Width="145"/><Column ss:Width="135"/>
      <Column ss:Width="170"/><Column ss:Width="340"/>
      <Row ss:Height="28">
        <Cell ss:MergeAcross="13" ss:StyleID="sTitleBanner">
          <Data ss:Type="String">BÁO CÁO TỔNG KẾT &amp; NGHIỆM THU NHIỆM VỤ BAY UAV (F17 - MISSION REVIEW REPORT)</Data>
        </Cell>
      </Row>
      <Row ss:Height="20">
        <Cell ss:MergeAcross="13" ss:StyleID="sMetaRow">
          <Data ss:Type="String">Dự án SmartFarm IoT &amp; UAV Platform | Sprint 8 - Task LTJ-39 | Ngày trích xuất: ${escapeXml(nowStr)}</Data>
        </Cell>
      </Row>
      <Row ss:Height="24">${headerCells}</Row>
      ${reviewRowsXml}
    </Table>
  </Worksheet>`;
  };

  let worksheetsXml = '';
  let sheetCount = 1;

  if (config.datasetType === 'FULL_WORKBOOK') {
    sheetCount = 5;
    worksheetsXml = [
      buildMissionReviewWorksheetXml(),
      buildDataWorksheetXml(
        '2_DuLieuCamBien_F11',
        'BẢNG TRÍCH XUẤT DỮ LIỆU CẢM BIẾN & QUAN TRẮC VI KHÍ HẬU (F11)',
        filteredRows.filter((r) => r.datasetType === 'SENSOR_TELEMETRY'),
        resolveColumnsForDataset('SENSOR_TELEMETRY', false)
      ),
      buildDataWorksheetXml(
        '3_CanhBaoVuotNguong_F08',
        'BẢNG TỔNG HỢP CẢNH BÁO VƯỢT NGƯỠNG & BIÊN BẢN XỬ LÝ (F08 / F11)',
        filteredRows.filter((r) => r.datasetType === 'ALERT_REPORT'),
        resolveColumnsForDataset('ALERT_REPORT', false)
      ),
      buildDataWorksheetXml(
        '4_LichSuSyncUAV_F20',
        'LỊCH SỬ ĐỒNG BỘ DỮ LIỆU NGOẠI TUYẾN UAV SQLITE → MQTT BULK (F20)',
        filteredRows.filter((r) => r.datasetType === 'UAV_OFFLINE_SYNC'),
        resolveColumnsForDataset('UAV_OFFLINE_SYNC', false)
      ),
      buildDataWorksheetXml(
        '5_NhatKyNoteMission_F16',
        'NHẬT KÝ GIÁM SÁT CHUYẾN BAY & NOTE MISSION THỦ CÔNG KÈM GPS SNAPSHOT (F15 / F16)',
        filteredRows.filter((r) => r.datasetType === 'MISSION_FLIGHT_NOTES'),
        resolveColumnsForDataset('MISSION_FLIGHT_NOTES', false)
      ),
    ].join('\n');
  } else {
    const meta = EXPORT_DATASET_CATALOG[config.datasetType];
    worksheetsXml = buildDataWorksheetXml(
      meta.sheetName,
      `BÁO CÁO SMARTFARM IOT & UAV — ${meta.label.toUpperCase()}`,
      filteredRows,
      resolveColumnsForDataset(config.datasetType, true)
    );
  }

  const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Nguyễn Trường An (Dev 4 - Quatrungvoon)</Author>
  <Company>SmartFarm IoT &amp; UAV Platform</Company>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="sTitleBanner">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F172A" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sMetaRow">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="9.5" ss:Italic="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#E0F2FE" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sTableHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0284C7"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284C7"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284C7"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0284C7"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0369A1" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sCellNormal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#0F172A"/>
  </Style>
  <Style ss:ID="sCellWarning">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCD34D"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#92400E"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sCellCritical">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FCA5A5"/>
   </Borders>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Bold="1" ss:Color="#991B1B"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${worksheetsXml}
</Workbook>`;

  return { xmlContent, sheetCount };
}

/**
 * Tạo nội dung CSV chuẩn RFC-4180 kèm UTF-8 BOM (\uFEFF) để mở trong Excel không lỗi dấu tiếng Việt
 */
function generateUtf8BomCsv(
  config: ExcelExportFilterConfig,
  filteredRows: NormalizedExportRow[]
): string {
  const activeCols = EXPORT_DATASET_CATALOG[config.datasetType].defaultColumns.filter(
    (col) =>
      config.selectedColumnKeys.length === 0 ||
      config.selectedColumnKeys.includes(col.key)
  );

  const escapeCsvCell = (val: unknown): string => {
    const safeVal = sanitizeSpreadsheetCell(
      val as string | number | null | undefined
    );
    const str = safeVal.replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines: string[] = [];
  if (config.includeSummaryHeader) {
    lines.push(
      escapeCsvCell(
        `SMARTFARM IOT & UAV PLATFORM - ${EXPORT_DATASET_CATALOG[config.datasetType].label}`
      )
    );
    lines.push(
      escapeCsvCell(
        `Người xuất: Nguyễn Trường An (Dev 4) | Khu vực: ${config.zoneFilter} | Khung giờ: ${config.timeRange} | Số bản ghi: ${filteredRows.length}`
      )
    );
  }

  lines.push(activeCols.map((col) => escapeCsvCell(col.header)).join(','));

  for (const row of filteredRows) {
    const rowCells = activeCols.map((col) => {
      const value = (row as unknown as Record<string, unknown>)[col.key] ?? '';
      return escapeCsvCell(value);
    });
    lines.push(rowCells.join(','));
  }

  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Tạo báo cáo HTML chuẩn in PDF cho chức năng Xuất Báo cáo In / PDF
 */
function generatePrintableHtmlReport(
  config: ExcelExportFilterConfig,
  filteredRows: NormalizedExportRow[],
  reviews: MissionReviewRecord[]
): string {
  const meta = EXPORT_DATASET_CATALOG[config.datasetType];
  const activeCols = meta.defaultColumns.filter(
    (col) =>
      config.selectedColumnKeys.length === 0 ||
      config.selectedColumnKeys.includes(col.key)
  );

  const thHtml = activeCols
    .map((c) => `<th>${escapeXml(c.header)}</th>`)
    .join('');

  const trHtml = filteredRows
    .map((r) => {
      const rowClass =
        r.severityLevel === 'CRITICAL'
          ? 'row-critical'
          : r.severityLevel === 'WARNING'
            ? 'row-warning'
            : '';
      const tds = activeCols
        .map((c) => {
          const val = (r as unknown as Record<string, unknown>)[c.key] ?? '';
          return `<td>${escapeXml(String(val))}</td>`;
        })
        .join('');
      return `<tr class="${rowClass}">${tds}</tr>`;
    })
    .join('\n');

  const reviewCardsHtml = reviews
    .map(
      (rev) => `
      <div class="rev-card">
        <div><strong>${escapeXml(rev.missionCode)} — ${escapeXml(rev.missionTitle)}</strong></div>
        <div>UAV: ${escapeXml(rev.uavId)} | Khu vực: ${escapeXml(rev.zoneName)} | Điểm chất lượng: <strong>${rev.overallScore}/100 (Hạng ${rev.qualityGrade})</strong> | Trạng thái: <strong>${escapeXml(MISSION_REVIEW_DECISION_META[rev.reviewDecision].label)}</strong></div>
        <div>Nhận xét: ${escapeXml(rev.reviewSummaryNote)}</div>
      </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo Cáo SmartFarm - ${escapeXml(meta.shortLabel)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 28px; }
    .banner { background: #0f172a; color: #fff; padding: 18px 22px; border-radius: 10px; margin-bottom: 18px; }
    .banner h1 { margin: 0 0 6px 0; font-size: 20px; color: #38bdf8; }
    .banner p { margin: 0; font-size: 12.5px; color: #cbd5e1; }
    h2 { font-size: 15px; color: #0369a1; border-bottom: 2px solid #0284c7; padding-bottom: 6px; margin-top: 20px; }
    .rev-card { border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; border-radius: 6px; padding: 10px 14px; margin-bottom: 10px; font-size: 12.5px; line-height: 1.5; background: #f8fafc; }
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 10px; }
    th { background: #0369a1; color: #fff; padding: 8px 10px; text-align: left; border: 1px solid #0284c7; }
    td { padding: 7px 10px; border: 1px solid #cbd5e1; vertical-align: top; }
    .row-critical { background: #fee2e2; color: #991b1b; font-weight: 600; }
    .row-warning { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="banner">
    <h1>HỆ THỐNG SMARTFARM IOT &amp; UAV PLATFORM — BÁO CÁO NGHIỆM THU &amp; TRÍCH XUẤT DỮ LIỆU (F11 / F17)</h1>
    <p>Phân hệ: ${escapeXml(meta.label)} | Người trích xuất: Nguyễn Trường An (Dev 4) | Thời gian: ${escapeXml(new Date().toLocaleString('vi-VN'))}</p>
  </div>
  <h2>1. Tổng kết Nghiệm thu Nhiệm vụ Bay UAV (Mission Review Summary - F17)</h2>
  ${reviewCardsHtml}
  <h2>2. Bảng Dữ liệu Chi tiết (${filteredRows.length} bản ghi)</h2>
  <table>
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${trHtml}</tbody>
  </table>
</body>
</html>`;
}

// ============================================================================
// 6. ĐỐI TƯỢNG DỊCH VỤ HYBRID REST API + CLIENT FALLBACK
// ============================================================================

export const missionReviewExportApi = {
  /**
   * Tải danh sách hồ sơ Nghiệm thu Nhiệm vụ Bay (F17)
   * Đồng bộ tự động các Note Mission mới nhất từ Sprint 7 (flightMonitorService)
   */
  async getMissionReviews(): Promise<MissionReviewRecord[]> {
    const storedReviews = loadStoredMissionReviews();

    // Đồng bộ Note Mission & trạng thái mới nhất từ Sprint 7 (LTJ-34) nếu có
    try {
      const [liveSessions, liveNotes] = await Promise.all([
        fetchFlightSessions(),
        fetchMissionNotes(),
      ]);

      const matchNotesForMission = (missionCode: string, missionIdStr: string) =>
        liveNotes
          .filter(
            (n) =>
              n.missionCode === missionCode ||
              n.missionCode === missionIdStr ||
              String(n.missionId) === missionIdStr
          )
          .map(mapLiveNoteToFieldNote);

      const merged = storedReviews.map((rev) => {
        const normalizedCode = rev.missionCode.startsWith('MSN-DALAT-')
          ? rev.missionId
          : rev.missionCode;
        const liveMatch = liveSessions.find(
          (s) =>
            s.missionCode === normalizedCode ||
            s.missionCode === rev.missionId ||
            String(s.missionId) === rev.missionId
        );
        const mappedNotes = matchNotesForMission(normalizedCode, rev.missionId);

        return {
          ...rev,
          missionCode: normalizedCode,
          operationalState: liveMatch ? liveMatch.status : rev.operationalState,
          // Dùng trực tiếp danh sách liveNotes từ Sprint 7 làm nguồn chuẩn để Note đã xóa không bị "hồi sinh"
          fieldNotesSummary: mappedNotes,
        };
      });

      // Tự động tạo hồ sơ "Chờ duyệt" cho các phiên bay Sprint 7 chưa có trong Sprint 8 (VD: UAV-004 / MSN-2026-074)
      const existingCodes = new Set(
        merged.flatMap((r) => [r.missionCode, r.missionId])
      );
      for (const session of liveSessions) {
        if (
          !existingCodes.has(session.missionCode) &&
          !existingCodes.has(String(session.missionId))
        ) {
          const pendingReview = buildPendingReviewFromSession(session);
          pendingReview.fieldNotesSummary = matchNotesForMission(
            session.missionCode,
            String(session.missionId)
          );
          merged.push(pendingReview);
          existingCodes.add(session.missionCode);
        }
      }

      saveStoredMissionReviews(merged);
      return merged;
    } catch {
      return storedReviews;
    }
  },

  /**
   * Cập nhật chấm điểm 5 tiêu chí và phê duyệt kết quả Nghiệm thu Mission (F17)
   * Đồng bộ lên Backend Dev 2 (PUT /uav/missions/{id}/review) rồi merge an toàn vào bản ghi đầy đủ
   */
  async submitMissionReview(
    payload: SubmitMissionReviewPayload
  ): Promise<MissionReviewRecord> {
    let backendReviewedAt: string | null = null;
    try {
      const response = await apiRequest<{ reviewedAt?: string }>(
        `/uav/missions/${encodeURIComponent(payload.missionId)}/review`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );
      if (response.data && typeof response.data.reviewedAt === 'string') {
        backendReviewedAt = response.data.reviewedAt;
      }
    } catch {
      // Fallback sang Hybrid LocalStorage khi Backend offline
    }

    const allReviews = loadStoredMissionReviews();
    const updatedList = allReviews.map((rev) => {
      if (rev.missionId !== payload.missionId) return rev;
      const newScore = calculateOverallMissionScore(
        payload.rubricScores,
        rev.errorWaypoints
      );
      const newGrade = determineQualityGrade(newScore);

      return {
        ...rev,
        reviewDecision: payload.reviewDecision,
        rubricScores: { ...payload.rubricScores },
        overallScore: newScore,
        qualityGrade: newGrade,
        reviewerName: payload.reviewerName.trim() || rev.reviewerName,
        reviewerRole: payload.reviewerRole.trim() || rev.reviewerRole,
        reviewSummaryNote: payload.reviewSummaryNote.trim() || rev.reviewSummaryNote,
        correctiveActionPlan:
          payload.correctiveActionPlan.trim() || rev.correctiveActionPlan,
        reviewedAt: backendReviewedAt || new Date().toISOString(),
      };
    });

    saveStoredMissionReviews(updatedList);
    const updated = updatedList.find((r) => r.missionId === payload.missionId);
    if (!updated) {
      throw new Error('Không tìm thấy hồ sơ nhiệm vụ bay cần nghiệm thu.');
    }
    return updated;
  },

  /**
   * Thực thi Xuất file Excel (.xls / .xlsx), CSV, JSON hoặc Báo cáo In (F11)
   * Kết nối Backend Apache POI endpoint trước, tự động fallback sang Hybrid Multi-Sheet Engine
   */
  async executeFileExport(
    config: ExcelExportFilterConfig,
    filteredRows: NormalizedExportRow[],
    reviews: MissionReviewRecord[]
  ): Promise<{
    historyItem: ExportExecutionHistoryItem;
    updatedHistory: ExportExecutionHistoryItem[];
  }> {
    if (filteredRows.length === 0) {
      throw new Error('Không có bản ghi nào khớp bộ lọc để xuất báo cáo.');
    }

    const rowsToExport =
      filteredRows.length > MAX_CLIENT_EXPORT_ROWS
        ? filteredRows.slice(0, MAX_CLIENT_EXPORT_ROWS)
        : filteredRows;

    const meta = EXPORT_DATASET_CATALOG[config.datasetType];
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const safePrefix = (config.customFileNamePrefix || 'SmartFarm_BaoCao')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    let executionSource: 'BACKEND_POI_API' | 'HYBRID_CLIENT_ENGINE' =
      'HYBRID_CLIENT_ENGINE';
    let blob: Blob | null = null;
    let sheetCount = config.datasetType === 'FULL_WORKBOOK' ? 5 : 1;
    let extension = 'xls';

    // Thử gọi Backend Apache POI Excel / OpenPDF API (LTJ-37) nếu Backend đang chạy
    let openedPrintDialog = false;
    try {
      const token = localStorage.getItem('accessToken');
      const zoneIdMap: Record<string, string> = {
        'ZONE-A': '1',
        'ZONE-B': '2',
        'ZONE-C': '3',
      };
      const mappedZoneId = zoneIdMap[config.zoneFilter];

      let backendUrl: string | null = null;
      if (config.fileFormat === 'XLSX') {
        if (config.datasetType === 'FULL_WORKBOOK') {
          backendUrl = `${API_BASE_URL}/reports/export/full-workbook`;
        } else if (config.datasetType === 'SENSOR_TELEMETRY') {
          const params = new URLSearchParams({ type: 'sensors' });
          if (mappedZoneId) params.set('zoneId', mappedZoneId);
          backendUrl = `${API_BASE_URL}/reports/export/excel?${params.toString()}`;
        } else if (config.datasetType === 'ALERT_REPORT') {
          const params = new URLSearchParams({ type: 'alerts' });
          if (mappedZoneId) params.set('zoneId', mappedZoneId);
          backendUrl = `${API_BASE_URL}/reports/export/excel?${params.toString()}`;
        } else if (config.datasetType === 'UAV_OFFLINE_SYNC') {
          backendUrl = `${API_BASE_URL}/reports/export/uav-sync?format=xlsx`;
        } else if (config.datasetType === 'MISSION_FLIGHT_NOTES') {
          const params = new URLSearchParams({ format: 'xlsx' });
          if (config.missionIdFilter && config.missionIdFilter !== 'ALL') {
            params.set('missionId', config.missionIdFilter);
          }
          backendUrl = `${API_BASE_URL}/reports/export/missions?${params.toString()}`;
        }
      } else if (
        config.fileFormat === 'HTML_PRINT' &&
        (config.datasetType === 'SENSOR_TELEMETRY' ||
          config.datasetType === 'ALERT_REPORT')
      ) {
        const typeParam =
          config.datasetType === 'ALERT_REPORT' ? 'alerts' : 'sensors';
        const params = new URLSearchParams({ type: typeParam });
        if (mappedZoneId) params.set('zoneId', mappedZoneId);
        backendUrl = `${API_BASE_URL}/reports/export/pdf?${params.toString()}`;
      }

      if (backendUrl) {
        const response = await fetch(backendUrl, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: AbortSignal.timeout(2500),
        });
        if (response.ok) {
          const contentType = (response.headers.get('content-type') || '').toLowerCase();
          const isValidExcel =
            config.fileFormat === 'XLSX' &&
            (contentType.includes('spreadsheetml') ||
              contentType.includes('ms-excel') ||
              contentType.includes('application/octet-stream'));
          const isValidPdf =
            config.fileFormat === 'HTML_PRINT' &&
            contentType.includes('application/pdf');

          if (isValidExcel || isValidPdf) {
            const fetchedBlob = await response.blob();
            if (fetchedBlob.size > 100) {
              blob = fetchedBlob;
              executionSource = 'BACKEND_POI_API';
              extension = isValidPdf ? 'pdf' : 'xlsx';
            }
          }
        }
      }
    } catch {
      // Sử dụng Hybrid Client Multi-Sheet Engine
    }

    if (!blob) {
      if (config.fileFormat === 'XLSX') {
        const { xmlContent, sheetCount: sc } = generateMultiSheetExcelXml(
          config,
          rowsToExport,
          reviews
        );
        sheetCount = sc;
        extension = 'xls';
        // Không chèn \uFEFF (BOM) trước <?xml ...?> để Excel không cảnh báo sai định dạng
        blob = new Blob([xmlContent], {
          type: 'application/vnd.ms-excel;charset=utf-8',
        });
      } else if (config.fileFormat === 'CSV') {
        const csvContent = generateUtf8BomCsv(config, rowsToExport);
        extension = 'csv';
        blob = new Blob([csvContent], {
          type: 'text/csv;charset=utf-8',
        });
      } else if (config.fileFormat === 'JSON') {
        const jsonPayload = {
          exportMetadata: {
            project: 'SmartFarm IoT & UAV Platform',
            sprintTask: 'Sprint 8 - LTJ-39 (F11 & F17)',
            exportedBy: 'Nguyễn Trường An (Dev 4 - Quatrungvoon)',
            exportedAt: new Date().toISOString(),
            datasetType: config.datasetType,
            datasetLabel: meta.label,
            zoneFilter: config.zoneFilter,
            timeRange: config.timeRange,
            missionIdFilter: config.missionIdFilter,
            totalRecords: rowsToExport.length,
          },
          missionReviewsSummary:
            config.datasetType === 'FULL_WORKBOOK' ||
            config.datasetType === 'MISSION_FLIGHT_NOTES'
              ? reviews
              : undefined,
          records: rowsToExport,
        };
        extension = 'json';
        blob = new Blob([JSON.stringify(jsonPayload, null, 2)], {
          type: 'application/json;charset=utf-8',
        });
      } else {
        const htmlContent = generatePrintableHtmlReport(
          config,
          rowsToExport,
          reviews
        );
        extension = 'html';
        blob = new Blob([htmlContent], {
          type: 'text/html;charset=utf-8',
        });
        // Mở cửa sổ xem trước & kích hoạt hộp thoại In / Lưu PDF của trình duyệt
        if (typeof window !== 'undefined') {
          const printWindow = window.open('', '_blank', 'width=1024,height=768');
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            printWindow.focus();
            window.setTimeout(() => {
              try {
                printWindow.print();
              } catch {
                // Ignore print dialog cancellation
              }
            }, 350);
            openedPrintDialog = true;
          }
        }
      }
    }

    const fileName = `${safePrefix}_${meta.sheetName}_${dateStamp}.${extension}`;
    const fileSizeKb = Number(Math.max(1.2, blob.size / 1024).toFixed(1));

    // Kích hoạt tải xuống trình duyệt (bỏ qua nếu đã mở cửa sổ In/PDF thành công)
    if (typeof window !== 'undefined' && !openedPrintDialog) {
      const downloadUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => window.URL.revokeObjectURL(downloadUrl), 2500);
    }

    const historyItem: ExportExecutionHistoryItem = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      fileName,
      datasetType: config.datasetType,
      datasetLabel: meta.shortLabel,
      fileFormat: config.fileFormat,
      rowCount:
        config.datasetType === 'FULL_WORKBOOK'
          ? rowsToExport.length + reviews.length
          : rowsToExport.length,
      sheetCount,
      fileSizeKb,
      zoneFilter: config.zoneFilter,
      timeRange: config.timeRange,
      exportedBy: 'Nguyễn Trường An (Dev 4)',
      exportedAt: new Date().toISOString(),
      executionSource,
    };

    const updatedHistory = appendExportHistoryItem(historyItem);
    return { historyItem, updatedHistory };
  },

  /**
   * Khôi phục dữ liệu mẫu mặc định cho Sprint 8
   */
  async resetMissionReviewsToDefault(): Promise<MissionReviewRecord[]> {
    saveStoredMissionReviews(INITIAL_MISSION_REVIEWS);
    return await this.getMissionReviews();
  },
};
