import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Thermometer, Droplets, Sun, Wind, Sprout,
  Plus, Trash2, MapPin, Info, Layers
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import type { SensorType, Farm, Zone } from '../types';
import { SENSOR_TYPE_LABELS } from '../types';
import { farmApi, zoneApi } from '../services/api';
import {
  fetchAllSensors, addSensor, removeSensor,
  setSelectedFarmId, setSelectedZoneId, setTypeFilter,
  selectFilteredSensors,
} from '../store/slices/sensorSlice';
import './SensorAssignment.css';

/**
 * SensorAssignment — Trang gán Cảm biến vào Zone
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

const SENSOR_TYPE_ICONS: Record<SensorType, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  SOIL_MOISTURE: Sprout,
  LIGHT: Sun,
  CO2: Wind,
};

const SENSOR_TYPE_CSS: Record<SensorType, string> = {
  TEMPERATURE: 'temperature',
  HUMIDITY: 'humidity',
  SOIL_MOISTURE: 'soil_moisture',
  LIGHT: 'light',
  CO2: 'co2',
};

const SENSOR_STAT_CLASS: Record<SensorType, string> = {
  TEMPERATURE: 'temp',
  HUMIDITY: 'humi',
  SOIL_MOISTURE: 'soil',
  LIGHT: 'light',
  CO2: 'co2',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function getStatusClass(status: string): string {
  return status.toLowerCase();
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng',
  ERROR: 'Lỗi',
  MAINTENANCE: 'Bảo trì',
};

export default function SensorAssignment() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedFarmId, selectedZoneId, typeFilter, loading, sensors } = useSelector((s: RootState) => s.sensor);
  const filteredSensors = useSelector(selectFilteredSensors);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSensorCode, setNewSensorCode] = useState('');
  const [newSensorName, setNewSensorName] = useState('');
  const [newSensorType, setNewSensorType] = useState<SensorType>('TEMPERATURE');

  useEffect(() => {
    dispatch(fetchAllSensors());
    farmApi.getAll().then(data => {
      setFarms(data);
    });
  }, [dispatch]);

  useEffect(() => {
    if (selectedFarmId) {
      zoneApi.getByFarmId(selectedFarmId).then(data => {
        setZones(data);
        if (data.length > 0 && !data.some(z => z.id === selectedZoneId)) {
          dispatch(setSelectedZoneId(data[0].id));
        }
      });
    } else {
      setZones([]);
    }
  }, [selectedFarmId, selectedZoneId, dispatch]);

  const selectedZone = zones.find(z => z.id === selectedZoneId);

  // Stats by sensor type
  const sensorsByType = (type: SensorType) => sensors.filter(s => s.sensorType === type).length;

  const handleAddSensor = async () => {
    if (!newSensorCode || !selectedZoneId || !selectedZone) return;
    await dispatch(addSensor({
      sensorCode: newSensorCode.trim().toUpperCase(),
      name: newSensorName.trim() || `Cảm biến ${newSensorCode.trim().toUpperCase()}`,
      sensorType: newSensorType,
      zoneId: selectedZoneId,
      zoneName: selectedZone.name,
      latitude: 10.845,
      longitude: 106.765,
    }));
    setNewSensorCode('');
    setNewSensorName('');
    setShowAddForm(false);
  };

  const handleRemoveSensor = async (id: number) => {
    await dispatch(removeSensor(id));
  };

  return (
    <div className="sensor-assignment">
      {/* Stats Row */}
      <div className="sensor-stats-row">
        {(['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE', 'LIGHT', 'CO2'] as SensorType[]).map(type => {
          const Icon = SENSOR_TYPE_ICONS[type];
          return (
            <div className="sensor-stat-mini" key={type}>
              <div className={`mini-icon ${SENSOR_STAT_CLASS[type]}`}>
                <Icon size={18} />
              </div>
              <div className="mini-info">
                <h5>{sensorsByType(type)}</h5>
                <span>{SENSOR_TYPE_LABELS[type]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Farm & Zone Selection */}
      <div className="sensor-selection-panel">
        <div className="selector-card">
          <label>Chọn trang trại</label>
          <select
            value={selectedFarmId ?? ''}
            onChange={e => {
              const val = e.target.value ? Number(e.target.value) : null;
              dispatch(setSelectedFarmId(val));
            }}
          >
            <option value="">-- Chọn trang trại --</option>
            {farms.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.location})</option>
            ))}
          </select>
          {selectedFarmId && (
            <div className="selected-info">
              <MapPin size={14} />
              {farms.find(f => f.id === selectedFarmId)?.location}
            </div>
          )}
        </div>

        <div className="selector-card">
          <label>Chọn vùng canh tác (Zone)</label>
          <select
            value={selectedZoneId ?? ''}
            onChange={e => {
              const val = e.target.value ? Number(e.target.value) : null;
              dispatch(setSelectedZoneId(val));
            }}
            disabled={!selectedFarmId}
          >
            <option value="">-- Tất cả Zone trong trang trại --</option>
            {zones.map(z => (
              <option key={z.id} value={z.id}>{z.name} — {z.cropType}</option>
            ))}
          </select>
          {selectedZone && (
            <div className="selected-info">
              <Layers size={14} />
              Loại cây trồng: {selectedZone.cropType} · {filteredSensors.length} cảm biến đang gán
            </div>
          )}
        </div>
      </div>

      {/* Sensor Table Section */}
      {!selectedZoneId ? (
        <div className="no-zone-selected">
          <Info size={48} />
          <h4>Chưa chọn Zone</h4>
          <p>Vui lòng chọn Trang trại và Zone phía trên để xem danh sách cảm biến</p>
        </div>
      ) : (
        <>
          {/* Section Header */}
          <div className="sensor-section-header">
            <div className="sensor-section-title">
              <h3>Cảm biến trong {selectedZone?.name}</h3>
              <span>{filteredSensors.length} cảm biến được gán</span>
            </div>
            <div className="sensor-toolbar">
              <select
                className="device-filter-select"
                value={typeFilter}
                onChange={e => dispatch(setTypeFilter(e.target.value))}
              >
                <option value="ALL">Tất cả loại</option>
                <option value="TEMPERATURE">Nhiệt độ</option>
                <option value="HUMIDITY">Độ ẩm</option>
                <option value="SOIL_MOISTURE">Độ ẩm đất</option>
                <option value="LIGHT">Ánh sáng</option>
                <option value="CO2">CO₂</option>
              </select>
              <button
                className="btn-add-device"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                <Plus size={16} />
                Thêm cảm biến
              </button>
            </div>
          </div>

          {/* Add Sensor Form */}
          {showAddForm && (
            <div className="add-sensor-form">
              <div className="form-group">
                <label>Mã cảm biến *</label>
                <input
                  type="text"
                  placeholder="VD: TEMP-004"
                  value={newSensorCode}
                  onChange={e => setNewSensorCode(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Tên hiển thị</label>
                <input
                  type="text"
                  placeholder="VD: Cảm biến Nhiệt độ Khu A"
                  value={newSensorName}
                  onChange={e => setNewSensorName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Loại cảm biến</label>
                <select
                  value={newSensorType}
                  onChange={e => setNewSensorType(e.target.value as SensorType)}
                >
                  <option value="TEMPERATURE">🌡️ Nhiệt độ</option>
                  <option value="HUMIDITY">💧 Độ ẩm</option>
                  <option value="SOIL_MOISTURE">🌱 Độ ẩm đất</option>
                  <option value="LIGHT">☀️ Ánh sáng</option>
                  <option value="CO2">💨 CO₂</option>
                </select>
              </div>
              <button
                className="btn-add-sensor"
                disabled={!newSensorCode}
                onClick={handleAddSensor}
              >
                <Plus size={14} />
                Gán vào Zone
              </button>
            </div>
          )}

          {/* Sensor Table */}
          <div className="device-table-container">
            <div className="device-table-scroll">
              <table className="device-table">
                <thead>
                  <tr>
                    <th>Mã cảm biến</th>
                    <th>Loại</th>
                    <th>Trạng thái</th>
                    <th>Zone</th>
                    <th>Ngày lắp đặt</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
                  ) : filteredSensors.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="device-empty">
                          <Thermometer size={40} />
                          <p>Chưa có cảm biến nào trong Zone này</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredSensors.map(sensor => {
                      const Icon = SENSOR_TYPE_ICONS[sensor.sensorType];
                      return (
                        <tr key={sensor.id}>
                          <td><span className="sensor-code">{sensor.sensorCode}</span></td>
                          <td>
                            <span className={`sensor-type-badge ${SENSOR_TYPE_CSS[sensor.sensorType]}`}>
                              <Icon size={14} />
                              {SENSOR_TYPE_LABELS[sensor.sensorType]}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${getStatusClass(sensor.status)}`}>
                              <span className="status-dot" />
                              {STATUS_LABELS[sensor.status] || sensor.status}
                            </span>
                          </td>
                          <td>
                            <div className="zone-name-cell">
                              <span className="zone-dot" />
                              {sensor.zoneName}
                            </div>
                          </td>
                          <td><span className="install-date">{formatDate(sensor.installedAt)}</span></td>
                          <td>
                            <button
                              className="btn-remove-sensor"
                              onClick={() => handleRemoveSensor(sensor.id)}
                            >
                              <Trash2 size={13} />
                              Gỡ
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
