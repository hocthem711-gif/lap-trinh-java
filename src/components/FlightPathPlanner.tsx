import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import type { RootState, AppDispatch } from '../store';
import { apiRequest } from '../services/api';
import { loadStoredSessions } from '../services/flightMonitorService';
import { fetchUAVs } from '../store/slices/deviceSlice';
import {
  initFlightMonitorData,
  syncPlannedMissionToMonitor,
} from '../store/slices/flightMonitorSlice';
import {
  setMissionMetadata,
  loadPresetWaypoints,
  loadRouteForUav,
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
  ZONE_GEOFENCE_BOUNDS,
  PRESET_DEMO_WAYPOINTS,
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

// ==================== Map Center & Sub-Zone Areas (SmartFarm Đà Lạt) ====================
const MAP_CENTER: [number, number] = [11.9378, 108.4652];
const MAP_ZOOM = 15;

const ZONE_FLIGHT_AREAS: Record<
  number,
  {
    name: string;
    color: string;
    bounds: [[number, number], [number, number]];
    presetWaypoints: Array<{
      latitude: number;
      longitude: number;
      altitude: number;
      speed: number;
      type: WaypointType;
    }>;
  }
> = {
  1: {
    name: 'Zone A1 — Khu A Nhà Kính Dâu Tây',
    color: '#10b981',
    bounds: [
      [ZONE_GEOFENCE_BOUNDS[1].minLat, ZONE_GEOFENCE_BOUNDS[1].minLng],
      [ZONE_GEOFENCE_BOUNDS[1].maxLat, ZONE_GEOFENCE_BOUNDS[1].maxLng],
    ],
    presetWaypoints: [
      { latitude: 11.9389, longitude: 108.4654, altitude: 30, speed: 8, type: WaypointType.TAKEOFF },
      { latitude: 11.9402, longitude: 108.4658, altitude: 50, speed: 10, type: WaypointType.NORMAL },
      { latitude: 11.9401, longitude: 108.4676, altitude: 50, speed: 8, type: WaypointType.HOVER },
      { latitude: 11.9390, longitude: 108.4672, altitude: 20, speed: 5, type: WaypointType.LANDING },
    ],
  },
  2: {
    name: 'Zone B1 — Khu B Thủy Canh Trung Tâm',
    color: '#0ea5e9',
    bounds: [
      [ZONE_GEOFENCE_BOUNDS[2].minLat, ZONE_GEOFENCE_BOUNDS[2].minLng],
      [ZONE_GEOFENCE_BOUNDS[2].maxLat, ZONE_GEOFENCE_BOUNDS[2].maxLng],
    ],
    presetWaypoints: [
      { latitude: 11.9374, longitude: 108.4654, altitude: 35, speed: 9, type: WaypointType.TAKEOFF },
      { latitude: 11.9383, longitude: 108.4658, altitude: 50, speed: 9.5, type: WaypointType.NORMAL },
      { latitude: 11.9382, longitude: 108.4676, altitude: 50, speed: 9, type: WaypointType.HOVER },
      { latitude: 11.9373, longitude: 108.4673, altitude: 25, speed: 6, type: WaypointType.LANDING },
    ],
  },
  3: {
    name: 'Zone C1 — Khu C Vườn Cây Ăn Quả',
    color: '#f59e0b',
    bounds: [
      [ZONE_GEOFENCE_BOUNDS[3].minLat, ZONE_GEOFENCE_BOUNDS[3].minLng],
      [ZONE_GEOFENCE_BOUNDS[3].maxLat, ZONE_GEOFENCE_BOUNDS[3].maxLng],
    ],
    presetWaypoints: [
      { latitude: 11.9352, longitude: 108.4655, altitude: 30, speed: 7.5, type: WaypointType.TAKEOFF },
      { latitude: 11.9365, longitude: 108.4659, altitude: 45, speed: 8, type: WaypointType.NORMAL },
      { latitude: 11.9364, longitude: 108.4678, altitude: 50, speed: 8, type: WaypointType.HOVER },
      { latitude: 11.9353, longitude: 108.4676, altitude: 25, speed: 5, type: WaypointType.LANDING },
    ],
  },
};

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

function inferWaypointType(label: string, idx: number, total: number): WaypointType {
  const upper = label.toUpperCase();
  if (upper.includes('TAKEOFF')) return WaypointType.TAKEOFF;
  if (upper.includes('HOVER')) return WaypointType.HOVER;
  if (upper.includes('RETURN_HOME') || upper.includes('RTH')) return WaypointType.RETURN_HOME;
  if (upper.includes('LANDING')) return WaypointType.LANDING;
  if (upper.includes('NORMAL')) return WaypointType.NORMAL;
  if (idx === 0) return WaypointType.TAKEOFF;
  if (idx === total - 1) return WaypointType.LANDING;
  return WaypointType.NORMAL;
}

// ==================== Custom Marker Icon (Cached) ====================
const waypointIconCache = new Map<string, L.DivIcon>();

function createWaypointIcon(order: number, isSelected: boolean, isOutOfBounds: boolean): L.DivIcon {
  const key = `${order}-${isSelected ? 1 : 0}-${isOutOfBounds ? 1 : 0}`;
  const cached = waypointIconCache.get(key);
  if (cached) return cached;

  let extraClass = '';
  if (isOutOfBounds) extraClass = ' out-of-bounds';
  else if (isSelected) extraClass = ' selected';

  const icon = L.divIcon({
    className: '',
    html: `<div class="wp-marker-icon${extraClass}">${order}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  waypointIconCache.set(key, icon);
  return icon;
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
  const dispatch = useDispatch<AppDispatch>();
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
  const deviceUavs = useSelector((state: RootState) => state.device.uavs);
  const monitorSessions = useSelector((state: RootState) => state.flightMonitor.sessions);

  const uavOptions = useMemo(() => {
    const baseFleet = [
      { id: 'UAV-001', name: 'UAV Trinh sát 01', model: 'DJI Matrice 300 RTK' },
      { id: 'UAV-002', name: 'UAV Giám sát 02', model: 'DJI Matrice 30T' },
      { id: 'UAV-003', name: 'UAV Tuần tra 03', model: 'Autel EVO II Dual 640T' },
    ];
    const seen = new Set(baseFleet.map((u) => u.id));
    const extras = deviceUavs
      .filter((u) => !seen.has(u.id) && u.id !== 'UAV-004')
      .map((u) => ({ id: u.id, name: u.name, model: u.model }));
    return [...baseFleet, ...extras];
  }, [deviceUavs]);

  const loadUavCurrentRoute = useCallback(
    (rawTargetUavId: string, mapInstance: L.Map | null) => {
      const targetUavId = rawTargetUavId === 'UAV-004' ? 'UAV-001' : rawTargetUavId;
      const hasStaleSession = monitorSessions.some(
        (s) =>
          s.uavId === 'UAV-004' ||
          s.zoneId > 3 ||
          s.waypoints.some((w) => w.longitude < 108.4645),
      );
      if (hasStaleSession) {
        dispatch(initFlightMonitorData());
      }
      const sessions =
        monitorSessions.length > 0 && !hasStaleSession
          ? monitorSessions
          : loadStoredSessions();
      const matched = sessions.find((s) => s.uavId === targetUavId);

      if (matched && matched.waypoints.length > 0) {
        const mappedWaypoints = matched.waypoints.map((wp, idx, arr) => ({
          latitude: wp.latitude,
          longitude: wp.longitude,
          altitude: wp.altitudeM,
          speed: wp.targetSpeedMs,
          type: inferWaypointType(wp.label, idx, arr.length),
        }));

        dispatch(
          loadRouteForUav({
            uavId: targetUavId,
            missionName: matched.missionName,
            zoneId: matched.zoneId,
            waypoints: mappedWaypoints,
          }),
        );

        const mappedStatus =
          matched.status === 'FLYING'
            ? MissionStatus.ACTIVE
            : matched.status === 'RETURNING'
              ? MissionStatus.ABORTED
              : matched.status === 'COMPLETED'
                ? MissionStatus.COMPLETED
                : MissionStatus.STANDBY;
        dispatch(setStatus(mappedStatus));

        if (mapInstance && mappedWaypoints.length >= 1) {
          const zoneArea = ZONE_FLIGHT_AREAS[matched.zoneId] ?? ZONE_FLIGHT_AREAS[1];
          const bounds = L.latLngBounds(zoneArea.bounds);
          mappedWaypoints.forEach((w) => bounds.extend([w.latitude, w.longitude]));
          mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
        }
      } else {
        dispatch(
          loadRouteForUav({
            uavId: targetUavId,
            missionName: `Tuần tra định kỳ (${targetUavId})`,
            zoneId: 1,
            waypoints: [],
          }),
        );
        dispatch(setStatus(MissionStatus.STANDBY));
      }
    },
    [dispatch, monitorSessions],
  );

  useEffect(() => {
    if (deviceUavs.length === 0) {
      dispatch(fetchUAVs());
    }
  }, [dispatch, deviceUavs.length]);

  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [mapRef, setMapRef] = useState<L.Map | null>(null);
  const [defaultAltDraft, setDefaultAltDraft] = useState<string | null>(null);
  const [defaultSpeedDraft, setDefaultSpeedDraft] = useState<string | null>(null);
  const [wpEditDraft, setWpEditDraft] = useState<{
    wpId: number;
    alt?: string;
    speed?: string;
  } | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didInitialRouteLoadRef = useRef(false);

  // Tự động nạp lộ trình bay hiện tại của UAV đang chọn ngay khi mở trang Lộ trình bay
  useEffect(() => {
    if (!mapRef || didInitialRouteLoadRef.current) return;
    didInitialRouteLoadRef.current = true;
    if (!isDrawing) {
      loadUavCurrentRoute(uavId, mapRef);
    }
  }, [mapRef, isDrawing, uavId, loadUavCurrentRoute]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const commitDefaultAltitude = useCallback(() => {
    if (defaultAltDraft === null) return;
    const parsed = Number(defaultAltDraft);
    const clamped = Number.isFinite(parsed)
      ? Math.max(5, Math.min(500, parsed))
      : defaultAltitude;
    dispatch(setDefaultAltitude(clamped));
    setDefaultAltDraft(null);
  }, [defaultAltDraft, defaultAltitude, dispatch]);

  const commitDefaultSpeed = useCallback(() => {
    if (defaultSpeedDraft === null) return;
    const parsed = Number(defaultSpeedDraft);
    const clamped = Number.isFinite(parsed)
      ? Math.max(1, Math.min(30, parsed))
      : defaultSpeed;
    dispatch(setDefaultSpeed(clamped));
    setDefaultSpeedDraft(null);
  }, [defaultSpeedDraft, defaultSpeed, dispatch]);

  const commitWaypointAltitude = useCallback(
    (wpId: number, fallbackAlt: number) => {
      if (!wpEditDraft || wpEditDraft.wpId !== wpId || wpEditDraft.alt === undefined) return;
      const parsed = Number(wpEditDraft.alt);
      const clamped = Number.isFinite(parsed)
        ? Math.max(5, Math.min(500, parsed))
        : fallbackAlt;
      dispatch(updateWaypoint({ id: wpId, altitude: clamped }));
      setWpEditDraft((prev) =>
        prev && prev.wpId === wpId ? { ...prev, alt: undefined } : null,
      );
    },
    [wpEditDraft, dispatch],
  );

  const commitWaypointSpeed = useCallback(
    (wpId: number, fallbackSpeed: number) => {
      if (!wpEditDraft || wpEditDraft.wpId !== wpId || wpEditDraft.speed === undefined) return;
      const parsed = Number(wpEditDraft.speed);
      const clamped = Number.isFinite(parsed)
        ? Math.max(1, Math.min(30, parsed))
        : fallbackSpeed;
      dispatch(updateWaypoint({ id: wpId, speed: clamped }));
      setWpEditDraft((prev) =>
        prev && prev.wpId === wpId ? { ...prev, speed: undefined } : null,
      );
    },
    [wpEditDraft, dispatch],
  );

  // Polyline positions
  const polylinePositions: [number, number][] = useMemo(
    () => waypoints.map(wp => [wp.latitude, wp.longitude]),
    [waypoints],
  );

  const activeZoneLabel = ZONE_GEOFENCE_BOUNDS[zoneId]?.code ?? 'Zone A1';
  const oobPointLabels = useMemo(
    () => waypoints.filter((w) => w.isOutOfBounds).map((w) => `#${w.order}`).join(', '),
    [waypoints],
  );

  // Fit all waypoints & active flight zone frame in view
  const fitBounds = useCallback(() => {
    if (!mapRef) return;
    const zoneArea = ZONE_FLIGHT_AREAS[zoneId] ?? ZONE_FLIGHT_AREAS[1];
    const bounds = L.latLngBounds(zoneArea.bounds);
    waypoints.forEach((wp) => bounds.extend([wp.latitude, wp.longitude]));
    mapRef.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [mapRef, zoneId, waypoints]);

  const applyZonePresetToMap = useCallback(
    (targetZoneId: number) => {
      const zoneCfg = ZONE_FLIGHT_AREAS[targetZoneId] ?? ZONE_FLIGHT_AREAS[1];
      dispatch(
        loadRouteForUav({
          uavId,
          missionName: `Tuần tra ${zoneCfg.name} (${uavId})`,
          zoneId: targetZoneId,
          waypoints: zoneCfg.presetWaypoints,
        }),
      );
      if (mapRef) {
        const bounds = L.latLngBounds(zoneCfg.bounds);
        mapRef.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
      }
    },
    [dispatch, uavId, mapRef],
  );

  // Load Preset Demo Route theo đúng Zone đang chọn
  const handleLoadPreset = useCallback(() => {
    const zoneCfg = ZONE_FLIGHT_AREAS[zoneId];
    if (zoneCfg) {
      applyZonePresetToMap(zoneId);
      return;
    }
    dispatch(loadPresetWaypoints());
    if (mapRef && PRESET_DEMO_WAYPOINTS.length > 0) {
      const bounds = L.latLngBounds(
        PRESET_DEMO_WAYPOINTS.map((wp) => [wp.latitude, wp.longitude] as [number, number]),
      );
      mapRef.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [zoneId, applyZonePresetToMap, dispatch, mapRef]);

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

  const pushRouteToFlightMonitor = useCallback(
    (resolvedName: string, backendMissionId?: number) => {
      if (waypoints.length < 2) return;
      const chosenUav = uavOptions.find((u) => u.id === uavId);
      dispatch(
        syncPlannedMissionToMonitor({
          uavId,
          uavName: chosenUav?.name,
          uavModel: chosenUav?.model,
          missionName: resolvedName,
          zoneId,
          totalDistanceM: telemetry.totalDistanceM,
          estimatedTimeSeconds: telemetry.estimatedTimeSeconds,
          backendMissionId,
          waypoints: waypoints.map((wp) => ({
            order: wp.order,
            latitude: wp.latitude,
            longitude: wp.longitude,
            altitude: wp.altitude,
            speed: wp.speed,
            type: wp.type,
          })),
        }),
      );
    },
    [dispatch, uavId, uavOptions, waypoints, zoneId, telemetry],
  );

  // Save mission (Hybrid: gửi POST /api/v1/missions lên Backend + đồng bộ sang Giám sát Chuyến bay)
  const handleSaveMission = useCallback(async () => {
    if (waypoints.length < 2) return;
    if (hasOOB) {
      setSaveMessage(
        `⚠ Không thể lưu lộ trình: Điểm ${oobPointLabels} đang nằm ngoài khung bay an toàn của ${activeZoneLabel}! Hãy kéo điểm đỏ vào lại trong khung.`,
      );
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveMessage(null), 4500);
      return;
    }
    const resolvedName = missionName || `Mission ${new Date().toLocaleDateString('vi-VN')}`;
    dispatch(saveMissionRoute({
      missionName: resolvedName,
      waypointCount: waypoints.length,
      totalDistanceM: telemetry.totalDistanceM,
      estimatedTimeSeconds: telemetry.estimatedTimeSeconds,
      estimatedBatteryDrain: telemetry.estimatedBatteryDrain,
      createdAt: new Date().toISOString(),
      waypointsJson: JSON.stringify(missionPayload),
    }));

    let syncedBackend = false;
    let createdMissionId: number | undefined;
    try {
      const res = await apiRequest<{ id?: number }>('/missions', {
        method: 'POST',
        body: JSON.stringify({
          ...missionPayload,
          name: resolvedName,
          missionName: resolvedName,
        }),
      });
      syncedBackend = true;
      if (typeof res.data?.id === 'number') {
        createdMissionId = res.data.id;
      }
    } catch {
      // Hybrid fallback khi Backend chưa bật
    }

    pushRouteToFlightMonitor(resolvedName, createdMissionId);

    setSaveMessage(
      syncedBackend
        ? `Đã lưu & đồng bộ lộ trình "${resolvedName}" cho ${uavId} sang Giám sát & Backend (${waypoints.length} WP · ${telemetry.totalDistanceM}m)`
        : `Đã lưu & đồng bộ lộ trình "${resolvedName}" cho ${uavId} sang Giám sát (${waypoints.length} WP · ${telemetry.totalDistanceM}m)`,
    );
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveMessage(null), 4000);
  }, [
    dispatch,
    waypoints,
    hasOOB,
    oobPointLabels,
    activeZoneLabel,
    telemetry,
    missionPayload,
    missionName,
    uavId,
    pushRouteToFlightMonitor,
  ]);

  // Copy JSON (an toàn với try/catch & cleanup timer)
  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(missionPayload, null, 2));
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setSaveMessage('Không thể tự động sao chép vào Clipboard trên trình duyệt này.');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setSaveMessage(null), 3000);
    }
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

          {/* Ranh giới 4 khung bay phân khu canh tác (Zone A1, B1, C1, D1) */}
          {Object.entries(ZONE_FLIGHT_AREAS).map(([idStr, area]) => {
            const zNum = Number(idStr);
            const isActiveZone = zNum === zoneId;
            const zoneBorderColor = isActiveZone && hasOOB ? '#ef4444' : area.color;
            return (
              <Rectangle
                key={zNum}
                bounds={area.bounds}
                pathOptions={{
                  color: zoneBorderColor,
                  weight: isActiveZone ? 3 : 1.3,
                  dashArray: isActiveZone ? (hasOOB ? '8 5' : undefined) : '5 5',
                  fillColor: zoneBorderColor,
                  fillOpacity: isActiveZone ? 0.14 : 0.03,
                }}
              >
                <Popup>
                  <strong>{area.name}</strong>
                  <br />
                  {isActiveZone
                    ? 'Khung bay an toàn đang kích hoạt (Kéo điểm ra ngoài khung sẽ bật cảnh báo đỏ)'
                    : 'Phân khu bay lân cận'}
                </Popup>
              </Rectangle>
            );
          })}

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
                      <span style={{ color: '#dc2626', fontWeight: 700 }}>
                        ⚠ Vượt ra ngoài khung bay {activeZoneLabel}!
                      </span>
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
            <AlertTriangle size={17} />
            <span>
              Cảnh báo vượt khung bay: Điểm <strong>{oobPointLabels}</strong> đang nằm ngoài khung cho phép của{' '}
              <strong>{activeZoneLabel}</strong>! Hãy kéo điểm đỏ vào lại trong khung màu.
            </span>
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
            <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
              <select
                className="config-select-input"
                style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis' }}
                value={uavId}
                onChange={(e) => loadUavCurrentRoute(e.target.value, mapRef)}
              >
                {uavOptions.map((uav) => (
                  <option key={uav.id} value={uav.id}>
                    {uav.id} ({uav.model})
                  </option>
                ))}
              </select>
              <select
                className="config-select-input"
                style={{ flexShrink: 0, width: 92 }}
                value={zoneId}
                onChange={(e) => applyZonePresetToMap(Number(e.target.value))}
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
              onClick={async () => {
                if (hasOOB) {
                  setSaveMessage(
                    `⚠ Khóa an toàn Geofence: Không thể cất cánh khi điểm ${oobPointLabels} nằm ngoài khung ${activeZoneLabel}!`,
                  );
                  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
                  saveTimerRef.current = setTimeout(() => setSaveMessage(null), 4500);
                  return;
                }
                dispatch(setStatus(MissionStatus.ACTIVE));
                const resolvedName =
                  missionName || `Mission ${new Date().toLocaleDateString('vi-VN')}`;
                let createdMissionId: number | undefined;
                try {
                  const res = await apiRequest<{ id?: number }>('/missions', {
                    method: 'POST',
                    body: JSON.stringify({
                      ...missionPayload,
                      name: resolvedName,
                      missionName: resolvedName,
                    }),
                  });
                  if (typeof res.data?.id === 'number') {
                    createdMissionId = res.data.id;
                  }
                } catch {
                  // Fallback local
                }
                pushRouteToFlightMonitor(resolvedName, createdMissionId);
              }}
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
              value={defaultAltDraft ?? String(defaultAltitude)}
              onChange={(e) => setDefaultAltDraft(e.target.value)}
              onBlur={commitDefaultAltitude}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDefaultAltitude();
              }}
              min={5}
              max={500}
            />
            <span className="unit-label">m</span>
          </div>

          <div className="config-row">
            <label><Gauge size={13} /> Tốc độ</label>
            <input
              type="number"
              value={defaultSpeedDraft ?? String(defaultSpeed)}
              onChange={(e) => setDefaultSpeedDraft(e.target.value)}
              onBlur={commitDefaultSpeed}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitDefaultSpeed();
              }}
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
                        {wp.isOutOfBounds && (
                          <strong style={{ color: '#dc2626' }}> · ⚠ Ngoài khung bay</strong>
                        )}
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
                            value={
                              wpEditDraft?.wpId === wp.id && wpEditDraft.alt !== undefined
                                ? wpEditDraft.alt
                                : String(wp.altitude)
                            }
                            onChange={e =>
                              setWpEditDraft((prev) => ({
                                wpId: wp.id,
                                speed: prev?.wpId === wp.id ? prev.speed : undefined,
                                alt: e.target.value,
                              }))
                            }
                            onBlur={() => commitWaypointAltitude(wp.id, wp.altitude)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitWaypointAltitude(wp.id, wp.altitude);
                            }}
                          />
                        </div>
                        <div className="wp-inline-field">
                          <label>Tốc độ (m/s)</label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={
                              wpEditDraft?.wpId === wp.id && wpEditDraft.speed !== undefined
                                ? wpEditDraft.speed
                                : String(wp.speed)
                            }
                            onChange={e =>
                              setWpEditDraft((prev) => ({
                                wpId: wp.id,
                                alt: prev?.wpId === wp.id ? prev.alt : undefined,
                                speed: e.target.value,
                              }))
                            }
                            onBlur={() => commitWaypointSpeed(wp.id, wp.speed)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitWaypointSpeed(wp.id, wp.speed);
                            }}
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
