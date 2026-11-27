// Dev 3 - Sprint 3 (F05) & Sprint 7 (LTJ-33: WebSocket Client & Icon UAV Chuyển động trên Map)

import { Fragment, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { RootState, AppDispatch } from '../store';
import type { RealtimeStatus } from '../types/realtime';
import {
  initFlightMonitorData,
  tickAllFlightSessions,
  applyLiveUavTelemetry,
  selectAllFlightSessions,
  toggleTelemetryStream,
  restoreFlightMonitorDefaults,
} from '../store/slices/flightMonitorSlice';
import {
  telemetrySocketClient,
  type LiveUavTelemetryEvent,
} from '../services/telemetrySocketClient';
import 'leaflet/dist/leaflet.css';

// 1. Tạo Marker chấm tròn đổi màu theo trạng thái Cảm biến (Sprint 3 - LTJ-13)
function createStatusIcon(status: RealtimeStatus): L.DivIcon {
  const colors: Record<RealtimeStatus, string> = {
    ONLINE: '#22c55e',
    WARNING: '#f59e0b',
    OFFLINE: '#ef4444',
  };

  return L.divIcon({
    className: 'sensor-overview-marker',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: ${colors[status]};
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

// 2. Tạo Icon Máy bay UAV xoay theo hướng bay (headingDeg) trên bản đồ (Sprint 7 - LTJ-33)
function createUavIcon(uavId: string, headingDeg: number, battery: number): L.DivIcon {
  const batColor = battery <= 20 ? '#f87171' : battery <= 40 ? '#fbbf24' : '#4ade80';
  const roundedBat = Math.round(battery);

  return L.divIcon({
    className: 'uav-moving-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        pointer-events: auto;
      ">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0f172a;
          color: ${batColor};
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          line-height: 1;
          transform: rotate(${headingDeg}deg);
          transition: transform 0.35s ease;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.45);
        ">✈</div>
        <span style="
          margin-top: 3px;
          background: rgba(15, 23, 42, 0.92);
          color: #f8fafc;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.2;
          padding: 2px 7px;
          border-radius: 999px;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.22);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        ">${uavId} • <span style="color: ${batColor};">${roundedBat}%</span></span>
      </div>
    `,
    iconSize: [104, 54],
    iconAnchor: [52, 16],
    popupAnchor: [0, -14],
  });
}

export default function SensorOverviewMap() {
  const dispatch = useDispatch<AppDispatch>();

  const sensors = useSelector((state: RootState) => state.sensorRealtime.sensors);
  const flightSessions = useSelector(selectAllFlightSessions);
  const isStreaming = useSelector((state: RootState) => state.flightMonitor.isStreaming);

  const [demoOffline, setDemoOffline] = useState(false);
  const [liveTelemetry, setLiveTelemetry] = useState<Record<string, LiveUavTelemetryEvent>>({});

  // Khởi tạo danh sách chuyến bay UAV và mở kết nối WebSocket / SSE (LTJ-33)
  useEffect(() => {
    if (flightSessions.length === 0) {
      dispatch(initFlightMonitorData());
    }

    telemetrySocketClient.connect();
    const unsubscribe = telemetrySocketClient.subscribeTelemetry((data) => {
      setLiveTelemetry((prev) => ({ ...prev, [data.uavId]: data }));
      dispatch(applyLiveUavTelemetry(data));
    });

    return () => unsubscribe();
  }, [dispatch, flightSessions.length]);

  // Tự động cập nhật tọa độ UAV di chuyển mỗi 2 giây
  useEffect(() => {
    if (!isStreaming) return;
    const timer = window.setInterval(() => {
      dispatch(tickAllFlightSessions());
    }, 2000);
    return () => window.clearInterval(timer);
  }, [dispatch, isStreaming]);

  return (
    <div className="panel" style={{ padding: 20 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem' }}>
            Bản đồ Cảm biến (F05) &amp; Đội bay UAV Realtime (LTJ-33)
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Hiển thị trực quan vị trí GPS cảm biến mặt đất và quỹ đạo UAV đang bay tại Nông trại Đà Lạt.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setDemoOffline((v) => !v)}
            disabled={sensors.length === 0}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              background: demoOffline ? '#fef2f2' : '#ffffff',
              color: demoOffline ? '#dc2626' : '#334155',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            {demoOffline ? 'Tắt mô phỏng Offline' : 'Thử Marker Offline'}
          </button>

          <button
            type="button"
            onClick={() => dispatch(toggleTelemetryStream())}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #3b82f6',
              background: isStreaming ? '#eff6ff' : '#2563eb',
              color: isStreaming ? '#1d4ed8' : '#ffffff',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            {isStreaming ? '⏸ Tạm dừng UAV bay' : '▶ Tiếp tục UAV bay'}
          </button>

          <button
            type="button"
            onClick={() => dispatch(restoreFlightMonitorDefaults())}
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid #10b981',
              background: '#ecfdf5',
              color: '#047857',
              fontWeight: 600,
              fontSize: '0.84rem',
              cursor: 'pointer',
            }}
          >
            ↻ Khởi hành lại đội bay
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 14,
          alignItems: 'center',
          fontSize: '0.88rem',
          color: '#475569',
          background: '#f8fafc',
          padding: '8px 14px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <span>🟢 Online</span>
        <span>🟡 Cảnh báo</span>
        <span>🔴 Offline</span>
        <span>• Cảm biến trên bản đồ: <strong>{sensors.length}</strong></span>
        <span>• Đội bay UAV: <strong>{flightSessions.length}</strong></span>
      </div>

      <MapContainer
        center={[11.9378, 108.4652]}
        zoom={15}
        scrollWheelZoom={true}
        style={{
          height: '540px',
          width: '100%',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          zIndex: 0,
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Hiển thị các Marker Cảm biến mặt đất (Sprint 3 - LTJ-13) */}
        {sensors.map((sensor, index) => {
          const status: RealtimeStatus =
            demoOffline && index === 0 ? 'OFFLINE' : sensor.status;

          return (
            <Marker
              key={sensor.id}
              position={[sensor.location.lat, sensor.location.lng]}
              icon={createStatusIcon(status)}
            >
              <Popup>
                <strong>{sensor.sensorCode}</strong>
                <p>Zone: {sensor.zoneName}</p>
                <p>Trạng thái: {status}</p>
                <p>
                  GPS: {sensor.location.lat.toFixed(5)}, {sensor.location.lng.toFixed(5)}
                </p>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. Hiển thị đường bay Waypoints và Icon UAV chuyển động (Sprint 7 - LTJ-33) */}
        {flightSessions.map((session, idx) => {
          const live = liveTelemetry[session.uavId];
          const rawLat = live?.latitude ?? session.latitude;
          const rawLng = live?.longitude ?? session.longitude;
          const battery = live?.batteryPercent ?? session.batteryPercent;
          const speed = live?.speedMs ?? session.speedMs;
          const heading = live?.headingDeg ?? session.headingDeg;

          // Tách nhẹ góc hiển thị nếu 2 UAV đang cùng đỗ trùng tọa độ trạm Home để nhãn không đè lên nhau
          const hasCollision = flightSessions
            .slice(0, idx)
            .some(
              (other) =>
                Math.abs(other.latitude - rawLat) < 0.00025 &&
                Math.abs(other.longitude - rawLng) < 0.00025,
            );
          const lat = hasCollision ? rawLat + 0.00055 * idx : rawLat;
          const lng = hasCollision ? rawLng + 0.00055 * (idx % 2 === 0 ? 1 : -1) : rawLng;

          const routePositions: [number, number][] = session.waypoints.map((wp) => [
            wp.latitude,
            wp.longitude,
          ]);

          return (
            <Fragment key={session.uavId}>
              {routePositions.length >= 2 && (
                <Polyline
                  positions={routePositions}
                  pathOptions={{ color: '#3b82f6', weight: 3, dashArray: '8 6' }}
                />
              )}

              <Marker
                position={[lat, lng]}
                icon={createUavIcon(session.uavId, heading, battery)}
              >
                <Popup>
                  <strong>
                    {session.uavName} ({session.uavId})
                  </strong>
                  <p>Nhiệm vụ: {session.missionName}</p>
                  <p>Trạng thái: {session.status}</p>
                  <p>
                    Tọa độ GPS: {rawLat.toFixed(5)}, {rawLng.toFixed(5)}
                  </p>
                  <p>
                    Tốc độ: {speed} m/s | Pin: {Math.round(battery)}%
                  </p>
                  <p>Tiến độ: {session.progressPercent}%</p>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
