
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { RootState } from '../store';
import type { RealtimeStatus } from '../types/realtime';
import 'leaflet/dist/leaflet.css';

// Dev 3 - Sprint 3 - F05
// Marker đổi màu theo trạng thái cảm biến.
function createStatusIcon(status: RealtimeStatus): L.DivIcon {
  const colors: Record<RealtimeStatus, string> = {
    ONLINE: '#22c55e',
    WARNING: '#f59e0b',
    OFFLINE: '#ef4444',
  };

  const color = colors[status];

  return L.divIcon({
    className: 'sensor-overview-marker',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px #0005;
      "></div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function SensorOverviewMap() {
  const sensors = useSelector(
    (state: RootState) => state.sensorRealtime.sensors
  );

  // Chỉ dùng để kiểm thử Marker đỏ, không sửa Redux.
  const [demoOffline, setDemoOffline] = useState(false);

  return (
    <div style={{ padding: 16 }}>
      <h2>Bản đồ tổng quan cảm biến - F05</h2>
      <p>
        Hiển thị vị trí GPS và trạng thái kết nối của cảm biến.
      </p>

      <div style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 12,
        alignItems: 'center'
      }}>
        <span>🟢 Online</span>
        <span>🟡 Cảnh báo</span>
        <span>🔴 Offline</span>
        <span>Tổng: {sensors.length} cảm biến</span>

        <button
          type="button"
          onClick={() => setDemoOffline(v => !v)}
          disabled={sensors.length === 0}
        >
          {demoOffline
            ? 'Tắt mô phỏng Offline'
            : 'Thử Marker Offline'}
        </button>
      </div>

      <MapContainer
        center={[10.8505, 106.7730]}
        zoom={15}
        scrollWheelZoom={true}
        style={{
          height: '520px',
          width: '100%',
          borderRadius: '12px',
          zIndex: 0
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {sensors.map((sensor, index) => {
          const status: RealtimeStatus =
            demoOffline && index === 0
              ? 'OFFLINE'
              : sensor.status;

          return (
            <Marker
              key={sensor.id}
              position={[
                sensor.location.lat,
                sensor.location.lng
              ]}
              icon={createStatusIcon(status)}
            >
              <Popup>
                <strong>{sensor.sensorCode}</strong>
                <p>Zone: {sensor.zoneName}</p>
                <p>Trạng thái: {status}</p>
                <p>
                  GPS: {sensor.location.lat.toFixed(5)},
                  {sensor.location.lng.toFixed(5)}
                </p>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
