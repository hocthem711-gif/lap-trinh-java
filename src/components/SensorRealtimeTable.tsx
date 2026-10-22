/**
 * SensorRealtimeTable — Bảng Cảm biến Realtime
 * Task: LTJ-14 - Sprint 3
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Hiển thị danh sách cảm biến với chỉ số thời gian thực:
 * - KPI Cards: Tổng hợp thống kê nhanh
 * - Toolbar: Bộ lọc Zone, Trạng thái, Loại, Tìm kiếm, Toggle Stream
 * - Table: Bảng dữ liệu realtime với badge trạng thái, thanh pin, chỉ số đo
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Activity, Thermometer, Droplets, Zap, Search,
  Wifi, WifiOff, AlertTriangle, RefreshCw, Pause, Play,
  Filter, X, BatteryMedium, Signal,
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import {
  updateSensors,
  addAlerts,
  clearAlerts,
  toggleStreaming,
  selectSensorForPopup,
  setFilterZone,
  setFilterStatus,
  setFilterSensorType,
  setSearchQuery,
  resetFilters,
  selectFilteredSensors,
  selectRealtimeStats,
  selectAlerts,
} from '../store/slices/sensorRealtimeSlice';
import { tickRealtimeUpdate, ZONE_LOCATIONS } from '../services/realtimeStream';
import { READING_LABELS } from '../types/realtime';
import type { RealtimeStatus } from '../types/realtime';
import type { SensorType } from '../types';
import { SENSOR_TYPE_LABELS } from '../types';
import './SensorRealtimeTable.css';

function SensorRealtimeTable() {
  const dispatch = useDispatch<AppDispatch>();
  const sensors = useSelector(selectFilteredSensors);
  const allSensors = useSelector((state: RootState) => state.sensorRealtime.sensors);
  const stats = useSelector(selectRealtimeStats);
  const alerts = useSelector(selectAlerts);
  const filter = useSelector((state: RootState) => state.sensorRealtime.filter);
  const isStreaming = useSelector((state: RootState) => state.sensorRealtime.isStreaming);
  const streamInterval = useSelector((state: RootState) => state.sensorRealtime.streamIntervalMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===== Realtime tick =====
  const doTick = useCallback(() => {
    const { updatedSensors, newAlerts } = tickRealtimeUpdate(allSensors);
    dispatch(updateSensors(updatedSensors));
    if (newAlerts.length > 0) {
      dispatch(addAlerts(newAlerts));
    }
  }, [allSensors, dispatch]);

  useEffect(() => {
    if (isStreaming) {
      intervalRef.current = setInterval(doTick, streamInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isStreaming, streamInterval, doTick]);

  // ===== Helper functions =====
  const getStatusConfig = (status: RealtimeStatus) => {
    switch (status) {
      case 'ONLINE': return { label: 'Online', className: 'rt-status-online', icon: Wifi };
      case 'WARNING': return { label: 'Cảnh báo', className: 'rt-status-warning', icon: AlertTriangle };
      case 'OFFLINE': return { label: 'Offline', className: 'rt-status-offline', icon: WifiOff };
    }
  };

  const getBatteryClass = (battery: number): string => {
    if (battery <= 20) return 'rt-battery-critical';
    if (battery <= 40) return 'rt-battery-low';
    return 'rt-battery-good';
  };

  const getReadingClass = (value: number, metric: string): string => {
    const thresholds: Record<string, { min: number; max: number }> = {
      temperature: { min: 15, max: 40 },
      airHumidity: { min: 30, max: 90 },
      soilMoisture: { min: 20, max: 80 },
      co2: { min: 300, max: 1500 },
      ph: { min: 5.5, max: 7.5 },
    };
    const t = thresholds[metric];
    if (!t) return '';
    if (value < t.min || value > t.max) return 'rt-reading-danger';
    if (value < t.min * 1.1 || value > t.max * 0.9) return 'rt-reading-warn';
    return '';
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const hasActiveFilter = filter.zoneId !== null || filter.status !== 'ALL' ||
    filter.sensorType !== 'ALL' || filter.searchQuery !== '';

  return (
    <div className="rt-container">
      {/* ===== KPI Cards ===== */}
      <div className="rt-kpi-row">
        <div className="rt-kpi-card">
          <div className="rt-kpi-icon rt-kpi-total"><Activity size={20} /></div>
          <div className="rt-kpi-data">
            <span className="rt-kpi-value">{stats.totalSensors}</span>
            <span className="rt-kpi-label">Tổng cảm biến</span>
          </div>
        </div>
        <div className="rt-kpi-card">
          <div className="rt-kpi-icon rt-kpi-online"><Wifi size={20} /></div>
          <div className="rt-kpi-data">
            <span className="rt-kpi-value rt-text-green">{stats.onlineCount}</span>
            <span className="rt-kpi-label">Đang hoạt động</span>
          </div>
        </div>
        <div className="rt-kpi-card">
          <div className="rt-kpi-icon rt-kpi-warn"><AlertTriangle size={20} /></div>
          <div className="rt-kpi-data">
            <span className="rt-kpi-value rt-text-amber">{stats.warningCount}</span>
            <span className="rt-kpi-label">Cảnh báo</span>
          </div>
        </div>
        <div className="rt-kpi-card">
          <div className="rt-kpi-icon rt-kpi-temp"><Thermometer size={20} /></div>
          <div className="rt-kpi-data">
            <span className="rt-kpi-value">{stats.avgTemperature}°C</span>
            <span className="rt-kpi-label">Nhiệt độ TB</span>
          </div>
        </div>
        <div className="rt-kpi-card">
          <div className="rt-kpi-icon rt-kpi-humi"><Droplets size={20} /></div>
          <div className="rt-kpi-data">
            <span className="rt-kpi-value">{stats.avgHumidity}%</span>
            <span className="rt-kpi-label">Độ ẩm TB</span>
          </div>
        </div>
      </div>

      {/* ===== Alert Banner ===== */}
      {alerts.length > 0 && (
        <div className="rt-alert-banner">
          <div className="rt-alert-content">
            <AlertTriangle size={16} />
            <span>
              <strong>{alerts.length}</strong> cảnh báo vượt ngưỡng —{' '}
              {alerts.slice(0, 2).map(a =>
                `${a.sensorCode}: ${READING_LABELS[a.metric].label} = ${a.value}${READING_LABELS[a.metric].unit}`
              ).join(' | ')}
              {alerts.length > 2 && ` (+${alerts.length - 2} khác)`}
            </span>
          </div>
          <button className="rt-alert-dismiss" onClick={() => dispatch(clearAlerts())} title="Xóa tất cả cảnh báo">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ===== Toolbar ===== */}
      <div className="rt-toolbar">
        <div className="rt-toolbar-left">
          <div className="rt-filter-group">
            <Filter size={15} />
            <select
              value={filter.zoneId ?? ''}
              onChange={e => dispatch(setFilterZone(e.target.value ? Number(e.target.value) : null))}
            >
              <option value="">Tất cả Zone</option>
              {Object.entries(ZONE_LOCATIONS).map(([id, z]) => (
                <option key={id} value={id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="rt-filter-group">
            <select
              value={filter.status}
              onChange={e => dispatch(setFilterStatus(e.target.value as RealtimeStatus | 'ALL'))}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ONLINE">🟢 Online</option>
              <option value="WARNING">🟡 Cảnh báo</option>
              <option value="OFFLINE">🔴 Offline</option>
            </select>
          </div>

          <div className="rt-filter-group">
            <select
              value={filter.sensorType}
              onChange={e => dispatch(setFilterSensorType(e.target.value as SensorType | 'ALL'))}
            >
              <option value="ALL">Tất cả loại</option>
              {Object.entries(SENSOR_TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {hasActiveFilter && (
            <button className="rt-btn-clear-filter" onClick={() => dispatch(resetFilters())}>
              <X size={14} /> Xóa lọc
            </button>
          )}
        </div>

        <div className="rt-toolbar-right">
          <div className="rt-search-box">
            <Search size={15} />
            <input
              type="text"
              placeholder="Tìm mã cảm biến..."
              value={filter.searchQuery}
              onChange={e => dispatch(setSearchQuery(e.target.value))}
            />
          </div>

          <button
            className={`rt-btn-stream ${isStreaming ? 'rt-streaming' : 'rt-paused'}`}
            onClick={() => dispatch(toggleStreaming())}
            title={isStreaming ? 'Tạm dừng stream' : 'Bật stream'}
          >
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
            {isStreaming ? 'LIVE' : 'Paused'}
            {isStreaming && <span className="rt-live-dot" />}
          </button>

          <button className="rt-btn-refresh" onClick={doTick} title="Cập nhật ngay">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ===== Data Table ===== */}
      <div className="rt-table-wrapper">
        <table className="rt-table">
          <thead>
            <tr>
              <th>Mã cảm biến</th>
              <th>Zone</th>
              <th>Trạng thái</th>
              <th><Thermometer size={13} /> Nhiệt độ</th>
              <th><Droplets size={13} /> Độ ẩm KK</th>
              <th>💧 Độ ẩm đất</th>
              <th><Zap size={13} /> CO₂</th>
              <th><BatteryMedium size={13} /> Pin</th>
              <th><Signal size={13} /> Tín hiệu</th>
              <th>Cập nhật</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map(sensor => {
              const statusCfg = getStatusConfig(sensor.status);
              const StatusIcon = statusCfg.icon;
              return (
                <tr key={sensor.id} className={sensor.status === 'OFFLINE' ? 'rt-row-offline' : ''}>
                  <td>
                    <div className="rt-sensor-code">
                      <strong>{sensor.sensorCode}</strong>
                      <span className="rt-sensor-type">{SENSOR_TYPE_LABELS[sensor.sensorType]}</span>
                    </div>
                  </td>
                  <td><span className="rt-zone-tag">{sensor.zoneName.split(' - ')[1] || sensor.zoneName}</span></td>
                  <td>
                    <span className={`rt-status-badge ${statusCfg.className}`}>
                      <StatusIcon size={12} />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className={getReadingClass(sensor.readings.temperature, 'temperature')}>
                    {sensor.readings.temperature.toFixed(1)}°C
                  </td>
                  <td className={getReadingClass(sensor.readings.airHumidity, 'airHumidity')}>
                    {sensor.readings.airHumidity.toFixed(1)}%
                  </td>
                  <td className={getReadingClass(sensor.readings.soilMoisture, 'soilMoisture')}>
                    {sensor.readings.soilMoisture.toFixed(1)}%
                  </td>
                  <td className={getReadingClass(sensor.readings.co2, 'co2')}>
                    {Math.round(sensor.readings.co2)} ppm
                  </td>
                  <td>
                    <div className="rt-battery-cell">
                      <div className={`rt-battery-bar ${getBatteryClass(sensor.battery)}`}>
                        <div className="rt-battery-fill" style={{ width: `${sensor.battery}%` }} />
                      </div>
                      <span className={getBatteryClass(sensor.battery)}>{sensor.battery}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="rt-signal-cell">
                      <Signal size={13} />
                      <span>{sensor.signal}%</span>
                    </div>
                  </td>
                  <td className="rt-time-cell">{formatTime(sensor.lastUpdated)}</td>
                  <td>
                    <button
                      className="rt-btn-locate"
                      onClick={() => dispatch(selectSensorForPopup(sensor.id))}
                      title="Xem trên bản đồ"
                    >
                      📍 Xem
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sensors.length === 0 && (
          <div className="rt-empty">
            <Search size={32} />
            <p>Không tìm thấy cảm biến phù hợp với bộ lọc hiện tại.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SensorRealtimeTable;
