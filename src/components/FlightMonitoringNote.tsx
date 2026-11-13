/**
 * FlightMonitoringNote — Sidebar Giám sát Chuyến bay & Note Mission (F16)
 * Task: LTJ-34 - Sprint 7
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * Bao gồm 2 phân hệ tích hợp:
 * 1. Sidebar Giám sát Chuyến bay Trực tiếp (Flight Monitoring Sidebar):
 *    - Hiển thị % Pin (kèm điện áp, nhiệt độ, cảnh báo mức pin và thanh giả lập mức pin)
 *    - Hiển thị & chuyển đổi Trạng thái chuyến bay: "Đang bay" (FLYING), "Về trạm" (RETURNING), "Thu thập lỗi" (COLLECTION_ERROR)
 *    - Theo dõi tiến độ Mission Progress qua từng Waypoint (khớp LTJ-32 & LTJ-35)
 *    - Bảng 6 thông số Telemetry nội suy thời gian thực + Bản đồ Leaflet trực quan hóa vị trí UAV
 * 2. Giao diện Note Mission Cập nhật Thủ công (F16):
 *    - Tạo mới, chỉnh sửa thủ công, ghim (Pin), xóa và lọc/tìm kiếm ghi chú nhiệm vụ
 *    - Tự động đính kèm tọa độ GPS, Waypoint hiện tại, % Pin và trạng thái bay tại thời điểm ghi chú
 *    - Hỗ trợ bộ mẫu ghi chú nhanh (Quick Templates) và xuất JSON Nhật ký Note Mission
 */

import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Plane,
  Battery,
  Signal,
  Navigation,
  Compass,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Play,
  Pause,
  Home,
  FileText,
  Plus,
  Pencil,
  Trash2,
  Pin,
  Search,
  Download,
  Copy,
  X,
  Clock,
  MapPin,
  Radio,
  Sparkles,
  Check,
  Layers,
} from 'lucide-react';
import type { AppDispatch } from '../store';
import {
  initFlightMonitorData,
  selectFlightUav,
  toggleTelemetryStream,
  tickAllFlightSessions,
  changeUavFlightStatus,
  adjustUavBatteryManual,
  jumpToWaypoint,
  addManualMissionNote,
  editManualMissionNote,
  removeManualMissionNote,
  setNoteFilterUav,
  setNoteFilterCategory,
  setNoteFilterPriority,
  setNoteFilterStatus,
  toggleNoteFilterPinned,
  setNoteSearchQuery,
  resetNoteFilters,
  setEditingNoteId,
  togglePinNoteLocal,
  restoreFlightMonitorDefaults,
  clearFlightActionMessage,
  selectAllFlightSessions,
  selectActiveFlightSession,
  selectFilteredMissionNotes,
  selectFlightMonitorKpis,
} from '../store/slices/flightMonitorSlice';
import {
  updateDroneDetails,
  SignalLevel,
} from '../store/slices/missionSlice';
import type { RootState } from '../store';
import {
  FLIGHT_STATUS_CONFIG,
  MISSION_NOTE_CATEGORY_LABELS,
  MISSION_NOTE_PRIORITY_LABELS,
  QUICK_NOTE_TEMPLATES,
  type FlightMonitorStatus,
  type MissionNote,
  type MissionNoteCategory,
  type MissionNotePriority,
  type QuickNoteTemplate,
} from '../types/flightMonitor';
import { formatFlightTime } from '../services/flightMonitorService';
import './FlightMonitoringNote.css';

// ==================== LEAFLET CUSTOM ICONS ====================

const createUavLiveIcon = (status: FlightMonitorStatus, headingDeg: number) => {
  const color = FLIGHT_STATUS_CONFIG[status].color;
  return L.divIcon({
    className: 'fm-uav-leaflet-icon',
    html: `
      <div class="fm-uav-marker-wrap" style="--uav-color: ${color};">
        <div class="fm-uav-pulse"></div>
        <div class="fm-uav-core" style="transform: rotate(${headingDeg}deg);">
          ✈
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
  });
};

const createWaypointNodeIcon = (
  order: number,
  visitState: 'COMPLETED' | 'ACTIVE' | 'PENDING' | 'ERROR',
) => {
  return L.divIcon({
    className: 'fm-wp-leaflet-icon',
    html: `<div class="fm-wp-marker wp-${visitState.toLowerCase()}">${order}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// ==================== MAIN COMPONENT ====================

export default function FlightMonitoringNote() {
  const dispatch = useDispatch<AppDispatch>();

  const sessions = useSelector(selectAllFlightSessions);
  const activeSession = useSelector(selectActiveFlightSession);
  const filteredNotes = useSelector(selectFilteredMissionNotes);
  const kpis = useSelector(selectFlightMonitorKpis);

  const isStreaming = useSelector(
    (state: RootState) => state.flightMonitor.isStreaming,
  );
  const noteFilter = useSelector(
    (state: RootState) => state.flightMonitor.noteFilter,
  );
  const editingNoteId = useSelector(
    (state: RootState) => state.flightMonitor.editingNoteId,
  );
  const lastActionMessage = useSelector(
    (state: RootState) => state.flightMonitor.lastActionMessage,
  );

  // State cho Form cập nhật thủ công Note Mission (F16)
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [noteCategory, setNoteCategory] =
    useState<MissionNoteCategory>('OBSERVATION');
  const [notePriority, setNotePriority] =
    useState<MissionNotePriority>('NORMAL');
  const [noteAuthor, setNoteAuthor] = useState<string>(
    'Nguyễn Trường An (Operator Ca 1)',
  );
  const [noteWaypointOrder, setNoteWaypointOrder] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // 1. Khởi tạo dữ liệu phiên bay & Note Mission khi mở trang
  useEffect(() => {
    if (sessions.length === 0) {
      dispatch(initFlightMonitorData());
    }
  }, [dispatch, sessions.length]);

  // 2. Vòng lặp mô phỏng nội suy Telemetry thời gian thực (2 giây / nhịp)
  useEffect(() => {
    if (!isStreaming) return undefined;

    const timer = window.setInterval(() => {
      dispatch(tickAllFlightSessions());
    }, 2000);

    return () => window.clearInterval(timer);
  }, [dispatch, isStreaming]);

  // 3. Đồng bộ thông số UAV đang chọn sang missionSlice trung tâm
  useEffect(() => {
    if (!activeSession) return;
    const sigLevel =
      activeSession.signalStrength >= 80
        ? SignalLevel.STRONG
        : activeSession.signalStrength >= 50
          ? SignalLevel.MEDIUM
          : activeSession.signalStrength > 0
            ? SignalLevel.WEAK
            : SignalLevel.LOST;

    dispatch(
      updateDroneDetails({
        altitude: activeSession.altitudeM,
        speed: activeSession.speedMs,
        battery: activeSession.batteryPercent,
        signal: sigLevel,
        satellites: activeSession.satellites,
        latitude: activeSession.latitude,
        longitude: activeSession.longitude,
      }),
    );
  }, [activeSession, dispatch]);

  // Tính toán danh sách tọa độ Polyline cho bản đồ Leaflet
  const routePositions = useMemo<[number, number][]>(() => {
    if (!activeSession) return [];
    return activeSession.waypoints.map((wp) => [wp.latitude, wp.longitude]);
  }, [activeSession]);

  // Định dạng màu sắc cho mức Pin
  const getBatteryLevelClass = (pct: number): string => {
    if (pct >= 50) return 'bat-good';
    if (pct >= 25) return 'bat-warn';
    return 'bat-critical';
  };

  // Xử lý nạp mẫu ghi chú nhanh (Quick Template)
  const handleApplyQuickTemplate = (tpl: QuickNoteTemplate) => {
    setNoteCategory(tpl.category);
    setNotePriority(tpl.priority);
    setNoteTitle(tpl.title);
    setNoteContent(tpl.content);
    if (activeSession) {
      setNoteWaypointOrder(activeSession.currentWaypointOrder);
    }
    setFormError(null);
  };

  // Xử lý bấm nút "Chỉnh sửa" trên 1 Note hiện có (F16)
  const handleStartEditNote = (note: MissionNote) => {
    dispatch(setEditingNoteId(note.id));
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNotePriority(note.priority);
    setNoteAuthor(note.author);
    setNoteWaypointOrder(note.waypointOrder);
    setFormError(null);
  };

  // Hủy chế độ chỉnh sửa Note
  const handleCancelEditNote = () => {
    dispatch(setEditingNoteId(null));
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('OBSERVATION');
    setNotePriority('NORMAL');
    setNoteWaypointOrder(0);
    setFormError(null);
  };

  // Xử lý Lưu (Thêm mới hoặc Cập nhật thủ công) Note Mission (F16)
  const handleSubmitNoteForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    const cleanTitle = noteTitle.trim();
    const cleanContent = noteContent.trim();

    if (!cleanTitle) {
      setFormError('Vui lòng nhập tiêu đề ghi chú nhiệm vụ.');
      return;
    }
    if (cleanContent.length < 10) {
      setFormError('Nội dung ghi chú cần tối thiểu 10 ký tự để đảm bảo rõ ràng.');
      return;
    }

    const wpOrder =
      noteWaypointOrder > 0
        ? noteWaypointOrder
        : activeSession.currentWaypointOrder;

    if (editingNoteId !== null) {
      dispatch(
        editManualMissionNote({
          noteId: editingNoteId,
          updates: {
            title: cleanTitle,
            content: cleanContent,
            category: noteCategory,
            priority: notePriority,
            author: noteAuthor.trim() || 'Nguyễn Trường An (Operator)',
            waypointOrder: wpOrder,
          },
        }),
      );
    } else {
      dispatch(
        addManualMissionNote({
          draft: {
            missionId: activeSession.missionId,
            uavId: activeSession.uavId,
            category: noteCategory,
            priority: notePriority,
            title: cleanTitle,
            content: cleanContent,
            author: noteAuthor.trim() || 'Nguyễn Trường An (Operator)',
            waypointOrder: wpOrder,
            attachLiveTelemetry: true,
          },
          session: activeSession,
        }),
      );
    }

    setNoteTitle('');
    setNoteContent('');
    setNoteWaypointOrder(0);
    setFormError(null);
  };

  // Điền nhanh form Note sự cố khi UAV đang ở trạng thái "Thu thập lỗi"
  const handleQuickLogErrorIncident = () => {
    if (!activeSession) return;
    dispatch(setEditingNoteId(null));
    setNoteCategory('INCIDENT');
    setNotePriority('URGENT');
    setNoteWaypointOrder(activeSession.currentWaypointOrder);
    setNoteTitle(
      `Sự cố thu thập dữ liệu tại Waypoint #${activeSession.currentWaypointOrder} (${activeSession.uavId})`,
    );
    setNoteContent(
      activeSession.errorReason ||
        `Phát hiện lỗi mất gói tin cảm biến tại tọa độ (${activeSession.latitude}, ${activeSession.longitude}). Pin hiện tại ${activeSession.batteryPercent}%. Đã chuyển chế độ giám sát khẩn cấp.`,
    );
    setFormError(null);
  };

  // Chuỗi JSON xuất báo cáo Nhật ký Note Mission + Telemetry
  const exportPayloadJson = useMemo(() => {
    return JSON.stringify(
      {
        exportedAt: activeSession?.lastTelemetryAt ?? '',
        exportedBy: 'Nguyễn Trường An (Dev 4 - LTJ-34)',
        activeUavTelemetry: activeSession,
        missionNotesCount: filteredNotes.length,
        missionNotes: filteredNotes,
      },
      null,
      2,
    );
  }, [activeSession, filteredNotes]);

  const handleCopyExportJson = () => {
    navigator.clipboard.writeText(exportPayloadJson);
    setCopiedJson(true);
    window.setTimeout(() => setCopiedJson(false), 2000);
  };

  if (!activeSession) {
    return (
      <div className="fm-loading-state">
        Đang tải dữ liệu Sidebar Giám sát Chuyến bay &amp; Note Mission...
      </div>
    );
  }

  const activeStatusCfg = FLIGHT_STATUS_CONFIG[activeSession.status];

  return (
    <div className="flight-monitor-page">
      {/* ==================== 1. HEADER BAR ==================== */}
      <header className="fm-header-card">
        <div className="fm-header-left">
          <span className="fm-sprint-badge">
            SPRINT 7 • TASK LTJ-34 • DEV 4 (F15 / F16)
          </span>
          <h2>Sidebar Giám sát Chuyến bay &amp; Nhật ký Note Mission</h2>
          <p>
            Giám sát trực tiếp <strong>% Pin</strong>, chuyển đổi trạng thái{' '}
            <strong>Đang bay • Về trạm • Thu thập lỗi</strong>, nội suy tọa độ
            Waypoints và cập nhật thủ công <strong>Note Mission (F16)</strong>.
          </p>
        </div>

        <div className="fm-header-actions">
          <button
            type="button"
            className={`fm-btn-stream ${isStreaming ? 'streaming-on' : 'streaming-off'}`}
            onClick={() => dispatch(toggleTelemetryStream())}
          >
            {isStreaming ? <Pause size={15} /> : <Play size={15} />}
            <span>
              {isStreaming ? 'Đang phát Telemetry (2s)' : 'Tiếp tục Telemetry'}
            </span>
          </button>

          <button
            type="button"
            className="fm-btn-secondary"
            onClick={() => setShowExportModal(true)}
          >
            <Download size={15} />
            <span>Xuất JSON Nhật ký</span>
          </button>

          <button
            type="button"
            className="fm-btn-reset"
            onClick={() => dispatch(restoreFlightMonitorDefaults())}
            title="Khôi phục dữ liệu mẫu mặc định"
          >
            <RotateCcw size={15} />
            <span>Khôi phục mẫu</span>
          </button>
        </div>
      </header>

      {/* Thông báo phản hồi thao tác */}
      {lastActionMessage && (
        <div className="fm-toast-banner">
          <div className="fm-toast-content">
            <CheckCircle2 size={17} />
            <span>{lastActionMessage}</span>
          </div>
          <button
            type="button"
            className="fm-toast-close"
            onClick={() => dispatch(clearFlightActionMessage())}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ==================== 2. 4 THẺ KPI TỔNG HỢP ==================== */}
      <section className="fm-kpi-grid">
        <article className="fm-kpi-card kpi-status">
          <div className="fm-kpi-icon">
            <Plane size={20} />
          </div>
          <div className="fm-kpi-body">
            <span className="fm-kpi-label">Trạng thái Đội bay UAV</span>
            <strong className="fm-kpi-value">
              {kpis.flyingCount} Đang bay • {kpis.returningCount} Về trạm
            </strong>
            <span className="fm-kpi-sub">
              {kpis.errorCount > 0
                ? `⚠ ${kpis.errorCount} UAV đang báo Thu thập lỗi`
                : 'Toàn bộ đường truyền ổn định'}
            </span>
          </div>
        </article>

        <article className="fm-kpi-card kpi-battery">
          <div className="fm-kpi-icon">
            <Battery size={20} />
          </div>
          <div className="fm-kpi-body">
            <span className="fm-kpi-label">Pin UAV Đang Giám sát</span>
            <strong className="fm-kpi-value">
              {activeSession.batteryPercent}% ({activeSession.batteryVoltageV}V)
            </strong>
            <span className="fm-kpi-sub">
              Trung bình đội bay: {kpis.avgBattery}% • Nhiệt độ:{' '}
              {activeSession.batteryTempC}°C
            </span>
          </div>
        </article>

        <article className="fm-kpi-card kpi-progress">
          <div className="fm-kpi-icon">
            <Navigation size={20} />
          </div>
          <div className="fm-kpi-body">
            <span className="fm-kpi-label">Tiến độ Mission (LTJ-32)</span>
            <strong className="fm-kpi-value">
              {activeSession.completedWaypoints}/{activeSession.totalWaypoints}{' '}
              Waypoints ({activeSession.progressPercent}%)
            </strong>
            <span className="fm-kpi-sub">
              Đã thu thập {activeSession.packetsCollected} gói • Lỗi:{' '}
              {activeSession.packetErrors} gói
            </span>
          </div>
        </article>

        <article className="fm-kpi-card kpi-notes">
          <div className="fm-kpi-icon">
            <FileText size={20} />
          </div>
          <div className="fm-kpi-body">
            <span className="fm-kpi-label">Nhật ký Note Mission (F16)</span>
            <strong className="fm-kpi-value">{kpis.totalNotes} Ghi chú</strong>
            <span className="fm-kpi-sub">
              {kpis.urgentNotes} ghi chú Khẩn cấp • Lưu trữ đồng bộ
            </span>
          </div>
        </article>
      </section>

      {/* ==================== 3. BỐ CỤC CHÍNH: SIDEBAR GIÁM SÁT (TRÁI) + BẢN ĐỒ & NOTE MISSION (PHẢI) ==================== */}
      <div className="fm-main-workspace">
        {/* ==================== CỘT TRÁI: SIDEBAR GIÁM SÁT CHUYẾN BAY (LTJ-34) ==================== */}
        <aside className="fm-monitoring-sidebar">
          <div className="fm-sidebar-section-header">
            <div className="fm-sidebar-title-row">
              <Radio size={18} className="fm-pulse-icon" />
              <h3>SIDEBAR GIÁM SÁT CHUYẾN BAY</h3>
            </div>
            <span className="fm-live-pill">
              {isStreaming ? '● LIVE' : '⏸ PAUSED'}
            </span>
          </div>

          {/* 3.1. Bộ chọn nhanh UAV đang làm nhiệm vụ */}
          <div className="fm-uav-selector-list">
            {sessions.map((s) => {
              const stCfg = FLIGHT_STATUS_CONFIG[s.status];
              const isSelected = s.uavId === activeSession.uavId;
              return (
                <button
                  key={s.uavId}
                  type="button"
                  className={`fm-uav-tab-card ${isSelected ? 'active' : ''}`}
                  onClick={() => dispatch(selectFlightUav(s.uavId))}
                >
                  <div className="fm-uav-tab-top">
                    <span className="fm-uav-code">{s.uavId}</span>
                    <span className={`fm-status-mini-badge ${stCfg.badgeClass}`}>
                      {stCfg.label}
                    </span>
                  </div>
                  <div className="fm-uav-tab-name">{s.uavName}</div>
                  <div className="fm-uav-tab-meta">
                    <span className={getBatteryLevelClass(s.batteryPercent)}>
                      🔋 {s.batteryPercent}%
                    </span>
                    <span>
                      📍 WP {s.completedWaypoints}/{s.totalWaypoints}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 3.2. Khối Trạng thái Chuyến bay & Điều khiển Chuyển đổi Trạng thái (Đang bay / Về trạm / Thu thập lỗi) */}
          <div className="fm-sidebar-block fm-status-control-block">
            <div className="fm-block-header">
              <span>TRẠNG THÁI CHUYẾN BAY HIỆN TẠI</span>
              <span className="fm-mission-code-tag">
                {activeSession.missionCode}
              </span>
            </div>

            <div className={`fm-current-status-banner ${activeStatusCfg.badgeClass}`}>
              <div className="fm-status-dot-large" />
              <div className="fm-status-banner-text">
                <strong>{activeStatusCfg.label.toUpperCase()}</strong>
                <span>{activeStatusCfg.shortDesc}</span>
              </div>
            </div>

            <div className="fm-status-switch-label">
              Chuyển trạng thái giám sát chuyến bay (LTJ-34):
            </div>
            <div className="fm-status-switch-grid">
              <button
                type="button"
                className={`fm-status-btn btn-flying ${
                  activeSession.status === 'FLYING' ? 'selected' : ''
                }`}
                onClick={() =>
                  dispatch(
                    changeUavFlightStatus({
                      missionId: activeSession.missionId,
                      newStatus: 'FLYING',
                    }),
                  )
                }
              >
                <Plane size={15} />
                <span>Đang bay</span>
              </button>

              <button
                type="button"
                className={`fm-status-btn btn-returning ${
                  activeSession.status === 'RETURNING' ? 'selected' : ''
                }`}
                onClick={() =>
                  dispatch(
                    changeUavFlightStatus({
                      missionId: activeSession.missionId,
                      newStatus: 'RETURNING',
                    }),
                  )
                }
              >
                <Home size={15} />
                <span>Về trạm</span>
              </button>

              <button
                type="button"
                className={`fm-status-btn btn-error ${
                  activeSession.status === 'COLLECTION_ERROR' ? 'selected' : ''
                }`}
                onClick={() =>
                  dispatch(
                    changeUavFlightStatus({
                      missionId: activeSession.missionId,
                      newStatus: 'COLLECTION_ERROR',
                    }),
                  )
                }
              >
                <AlertTriangle size={15} />
                <span>Thu thập lỗi</span>
              </button>
            </div>

            {/* Hộp cảnh báo chi tiết khi UAV đang ở trạng thái "Thu thập lỗi" */}
            {activeSession.status === 'COLLECTION_ERROR' && (
              <div className="fm-error-diagnostic-box">
                <div className="fm-error-diag-header">
                  <AlertTriangle size={16} />
                  <strong>CẢNH BÁO LỖI THU THẬP DỮ LIỆU CẢM BIẾN</strong>
                </div>
                <p>
                  {activeSession.errorReason ||
                    `Mất gói tin MQTT tại Waypoint #${activeSession.currentWaypointOrder}.`}
                </p>
                <button
                  type="button"
                  className="fm-btn-log-incident"
                  onClick={handleQuickLogErrorIncident}
                >
                  <FileText size={14} />
                  <span>Đẩy vào Form Note Sự cố (F16)</span>
                </button>
              </div>
            )}
          </div>

          {/* 3.3. Khối Đồng hồ Giám sát % Pin & Năng lượng (Battery Telemetry Gauge) */}
          <div className="fm-sidebar-block fm-battery-block">
            <div className="fm-block-header">
              <span>GIÁM SÁT NĂNG LƯỢNG &amp; % PIN UAV</span>
              <span
                className={`fm-battery-pill ${getBatteryLevelClass(
                  activeSession.batteryPercent,
                )}`}
              >
                {activeSession.batteryPercent >= 50
                  ? 'An toàn'
                  : activeSession.batteryPercent >= 25
                    ? 'Pin trung bình'
                    : 'Pin yếu - Cần RTH'}
              </span>
            </div>

            <div className="fm-battery-gauge-row">
              <div className="fm-battery-big-number">
                <strong
                  className={getBatteryLevelClass(activeSession.batteryPercent)}
                >
                  {activeSession.batteryPercent}%
                </strong>
                <span>Dung lượng còn lại</span>
              </div>
              <div className="fm-battery-specs">
                <div>
                  <span>Điện áp:</span>
                  <strong>{activeSession.batteryVoltageV} V</strong>
                </div>
                <div>
                  <span>Nhiệt độ Pin:</span>
                  <strong>{activeSession.batteryTempC} °C</strong>
                </div>
                <div>
                  <span>Thời gian còn:</span>
                  <strong>
                    ~{formatFlightTime(activeSession.estimatedRemainingSeconds)}
                  </strong>
                </div>
              </div>
            </div>

            <div className="fm-battery-bar-track">
              <div
                className={`fm-battery-bar-fill ${getBatteryLevelClass(
                  activeSession.batteryPercent,
                )}`}
                style={{ width: `${activeSession.batteryPercent}%` }}
              />
            </div>

            <div className="fm-battery-simulator-control">
              <label htmlFor="fm-battery-slider">
                Mô phỏng nhanh mức % Pin (Tự động Về trạm nếu &le; 20%):
              </label>
              <div className="fm-battery-preset-btns">
                {[92, 55, 24, 15].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`fm-bat-preset-btn ${
                      activeSession.batteryPercent === val ? 'active' : ''
                    }`}
                    onClick={() =>
                      dispatch(
                        adjustUavBatteryManual({
                          uavId: activeSession.uavId,
                          batteryPercent: val,
                        }),
                      )
                    }
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3.4. Lưới 6 Thông số Telemetry Chuyến bay Realtime */}
          <div className="fm-sidebar-block">
            <div className="fm-block-header">
              <span>THÔNG SỐ TELEMETRY TRỰC TIẾP (F15)</span>
              <span>Cập nhật: {activeSession.lastTelemetryAt.slice(11, 19)}</span>
            </div>

            <div className="fm-telemetry-grid">
              <div className="fm-tele-item">
                <span className="fm-tele-label">
                  <MapPin size={13} /> Tọa độ GPS Nội suy
                </span>
                <strong className="fm-tele-val">
                  {activeSession.latitude.toFixed(4)},{' '}
                  {activeSession.longitude.toFixed(4)}
                </strong>
              </div>

              <div className="fm-tele-item">
                <span className="fm-tele-label">
                  <Gauge size={13} /> Độ cao &amp; Vận tốc
                </span>
                <strong className="fm-tele-val">
                  {activeSession.altitudeM} m • {activeSession.speedMs} m/s
                </strong>
              </div>

              <div className="fm-tele-item">
                <span className="fm-tele-label">
                  <Compass size={13} /> Hướng bay (Heading)
                </span>
                <strong className="fm-tele-val">
                  {activeSession.headingDeg}° Bắc
                </strong>
              </div>

              <div className="fm-tele-item">
                <span className="fm-tele-label">
                  <Signal size={13} /> Tín hiệu &amp; Vệ tinh
                </span>
                <strong className="fm-tele-val">
                  RSSI {activeSession.signalStrength}% ({activeSession.satellites}{' '}
                  SAT)
                </strong>
              </div>

              <div className="fm-tele-item">
                <span className="fm-tele-label">
                  <Clock size={13} /> Thời gian đã bay
                </span>
                <strong className="fm-tele-val">
                  {formatFlightTime(activeSession.elapsedSeconds)}
                </strong>
              </div>

              <div className="fm-tele-item">
                <span className="fm-tele-label">
                  <Layers size={13} /> Gói tin Thu thập / Lỗi
                </span>
                <strong className="fm-tele-val">
                  {activeSession.packetsCollected} OK /{' '}
                  <span
                    className={
                      activeSession.packetErrors > 0 ? 'fm-err-count' : ''
                    }
                  >
                    {activeSession.packetErrors} Lỗi
                  </span>
                </strong>
              </div>
            </div>
          </div>

          {/* 3.5. Khối Tiến độ Hành trình Waypoints (Mission Progress - LTJ-32) */}
          <div className="fm-sidebar-block">
            <div className="fm-block-header">
              <span>TIẾN ĐỘ ĐIỂM BAY (MISSION PROGRESS)</span>
              <strong>
                {activeSession.completedWaypoints}/{activeSession.totalWaypoints}{' '}
                WP ({activeSession.progressPercent}%)
              </strong>
            </div>

            <div className="fm-progress-bar-track">
              <div
                className="fm-progress-bar-fill"
                style={{ width: `${activeSession.progressPercent}%` }}
              />
            </div>

            <div className="fm-progress-sub-row">
              <span>
                Quãng đường: {activeSession.distanceTraveledM}m /{' '}
                {activeSession.totalRouteDistanceM}m
              </span>
              <span>
                Nội suy đoạn α = {(activeSession.segmentProgress * 100).toFixed(0)}%
              </span>
            </div>

            <div className="fm-waypoint-stepper">
              {activeSession.waypoints.map((wp) => (
                <div
                  key={wp.order}
                  className={`fm-wp-step-row state-${wp.visitState.toLowerCase()}`}
                >
                  <div className="fm-wp-step-badge">{wp.order}</div>
                  <div className="fm-wp-step-info">
                    <div className="fm-wp-step-title">{wp.label}</div>
                    <div className="fm-wp-step-coords">
                      ({wp.latitude.toFixed(4)}, {wp.longitude.toFixed(4)}) • Cao{' '}
                      {wp.altitudeM}m • Gói: {wp.collectedPackets}
                      {wp.errorPackets > 0 && (
                        <span className="fm-wp-err-tag">
                          {' '}
                          • Lỗi: {wp.errorPackets}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="fm-wp-jump-btn"
                    onClick={() =>
                      dispatch(
                        jumpToWaypoint({
                          uavId: activeSession.uavId,
                          waypointOrder: wp.order,
                        }),
                      )
                    }
                    title={`Di chuyển UAV tới Waypoint #${wp.order}`}
                  >
                    Bay tới
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ==================== CỘT PHẢI: BẢN ĐỒ HÀNH TRÌNH & GIAO DIỆN NOTE MISSION THỦ CÔNG (F16) ==================== */}
        <div className="fm-right-content">
          {/* 4.1. Bản đồ Leaflet Giám sát Vị trí UAV & Các điểm Waypoint */}
          <section className="fm-map-card">
            <div className="fm-card-header">
              <div>
                <h3>
                  Bản đồ Hành trình Trực tiếp — {activeSession.uavName} (
                  {activeSession.zoneName})
                </h3>
                <p>
                  Biểu diễn đường bay Polyline, trạng thái từng Waypoint và vị trí
                  nội suy hiện tại của UAV ({activeSession.latitude.toFixed(5)},{' '}
                  {activeSession.longitude.toFixed(5)}).
                </p>
              </div>
              <span className={`fm-status-badge-lg ${activeStatusCfg.badgeClass}`}>
                ● {activeStatusCfg.label}
              </span>
            </div>

            <div className="fm-leaflet-wrapper">
              <MapContainer
                key={activeSession.uavId}
                center={[activeSession.latitude, activeSession.longitude]}
                zoom={15}
                scrollWheelZoom={true}
                className="fm-leaflet-map"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Đường nối các Waypoints */}
                {routePositions.length > 1 && (
                  <Polyline
                    positions={routePositions}
                    pathOptions={{
                      color: activeStatusCfg.color,
                      weight: 4,
                      dashArray:
                        activeSession.status === 'RETURNING' ? '8, 8' : undefined,
                    }}
                  />
                )}

                {/* Marker các điểm Waypoints */}
                {activeSession.waypoints.map((wp) => (
                  <Marker
                    key={wp.order}
                    position={[wp.latitude, wp.longitude]}
                    icon={createWaypointNodeIcon(wp.order, wp.visitState)}
                  >
                    <Popup>
                      <div className="fm-map-popup">
                        <strong>{wp.label}</strong>
                        <div>
                          Tọa độ: {wp.latitude.toFixed(5)},{' '}
                          {wp.longitude.toFixed(5)}
                        </div>
                        <div>
                          Độ cao: {wp.altitudeM}m • Tốc độ: {wp.targetSpeedMs}m/s
                        </div>
                        <div>
                          Gói thu thập: {wp.collectedPackets} • Gói lỗi:{' '}
                          {wp.errorPackets}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Marker vị trí UAV hiện tại */}
                <Marker
                  position={[activeSession.latitude, activeSession.longitude]}
                  icon={createUavLiveIcon(
                    activeSession.status,
                    activeSession.headingDeg,
                  )}
                >
                  <Popup>
                    <div className="fm-map-popup">
                      <strong>
                        {activeSession.uavId} — {activeSession.uavName}
                      </strong>
                      <div>Trạng thái: {activeStatusCfg.label}</div>
                      <div>
                        Pin: {activeSession.batteryPercent}% (
                        {activeSession.batteryVoltageV}V)
                      </div>
                      <div>
                        Độ cao: {activeSession.altitudeM}m • Tốc độ:{' '}
                        {activeSession.speedMs}m/s
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </section>

          {/* 4.2. Khu vực Form Cập nhật Thủ công Note Mission (F16) */}
          <section className="fm-note-editor-card">
            <div className="fm-card-header">
              <div>
                <h3>
                  {editingNoteId !== null
                    ? `Chỉnh sửa Thủ công Ghi chú Nhiệm vụ #${editingNoteId} (F16)`
                    : 'Cập nhật Thủ công Ghi chú Nhiệm vụ — Note Mission (F16)'}
                </h3>
                <p>
                  Ghi nhận nhật ký vận hành, cảnh báo thời tiết hoặc sự cố thu thập
                  dữ liệu kèm thông số Telemetry tự động của{' '}
                  <strong>{activeSession.uavId}</strong>.
                </p>
              </div>

              {editingNoteId !== null && (
                <button
                  type="button"
                  className="fm-btn-cancel-edit"
                  onClick={handleCancelEditNote}
                >
                  <X size={14} />
                  <span>Hủy chỉnh sửa</span>
                </button>
              )}
            </div>

            {/* Thanh mẫu ghi chú nhanh (Quick Templates) */}
            <div className="fm-quick-templates-bar">
              <span className="fm-tpl-label">
                <Sparkles size={14} /> Mẫu điền nhanh:
              </span>
              {QUICK_NOTE_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  className="fm-tpl-chip"
                  onClick={() => handleApplyQuickTemplate(tpl)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <form className="fm-note-form" onSubmit={handleSubmitNoteForm}>
              <div className="fm-form-row-4">
                <div className="fm-form-group">
                  <label htmlFor="fm-note-category">Phân loại Note</label>
                  <select
                    id="fm-note-category"
                    value={noteCategory}
                    onChange={(e) =>
                      setNoteCategory(e.target.value as MissionNoteCategory)
                    }
                  >
                    {(
                      Object.keys(
                        MISSION_NOTE_CATEGORY_LABELS,
                      ) as MissionNoteCategory[]
                    ).map((cat) => (
                      <option key={cat} value={cat}>
                        {MISSION_NOTE_CATEGORY_LABELS[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fm-form-group">
                  <label htmlFor="fm-note-priority">Mức độ ưu tiên</label>
                  <select
                    id="fm-note-priority"
                    value={notePriority}
                    onChange={(e) =>
                      setNotePriority(e.target.value as MissionNotePriority)
                    }
                  >
                    {(
                      Object.keys(
                        MISSION_NOTE_PRIORITY_LABELS,
                      ) as MissionNotePriority[]
                    ).map((p) => (
                      <option key={p} value={p}>
                        {MISSION_NOTE_PRIORITY_LABELS[p].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fm-form-group">
                  <label htmlFor="fm-note-wp">Gắn với Waypoint</label>
                  <select
                    id="fm-note-wp"
                    value={
                      noteWaypointOrder || activeSession.currentWaypointOrder
                    }
                    onChange={(e) =>
                      setNoteWaypointOrder(Number(e.target.value))
                    }
                  >
                    {activeSession.waypoints.map((wp) => (
                      <option key={wp.order} value={wp.order}>
                        Waypoint #{wp.order} ({wp.visitState})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fm-form-group">
                  <label htmlFor="fm-note-author">Người ghi nhận</label>
                  <input
                    id="fm-note-author"
                    type="text"
                    value={noteAuthor}
                    onChange={(e) => setNoteAuthor(e.target.value)}
                    placeholder="Tên kỹ thuật viên / Operator..."
                  />
                </div>
              </div>

              <div className="fm-form-group">
                <label htmlFor="fm-note-title">
                  Tiêu đề ghi chú nhiệm vụ <span className="req">*</span>
                </label>
                <input
                  id="fm-note-title"
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Ví dụ: Phát hiện suy hao tín hiệu RSSI tại Waypoint #2 hoặc xác nhận RTH..."
                />
              </div>

              <div className="fm-form-group">
                <label htmlFor="fm-note-content">
                  Nội dung ghi chú chi tiết (F16) <span className="req">*</span>
                </label>
                <textarea
                  id="fm-note-content"
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Nhập mô tả chi tiết tình trạng chuyến bay, thông số môi trường hoặc hành động xử lý của người vận hành..."
                />
              </div>

              {/* Hộp hiển thị thông số Telemetry tự động đính kèm vào Note */}
              <div className="fm-telemetry-snapshot-bar">
                <span>
                  📌 <strong>Đính kèm tự động:</strong> UAV{' '}
                  <strong>{activeSession.uavId}</strong> ({activeSession.missionCode}
                  )
                </span>
                <span>• Trạng thái: {activeStatusCfg.label}</span>
                <span>• Pin: {activeSession.batteryPercent}%</span>
                <span>
                  • GPS: ({activeSession.latitude.toFixed(4)},{' '}
                  {activeSession.longitude.toFixed(4)})
                </span>
              </div>

              {formError && <div className="fm-form-error">{formError}</div>}

              <div className="fm-form-submit-row">
                <button type="submit" className="fm-btn-submit-note">
                  {editingNoteId !== null ? (
                    <>
                      <Pencil size={15} />
                      <span>Lưu cập nhật Note #{editingNoteId}</span>
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      <span>Lưu Note Mission (F16)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* 4.3. Danh sách & Bộ lọc Nhật ký Note Mission (F16) */}
          <section className="fm-notes-list-card">
            <div className="fm-card-header">
              <div>
                <h3>
                  Danh sách Nhật ký Note Mission ({filteredNotes.length} bản ghi)
                </h3>
                <p>
                  Lịch sử ghi chú thủ công của người vận hành gắn liền với từng
                  chuyến bay UAV và điểm Waypoint.
                </p>
              </div>
              <button
                type="button"
                className="fm-btn-clear-filter"
                onClick={() => dispatch(resetNoteFilters())}
              >
                Xóa bộ lọc
              </button>
            </div>

            {/* Thanh công cụ lọc Note Mission */}
            <div className="fm-notes-filter-bar">
              <div className="fm-search-box">
                <Search size={15} />
                <input
                  type="search"
                  value={noteFilter.searchQuery}
                  onChange={(e) => dispatch(setNoteSearchQuery(e.target.value))}
                  placeholder="Tìm theo tiêu đề, nội dung, mã UAV, phân khu..."
                />
              </div>

              <select
                value={noteFilter.uavId}
                onChange={(e) => dispatch(setNoteFilterUav(e.target.value))}
                aria-label="Lọc theo UAV"
              >
                <option value="ALL">Tất cả UAV</option>
                {sessions.map((s) => (
                  <option key={s.uavId} value={s.uavId}>
                    {s.uavId} — {s.uavName}
                  </option>
                ))}
              </select>

              <select
                value={noteFilter.category}
                onChange={(e) =>
                  dispatch(
                    setNoteFilterCategory(
                      e.target.value as MissionNoteCategory | 'ALL',
                    ),
                  )
                }
                aria-label="Lọc theo phân loại"
              >
                <option value="ALL">Mọi phân loại</option>
                {(
                  Object.keys(
                    MISSION_NOTE_CATEGORY_LABELS,
                  ) as MissionNoteCategory[]
                ).map((c) => (
                  <option key={c} value={c}>
                    {MISSION_NOTE_CATEGORY_LABELS[c].label}
                  </option>
                ))}
              </select>

              <select
                value={noteFilter.priority}
                onChange={(e) =>
                  dispatch(
                    setNoteFilterPriority(
                      e.target.value as MissionNotePriority | 'ALL',
                    ),
                  )
                }
                aria-label="Lọc theo mức ưu tiên"
              >
                <option value="ALL">Mọi mức ưu tiên</option>
                {(
                  Object.keys(
                    MISSION_NOTE_PRIORITY_LABELS,
                  ) as MissionNotePriority[]
                ).map((p) => (
                  <option key={p} value={p}>
                    {MISSION_NOTE_PRIORITY_LABELS[p].label}
                  </option>
                ))}
              </select>

              <select
                value={noteFilter.flightStatus}
                onChange={(e) =>
                  dispatch(
                    setNoteFilterStatus(
                      e.target.value as FlightMonitorStatus | 'ALL',
                    ),
                  )
                }
                aria-label="Lọc theo trạng thái bay"
              >
                <option value="ALL">Mọi trạng thái bay</option>
                <option value="FLYING">Đang bay</option>
                <option value="RETURNING">Về trạm</option>
                <option value="COLLECTION_ERROR">Thu thập lỗi</option>
              </select>

              <button
                type="button"
                className={`fm-pin-filter-btn ${
                  noteFilter.onlyPinned ? 'active' : ''
                }`}
                onClick={() => dispatch(toggleNoteFilterPinned())}
              >
                <Pin size={14} />
                <span>Đã ghim</span>
              </button>
            </div>

            {/* Danh sách các thẻ Note Mission */}
            <div className="fm-notes-feed">
              {filteredNotes.length === 0 ? (
                <div className="fm-empty-notes">
                  Không tìm thấy ghi chú nhiệm vụ nào khớp với bộ lọc hiện tại.
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const catInfo = MISSION_NOTE_CATEGORY_LABELS[note.category];
                  const prioInfo = MISSION_NOTE_PRIORITY_LABELS[note.priority];
                  const stInfo = FLIGHT_STATUS_CONFIG[note.flightStatusAtNote];

                  return (
                    <article
                      key={note.id}
                      className={`fm-note-item-card ${
                        note.isPinned ? 'is-pinned' : ''
                      } ${editingNoteId === note.id ? 'is-editing' : ''}`}
                    >
                      <div className="fm-note-item-top">
                        <div className="fm-note-badges">
                          {note.isPinned && (
                            <span className="fm-badge-pinned">📌 Đã ghim</span>
                          )}
                          <span className={`fm-badge-prio ${prioInfo.badgeClass}`}>
                            {prioInfo.label}
                          </span>
                          <span className={`fm-badge-cat ${catInfo.badgeClass}`}>
                            {catInfo.label}
                          </span>
                          <span className={`fm-badge-st ${stInfo.badgeClass}`}>
                            Lúc ghi: {stInfo.label} ({note.batteryAtNote}% Pin)
                          </span>
                        </div>

                        <div className="fm-note-actions">
                          <button
                            type="button"
                            className={`fm-icon-btn ${
                              note.isPinned ? 'pinned' : ''
                            }`}
                            onClick={() => dispatch(togglePinNoteLocal(note.id))}
                            title={
                              note.isPinned ? 'Bỏ ghim ghi chú' : 'Ghim ghi chú lên đầu'
                            }
                          >
                            <Pin size={14} />
                          </button>

                          <button
                            type="button"
                            className="fm-icon-btn"
                            onClick={() => handleStartEditNote(note)}
                            title="Chỉnh sửa thủ công ghi chú này (F16)"
                          >
                            <Pencil size={14} />
                          </button>

                          <button
                            type="button"
                            className="fm-icon-btn danger"
                            onClick={() =>
                              dispatch(removeManualMissionNote(note.id))
                            }
                            title="Xóa ghi chú"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <h4 className="fm-note-item-title">{note.title}</h4>
                      <p className="fm-note-item-content">{note.content}</p>

                      <div className="fm-note-item-footer">
                        <span>
                          ✈ <strong>{note.uavId}</strong> ({note.missionCode}) •{' '}
                          {note.zoneName}
                        </span>
                        <span>
                          📍 Waypoint #{note.waypointOrder} (
                          {note.latitude.toFixed(4)}, {note.longitude.toFixed(4)})
                        </span>
                        <span>👤 {note.author}</span>
                        <span>
                          🕒{' '}
                          {new Date(note.updatedAt).toLocaleString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ==================== 5. MODAL XUẤT JSON NHẬT KÝ NOTE MISSION ==================== */}
      {showExportModal && (
        <div className="fm-modal-backdrop" onClick={() => setShowExportModal(false)}>
          <div
            className="fm-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="fm-modal-header">
              <div>
                <h3>Xuất Dữ liệu Giám sát Chuyến bay &amp; Note Mission (JSON)</h3>
                <p>
                  Payload chuẩn phục vụ đồng bộ Backend REST API và lưu trữ báo
                  cáo nhiệm vụ.
                </p>
              </div>
              <button
                type="button"
                className="fm-icon-btn"
                onClick={() => setShowExportModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <pre className="fm-json-preview">{exportPayloadJson}</pre>

            <div className="fm-modal-footer">
              <button
                type="button"
                className="fm-btn-submit-note"
                onClick={handleCopyExportJson}
              >
                {copiedJson ? <Check size={15} /> : <Copy size={15} />}
                <span>
                  {copiedJson ? 'Đã sao chép vào Clipboard!' : 'Sao chép JSON'}
                </span>
              </button>
              <button
                type="button"
                className="fm-btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
