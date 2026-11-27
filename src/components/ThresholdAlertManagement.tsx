import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ShieldAlert,
  SlidersHorizontal,
  BellRing,
  CircleCheck,
  TriangleAlert,
  Info,
  Thermometer,
  Droplets,
  Sprout,
  Sun,
  Wind,
  Battery,
  Zap,
  RotateCcw,
  Search,
  Save,
  Check,
  X,
  Trash2,
  Eye,
} from 'lucide-react';
import type { AppDispatch, RootState } from '../store';
import {
  initThresholdAlertModule,
  loadThresholdsForZone,
  saveZoneThresholdRule,
  resetZoneThresholds,
  acknowledgeAlertById,
  closeAlertById,
  closeAllOpenAlerts,
  deleteAlertById,
  triggerExtremeTelemetryBurst,
  setSelectedThresholdFarmId,
  setSelectedThresholdZoneId,
  setAlertFilterLevel,
  setAlertFilterStatus,
  setAlertFilterSearch,
  resetAlertFilters,
  selectAlertForModal,
  clearActionBanner,
  selectFilteredAlerts,
  selectAlertSummaryStats,
  selectSelectedAlertItem,
} from '../store/slices/alertSlice';
import {
  SENSOR_THRESHOLD_PRESETS,
  ALERT_LEVEL_LABELS,
  ALERT_STATUS_LABELS,
  ALERT_SOURCE_LABELS,
  type AlertItem,
  type AlertSourceType,
  type AlertStatus,
  type BackendAlertLevel,
  type ThresholdRule,
} from '../types/alert';
import './ThresholdAlertManagement.css';

const SENSOR_ICONS: Record<AlertSourceType, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  SOIL_MOISTURE: Sprout,
  LIGHT: Sun,
  CO2: Wind,
  UAV_BATTERY: Battery,
};

type SimpleThresholdPatch = Partial<
  Pick<ThresholdRule, 'minValue' | 'maxValue' | 'enabled'>
>;

function formatShortTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

export default function ThresholdAlertManagement() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    farms,
    zones,
    selectedFarmId,
    selectedZoneId,
    zoneThresholds,
    filter,
    loadingThresholds,
    savingThresholdSensor,
    simulatingExtreme,
    lastActionBanner,
  } = useSelector((state: RootState) => state.alert);

  const filteredAlerts = useSelector(selectFilteredAlerts);
  const summaryStats = useSelector(selectAlertSummaryStats);
  const selectedAlert = useSelector(selectSelectedAlertItem);

  const [activeTab, setActiveTab] = useState<'ALERTS' | 'THRESHOLDS'>('ALERTS');
  const [draftEdits, setDraftEdits] = useState<Record<number, SimpleThresholdPatch>>({});
  const [ruleError, setRuleError] = useState<Record<number, string>>({});
  const [resolveNoteInput, setResolveNoteInput] = useState<string>('');

  useEffect(() => {
    dispatch(initThresholdAlertModule());
  }, [dispatch]);

  const farmZones = zones.filter((z) => z.farmId === selectedFarmId);
  const activeZone =
    zones.find((z) => z.id === selectedZoneId) ?? farmZones[0] ?? zones[0];

  const handleFarmChange = (farmId: number) => {
    dispatch(setSelectedThresholdFarmId(farmId));
    const nextZones = zones.filter((z) => z.farmId === farmId);
    if (nextZones.length > 0) {
      setDraftEdits({});
      setRuleError({});
      dispatch(loadThresholdsForZone(nextZones[0].id));
    }
  };

  const handleZoneChange = (zoneId: number) => {
    setDraftEdits({});
    setRuleError({});
    dispatch(setSelectedThresholdZoneId(zoneId));
    dispatch(loadThresholdsForZone(zoneId));
  };

  const getEffectiveRule = (rule: ThresholdRule): ThresholdRule => {
    const patch = draftEdits[rule.id];
    if (!patch) return rule;
    return { ...rule, ...patch };
  };

  const handleFieldChange = (
    rule: ThresholdRule,
    field: keyof SimpleThresholdPatch,
    value: number | boolean,
  ) => {
    setDraftEdits((prev) => ({
      ...prev,
      [rule.id]: {
        ...prev[rule.id],
        [field]: value,
      },
    }));
    setRuleError((prev) => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
  };

  const handleSaveRule = async (rule: ThresholdRule) => {
    const effective = getEffectiveRule(rule);
    if (effective.minValue >= effective.maxValue) {
      setRuleError((prev) => ({
        ...prev,
        [rule.id]: 'Mức tối thiểu (Min) phải nhỏ hơn mức tối đa (Max).',
      }));
      return;
    }

    const span = Math.max(2, Math.round((effective.maxValue - effective.minValue) * 0.25));
    const safeCritMin = Math.min(effective.criticalMin, effective.minValue - span);
    const safeCritMax = Math.max(effective.criticalMax, effective.maxValue + span);

    await dispatch(
      saveZoneThresholdRule({
        id: effective.id,
        zoneId: effective.zoneId,
        sensorType: effective.sensorType,
        minValue: effective.minValue,
        maxValue: effective.maxValue,
        criticalMin: safeCritMin,
        criticalMax: safeCritMax,
        enabled: effective.enabled,
      }),
    );

    setDraftEdits((prev) => {
      const next = { ...prev };
      delete next[rule.id];
      return next;
    });
  };

  const handleResetZoneDefaults = async () => {
    if (!activeZone) return;
    setDraftEdits({});
    setRuleError({});
    await dispatch(resetZoneThresholds(activeZone.id));
  };

  const handleOpenCloseModal = (alertItem: AlertItem) => {
    setResolveNoteInput(
      alertItem.resolvedNote ||
        `Đã kiểm tra thiết bị ${alertItem.sensorCode} tại ${alertItem.zoneName} và xử lý ổn định trở lại.`,
    );
    dispatch(selectAlertForModal(alertItem.id));
  };

  const handleConfirmCloseAlert = async () => {
    if (!selectedAlert) return;
    await dispatch(
      closeAlertById({
        alertId: selectedAlert.id,
        note: resolveNoteInput,
      }),
    );
    setResolveNoteInput('');
  };

  return (
    <div className="ta-clean-page">
      {/* 1. THANH CHUYỂN CHẾ ĐỘ GỌN GÀNG + NÚT TEST CẢNH BÁO ĐỎ */}
      <div className="ta-clean-topbar">
        <div className="ta-tab-pills">
          <button
            type="button"
            className={`ta-clean-tab ${activeTab === 'ALERTS' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALERTS')}
          >
            <BellRing size={16} />
            <span>1. Danh sách Cảnh báo ({filteredAlerts.length})</span>
          </button>

          <button
            type="button"
            className={`ta-clean-tab ${activeTab === 'THRESHOLDS' ? 'active' : ''}`}
            onClick={() => setActiveTab('THRESHOLDS')}
          >
            <SlidersHorizontal size={16} />
            <span>2. Cài đặt Ngưỡng An toàn</span>
          </button>
        </div>

        <div className="ta-top-actions">
          <button
            type="button"
            className="ta-clean-btn btn-red"
            disabled={simulatingExtreme}
            onClick={() => {
              setActiveTab('ALERTS');
              dispatch(triggerExtremeTelemetryBurst());
            }}
          >
            <Zap size={15} />
            <span>
              {simulatingExtreme
                ? 'Đang gửi cảnh báo...'
                : 'Bắn thử Cảnh báo Đỏ (60°C / Pin 5%)'}
            </span>
          </button>

          {summaryStats.openCount > 0 && (
            <button
              type="button"
              className="ta-clean-btn btn-outline"
              onClick={() => dispatch(closeAllOpenAlerts(filter.zoneId))}
            >
              <Check size={15} />
              <span>Đóng nhanh tất cả ({summaryStats.openCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* THÔNG BÁO THAO TÁC */}
      {lastActionBanner && (
        <div className="ta-clean-toast">
          <span>{lastActionBanner}</span>
          <button type="button" onClick={() => dispatch(clearActionBanner())}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* 2. 4 Ô THỐNG KÊ SÁNG SỦA */}
      <div className="ta-kpi-row">
        <div className="ta-kpi-box">
          <span>Đang mở cần xử lý</span>
          <strong className={summaryStats.openCount > 0 ? 'txt-red' : ''}>
            {summaryStats.openCount} cảnh báo
          </strong>
        </div>
        <div className="ta-kpi-box">
          <span>Chưa đọc</span>
          <strong className={summaryStats.unreadCount > 0 ? 'txt-amber' : ''}>
            {summaryStats.unreadCount} tin mới
          </strong>
        </div>
        <div className="ta-kpi-box">
          <span>Đã xử lý xong</span>
          <strong className="txt-green">{summaryStats.resolvedCount} sự cố</strong>
        </div>
        <div className="ta-kpi-box">
          <span>Ngưỡng đang bật</span>
          <strong>{summaryStats.activeThresholdCount} quy tắc</strong>
        </div>
      </div>

      {/* ==================== TAB 1: DANH SÁCH CẢNH BÁO ==================== */}
      {activeTab === 'ALERTS' ? (
        <section className="ta-clean-card">
          <div className="ta-card-head">
            <div>
              <h3>Danh sách Cảnh báo Vượt ngưỡng</h3>
              <p>
                Bấm nút đỏ <strong>Bắn thử Cảnh báo Đỏ</strong> ở góc trên để tạo sự cố mẫu rồi thử
                Tiếp nhận / Đóng sự cố
              </p>
            </div>
          </div>

          {/* Bộ lọc gọn trên 1 hàng */}
          <div className="ta-simple-filters">
            <div className="ta-search-input">
              <Search size={15} />
              <input
                type="search"
                value={filter.searchQuery}
                onChange={(e) => dispatch(setAlertFilterSearch(e.target.value))}
                placeholder="Tìm mã cảm biến, khu vực, nội dung..."
              />
            </div>

            <select
              value={filter.level}
              onChange={(e) =>
                dispatch(setAlertFilterLevel(e.target.value as BackendAlertLevel | 'ALL'))
              }
            >
              <option value="ALL">Tất cả mức độ</option>
              <option value="CRITICAL">Nguy hiểm (Đỏ)</option>
              <option value="WARNING">Cảnh báo (Vàng)</option>
              <option value="INFO">Thông tin</option>
            </select>

            <select
              value={filter.status}
              onChange={(e) =>
                dispatch(setAlertFilterStatus(e.target.value as AlertStatus | 'ALL'))
              }
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="OPEN">Đang mở</option>
              <option value="ACKNOWLEDGED">Đã tiếp nhận</option>
              <option value="RESOLVED">Đã xử lý xong</option>
            </select>

            <button
              type="button"
              className="ta-clean-btn btn-outline"
              onClick={() => dispatch(resetAlertFilters())}
            >
              <RotateCcw size={14} /> Đặt lại lọc
            </button>
          </div>

          {/* Bảng danh sách sạch sẽ, dễ đọc */}
          <div className="ta-clean-table-wrap">
            <table className="ta-clean-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mức độ</th>
                  <th>Khu vực &amp; Thiết bị</th>
                  <th>Số đo</th>
                  <th>Nội dung cảnh báo</th>
                  <th>Trạng thái</th>
                  <th>Xử lý</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ta-clean-empty">
                      Chưa có cảnh báo nào khớp bộ lọc. Bạn có thể bấm nút{' '}
                      <strong>Bắn thử Cảnh báo Đỏ</strong> ở góc trên phải để kiểm thử!
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => {
                    const SourceIcon = SENSOR_ICONS[item.sensorType] || Info;
                    return (
                      <tr key={item.id} className={!item.isRead ? 'row-unread' : ''}>
                        <td>
                          <strong>{item.alertCode}</strong>
                          <div className="ta-sub-txt">{formatShortTime(item.createdAt)}</div>
                        </td>

                        <td>
                          <span className={`ta-pill lvl-${item.alertLevel.toLowerCase()}`}>
                            {item.alertLevel === 'CRITICAL' ? (
                              <ShieldAlert size={12} />
                            ) : (
                              <TriangleAlert size={12} />
                            )}
                            {ALERT_LEVEL_LABELS[item.alertLevel]}
                          </span>
                        </td>

                        <td>
                          <strong>{item.zoneName}</strong>
                          <div className="ta-sub-txt">
                            <SourceIcon size={12} /> {item.sensorCode} (
                            {ALERT_SOURCE_LABELS[item.sensorType]})
                          </div>
                        </td>

                        <td>
                          <strong className="txt-red">
                            {item.measuredValue} {item.unit}
                          </strong>
                          <div className="ta-sub-txt">
                            An toàn: {item.thresholdMin}–{item.thresholdMax} {item.unit}
                          </div>
                        </td>

                        <td style={{ maxWidth: 320 }}>
                          <div>{item.message}</div>
                          {item.resolvedNote && (
                            <div className="ta-note-done">
                              ✓ Đã xử lý: {item.resolvedNote}
                            </div>
                          )}
                        </td>

                        <td>
                          <span className={`ta-pill st-${item.status.toLowerCase()}`}>
                            {ALERT_STATUS_LABELS[item.status]}
                          </span>
                        </td>

                        <td>
                          <div className="ta-btn-group">
                            {!item.isRead && item.status === 'OPEN' && (
                              <button
                                type="button"
                                className="ta-mini-btn blue"
                                onClick={() => dispatch(acknowledgeAlertById(item.id))}
                              >
                                <Eye size={13} /> Tiếp nhận
                              </button>
                            )}

                            {item.status !== 'RESOLVED' ? (
                              <button
                                type="button"
                                className="ta-mini-btn green"
                                onClick={() => handleOpenCloseModal(item)}
                              >
                                <Check size={13} /> Đóng sự cố
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="ta-mini-btn slate"
                                onClick={() => handleOpenCloseModal(item)}
                              >
                                Xem
                              </button>
                            )}

                            <button
                              type="button"
                              className="ta-mini-btn danger"
                              onClick={() => dispatch(deleteAlertById(item.id))}
                              title="Xóa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* ==================== TAB 2: CÀI ĐẶT NGƯỠNG AN TOÀN ==================== */
        <section className="ta-clean-card">
          <div className="ta-card-head">
            <div>
              <h3>Thiết lập Giới hạn An toàn cho Cảm biến</h3>
              <p>Khi cảm biến đo vượt ra ngoài khoảng Tối thiểu – Tối đa, hệ thống sẽ báo động</p>
            </div>

            <button
              type="button"
              className="ta-clean-btn btn-outline"
              onClick={handleResetZoneDefaults}
            >
              <RotateCcw size={14} /> Khôi phục mặc định
            </button>
          </div>

          {/* Chọn Trang trại & Khu vực */}
          <div className="ta-zone-bar">
            <div className="ta-field-inline">
              <label htmlFor="ta-farm-sel">Trang trại:</label>
              <select
                id="ta-farm-sel"
                value={selectedFarmId}
                onChange={(e) => handleFarmChange(Number(e.target.value))}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="ta-field-inline">
              <label htmlFor="ta-zone-sel">Khu vực:</label>
              <select
                id="ta-zone-sel"
                value={activeZone?.id ?? selectedZoneId}
                onChange={(e) => handleZoneChange(Number(e.target.value))}
              >
                {farmZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingThresholds ? (
            <div className="ta-clean-empty">Đang tải cấu hình ngưỡng...</div>
          ) : (
            <div className="ta-rules-grid">
              {zoneThresholds.map((rule) => {
                const eff = getEffectiveRule(rule);
                const preset = SENSOR_THRESHOLD_PRESETS[rule.sensorType];
                const Icon = SENSOR_ICONS[rule.sensorType] || Thermometer;
                const isSaving = savingThresholdSensor === rule.sensorType;
                const errText = ruleError[rule.id];

                return (
                  <div
                    key={rule.id}
                    className={`ta-rule-card ${!eff.enabled ? 'is-off' : ''}`}
                  >
                    <div className="ta-rule-top">
                      <div className="ta-rule-title">
                        <Icon size={18} />
                        <div>
                          <strong>
                            {preset?.label || rule.sensorType} ({preset?.unit || ''})
                          </strong>
                          <span>
                            Khoảng an toàn hiện tại: {eff.minValue} – {eff.maxValue}{' '}
                            {preset?.unit}
                          </span>
                        </div>
                      </div>

                      <label className="ta-switch">
                        <input
                          type="checkbox"
                          checked={eff.enabled}
                          onChange={(e) =>
                            handleFieldChange(rule, 'enabled', e.target.checked)
                          }
                        />
                        <span>{eff.enabled ? 'Đang bật' : 'Đã tắt'}</span>
                      </label>
                    </div>

                    <div className="ta-minmax-row">
                      <div className="ta-num-field">
                        <label>Tối thiểu an toàn (Min)</label>
                        <input
                          type="number"
                          step={preset?.step ?? 1}
                          value={eff.minValue}
                          disabled={!eff.enabled}
                          onChange={(e) =>
                            handleFieldChange(rule, 'minValue', Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="ta-num-field">
                        <label>Tối đa an toàn (Max)</label>
                        <input
                          type="number"
                          step={preset?.step ?? 1}
                          value={eff.maxValue}
                          disabled={!eff.enabled}
                          onChange={(e) =>
                            handleFieldChange(rule, 'maxValue', Number(e.target.value))
                          }
                        />
                      </div>
                    </div>

                    {errText && <div className="ta-rule-err">{errText}</div>}

                    <button
                      type="button"
                      className="ta-clean-btn btn-blue-full"
                      disabled={isSaving}
                      onClick={() => handleSaveRule(rule)}
                    >
                      <Save size={14} />
                      <span>{isSaving ? 'Đang lưu...' : 'Lưu ngưỡng này'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== MODAL ĐÓNG SỰ CỐ GỌN GÀNG ==================== */}
      {selectedAlert && (
        <div
          className="ta-clean-backdrop"
          onClick={() => dispatch(selectAlertForModal(null))}
        >
          <div className="ta-clean-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ta-modal-top">
              <h3>
                {selectedAlert.status === 'RESOLVED'
                  ? `Chi tiết Cảnh báo ${selectedAlert.alertCode}`
                  : `Xác nhận Đóng Cảnh báo ${selectedAlert.alertCode}`}
              </h3>
              <button
                type="button"
                onClick={() => dispatch(selectAlertForModal(null))}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ta-modal-summary">
              <div>
                <strong>Thiết bị:</strong> {selectedAlert.sensorCode} — {selectedAlert.zoneName}
              </div>
              <div>
                <strong>Số đo vi phạm:</strong>{' '}
                <span className="txt-red">
                  {selectedAlert.measuredValue} {selectedAlert.unit}
                </span>{' '}
                (An toàn: {selectedAlert.thresholdMin}–{selectedAlert.thresholdMax}{' '}
                {selectedAlert.unit})
              </div>
              <p>{selectedAlert.message}</p>
            </div>

            <div className="ta-modal-field">
              <label>Ghi chú cách xử lý:</label>
              <textarea
                rows={3}
                value={resolveNoteInput}
                onChange={(e) => setResolveNoteInput(e.target.value)}
                placeholder="Nhập hành động xử lý (VD: Đã bật hệ thống phun sương làm mát)..."
              />
            </div>

            <div className="ta-modal-actions">
              <button
                type="button"
                className="ta-clean-btn btn-outline"
                onClick={() => dispatch(selectAlertForModal(null))}
              >
                Đóng cửa sổ
              </button>
              <button
                type="button"
                className="ta-clean-btn btn-green"
                onClick={handleConfirmCloseAlert}
              >
                <CircleCheck size={15} />
                <span>
                  {selectedAlert.status === 'RESOLVED'
                    ? 'Lưu cập nhật ghi chú'
                    : 'Xác nhận Đã xử lý xong'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
