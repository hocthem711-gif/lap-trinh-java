import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Plane, Radio, Search, Plus, Trash2, Eye, Signal,
  Activity, WifiOff, Wrench, X, Server, MapPin, Clock, Battery, Cpu
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import type { UAV, Gateway, UAVStatus, GatewayStatus } from '../types';
import {
  fetchUAVs, fetchGateways, createUAV, createGateway, deleteUAV, deleteGateway,
  setActiveTab, setSearchQuery, setStatusFilter,
  selectFilteredUAVs, selectFilteredGateways,
  type DeviceTab,
} from '../store/slices/deviceSlice';
import './DeviceManagement.css';

/**
 * DeviceManagement — Trang quản lý UAV/Gateway
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

// ==================== Status Helpers ====================
const UAV_STATUS_LABELS: Record<UAVStatus, string> = {
  ACTIVE: 'Đang hoạt động', IDLE: 'Chờ lệnh', MAINTENANCE: 'Bảo trì', OFFLINE: 'Mất kết nối',
};

const GW_STATUS_LABELS: Record<GatewayStatus, string> = {
  ONLINE: 'Trực tuyến', OFFLINE: 'Ngoại tuyến', ERROR: 'Lỗi',
};

function getStatusClass(status: string): string {
  return status.toLowerCase();
}

function getBatteryLevel(battery: number): string {
  if (battery >= 60) return 'high';
  if (battery >= 25) return 'medium';
  return 'low';
}

function getSignalLevel(signal: number): { level: string; bars: number } {
  if (signal >= 80) return { level: 'strong', bars: 4 };
  if (signal >= 50) return { level: 'medium', bars: 3 };
  if (signal >= 20) return { level: 'weak', bars: 2 };
  return { level: 'weak', bars: 1 };
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60000) return 'Vừa xong';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return `${Math.floor(diff / 86400000)} ngày trước`;
}

// ==================== Main Component ====================
export default function DeviceManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const { activeTab, searchQuery, statusFilter, loading, uavs, gateways } = useSelector((s: RootState) => s.device);
  const filteredUAVs = useSelector(selectFilteredUAVs);
  const filteredGateways = useSelector(selectFilteredGateways);

  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedUAV, setSelectedUAV] = useState<UAV | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);

  useEffect(() => {
    dispatch(fetchUAVs());
    dispatch(fetchGateways());
  }, [dispatch]);

  // UAV Stats
  const uavActive = uavs.filter(u => u.status === 'ACTIVE').length;
  const uavIdle = uavs.filter(u => u.status === 'IDLE').length;
  const uavMaintenance = uavs.filter(u => u.status === 'MAINTENANCE').length;
  const uavOffline = uavs.filter(u => u.status === 'OFFLINE').length;

  // Gateway Stats
  const gwOnline = gateways.filter(g => g.status === 'ONLINE').length;
  const gwOffline = gateways.filter(g => g.status === 'OFFLINE').length;
  const gwError = gateways.filter(g => g.status === 'ERROR').length;
  const totalConnectedSensors = gateways.reduce((sum, g) => sum + g.connectedSensors, 0);

  const handleDelete = async (id: string) => {
    if (activeTab === 'uav') {
      await dispatch(deleteUAV(id));
    } else {
      await dispatch(deleteGateway(id));
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="device-management">
      {/* Tab Navigation */}
      <div className="device-tabs">
        <button
          className={`device-tab-btn ${activeTab === 'uav' ? 'active' : ''}`}
          onClick={() => dispatch(setActiveTab('uav'))}
        >
          <Plane size={18} />
          Thiết bị UAV
          <span className="tab-count">{uavs.length}</span>
        </button>
        <button
          className={`device-tab-btn ${activeTab === 'gateway' ? 'active' : ''}`}
          onClick={() => dispatch(setActiveTab('gateway'))}
        >
          <Server size={18} />
          Gateway
          <span className="tab-count">{gateways.length}</span>
        </button>
      </div>

      {/* Stats Bar */}
      {activeTab === 'uav' ? (
        <div className="device-stats-bar">
          <div className="device-stat-card">
            <div className="stat-icon-box blue"><Plane size={20} /></div>
            <div className="stat-info"><h4>{uavs.length}</h4><span>Tổng UAV</span></div>
          </div>
          <div className="device-stat-card">
            <div className="stat-icon-box green"><Activity size={20} /></div>
            <div className="stat-info"><h4>{uavActive}</h4><span>Đang hoạt động</span></div>
          </div>
          <div className="device-stat-card">
            <div className="stat-icon-box amber"><Wrench size={20} /></div>
            <div className="stat-info"><h4>{uavMaintenance + uavIdle}</h4><span>Bảo trì / Chờ</span></div>
          </div>
          <div className="device-stat-card">
            <div className="stat-icon-box red"><WifiOff size={20} /></div>
            <div className="stat-info"><h4>{uavOffline}</h4><span>Mất kết nối</span></div>
          </div>
        </div>
      ) : (
        <div className="device-stats-bar">
          <div className="device-stat-card">
            <div className="stat-icon-box blue"><Server size={20} /></div>
            <div className="stat-info"><h4>{gateways.length}</h4><span>Tổng Gateway</span></div>
          </div>
          <div className="device-stat-card">
            <div className="stat-icon-box green"><Radio size={20} /></div>
            <div className="stat-info"><h4>{gwOnline}</h4><span>Trực tuyến</span></div>
          </div>
          <div className="device-stat-card">
            <div className="stat-icon-box red"><WifiOff size={20} /></div>
            <div className="stat-info"><h4>{gwOffline + gwError}</h4><span>Lỗi / Ngoại tuyến</span></div>
          </div>
          <div className="device-stat-card">
            <div className="stat-icon-box purple"><Signal size={20} /></div>
            <div className="stat-info"><h4>{totalConnectedSensors}</h4><span>Cảm biến kết nối</span></div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="device-toolbar">
        <div className="device-toolbar-left">
          <div className="device-search-wrapper">
            <Search size={16} />
            <input
              className="device-search-input"
              type="text"
              placeholder={activeTab === 'uav' ? 'Tìm theo tên, mã UAV hoặc model...' : 'Tìm theo tên, mã Gateway hoặc IP...'}
              value={searchQuery}
              onChange={e => dispatch(setSearchQuery(e.target.value))}
            />
          </div>
          <select
            className="device-filter-select"
            value={statusFilter}
            onChange={e => dispatch(setStatusFilter(e.target.value))}
          >
            <option value="ALL">Tất cả trạng thái</option>
            {activeTab === 'uav' ? (
              <>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="IDLE">Chờ lệnh</option>
                <option value="MAINTENANCE">Bảo trì</option>
                <option value="OFFLINE">Mất kết nối</option>
              </>
            ) : (
              <>
                <option value="ONLINE">Trực tuyến</option>
                <option value="OFFLINE">Ngoại tuyến</option>
                <option value="ERROR">Lỗi</option>
              </>
            )}
          </select>
        </div>
        <button className="btn-add-device" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          Thêm {activeTab === 'uav' ? 'UAV' : 'Gateway'}
        </button>
      </div>

      {/* Data Table */}
      <div className="device-table-container">
        <div className="device-table-scroll">
          {activeTab === 'uav' ? (
            <table className="device-table">
              <thead>
                <tr>
                  <th>Mã UAV</th>
                  <th>Thiết bị</th>
                  <th>Pin</th>
                  <th>Tín hiệu</th>
                  <th>Trạng thái</th>
                  <th>Vị trí</th>
                  <th>Hoạt động</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
                ) : filteredUAVs.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="device-empty">
                        <Plane size={40} />
                        <p>Không tìm thấy UAV phù hợp</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUAVs.map(uav => {
                    const batLevel = getBatteryLevel(uav.battery);
                    const sig = getSignalLevel(uav.signal);
                    return (
                      <tr key={uav.id}>
                        <td><span className="device-id">{uav.id}</span></td>
                        <td>
                          <div className="device-name-cell">
                            <span className="device-name">{uav.name}</span>
                            <span className="device-model">{uav.model}</span>
                          </div>
                        </td>
                        <td>
                          <div className="battery-bar-wrapper">
                            <div className="battery-bar">
                              <div
                                className={`battery-bar-fill ${batLevel}`}
                                style={{ width: `${uav.battery}%` }}
                              />
                            </div>
                            <span className={`battery-text ${batLevel}`}>{uav.battery}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="signal-indicator">
                            <div className="signal-bars">
                              {[1, 2, 3, 4].map(i => (
                                <div
                                  key={i}
                                  className={`signal-bar ${i <= sig.bars ? `filled ${sig.level}` : ''}`}
                                />
                              ))}
                            </div>
                            <span className="signal-text">{uav.signal}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusClass(uav.status)}`}>
                            <span className="status-dot" />
                            {UAV_STATUS_LABELS[uav.status]}
                          </span>
                        </td>
                        <td><span className="location-text">{uav.location}</span></td>
                        <td><span className="location-text">{formatTimeAgo(uav.lastSeen)}</span></td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="action-btn"
                              title="Chi tiết UAV"
                              onClick={() => setSelectedUAV(uav)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="action-btn danger"
                              title="Xóa"
                              onClick={() => setDeleteConfirm(uav.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="device-table">
              <thead>
                <tr>
                  <th>Mã Gateway</th>
                  <th>Tên</th>
                  <th>Địa chỉ IP</th>
                  <th>Trạng thái</th>
                  <th>Cảm biến</th>
                  <th>Firmware</th>
                  <th>Ping cuối</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Đang tải...</td></tr>
                ) : filteredGateways.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="device-empty">
                        <Server size={40} />
                        <p>Không tìm thấy Gateway phù hợp</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGateways.map(gw => (
                    <tr key={gw.id}>
                      <td><span className="device-id">{gw.id}</span></td>
                      <td><span className="device-name">{gw.name}</span></td>
                      <td><span className="ip-address">{gw.ipAddress}</span></td>
                      <td>
                        <span className={`status-badge ${getStatusClass(gw.status)}`}>
                          <span className="status-dot" />
                          {GW_STATUS_LABELS[gw.status]}
                        </span>
                      </td>
                      <td><span className="sensor-count">{gw.connectedSensors}</span></td>
                      <td><span className="firmware-tag">{gw.firmwareVersion}</span></td>
                      <td><span className="location-text">{formatTimeAgo(gw.lastPing)}</span></td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="action-btn"
                            title="Chi tiết Gateway"
                            onClick={() => setSelectedGateway(gw)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="action-btn danger"
                            title="Xóa"
                            onClick={() => setDeleteConfirm(gw.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* UAV Detail Modal */}
      {selectedUAV && (
        <div className="modal-overlay" onClick={() => setSelectedUAV(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết thiết bị UAV — {selectedUAV.id}</h3>
              <button className="modal-close" onClick={() => setSelectedUAV(null)}><X size={16} /></button>
            </div>
            <div className="device-detail-grid">
              <div className="device-detail-item">
                <span className="detail-label"><Plane size={14} /> Tên thiết bị</span>
                <span className="detail-value">{selectedUAV.name}</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Cpu size={14} /> Dòng máy (Model)</span>
                <span className="detail-value">{selectedUAV.model}</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Activity size={14} /> Trạng thái</span>
                <span className={`status-badge ${getStatusClass(selectedUAV.status)}`}>
                  <span className="status-dot" />
                  {UAV_STATUS_LABELS[selectedUAV.status]}
                </span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Battery size={14} /> Dung lượng Pin</span>
                <span className={`detail-value battery-text ${getBatteryLevel(selectedUAV.battery)}`}>
                  {selectedUAV.battery}%
                </span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Signal size={14} /> Cường độ tín hiệu</span>
                <span className="detail-value">{selectedUAV.signal}%</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><MapPin size={14} /> Vị trí hiện tại</span>
                <span className="detail-value">{selectedUAV.location}</span>
              </div>
              <div className="device-detail-item full-width">
                <span className="detail-label"><Clock size={14} /> Lần kết nối cuối</span>
                <span className="detail-value">
                  {new Date(selectedUAV.lastSeen).toLocaleString('vi-VN')} ({formatTimeAgo(selectedUAV.lastSeen)})
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-submit" onClick={() => setSelectedUAV(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Gateway Detail Modal */}
      {selectedGateway && (
        <div className="modal-overlay" onClick={() => setSelectedGateway(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chi tiết Gateway — {selectedGateway.id}</h3>
              <button className="modal-close" onClick={() => setSelectedGateway(null)}><X size={16} /></button>
            </div>
            <div className="device-detail-grid">
              <div className="device-detail-item">
                <span className="detail-label"><Server size={14} /> Tên Gateway</span>
                <span className="detail-value">{selectedGateway.name}</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Radio size={14} /> Địa chỉ IP</span>
                <span className="detail-value ip-address">{selectedGateway.ipAddress}</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Activity size={14} /> Trạng thái</span>
                <span className={`status-badge ${getStatusClass(selectedGateway.status)}`}>
                  <span className="status-dot" />
                  {GW_STATUS_LABELS[selectedGateway.status]}
                </span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Signal size={14} /> Cảm biến kết nối</span>
                <span className="detail-value sensor-count">{selectedGateway.connectedSensors} node</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Cpu size={14} /> Phiên bản Firmware</span>
                <span className="detail-value firmware-tag">{selectedGateway.firmwareVersion}</span>
              </div>
              <div className="device-detail-item">
                <span className="detail-label"><Clock size={14} /> Ping gần nhất</span>
                <span className="detail-value">{formatTimeAgo(selectedGateway.lastPing)}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-submit" onClick={() => setSelectedGateway(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Xác nhận xóa</h3>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}><X size={16} /></button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.65)', margin: '0 0 8px', fontSize: '14px' }}>
              Bạn có chắc muốn xóa thiết bị <strong style={{ color: '#f87171' }}>{deleteConfirm}</strong> khỏi hệ thống?
            </p>
            <p style={{ color: 'rgba(255,255,255,0.4)', margin: 0, fontSize: '13px' }}>
              Hành động này không thể hoàn tác.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteConfirm(null)}>Hủy</button>
              <button
                className="btn-submit"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}
                onClick={() => handleDelete(deleteConfirm)}
              >
                Xóa thiết bị
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <AddDeviceModal
          type={activeTab}
          onClose={() => setShowAddModal(false)}
          onAdded={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ==================== Add Device Modal ====================
function AddDeviceModal({ type, onClose, onAdded }: {
  type: DeviceTab;
  onClose: () => void;
  onAdded: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (type === 'uav') {
        await dispatch(createUAV({
          name: formData.name || '',
          model: formData.model || 'DJI Agras T30',
          battery: parseInt(formData.battery || '100', 10),
          signal: parseInt(formData.signal || '95', 10),
          status: (formData.status as UAVStatus) || 'IDLE',
          location: formData.location || 'Khu A - Zone 1',
        }));
      } else {
        await dispatch(createGateway({
          name: formData.name || '',
          ipAddress: formData.ipAddress || '',
          status: (formData.status as GatewayStatus) || 'ONLINE',
          connectedSensors: parseInt(formData.connectedSensors || '0', 10),
          firmwareVersion: formData.firmwareVersion || 'v2.4.1',
        }));
      }
      onAdded();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Thêm {type === 'uav' ? 'UAV' : 'Gateway'} mới</h3>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên thiết bị *</label>
            <input
              type="text"
              required
              placeholder={type === 'uav' ? 'VD: UAV Trinh sát 04' : 'VD: Gateway Khu F'}
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          {type === 'uav' ? (
            <>
              <div className="form-group">
                <label>Model thiết bị</label>
                <input
                  type="text"
                  placeholder="VD: DJI Matrice 300 RTK"
                  value={formData.model || ''}
                  onChange={e => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Vị trí hiện tại</label>
                <input
                  type="text"
                  placeholder="VD: Khu A - Zone 1"
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Trạng thái ban đầu</label>
                <select
                  value={formData.status || 'IDLE'}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="IDLE">Chờ lệnh</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="MAINTENANCE">Bảo trì</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label>Địa chỉ IP *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 192.168.1.200"
                  value={formData.ipAddress || ''}
                  onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phiên bản Firmware</label>
                <input
                  type="text"
                  placeholder="VD: v2.4.1"
                  value={formData.firmwareVersion || ''}
                  onChange={e => setFormData({ ...formData, firmwareVersion: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Trạng thái</label>
                <select
                  value={formData.status || 'ONLINE'}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="ONLINE">Trực tuyến</option>
                  <option value="OFFLINE">Ngoại tuyến</option>
                </select>
              </div>
            </>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              <Plus size={16} /> {submitting ? 'Đang thêm...' : 'Thêm thiết bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
