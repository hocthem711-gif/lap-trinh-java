// Dev 3 - Sprint 3 (F05) & Sprint 7 (LTJ-33: WebSocket Client & Icon UAV Chuyển động trên Map)

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import type { RootState, AppDispatch } from '../store';
import type { RealtimeStatus } from '../types/realtime';
import {
  initFlightMonitorData,
  tickAllFlightSessions,
  selectAllFlightSessions,
  toggleTelemetryStream,
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
        width: 20px;
        height: 20px;
        background: ${colors[status]};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px #0005;
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

// 2. Tạo Icon Máy bay UAV xoay theo hướng bay (headingDeg) trên bản đồ (Sprint 7 - LTJ-33)
function createUavIcon(uavId: string, headingDeg: number, battery: number): L.DivIcon {
  return L.divIcon({
    className: 'uav-moving-marker',
    html: `
      <div style="text-align: center;">
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #0f172a;
          color: #22c55e;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          transform: rotate(${headingDeg}deg);
          transition: transform 0.4s;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
        ">✈</div>
        <span style="
          background: #0f172a;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 1px 5px;
          border-radius: 4px;
        ">${uavId} (${battery}%)</span>
      </div>
    `,
    iconSize: [40, 48],
    iconAnchor: [20, 20],
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
    <div style={{ padding: 16 }}>
      <h2>Bản đồ Cảm biến (F05) &amp; Icon UAV Chuyển động Realtime (LTJ-33)</h2>
      <p>Hiển thị vị trí GPS cảm biến và tọa độ UAV đang bay theo thời gian thực.</p>

      <div
        style={{
          display: 'flex',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <span>🟢 Online</span>
        <span>🟡 Cảnh báo</span>
        <span>🔴 Offline</span>
        <span>• Cảm biến: {sensors.length}</span>
        <span>• UAV đang bay: {flightSessions.length}</span>

        <button
          type="button"
          onClick={() => setDemoOffline((v) => !v)}
          disabled={sensors.length === 0}
        >
          {demoOffline ? 'Tắt mô phỏng Offline' : 'Thử Marker Offline'}
        </button>

        <button
          type="button"
          onClick={() => dispatch(toggleTelemetryStream())}
        >
          {isStreaming ? '⏸ Tạm dừng UAV bay' : '▶ Tiếp tục UAV bay'}
        </button>
      </div>

      <MapContainer
        center={[10.8505, 106.773]}
        zoom={15}
        scrollWheelZoom={true}
        style={{
          height: '520px',
          width: '100%',
          borderRadius: '12px',
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
        {flightSessions.map((session) => {
          const live = liveTelemetry[session.uavId];
          const lat = live?.latitude ?? session.latitude;
          const lng = live?.longitude ?? session.longitude;
          const battery = live?.batteryPercent ?? session.batteryPercent;
          const speed = live?.speedMs ?? session.speedMs;
          const heading = live?.headingDeg ?? session.headingDeg;

          const routePositions: [number, number][] = session.waypoints.map((wp) => [
            wp.latitude,
            wp.longitude,
          ]);

          return (
            <div key={session.uavId}>
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
                    Tọa độ GPS: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                  <p>
                    Tốc độ: {speed} m/s | Pin: {battery}%
                  </p>
                  <p>Tiến độ: {session.progressPercent}%</p>
                </Popup>
              </Marker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
