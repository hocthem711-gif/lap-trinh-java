import { useState, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Rectangle,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MousePointerClick,
  Undo2,
  Trash2,
  Maximize2,
  Route,
  Clock,
  Battery,
  MapPinPlus,
  ArrowUpFromLine,
  Gauge,
  AlertTriangle,
  Save,
  FileJson,
  X,
  Copy,
  MapPin,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Plane,
} from 'lucide-react';
import type { RootState } from '../store';
import {
  setMissionMetadata,
  loadPresetWaypoints,
  addWaypoint,
  removeWaypoint,
  undoLastWaypoint,
  updateWaypoint,
  selectWaypoint,
  clearWaypoints,
  setDrawingMode,
  setDefaultAltitude,
  setDefaultSpeed,
  setAllAltitude,
  setAllSpeed,
  selectWaypoints,
  selectTelemetry,
  selectIsDrawingMode,
  selectSelectedWaypointId,
  selectHasOutOfBoundsWaypoints,
  selectMissionPayload,
  WaypointType,
  GEOFENCE_BOUNDS,
} from '../store/slices/waypointSlice';
import {
  saveMissionRoute,
  setStatus,
  abortMission,
  completeMission,
  MissionStatus,
} from '../store/slices/missionSlice';
import 'leaflet/dist/leaflet.css';
import './FlightPathPlanner.css';

/**
 * FlightPathPlanner — Giao diện Vẽ Waypoints Đường bay UAV trên Bản đồ
 * Task: LTJ-19 - Sprint 4
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Chức năng:
 * 1. Click trên Map thêm Waypoint → Polyline nối lộ trình bay
 * 2. Nạp lộ trình bay mẫu (Preset Demo) khớp kịch bản kiểm thử Khu A
 * 3. Drag & drop Marker chỉnh tọa độ GPS + chỉnh từng điểm (Cao độ, Tốc độ, Loại điểm)
 * 4. Tính toán khoảng cách 3D (Haversine), thời gian bay, pin tiêu hao
 * 5. Geofence validation (cảnh báo nếu điểm ra ngoài ranh giới Farm)
 * 6. Quản lý trạng thái Mission (Start / Pause / RTH Abort) & Export JSON payload (LTJ-17)
 */

// ==================== Map Center (SmartFarm area) ====================
const MAP_CENTER: [number, number] = [10.8505, 106.7730];
const MAP_ZOOM = 15;

const WAYPOINT_TYPE_LABELS: Record<WaypointType, string> = {
  TAKEOFF: '🛫 Cất cánh (TAKEOFF)',
  NORMAL: '✈️ Bay thường (NORMAL)',
  HOVER: '🚁 Bay treo (HOVER)',
  LANDING: '🛬 Hạ cánh (LANDING)',
  RETURN_HOME: '🏠 Quay về (RTH)',
};

const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  STANDBY: 'Chờ lệnh',
  PLANNING: 'Đã lập kế hoạch',
  ACTIVE: 'Đang bay',
  PAUSED: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  ABORTED: 'Khẩn cấp (RTH)',
};

// ==================== Custom Marker Icon ====================
function createWaypointIcon(order: number, isSelected: boolean, isOutOfBounds: boolean): L.DivIcon {
  let extraClass = '';
  if (isOutOfBounds) extraClass = ' out-of-bounds';
  else if (isSelected) extraClass = ' selected';

  return L.divIcon({
    className: '',
    html: `<div class="wp-marker-icon${extraClass}">${order}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// ==================== Map Click Handler Sub-component ====================
function MapClickHandler() {
  const dispatch = useDispatch();
  const isDrawing = useSelector(selectIsDrawingMode);

  useMapEvents({
    click(e) {
      if (isDrawing) {
        dispatch(addWaypoint({
          latitude: e.latlng.lat,
          longitude: e.latlng.lng,
        }));
      }
    },
  });

  return null;
}

// ==================== Main Component ====================
export default function FlightPathPlanner() {
  const dispatch = useDispatch();
  const waypoints = useSelector(selectWaypoints);
  const telemetry = useSelector(selectTelemetry);
  const isDrawing = useSelector(selectIsDrawingMode);
  const selectedId = useSelector(selectSelectedWaypointId);
  const hasOOB = useSelector(selectHasOutOfBoundsWaypoints);
  const missionPayload = useSelector(selectMissionPayload);
  const defaultAltitude = useSelector((state: RootState) => state.waypoint.defaultAltitude);
  const defaultSpeed = useSelector((state: RootState) => state.waypoint.defaultSpeed);
  const missionName = useSelector((state: RootState) => state.waypoint.missionName);
  const uavId = useSelector((state: RootState) => state.waypoint.uavId);
  const zoneId = useSelector((state: RootState) => state.waypoint.zoneId);
  const missionStatus = useSelector((state: RootState) => state.mission.status);

  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  // Polyline positions
  const polylinePositions: [number, number][] = useMemo(
    () => waypoints.map(wp => [wp.latitude, wp.longitude]),
    [waypoints],
  );

  // Geofence rectangle
  const geofenceCorners: [[number, number], [number, number]] = [
    [GEOFENCE_BOUNDS.minLat, GEOFENCE_BOUNDS.minLng],
    [GEOFENCE_BOUNDS.maxLat, GEOFENCE_BOUNDS.maxLng],
  ];

  // Fit all waypoints in view
  const fitBounds = useCallback(() => {
    if (mapRef && waypoints.length > 0) {
      const bounds = L.latLngBounds(
        waypoints.map(wp => [wp.latitude, wp.longitude] as [number, number]),
      );
      mapRef.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [mapRef, waypoints]);

  // Load Preset Demo Route
  const handleLoadPreset = useCallback(() => {
    dispatch(loadPresetWaypoints());
    if (mapRef) {
      const bounds = L.latLngBounds([
        [10.8450, 106.7650],
        [10.8550, 106.7820],
      ]);
      mapRef.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [dispatch, mapRef]);

  // Handle marker drag end
  const handleDragEnd = useCallback((waypointId: number, e: L.DragEndEvent) => {
    const marker = e.target;
    const pos = marker.getLatLng();
    dispatch(updateWaypoint({
      id: waypointId,
      latitude: pos.lat,
      longitude: pos.lng,
    }));
  }, [dispatch]);

  // Select waypoint in list and fly to it on map
  const handleSelectWaypoint = useCallback((wp: { id: number; latitude: number; longitude: number }) => {
    dispatch(selectWaypoint(wp.id));
    if (mapRef) {
      mapRef.flyTo([wp.latitude, wp.longitude], 16, { duration: 0.7 });
    }
  }, [dispatch, mapRef]);

  // Save mission
  const handleSaveMission = useCallback(() => {
    if (waypoints.length < 2) return;
    dispatch(saveMissionRoute({
      missionName: missionName || `Mission ${new Date().toLocaleDateString('vi-VN')}`,
      waypointCount: waypoints.length,
      totalDistanceM: telemetry.totalDistanceM,
      estimatedTimeSeconds: telemetry.estimatedTimeSeconds,
      estimatedBatteryDrain: telemetry.estimatedBatteryDrain,
      createdAt: new Date().toISOString(),
      waypointsJson: JSON.stringify(missionPayload),
    }));
    setSaveMessage(`Đã lưu nhiệm vụ "${missionName}" (${waypoints.length} WP · ${telemetry.totalDistanceM}m)`);
    setTimeout(() => setSaveMessage(null), 4000);
  }, [dispatch, waypoints, telemetry, missionPayload, missionName]);

  // Copy JSON
  const handleCopyJson = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(missionPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [missionPayload]);

  return (
    <div className="flight-planner">
      {/* ==================== MAP ==================== */}
      <div className="flight-map-container">
        <MapContainer
          center={MAP_CENTER}
          zoom={MAP_ZOOM}
          scrollWheelZoom={true}
          ref={setMapRef}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapClickHandler />

          {/* Geofence boundary rectangle */}
          <Rectangle
            bounds={geofenceCorners}
            pathOptions={{
              color: '#6366f1',
              weight: 2,
              dashArray: '8 6',
              fillColor: '#6366f1',
              fillOpacity: 0.04,
            }}
          />

          {/* Flight path polyline */}
          {polylinePositions.length >= 2 && (
            <Polyline
              positions={polylinePositions}
              pathOptions={{
                color: '#3b82f6',
                weight: 3,
                opacity: 0.85,
                dashArray: '10 6',
              }}
            />
          )}

          {/* Waypoint markers */}
          {waypoints.map(wp => (
            <Marker
              key={wp.id}
              position={[wp.latitude, wp.longitude]}
              icon={createWaypointIcon(wp.order, wp.id === selectedId, wp.isOutOfBounds)}
              draggable={true}
              eventHandlers={{
                click: () => dispatch(selectWaypoint(wp.id)),
                dragend: (e) => handleDragEnd(wp.id, e),
              }}
            >
              <Popup className="wp-popup">
                <div>
                  <strong>Waypoint #{wp.order} ({wp.type})</strong>
                  <br />
                  Lat: {wp.latitude.toFixed(6)}
                  <br />
                  Lng: {wp.longitude.toFixed(6)}
                  <br />
                  Cao độ: {wp.altitude}m | Tốc độ: {wp.speed}m/s
                  {wp.isOutOfBounds && (
                    <>
                      <br />
                      <span style={{ color: '#f87171' }}>⚠ Ngoài vùng an toàn</span>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Map overlay toolbar */}
        <div className="map-toolbar">
          <button
            type="button"
            className={isDrawing ? 'active-draw' : ''}
            onClick={() => dispatch(setDrawingMode(!isDrawing))}
          >
            <MousePointerClick size={15} />
            {isDrawing ? 'Đang vẽ...' : 'Vẽ điểm'}
          </button>

          <button
            type="button"
            className="preset-btn"
            onClick={handleLoadPreset}
            title="Nạp lộ trình bay mẫu 4 điểm tại Khu A"
          >
            <Sparkles size={15} />
            Nạp lộ trình mẫu (Preset Demo)
          </button>

          <button
            type="button"
            onClick={() => dispatch(undoLastWaypoint())}
            disabled={waypoints.length === 0}
          >
            <Undo2 size={15} />
            Hoàn tác
          </button>

          <button
            type="button"
            className="danger-btn"
            onClick={() => dispatch(clearWaypoints())}
            disabled={waypoints.length === 0}
          >
            <Trash2 size={15} />
            Xóa tất cả
          </button>

          <button
            type="button"
            onClick={fitBounds}
            disabled={waypoints.length === 0}
          >
            <Maximize2 size={15} />
            Fit View
          </button>
        </div>

        {/* Save confirmation banner */}
        {saveMessage && (
          <div className="mission-save-banner">
            <CheckCircle2 size={16} />
            {saveMessage}
          </div>
        )}

        {/* Geofence warning */}
        {hasOOB && (
          <div className="geofence-warning">
            <AlertTriangle size={16} />
            Cảnh báo: Có điểm bay nằm ngoài ranh giới an toàn của nông trại!
          </div>
        )}
      </div>

      {/* ==================== SIDEBAR ==================== */}
      <div className="flight-sidebar">
        {/* Telemetry summary */}
        <div className="telemetry-grid">
          <div className="telemetry-card">
            <div className="label"><Route size={13} /> Khoảng cách</div>
            <div className="value">
              {telemetry.totalDistanceM >= 1000
                ? telemetry.totalDistanceKm.toFixed(2)
                : Math.round(telemetry.totalDistanceM)}
              <span className="unit">
                {telemetry.totalDistanceM >= 1000 ? 'km' : 'm'}
              </span>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="label"><Clock size={13} /> Thời gian bay</div>
            <div className="value">
              {telemetry.estimatedTimeFormatted}
              <span className="unit">phút</span>
            </div>
          </div>

          <div className={`telemetry-card${telemetry.estimatedBatteryDrain > 80 ? ' danger' : telemetry.estimatedBatteryDrain > 50 ? ' warning' : ''}`}>
            <div className="label"><Battery size={13} /> Pin tiêu hao</div>
            <div className="value">
              {telemetry.estimatedBatteryDrain.toFixed(2)}
              <span className="unit">%</span>
            </div>
          </div>

          <div className="telemetry-card">
            <div className="label"><MapPinPlus size={13} /> Số điểm</div>
            <div className="value">
              {waypoints.length}
              <span className="unit">WP</span>
            </div>
          </div>
        </div>

        {/* Mission Info & Flight Control Panel */}
        <div className="config-panel">
          <h3>
            <Plane size={16} /> Thông tin & Điều khiển Mission
            <span className={`mission-status-pill ${missionStatus.toLowerCase()}`}>
              {MISSION_STATUS_LABELS[missionStatus]}
            </span>
          </h3>

          <div className="config-row">
            <label>Tên nhiệm vụ</label>
            <input
              type="text"
              className="config-text-input"
              value={missionName}
              onChange={(e) => dispatch(setMissionMetadata({ missionName: e.target.value }))}
              placeholder="VD: Tuần tra Khu A"
            />
          </div>

          <div className="config-row">
            <label>Thiết bị / Zone</label>
            <div style={{ display: 'flex', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
              <select
                className="config-select-input"
                value={uavId}
                onChange={(e) => dispatch(setMissionMetadata({ uavId: e.target.value }))}
              >
                <option value="UAV-001">UAV-001 (Agras T30)</option>
                <option value="UAV-002">UAV-002 (Mavic 3M)</option>
                <option value="UAV-005">UAV-005 (Phantom 4 RTK)</option>
              </select>
              <select
                className="config-select-input"
                value={zoneId}
                onChange={(e) => dispatch(setMissionMetadata({ zoneId: Number(e.target.value) }))}
              >
                <option value={1}>Zone A1</option>
                <option value={2}>Zone B1</option>
                <option value={3}>Zone C1</option>
              </select>
            </div>
          </div>

          <div className="mission-control-btns">
            <button
              type="button"
              className="mc-btn start"
              disabled={waypoints.length < 2 || missionStatus === MissionStatus.ACTIVE}
              onClick={() => dispatch(setStatus(MissionStatus.ACTIVE))}
            >
              <Play size={13} /> Bay
            </button>
            <button
              type="button"
              className="mc-btn pause"
              disabled={missionStatus !== MissionStatus.ACTIVE}
              onClick={() => dispatch(setStatus(MissionStatus.PAUSED))}
            >
              <Pause size={13} /> Tạm dừng
            </button>
            <button
              type="button"
              className="mc-btn complete"
              disabled={missionStatus !== MissionStatus.ACTIVE && missionStatus !== MissionStatus.PAUSED}
              onClick={() => dispatch(completeMission())}
            >
              <CheckCircle2 size={13} /> Hoàn tất
            </button>
            <button
              type="button"
              className="mc-btn abort"
              disabled={waypoints.length === 0}
              onClick={() => dispatch(abortMission())}
              title="Hủy khẩn cấp & Quay về (Return To Home)"
            >
              <RotateCcw size={13} /> RTH
            </button>
          </div>
        </div>

        {/* Flight default config */}
        <div className="config-panel">
          <h3><Gauge size={16} /> Cấu hình bay mặc định</h3>

          <div className="config-row">
            <label><ArrowUpFromLine size={13} /> Cao độ</label>
            <input
              type="number"
              value={defaultAltitude}
              onChange={(e) => dispatch(setDefaultAltitude(Number(e.target.value)))}
              min={5}
              max={500}
            />
            <span className="unit-label">m</span>
          </div>

          <div className="config-row">
            <label><Gauge size={13} /> Tốc độ</label>
            <input
              type="number"
              value={defaultSpeed}
              onChange={(e) => dispatch(setDefaultSpeed(Number(e.target.value)))}
              min={1}
              max={30}
            />
            <span className="unit-label">m/s</span>
          </div>

          <button
            type="button"
            className="apply-all-btn"
            onClick={() => {
              dispatch(setAllAltitude(defaultAltitude));
              dispatch(setAllSpeed(defaultSpeed));
            }}
            disabled={waypoints.length === 0}
          >
            Áp dụng cho tất cả điểm bay
          </button>
        </div>

        {/* Waypoint list */}
        <div className="waypoint-list-panel">
          <h3>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={15} /> Danh sách Waypoints
            </span>
            <span>{waypoints.length} điểm</span>
          </h3>

          {waypoints.length === 0 ? (
            <div className="wp-list-empty">
              <div className="empty-icon">📍</div>
              Nhấn nút <strong>"Vẽ điểm"</strong> rồi click lên bản đồ
              <br />
              hoặc chọn <strong>"Nạp lộ trình mẫu"</strong> để bắt đầu.
            </div>
          ) : (
            waypoints.map(wp => {
              const isSelected = wp.id === selectedId;
              return (
                <div
                  key={wp.id}
                  className={`wp-list-item${isSelected ? ' selected' : ''}${wp.isOutOfBounds ? ' out-of-bounds' : ''}`}
                  onClick={() => handleSelectWaypoint(wp)}
                >
                  <div className="wp-item-main">
                    <div className="wp-order-badge">{wp.order}</div>
                    <div className="wp-list-info">
                      <div className="coords">
                        {wp.latitude.toFixed(5)}, {wp.longitude.toFixed(5)}
                      </div>
                      <div className="meta">
                        Alt: {wp.altitude}m · Spd: {wp.speed}m/s · {wp.type}
                        {wp.isOutOfBounds && ' · ⚠ OOB'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="wp-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(removeWaypoint(wp.id));
                      }}
                      title="Xóa điểm"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Inline editor when waypoint is selected */}
                  {isSelected && (
                    <div className="wp-inline-editor" onClick={e => e.stopPropagation()}>
                      <div className="wp-inline-field">
                        <label>Loại điểm</label>
                        <select
                          value={wp.type}
                          onChange={e => dispatch(updateWaypoint({ id: wp.id, type: e.target.value as WaypointType }))}
                        >
                          {Object.entries(WAYPOINT_TYPE_LABELS).map(([k, label]) => (
                            <option key={k} value={k}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="wp-inline-row">
                        <div className="wp-inline-field">
                          <label>Cao độ (m)</label>
                          <input
                            type="number"
                            min={5}
                            max={500}
                            value={wp.altitude}
                            onChange={e => dispatch(updateWaypoint({ id: wp.id, altitude: Math.max(5, Math.min(500, Number(e.target.value))) }))}
                          />
                        </div>
                        <div className="wp-inline-field">
                          <label>Tốc độ (m/s)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={wp.speed}
                            onChange={e => dispatch(updateWaypoint({ id: wp.id, speed: Math.max(1, Math.min(30, Number(e.target.value))) }))}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Action buttons */}
        <button
          type="button"
          className="save-mission-btn"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#a5b4fc', boxShadow: 'none', border: '1px solid rgba(99,102,241,0.3)' }}
          onClick={() => setShowJsonModal(true)}
          disabled={waypoints.length < 2}
        >
          <FileJson size={17} />
          Xem JSON API Payload
        </button>

        <button
          type="button"
          className="save-mission-btn"
          onClick={handleSaveMission}
          disabled={waypoints.length < 2}
        >
          <Save size={17} />
          Lưu Mission
        </button>
      </div>

      {/* ==================== JSON Export Modal ==================== */}
      {showJsonModal && (
        <div className="json-modal-overlay" onClick={() => setShowJsonModal(false)}>
          <div className="json-modal" onClick={e => e.stopPropagation()}>
            <h3>📡 API Payload — POST /api/v1/missions</h3>
            <p>JSON Waypoints chuẩn bị gửi cho Backend Dev 2 (Task LTJ-17)</p>
            <pre>{JSON.stringify(missionPayload, null, 2)}</pre>
            <div className="json-modal-actions">
              <button type="button" className="copy-btn" onClick={handleCopyJson}>
                <Copy size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                {copied ? 'Đã sao chép!' : 'Sao chép JSON'}
              </button>
              <button type="button" className="close-btn" onClick={() => setShowJsonModal(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
