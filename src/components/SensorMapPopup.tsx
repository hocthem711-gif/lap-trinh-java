/**
 * SensorMapPopup — Bản đồ Cảm biến & Popup Chi tiết
 * Task: LTJ-14 - Sprint 3
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Hiển thị bản đồ Leaflet với Marker cảm biến theo Zone.
 * Click Marker → Bung Popup glassmorphism hiện chi tiết chỉ số realtime.
 * Component đóng gói độc lập, nhận dữ liệu từ Redux Store.
 */

import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  MapContainer, TileLayer, Marker, Popup, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Thermometer, Droplets, Sun, Wind, Zap,
  BatteryMedium, Signal, X, Wifi, WifiOff, AlertTriangle,
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import {
  selectSensorForPopup,
  selectSelectedSensor,
} from '../store/slices/sensorRealtimeSlice';
import { READING_LABELS } from '../types/realtime';
import type { RealtimeSensorNode, RealtimeStatus } from '../types/realtime';
import { SENSOR_TYPE_LABELS } from '../types';
import 'leaflet/dist/leaflet.css';
import './SensorMapPopup.css';

// ===== Custom Marker Icons =====

function createMarkerIcon(status: RealtimeStatus): L.DivIcon {
  const colorMap: Record<RealtimeStatus, string> = {
    ONLINE: '#22c55e',
    WARNING: '#f59e0b',
    OFFLINE: '#ef4444',
  };
  const color = colorMap[status];
  const pulseClass = status === 'ONLINE' ? 'map-marker-pulse' : '';

  return L.divIcon({
    className: 'map-custom-marker',
    html: `
      <div class="map-marker-wrapper ${pulseClass}">
        <div class="map-marker-pin" style="background: ${color}; box-shadow: 0 0 10px ${color}66;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6M12 17v6M1 12h6M17 12h6"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// ===== FlyTo Component (điều hướng bản đồ khi chọn sensor) =====

function FlyToSensor({ sensor }: { sensor: RealtimeSensorNode | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (sensor) {
      map.flyTo([sensor.location.lat, sensor.location.lng], 17, { duration: 1.2 });
    }
  }, [sensor, map]);
  return null;
}

// ===== Popup Content Component =====

function SensorPopupContent({ sensor }: { sensor: RealtimeSensorNode }) {
  const getStatusConfig = (status: RealtimeStatus) => {
    switch (status) {
      case 'ONLINE': return { label: 'Online', className: 'popup-status-online', Icon: Wifi };
      case 'WARNING': return { label: 'Cảnh báo', className: 'popup-status-warning', Icon: AlertTriangle };
      case 'OFFLINE': return { label: 'Offline', className: 'popup-status-offline', Icon: WifiOff };
    }
  };

  const statusCfg = getStatusConfig(sensor.status);
  const StatusIcon = statusCfg.Icon;

  const getBatteryClass = (b: number) => b <= 20 ? 'popup-bat-critical' : b <= 40 ? 'popup-bat-low' : 'popup-bat-good';

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const readingIcons: Record<string, typeof Thermometer> = {
    temperature: Thermometer,
    airHumidity: Droplets,
    soilMoisture: Droplets,
    light: Sun,
    co2: Wind,
    ph: Zap,
  };

  return (
    <div className="popup-glass">
      {/* Header */}
      <div className="popup-header">
        <div className="popup-title-group">
          <h4>{sensor.sensorCode}</h4>
          <span className="popup-type-tag">{SENSOR_TYPE_LABELS[sensor.sensorType]}</span>
        </div>
        <span className={`popup-status-pill ${statusCfg.className}`}>
          <StatusIcon size={11} />
          {statusCfg.label}
        </span>
      </div>

      {/* Zone & Coords */}
      <div className="popup-meta">
        <span>📍 {sensor.zoneName}</span>
        <span className="popup-coords">
          {sensor.location.lat.toFixed(4)}, {sensor.location.lng.toFixed(4)}
        </span>
      </div>

      {/* Readings Grid */}
      <div className="popup-readings-grid">
        {(Object.keys(sensor.readings) as (keyof typeof sensor.readings)[]).map(key => {
          const info = READING_LABELS[key];
          const ReadingIcon = readingIcons[key] || Zap;
          const value = sensor.readings[key];

          return (
            <div key={key} className="popup-reading-item">
              <div className="popup-reading-icon">
                <ReadingIcon size={13} />
              </div>
              <div className="popup-reading-data">
                <span className="popup-reading-value">
                  {typeof value === 'number' ? (key === 'light' || key === 'co2' ? Math.round(value) : value.toFixed(1)) : value}
                  <small>{info.unit}</small>
                </span>
                <span className="popup-reading-label">{info.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Battery & Signal */}
      <div className="popup-hw-row">
        <div className="popup-hw-item">
          <BatteryMedium size={14} />
          <div className="popup-bat-bar">
            <div className={`popup-bat-fill ${getBatteryClass(sensor.battery)}`} style={{ width: `${sensor.battery}%` }} />
          </div>
          <span className={getBatteryClass(sensor.battery)}>{sensor.battery}%</span>
        </div>
        <div className="popup-hw-item">
          <Signal size={14} />
          <span>{sensor.signal}%</span>
        </div>
        <div className="popup-hw-item popup-time">
          🕐 {formatTime(sensor.lastUpdated)}
        </div>
      </div>
    </div>
  );
}

// ===== Main Map Component =====

function SensorMapPopup() {
  const dispatch = useDispatch<AppDispatch>();
  const sensors = useSelector((state: RootState) => state.sensorRealtime.sensors);
  const selectedSensor = useSelector(selectSelectedSensor);
  const mapRef = useRef<L.Map | null>(null);

  // Trung tâm bản đồ (trung bình tọa độ các Zone)
  const defaultCenter: [number, number] = [10.8505, 106.7730];
  const defaultZoom = 16;

  return (
    <div className="map-container">
      {/* Legend */}
      <div className="map-legend">
        <div className="map-legend-title">Chú thích</div>
        <div className="map-legend-item">
          <span className="map-legend-dot map-dot-online" />Online
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot map-dot-warning" />Cảnh báo
        </div>
        <div className="map-legend-item">
          <span className="map-legend-dot map-dot-offline" />Offline
        </div>
        <div className="map-legend-count">{sensors.length} cảm biến</div>
      </div>

      {/* Selected Sensor Sidebar */}
      {selectedSensor && (
        <div className="map-detail-sidebar">
          <button
            className="map-detail-close"
            onClick={() => dispatch(selectSensorForPopup(null))}
          >
            <X size={16} />
          </button>
          <SensorPopupContent sensor={selectedSensor} />
        </div>
      )}

      {/* Leaflet Map */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="map-leaflet"
        ref={mapRef}
        scrollWheelZoom={true}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToSensor sensor={selectedSensor} />

        {sensors.map(sensor => (
          <Marker
            key={sensor.id}
            position={[sensor.location.lat, sensor.location.lng]}
            icon={createMarkerIcon(sensor.status)}
            eventHandlers={{
              click: () => dispatch(selectSensorForPopup(sensor.id)),
            }}
          >
            <Popup className="map-leaflet-popup" maxWidth={320} minWidth={280}>
              <SensorPopupContent sensor={sensor} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default SensorMapPopup;
