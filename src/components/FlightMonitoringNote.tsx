import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Rectangle,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Plane,
  Battery,
  AlertTriangle,
  RotateCcw,
  Play,
  Pause,
  Home,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  X,
  Download,
  ExternalLink,
  LocateFixed,
} from 'lucide-react';
import type { AppDispatch, RootState } from '../store';
import {
  initializeMissionReviewExportData,
  setSelectedMissionId,
  triggerDatasetFileExport,
} from '../store/slices/missionReviewExportSlice';
import {
  initFlightMonitorData,
  selectFlightUav,
  toggleTelemetryStream,
  tickAllFlightSessions,
  applyLiveUavTelemetry,
  changeUavFlightStatus,
  adjustUavBatteryManual,
  addManualMissionNote,
  editManualMissionNote,
  removeManualMissionNote,
  setEditingNoteId,
  restoreFlightMonitorDefaults,
  clearFlightActionMessage,
  selectAllFlightSessions,
  selectActiveFlightSession,
} from '../store/slices/flightMonitorSlice';
import { telemetrySocketClient } from '../services/telemetrySocketClient';
import {
  loadStoredSessions,
  syncSessionsWaypointsToBackend,
} from '../services/flightMonitorService';
import {
  updateDroneDetails,
  SignalLevel,
} from '../store/slices/missionSlice';
import { ZONE_GEOFENCE_BOUNDS } from '../store/slices/waypointSlice';
import {
  FLIGHT_STATUS_CONFIG,
  MISSION_NOTE_PRIORITY_LABELS,
  QUICK_NOTE_TEMPLATES,
  type FlightMonitorStatus,
  type MissionNote,
  type MissionNoteCategory,
  type MissionNotePriority,
  type QuickNoteTemplate,
  type WaypointVisitState,
} from '../types/flightMonitor';
import 'leaflet/dist/leaflet.css';
import './FlightMonitoringNote.css';

// ==================== LEAFLET ICONS ====================

const uavIconCache = new Map<string, L.DivIcon>();

function getUavLiveIcon(status: FlightMonitorStatus, headingDeg: number): L.DivIcon {
  const bucketHeading = Math.round(headingDeg / 5) * 5;
  const key = `${status}:${bucketHeading}`;
  const cached = uavIconCache.get(key);
  if (cached) return cached;

  const color = FLIGHT_STATUS_CONFIG[status].color;
  const icon = L.divIcon({
    className: 'fm-uav-leaflet-icon',
    html: `
      <div class="fm-uav-marker" style="--uav-color: ${color};">
        <div class="fm-uav-plane" style="transform: rotate(${bucketHeading}deg);">✈</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -16],
  });
  uavIconCache.set(key, icon);
  return icon;
}

const waypointIconCache = new Map<string, L.DivIcon>();

function getWaypointNodeIcon(order: number, visitState: WaypointVisitState): L.DivIcon {
  const key = `${order}:${visitState}`;
  const cached = waypointIconCache.get(key);
  if (cached) return cached;

  const icon = L.divIcon({
    className: 'fm-wp-leaflet-icon',
    html: `<div class="fm-wp-marker wp-${visitState.toLowerCase()}">${order}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
  waypointIconCache.set(key, icon);
  return icon;
}

function FitSessionRouteBounds({
  uavId,
  zoneId,
  waypoints,
}: {
  uavId: string;
  zoneId: number;
  waypoints: Array<{ latitude: number; longitude: number }>;
}) {
  const map = useMap();
  const routeSignature = useMemo(
    () =>
      `${uavId}:${zoneId}:${waypoints
        .map((w) => `${w.latitude.toFixed(5)},${w.longitude.toFixed(5)}`)
        .join('|')}`,
    [uavId, zoneId, waypoints],
  );

  useEffect(() => {
    const zBox = ZONE_GEOFENCE_BOUNDS[zoneId] ?? ZONE_GEOFENCE_BOUNDS[1];
    const bounds = L.latLngBounds([
      [zBox.minLat, zBox.minLng],
      [zBox.maxLat, zBox.maxLng],
    ]);
    waypoints.forEach((w) => bounds.extend([w.latitude, w.longitude]));
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 16 });
  }, [map, routeSignature, zoneId, waypoints]);

  return null;
}

// ==================== MAIN COMPONENT ====================

interface FlightMonitoringNoteProps {
  onNavigateExportReview?: (uavId: string) => void;
}

export default function FlightMonitoringNote({
  onNavigateExportReview,
}: FlightMonitoringNoteProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const monitorMapRef = useRef<L.Map | null>(null);

  const handleDownloadCompletedFlightExcel = async () => {
    if (!activeSession || downloadingExcel) return;
    setDownloadingExcel(true);
    try {
      const initRes = await dispatch(initializeMissionReviewExportData()).unwrap();
      const matched = initRes.reviews.find(
        (r) => r.uavId === activeSession.uavId || r.missionCode === activeSession.missionCode,
      );
      const targetId = matched?.missionId ?? activeSession.missionCode;
      dispatch(setSelectedMissionId(targetId));
      await dispatch(
        triggerDatasetFileExport({
          datasetType: 'MISSION_FLIGHT_NOTES',
          missionIdFilter: targetId,
          customFileNamePrefix: `BaoCao_ChuyenBay_${activeSession.uavId}`,
          fileFormat: 'XLSX',
        }),
      );
    } finally {
      setDownloadingExcel(false);
    }
  };

  const sessions = useSelector(selectAllFlightSessions);
  const activeSession = useSelector(selectActiveFlightSession);
  const allNotes = useSelector((state: RootState) => state.flightMonitor.notes);
  const isStreaming = useSelector((state: RootState) => state.flightMonitor.isStreaming);
  const editingNoteId = useSelector((state: RootState) => state.flightMonitor.editingNoteId);
  const lastActionMessage = useSelector(
    (state: RootState) => state.flightMonitor.lastActionMessage,
  );

  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<MissionNoteCategory>('OBSERVATION');
  const [notePriority, setNotePriority] = useState<MissionNotePriority>('NORMAL');
  const [showAllUavNotes, setShowAllUavNotes] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length === 0) {
      dispatch(initFlightMonitorData());
    }
    telemetrySocketClient.connect();
    const unsubscribe = telemetrySocketClient.subscribeTelemetry((data) => {
      dispatch(applyLiveUavTelemetry(data));
    });
    return () => unsubscribe();
  }, [dispatch, sessions.length]);

  const allRoutesSignature = useMemo(
    () =>
      sessions
        .map(
          (s) =>
            `${s.uavId}:${s.waypoints
              .map((w) => `${w.latitude.toFixed(5)},${w.longitude.toFixed(5)}`)
              .join('|')}`,
        )
        .join(';'),
    [sessions],
  );

  useEffect(() => {
    const current = sessions.length > 0 ? sessions : loadStoredSessions();
    if (current.length > 0) {
      void syncSessionsWaypointsToBackend(current);
    }
    // Chỉ đẩy lên Backend khi danh sách tọa độ Waypoint thực sự thay đổi (không gọi lại mỗi nhịp bay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRoutesSignature]);

  useEffect(() => {
    if (!isStreaming) return undefined;
    const timer = window.setInterval(() => {
      dispatch(tickAllFlightSessions());
    }, 2000);
    return () => window.clearInterval(timer);
  }, [dispatch, isStreaming]);

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

  const routePositions = useMemo<[number, number][]>(() => {
    if (!activeSession) return [];
    return activeSession.waypoints.map((wp) => [wp.latitude, wp.longitude]);
  }, [activeSession]);

  const visibleNotes = useMemo(() => {
    if (!activeSession || showAllUavNotes) return allNotes;
    return allNotes.filter((n) => n.uavId === activeSession.uavId);
  }, [allNotes, activeSession, showAllUavNotes]);

  const getBatteryClass = (pct: number): string => {
    if (pct > 40) return 'bat-good';
    if (pct > 20) return 'bat-warn';
    return 'bat-critical';
  };

  const handleApplyQuickTemplate = (tpl: QuickNoteTemplate) => {
    setNoteCategory(tpl.category);
    setNotePriority(tpl.priority);
    setNoteTitle(tpl.title);
    setNoteContent(tpl.content);
    setFormError(null);
  };

  const handleStartEditNote = (note: MissionNote) => {
    dispatch(setEditingNoteId(note.id));
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteCategory(note.category);
    setNotePriority(note.priority);
    setFormError(null);
  };

  const handleCancelEditNote = () => {
    dispatch(setEditingNoteId(null));
    setNoteTitle('');
    setNoteContent('');
    setNoteCategory('OBSERVATION');
    setNotePriority('NORMAL');
    setFormError(null);
  };

  const handleSubmitNoteForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;

    const cleanTitle = noteTitle.trim();
    const cleanContent = noteContent.trim();

    if (!cleanTitle) {
      setFormError('Vui lòng nhập tiêu đề ghi chú.');
      return;
    }
    if (cleanContent.length < 10) {
      setFormError('Nội dung cần tối thiểu 10 ký tự (bạn có thể bấm Mẫu điền nhanh ở trên).');
      return;
    }

    if (editingNoteId !== null) {
      dispatch(
        editManualMissionNote({
          noteId: editingNoteId,
          updates: {
            title: cleanTitle,
            content: cleanContent,
            category: noteCategory,
            priority: notePriority,
            waypointOrder: activeSession.currentWaypointOrder,
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
            author: 'Người vận hành trực ca',
            waypointOrder: activeSession.currentWaypointOrder,
            attachLiveTelemetry: true,
          },
          session: activeSession,
        }),
      );
    }

    setNoteTitle('');
    setNoteContent('');
    setFormError(null);
  };

  if (!activeSession) {
    return (
      <div className="fm-simple-loading">
        Đang tải dữ liệu giám sát chuyến bay...
      </div>
    );
  }

  const activeStatusCfg = FLIGHT_STATUS_CONFIG[activeSession.status];
  const roundedBat = Math.round(activeSession.batteryPercent);

  return (
    <div className="fm-clean-page">
      {/* 1. THANH CHỌN MÁY BAY & NÚT ĐIỀU KHIỂN CHUNG */}
      <div className="fm-clean-topbar">
        <div className="fm-uav-selector-row">
          {sessions.map((s) => {
            const isSelected = s.uavId === activeSession.uavId;
            const st = FLIGHT_STATUS_CONFIG[s.status];
            const bat = Math.round(s.batteryPercent);
            return (
              <button
                key={s.uavId}
                type="button"
                className={`fm-uav-pill-card ${isSelected ? 'active' : ''}`}
                onClick={() => dispatch(selectFlightUav(s.uavId))}
              >
                <div className="fm-uav-pill-top">
                  <strong>{s.uavId}</strong>
                  <span className={`fm-mini-status ${st.badgeClass}`}>{st.label}</span>
                </div>
                <div className="fm-uav-pill-sub">
                  <span>{s.uavName}</span>
                  <span className={getBatteryClass(bat)}>🔋 {bat}%</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="fm-top-controls">
          <button
            type="button"
            className={`fm-clean-btn ${isStreaming ? 'btn-outline-blue' : 'btn-solid-blue'}`}
            onClick={() => dispatch(toggleTelemetryStream())}
          >
            {isStreaming ? <Pause size={15} /> : <Play size={15} />}
            <span>{isStreaming ? 'Tạm dừng bay' : 'Tiếp tục bay'}</span>
          </button>

          <button
            type="button"
            className="fm-clean-btn btn-outline-slate"
            onClick={() => dispatch(restoreFlightMonitorDefaults())}
          >
            <RotateCcw size={15} />
            <span>Khôi phục mẫu</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO THAO TÁC (NẾU CÓ) */}
      {lastActionMessage && (
        <div className="fm-clean-toast">
          <span>{lastActionMessage}</span>
          <button
            type="button"
            onClick={() => dispatch(clearFlightActionMessage())}
            aria-label="Đóng"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. KHU VỰC GIÁM SÁT CHÍNH: CỘT TRÁI ĐIỀU KHIỂN GỌN - CỘT PHẢI BẢN ĐỒ RỘNG */}
      <div className="fm-clean-main-grid">
        {/* Cột trái: Điều khiển trạng thái & Pin */}
        <aside className="fm-clean-card fm-control-card">
          <div className="fm-card-title-row">
            <div>
              <h3>{activeSession.uavName}</h3>
              <p>{activeSession.missionName}</p>
            </div>
            <span className="fm-code-tag">{activeSession.uavId}</span>
          </div>

          {/* Trạng thái & 3 nút chuyển đổi */}
          <div className="fm-section-box">
            <div className="fm-box-label">Trạng thái chuyến bay</div>
            <div className={`fm-status-banner-clean ${activeStatusCfg.badgeClass}`}>
              <strong>{activeStatusCfg.label}</strong>
              <span>{activeStatusCfg.shortDesc}</span>
            </div>

            {activeSession.status === 'COMPLETED' && (
              <div className="fm-completed-export-box">
                <div className="fm-completed-title">
                  ✓ Chuyến bay đã hoàn tất! Bạn có thể tải ngay bảng kết quả:
                </div>
                <button
                  type="button"
                  className="fm-clean-btn btn-solid-green"
                  disabled={downloadingExcel}
                  onClick={handleDownloadCompletedFlightExcel}
                >
                  <Download size={14} />
                  <span>
                    {downloadingExcel
                      ? 'Đang tạo file Excel...'
                      : `Tải Excel chuyến bay ${activeSession.uavId} (.xls)`}
                  </span>
                </button>
                {onNavigateExportReview && (
                  <button
                    type="button"
                    className="fm-clean-btn btn-outline-slate"
                    style={{ width: '100%' }}
                    onClick={() => onNavigateExportReview(activeSession.uavId)}
                  >
                    <ExternalLink size={14} />
                    <span>Xem chi tiết bên trang Xuất Excel</span>
                  </button>
                )}
              </div>
            )}

            <div className="fm-status-btn-row">
              <button
                type="button"
                className={`fm-state-btn ${activeSession.status === 'FLYING' ? 'active-fly' : ''}`}
                onClick={() =>
                  dispatch(
                    changeUavFlightStatus({
                      missionId: activeSession.missionId,
                      newStatus: 'FLYING',
                    }),
                  )
                }
              >
                <Plane size={14} /> Đang bay
              </button>

              <button
                type="button"
                className={`fm-state-btn ${activeSession.status === 'RETURNING' ? 'active-rth' : ''}`}
                onClick={() =>
                  dispatch(
                    changeUavFlightStatus({
                      missionId: activeSession.missionId,
                      newStatus: 'RETURNING',
                    }),
                  )
                }
              >
                <Home size={14} /> Về trạm
              </button>

              <button
                type="button"
                className={`fm-state-btn ${
                  activeSession.status === 'COLLECTION_ERROR' ? 'active-err' : ''
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
                <AlertTriangle size={14} /> Báo lỗi
              </button>
            </div>
          </div>

          {/* Pin & 4 nút giả lập pin nhanh */}
          <div className="fm-section-box">
            <div className="fm-box-header-inline">
              <span className="fm-box-label">
                <Battery size={14} /> Dung lượng Pin
              </span>
              <strong className={`fm-bat-big ${getBatteryClass(roundedBat)}`}>
                {roundedBat}%
              </strong>
            </div>

            <div className="fm-bar-track">
              <div
                className={`fm-bar-fill ${getBatteryClass(roundedBat)}`}
                style={{ width: `${roundedBat}%` }}
              />
            </div>

            <div className="fm-hint-text">
              Thử mức Pin (dưới 20% máy bay tự động quay về trạm):
            </div>
            <div className="fm-bat-preset-row">
              {[92, 58, 24, 15].map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`fm-bat-chip ${val <= 20 ? 'danger' : ''}`}
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

          {/* Tiến độ & 3 thông số cốt lõi */}
          <div className="fm-section-box">
            <div className="fm-box-header-inline">
              <span className="fm-box-label">Tiến độ điểm bay</span>
              <strong>
                {activeSession.completedWaypoints}/{activeSession.totalWaypoints} điểm (
                {activeSession.progressPercent}%)
              </strong>
            </div>
            <div className="fm-bar-track">
              <div
                className="fm-bar-fill progress-blue"
                style={{ width: `${activeSession.progressPercent}%` }}
              />
            </div>

            <div className="fm-mini-metrics">
              <div>
                <span>Độ cao</span>
                <strong>{activeSession.altitudeM} m</strong>
              </div>
              <div>
                <span>Tốc độ</span>
                <strong>{activeSession.speedMs} m/s</strong>
              </div>
              <div>
                <span>Vị trí</span>
                <strong>
                  {activeSession.latitude.toFixed(4)}, {activeSession.longitude.toFixed(4)}
                </strong>
              </div>
            </div>
          </div>
        </aside>

        {/* Cột phải: Bản đồ trực tiếp */}
        <section className="fm-clean-card fm-map-section">
          <div className="fm-card-title-row">
            <div>
              <h3>Bản đồ Đường bay Trực tiếp — {activeSession.zoneName}</h3>
              <p>Theo dõi vị trí máy bay di chuyển qua các điểm Waypoints theo thời gian thực</p>
            </div>
            <span className={`fm-mini-status ${activeStatusCfg.badgeClass}`}>
              ● {activeStatusCfg.label}
            </span>
          </div>

          <div className="fm-clean-map-box">
            <MapContainer
              key={`${activeSession.uavId}-${activeSession.startedAt}`}
              ref={monitorMapRef}
              center={[activeSession.latitude, activeSession.longitude]}
              zoom={15}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <FitSessionRouteBounds
                uavId={activeSession.uavId}
                zoneId={activeSession.zoneId}
                waypoints={activeSession.waypoints}
              />

              {(() => {
                const zBox = ZONE_GEOFENCE_BOUNDS[activeSession.zoneId] ?? ZONE_GEOFENCE_BOUNDS[1];
                return (
                  <Rectangle
                    bounds={[
                      [zBox.minLat, zBox.minLng],
                      [zBox.maxLat, zBox.maxLng],
                    ]}
                    pathOptions={{
                      color: '#10b981',
                      weight: 2,
                      dashArray: '6 5',
                      fillColor: '#10b981',
                      fillOpacity: 0.08,
                    }}
                  >
                    <Popup>
                      <strong>Khung bay an toàn — {zBox.code}</strong>
                      <div>{zBox.label}</div>
                    </Popup>
                  </Rectangle>
                );
              })()}

              {routePositions.length > 1 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{
                    color: activeStatusCfg.color,
                    weight: 4,
                    dashArray: activeSession.status === 'RETURNING' ? '8, 8' : undefined,
                  }}
                />
              )}

              {activeSession.waypoints.map((wp) => (
                <Marker
                  key={wp.order}
                  position={[wp.latitude, wp.longitude]}
                  icon={getWaypointNodeIcon(wp.order, wp.visitState)}
                >
                  <Popup>
                    <strong>{wp.label}</strong>
                    <div>Độ cao: {wp.altitudeM}m • Tốc độ: {wp.targetSpeedMs}m/s</div>
                  </Popup>
                </Marker>
              ))}

              <Marker
                position={[activeSession.latitude, activeSession.longitude]}
                icon={getUavLiveIcon(activeSession.status, activeSession.headingDeg)}
              >
                <Popup>
                  <strong>
                    {activeSession.uavId} — {activeSession.uavName}
                  </strong>
                  <div>
                    Pin: {roundedBat}% • {activeStatusCfg.label}
                  </div>
                </Popup>
              </Marker>
            </MapContainer>

            {/* Nút quay nhanh về vùng trang trại & UAV đang giám sát */}
            <button
              type="button"
              className="fm-recenter-btn"
              onClick={() => {
                const map = monitorMapRef.current;
                if (!map) return;
                const zBox =
                  ZONE_GEOFENCE_BOUNDS[activeSession.zoneId] ?? ZONE_GEOFENCE_BOUNDS[1];
                const bounds = L.latLngBounds([
                  [zBox.minLat, zBox.minLng],
                  [zBox.maxLat, zBox.maxLng],
                ]);
                activeSession.waypoints.forEach((w) =>
                  bounds.extend([w.latitude, w.longitude]),
                );
                bounds.extend([activeSession.latitude, activeSession.longitude]);
                map.flyToBounds(bounds, { padding: [36, 36], maxZoom: 16, duration: 0.9 });
              }}
              title={`Quay về vị trí ${activeSession.uavId} & ${activeSession.zoneName}`}
            >
              <LocateFixed size={16} />
              <span>Về trang trại</span>
            </button>
          </div>
        </section>
      </div>

      {/* 3. KHU VỰC GHI CHÚ NHIỆM VỤ (NOTE MISSION - F16): GỌN 2 CỘT CẠNH NHAU */}
      <div className="fm-clean-notes-grid">
        {/* Nửa trái: Viết ghi chú mới */}
        <section className="fm-clean-card">
          <div className="fm-card-title-row">
            <div>
              <h3>
                {editingNoteId !== null
                  ? `Sửa Ghi chú #${editingNoteId}`
                  : `Thêm Ghi chú Chuyến bay (${activeSession.uavId})`}
              </h3>
              <p>Ghi lại sự cố thời tiết, sâu bệnh hoặc tín hiệu tại điểm đang bay</p>
            </div>
            {editingNoteId !== null && (
              <button
                type="button"
                className="fm-clean-btn btn-outline-slate"
                onClick={handleCancelEditNote}
              >
                Hủy sửa
              </button>
            )}
          </div>

          <div className="fm-quick-chips">
            <span className="fm-chip-title">
              <Sparkles size={13} /> Điền nhanh:
            </span>
            {QUICK_NOTE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                className="fm-quick-chip-btn"
                onClick={() => handleApplyQuickTemplate(tpl)}
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <form className="fm-simple-form" onSubmit={handleSubmitNoteForm}>
            <div className="fm-simple-row">
              <div className="fm-field" style={{ flex: 1 }}>
                <label htmlFor="fm-title">Tiêu đề ghi chú</label>
                <input
                  id="fm-title"
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="VD: Phát hiện khô hạn cục bộ tại điểm #2..."
                />
              </div>

              <div className="fm-field" style={{ width: 150 }}>
                <label htmlFor="fm-prio">Mức ưu tiên</label>
                <select
                  id="fm-prio"
                  value={notePriority}
                  onChange={(e) => setNotePriority(e.target.value as MissionNotePriority)}
                >
                  {(Object.keys(MISSION_NOTE_PRIORITY_LABELS) as MissionNotePriority[]).map(
                    (p) => (
                      <option key={p} value={p}>
                        {MISSION_NOTE_PRIORITY_LABELS[p].label}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            <div className="fm-field">
              <label htmlFor="fm-content">Nội dung chi tiết</label>
              <textarea
                id="fm-content"
                rows={3}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Nhập mô tả tình trạng thực địa hoặc bấm nút Điền nhanh ở trên..."
              />
            </div>

            {formError && <div className="fm-clean-error">{formError}</div>}

            <button type="submit" className="fm-clean-btn btn-solid-blue">
              {editingNoteId !== null ? <Pencil size={15} /> : <Plus size={16} />}
              <span>{editingNoteId !== null ? 'Cập nhật ghi chú' : 'Lưu ghi chú'}</span>
            </button>
          </form>
        </section>

        {/* Nửa phải: Danh sách ghi chú */}
        <section className="fm-clean-card">
          <div className="fm-card-title-row">
            <div>
              <h3>Nhật ký Ghi chú ({visibleNotes.length})</h3>
              <p>
                {showAllUavNotes
                  ? 'Đang hiển thị ghi chú của tất cả UAV'
                  : `Đang lọc ghi chú của ${activeSession.uavId}`}
              </p>
            </div>

            <button
              type="button"
              className="fm-clean-btn btn-outline-slate"
              onClick={() => setShowAllUavNotes((v) => !v)}
            >
              {showAllUavNotes ? `Chỉ xem ${activeSession.uavId}` : `Xem tất cả (${allNotes.length})`}
            </button>
          </div>

          <div className="fm-clean-note-list">
            {visibleNotes.length === 0 ? (
              <div className="fm-clean-empty">
                Chưa có ghi chú nào cho {activeSession.uavId}. Bạn hãy bấm thử một nút{' '}
                <strong>Điền nhanh</strong> bên trái rồi nhấn <strong>Lưu ghi chú</strong>!
              </div>
            ) : (
              visibleNotes.map((note) => {
                const prioInfo = MISSION_NOTE_PRIORITY_LABELS[note.priority];
                return (
                  <article key={note.id} className="fm-clean-note-item">
                    <div className="fm-clean-note-head">
                      <div className="fm-clean-note-badges">
                        <span className="fm-code-tag">{note.uavId}</span>
                        <span className={`fm-prio-pill ${prioInfo.badgeClass}`}>
                          {prioInfo.label}
                        </span>
                        <span className="fm-wp-meta">Điểm #{note.waypointOrder}</span>
                      </div>

                      <div className="fm-clean-note-btns">
                        <button
                          type="button"
                          onClick={() => handleStartEditNote(note)}
                          title="Sửa ghi chú"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => dispatch(removeManualMissionNote(note.id))}
                          title="Xóa ghi chú"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h4>{note.title}</h4>
                    <p>{note.content}</p>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
