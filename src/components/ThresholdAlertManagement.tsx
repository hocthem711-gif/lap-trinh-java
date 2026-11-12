/**
 * ThresholdAlertManagement — Giao diện Cấu hình Ngưỡng (F09) & Quản lý Cảnh báo (F08)
 * Task: LTJ-29 - Sprint 6
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * Gồm 2 phân hệ tích hợp:
 * 1. Cấu hình Ngưỡng Cảnh báo cho từng Zone (F09):
 *    - Chọn Nông trại (Farm) & Phân khu (Zone)
 *    - Thiết lập ngưỡng 4 mốc (Critical Min < Min < Max < Critical Max) cho 5 loại cảm biến
 *    - Thanh phổ trực quan dải an toàn (Danger — Warning — Optimal — Warning — Danger)
 *    - Kiểm định toán học thời gian thực & Nút khôi phục mặc định
 * 2. Quản lý Danh sách Cảnh báo (F08):
 *    - Bộ lọc đa chiều (Khu vực, Mức độ, Trạng thái, Loại cảm biến, Chưa đọc, Từ khóa)
 *    - Nút Mô phỏng Bắn Data Cực đoan (Nhiệt độ 60°C & Pin UAV 5%) khớp kịch bản Dev 5 (LTJ-30)
 *    - Cho phép Tiếp nhận (Acknowledge), Đóng cảnh báo (Close/Resolve Alert) kèm ghi chú xử lý
 */

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
  Layers,
  MapPin,
  Clock,
} from 'lucide-react';
import type { AppDispatch, RootState } from '../store';
import type { SensorType } from '../types';
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
  setAlertFilterZone,
  setAlertFilterLevel,
  setAlertFilterStatus,
  setAlertFilterSensorType,
  setAlertFilterUnreadOnly,
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
import { validateThresholdRule } from '../services/alertService';
import './ThresholdAlertManagement.css';

const SENSOR_ICONS: Record<AlertSourceType, typeof Thermometer> = {
  TEMPERATURE: Thermometer,
  HUMIDITY: Droplets,
  SOIL_MOISTURE: Sprout,
  LIGHT: Sun,
  CO2: Wind,
  UAV_BATTERY: Battery,
};

type ThresholdDraftPatch = Partial<
  Pick<ThresholdRule, 'minValue' | 'maxValue' | 'criticalMin' | 'criticalMax' | 'enabled'>
>;

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

  const [activeTab, setActiveTab] = useState<'ALL' | 'THRESHOLDS' | 'ALERTS'>('ALL');
  const [draftEdits, setDraftEdits] = useState<Record<number, ThresholdDraftPatch>>({});
  const [resolveNoteInput, setResolveNoteInput] = useState<string>('');
  const [quickTestValues, setQuickTestValues] = useState<Record<number, string>>({});

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
      dispatch(loadThresholdsForZone(nextZones[0].id));
    }
  };

  const handleZoneChange = (zoneId: number) => {
    setDraftEdits({});
    dispatch(setSelectedThresholdZoneId(zoneId));
    dispatch(loadThresholdsForZone(zoneId));
  };

  const getEffectiveRule = (rule: ThresholdRule): ThresholdRule => {
    const patch = draftEdits[rule.id];
    if (!patch) return rule;
    return { ...rule, ...patch };
  };

  const handleDraftFieldChange = (
    rule: ThresholdRule,
    field: keyof ThresholdDraftPatch,
    value: number | boolean
  ) => {
    setDraftEdits((prev) => ({
      ...prev,
      [rule.id]: {
        ...prev[rule.id],
        [field]: value,
      },
    }));
  };

  const handleSaveRule = async (rule: ThresholdRule) => {
    const effective = getEffectiveRule(rule);
    const validation = validateThresholdRule(effective);
    if (!validation.valid) return;

    await dispatch(
      saveZoneThresholdRule({
        id: effective.id,
        zoneId: effective.zoneId,
        sensorType: effective.sensorType,
        minValue: effective.minValue,
        maxValue: effective.maxValue,
        criticalMin: effective.criticalMin,
        criticalMax: effective.criticalMax,
        enabled: effective.enabled,
      })
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
    await dispatch(resetZoneThresholds(activeZone.id));
  };

  const handleOpenCloseModal = (alertItem: AlertItem) => {
    setResolveNoteInput(
      alertItem.resolvedNote ||
        `Đã kiểm tra thiết bị ${alertItem.sensorCode} tại ${alertItem.zoneName} và xử lý đưa chỉ số về ngưỡng an toàn.`
    );
    dispatch(selectAlertForModal(alertItem.id));
  };

  const handleConfirmCloseAlert = async () => {
    if (!selectedAlert) return;
    await dispatch(
      closeAlertById({
        alertId: selectedAlert.id,
        note: resolveNoteInput,
      })
    );
    setResolveNoteInput('');
  };

  return (
    <div className="threshold-alert-page">
      {/* ==================== HEADER & KPI SUMMARY ==================== */}
      <div className="ta-header-card">
        <div className="ta-header-left">
          <div className="ta-badge">SPRINT 6 · TASK LTJ-29 (F08 &amp; F09)</div>
          <h2>Cấu hình Ngưỡng Cảm biến (Threshold) &amp; Quản lý Cảnh báo (Alert)</h2>
          <p>
            Thiết lập ngưỡng cảnh báo 4 mốc cho từng vùng canh tác (Zone) và giám sát, tiếp nhận,
            đóng các cảnh báo vượt ngưỡng phát sinh từ Alert Engine &amp; UAV Telemetry.
          </p>
        </div>

        <div className="ta-header-actions">
          <div className="ta-view-tabs">
            <button
              type="button"
              className={`ta-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ALL')}
            >
              Tất cả phân hệ
            </button>
            <button
              type="button"
              className={`ta-tab-btn ${activeTab === 'THRESHOLDS' ? 'active' : ''}`}
              onClick={() => setActiveTab('THRESHOLDS')}
            >
              <SlidersHorizontal size={15} />
              Cấu hình Ngưỡng (F09)
            </button>
            <button
              type="button"
              className={`ta-tab-btn ${activeTab === 'ALERTS' ? 'active' : ''}`}
              onClick={() => setActiveTab('ALERTS')}
            >
              <BellRing size={15} />
              Danh sách Alert ({summaryStats.openCount})
            </button>
          </div>

          <button
            type="button"
            className="ta-btn-extreme"
            disabled={simulatingExtreme}
            onClick={() => dispatch(triggerExtremeTelemetryBurst())}
            title="Mô phỏng bắn số liệu cực đoan: Nhiệt độ 60°C & Pin UAV 5% (Task LTJ-30)"
          >
            <Zap size={16} />
            {simulatingExtreme
              ? 'Đang bắn dữ liệu...'
              : 'Mô phỏng Data Cực đoan (60°C / Pin 5%)'}
          </button>
        </div>
      </div>

      {/* Banner thông báo thao tác */}
      {lastActionBanner && (
        <div className="ta-action-banner">
          <div className="ta-banner-content">
            <CircleCheck size={18} />
            <span>{lastActionBanner}</span>
          </div>
          <button
            type="button"
            className="ta-banner-close"
            onClick={() => dispatch(clearActionBanner())}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 4 Thẻ KPI Tổng quan */}
      <div className="ta-kpi-grid">
        <div className="ta-kpi-card critical">
          <div className="ta-kpi-icon">
            <ShieldAlert size={22} />
          </div>
          <div className="ta-kpi-info">
            <span className="ta-kpi-label">Cảnh báo Đang mở (Open)</span>
            <strong className="ta-kpi-value">{summaryStats.openCount}</strong>
            <span className="ta-kpi-sub">
              {summaryStats.criticalOpenCount} mức Nguy hiểm · {summaryStats.warningOpenCount} Cảnh báo
            </span>
          </div>
        </div>

        <div className="ta-kpi-card warning">
          <div className="ta-kpi-icon">
            <BellRing size={22} />
          </div>
          <div className="ta-kpi-info">
            <span className="ta-kpi-label">Cảnh báo Chưa đọc</span>
            <strong className="ta-kpi-value">{summaryStats.unreadCount}</strong>
            <span className="ta-kpi-sub">
              {summaryStats.acknowledgedCount} cảnh báo đang được xử lý
            </span>
          </div>
        </div>

        <div className="ta-kpi-card resolved">
          <div className="ta-kpi-icon">
            <CircleCheck size={22} />
          </div>
          <div className="ta-kpi-info">
            <span className="ta-kpi-label">Đã đóng / Xử lý xong</span>
            <strong className="ta-kpi-value">{summaryStats.resolvedCount}</strong>
            <span className="ta-kpi-sub">
              Trên tổng số {summaryStats.totalAlerts} cảnh báo ghi nhận
            </span>
          </div>
        </div>

        <div className="ta-kpi-card rules">
          <div className="ta-kpi-icon">
            <SlidersHorizontal size={22} />
          </div>
          <div className="ta-kpi-info">
            <span className="ta-kpi-label">Quy tắc Ngưỡng đang bật</span>
            <strong className="ta-kpi-value">{summaryStats.activeThresholdCount}</strong>
            <span className="ta-kpi-sub">
              Giám sát tự động 5 chỉ số trên {zones.length || 6} Zone
            </span>
          </div>
        </div>
      </div>

      {/* ==================== PHÂN HỆ 1: CẤU HÌNH THRESHOLD THEO ZONE (F09) ==================== */}
      {(activeTab === 'ALL' || activeTab === 'THRESHOLDS') && (
        <section className="ta-section-panel">
          <div className="ta-section-header">
            <div>
              <h3>
                <SlidersHorizontal size={19} />
                Thiết lập Ngưỡng Cảnh báo (Threshold) theo Phân khu — F09
              </h3>
              <p>
                Cấu hình dải an toàn <code>[Min – Max]</code> và ngưỡng báo động đỏ{' '}
                <code>[Critical Min – Critical Max]</code> cho từng loại cảm biến trong Zone.
              </p>
            </div>

            <div className="ta-zone-selectors">
              <div className="ta-select-box">
                <label>
                  <MapPin size={13} /> Trang trại (Farm)
                </label>
                <select
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

              <div className="ta-select-box">
                <label>
                  <Layers size={13} /> Phân khu canh tác (Zone)
                </label>
                <select
                  value={selectedZoneId}
                  onChange={(e) => handleZoneChange(Number(e.target.value))}
                >
                  {farmZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.cropType})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="ta-btn-secondary"
                onClick={handleResetZoneDefaults}
                title="Khôi phục toàn bộ ngưỡng của Zone này về mức khuyến nghị"
              >
                <RotateCcw size={15} />
                Khôi phục mặc định
              </button>
            </div>
          </div>

          {loadingThresholds ? (
            <div className="ta-loading">Đang tải cấu hình ngưỡng của phân khu...</div>
          ) : (
            <div className="ta-threshold-grid">
              {zoneThresholds.map((rule) => {
                const effective = getEffectiveRule(rule);
                const preset = SENSOR_THRESHOLD_PRESETS[rule.sensorType as SensorType];
                const Icon = SENSOR_ICONS[rule.sensorType] || Thermometer;
                const validation = validateThresholdRule(effective);
                const isDirty = Boolean(draftEdits[rule.id]);
                const isSaving = savingThresholdSensor === rule.sensorType;

                // Tính tỷ lệ phần trăm cho thanh phổ 5 vùng (Danger - Warning - Safe - Warning - Danger)
                const span = Math.max(1, preset.physicalMax - preset.physicalMin);
                const clampPct = (val: number) =>
                  Math.min(100, Math.max(0, ((val - preset.physicalMin) / span) * 100));

                const cMinPct = clampPct(effective.criticalMin);
                const minPct = clampPct(effective.minValue);
                const maxPct = clampPct(effective.maxValue);
                const cMaxPct = clampPct(effective.criticalMax);

                const sampleRaw = quickTestValues[rule.id];
                const sampleVal =
                  sampleRaw !== undefined && sampleRaw !== '' ? Number(sampleRaw) : null;
                let sampleResult: 'NORMAL' | 'WARNING' | 'CRITICAL' | null = null;
                if (sampleVal !== null && !Number.isNaN(sampleVal)) {
                  if (sampleVal <= effective.criticalMin || sampleVal >= effective.criticalMax) {
                    sampleResult = 'CRITICAL';
                  } else if (sampleVal < effective.minValue || sampleVal > effective.maxValue) {
                    sampleResult = 'WARNING';
                  } else {
                    sampleResult = 'NORMAL';
                  }
                }

                return (
                  <div
                    key={rule.id}
                    className={`ta-rule-card ${!effective.enabled ? 'disabled' : ''} ${
                      !validation.valid ? 'invalid' : ''
                    }`}
                  >
                    <div className="ta-rule-top">
                      <div className="ta-rule-title">
                        <span
                          className="ta-sensor-icon"
                          style={{
                            backgroundColor: `${preset.color}20`,
                            color: preset.color,
                          }}
                        >
                          <Icon size={20} />
                        </span>
                        <div>
                          <h4>
                            {preset.label}{' '}
                            <span className="ta-unit-badge">{preset.unit}</span>
                          </h4>
                          <p>{preset.description}</p>
                        </div>
                      </div>

                      <label className="ta-toggle-switch">
                        <input
                          type="checkbox"
                          checked={effective.enabled}
                          onChange={(e) =>
                            handleDraftFieldChange(rule, 'enabled', e.target.checked)
                          }
                        />
                        <span className="ta-toggle-slider" />
                        <span className="ta-toggle-text">
                          {effective.enabled ? 'Đang bật' : 'Đã tắt'}
                        </span>
                      </label>
                    </div>

                    {/* Thanh phổ trực quan 4 mốc */}
                    <div className="ta-spectrum-box">
                      <div className="ta-spectrum-labels">
                        <span className="crit">
                          Nguy hiểm &le; {effective.criticalMin}
                          {preset.unit}
                        </span>
                        <span className="safe">
                          An toàn: {effective.minValue} – {effective.maxValue}
                          {preset.unit}
                        </span>
                        <span className="crit">
                          Nguy hiểm &ge; {effective.criticalMax}
                          {preset.unit}
                        </span>
                      </div>
                      <div className="ta-spectrum-bar">
                        <div
                          className="seg danger"
                          style={{ width: `${cMinPct}%` }}
                          title="Vùng nguy hiểm dưới (Critical Low)"
                        />
                        <div
                          className="seg warning"
                          style={{ width: `${Math.max(0, minPct - cMinPct)}%` }}
                          title="Vùng cảnh báo sớm dưới (Warning Low)"
                        />
                        <div
                          className="seg safe"
                          style={{ width: `${Math.max(0, maxPct - minPct)}%` }}
                          title="Vùng tối ưu an toàn (Normal)"
                        />
                        <div
                          className="seg warning"
                          style={{ width: `${Math.max(0, cMaxPct - maxPct)}%` }}
                          title="Vùng cảnh báo sớm trên (Warning High)"
                        />
                        <div
                          className="seg danger"
                          style={{ width: `${Math.max(0, 100 - cMaxPct)}%` }}
                          title="Vùng nguy hiểm trên (Critical High)"
                        />
                      </div>
                    </div>

                    {/* 4 Ô nhập số liệu Ngưỡng */}
                    <div className="ta-inputs-row">
                      <div className="ta-input-field crit">
                        <label>Nguy hiểm dưới (Crit Min)</label>
                        <input
                          type="number"
                          step={preset.step}
                          value={effective.criticalMin}
                          onChange={(e) =>
                            handleDraftFieldChange(
                              rule,
                              'criticalMin',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>

                      <div className="ta-input-field warn">
                        <label>Tối thiểu an toàn (Min)</label>
                        <input
                          type="number"
                          step={preset.step}
                          value={effective.minValue}
                          onChange={(e) =>
                            handleDraftFieldChange(rule, 'minValue', Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="ta-input-field warn">
                        <label>Tối đa an toàn (Max)</label>
                        <input
                          type="number"
                          step={preset.step}
                          value={effective.maxValue}
                          onChange={(e) =>
                            handleDraftFieldChange(rule, 'maxValue', Number(e.target.value))
                          }
                        />
                      </div>

                      <div className="ta-input-field crit">
                        <label>Nguy hiểm trên (Crit Max)</label>
                        <input
                          type="number"
                          step={preset.step}
                          value={effective.criticalMax}
                          onChange={(e) =>
                            handleDraftFieldChange(
                              rule,
                              'criticalMax',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </div>

                    {/* Ô kiểm tra thử giá trị đo với quy tắc ngưỡng */}
                    <div className="ta-quick-evaluator">
                      <span>Kiểm thử nhanh giá trị đo ({preset.unit}):</span>
                      <input
                        type="number"
                        step={preset.step}
                        placeholder={`VD: ${preset.maxValue + preset.step * 5}`}
                        value={quickTestValues[rule.id] ?? ''}
                        onChange={(e) =>
                          setQuickTestValues((prev) => ({
                            ...prev,
                            [rule.id]: e.target.value,
                          }))
                        }
                      />
                      {sampleResult && (
                        <span className={`ta-eval-badge ${sampleResult.toLowerCase()}`}>
                          {sampleResult === 'NORMAL'
                            ? 'Hợp lệ (An toàn)'
                            : sampleResult === 'WARNING'
                              ? 'Vượt ngưỡng (WARNING)'
                              : 'Báo động đỏ (CRITICAL)'}
                        </span>
                      )}
                    </div>

                    {!validation.valid && (
                      <div className="ta-validation-error">
                        <TriangleAlert size={15} />
                        <span>{validation.errorMessage}</span>
                      </div>
                    )}

                    <div className="ta-rule-footer">
                      <span className="ta-updated-time">
                        <Clock size={12} /> Cập nhật: {formatDateTime(effective.updatedAt)}
                      </span>
                      <div className="ta-rule-btns">
                        {isDirty && (
                          <button
                            type="button"
                            className="ta-btn-ghost"
                            onClick={() =>
                              setDraftEdits((prev) => {
                                const next = { ...prev };
                                delete next[rule.id];
                                return next;
                              })
                            }
                          >
                            Hủy sửa
                          </button>
                        )}
                        <button
                          type="button"
                          className="ta-btn-save"
                          disabled={!validation.valid || isSaving}
                          onClick={() => handleSaveRule(rule)}
                        >
                          <Save size={14} />
                          {isSaving
                            ? 'Đang lưu...'
                            : isDirty
                              ? 'Lưu thay đổi *'
                              : 'Lưu cấu hình'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== PHÂN HỆ 2: QUẢN LÝ DANH SÁCH ALERT (F08) ==================== */}
      {(activeTab === 'ALL' || activeTab === 'ALERTS') && (
        <section className="ta-section-panel">
          <div className="ta-section-header">
            <div>
              <h3>
                <BellRing size={19} />
                Quản lý Danh sách Cảnh báo Vượt ngưỡng (Alert Management — F08)
              </h3>
              <p>
                Theo dõi các cảnh báo sinh ra từ Alert Engine (Dev 2 - LTJ-27) &amp; Simulator
                (Dev 5 - LTJ-30). Hỗ trợ xác nhận đã đọc và đóng cảnh báo (Close Alert).
              </p>
            </div>

            <div className="ta-bulk-actions">
              <button
                type="button"
                className="ta-btn-resolve-all"
                disabled={summaryStats.openCount === 0 && summaryStats.acknowledgedCount === 0}
                onClick={() => dispatch(closeAllOpenAlerts(filter.zoneId))}
              >
                <Check size={15} />
                Đóng tất cả cảnh báo đang mở
              </button>
            </div>
          </div>

          {/* Thanh bộ lọc đa điều kiện */}
          <div className="ta-filter-bar">
            <div className="ta-search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Tìm mã cảnh báo (ALT-...), mã cảm biến, nội dung..."
                value={filter.searchQuery}
                onChange={(e) => dispatch(setAlertFilterSearch(e.target.value))}
              />
            </div>

            <select
              value={filter.zoneId}
              onChange={(e) =>
                dispatch(
                  setAlertFilterZone(
                    e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                  )
                )
              }
            >
              <option value="ALL">Tất cả Phân khu (Zone)</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>

            <select
              value={filter.level}
              onChange={(e) =>
                dispatch(
                  setAlertFilterLevel(e.target.value as BackendAlertLevel | 'ALL')
                )
              }
            >
              <option value="ALL">Mọi mức độ nghiêm trọng</option>
              <option value="CRITICAL">Nguy hiểm (CRITICAL)</option>
              <option value="WARNING">Cảnh báo (WARNING)</option>
              <option value="INFO">Thông tin (INFO)</option>
            </select>

            <select
              value={filter.status}
              onChange={(e) =>
                dispatch(setAlertFilterStatus(e.target.value as AlertStatus | 'ALL'))
              }
            >
              <option value="ALL">Mọi trạng thái xử lý</option>
              <option value="OPEN">Đang mở (Open)</option>
              <option value="ACKNOWLEDGED">Đã tiếp nhận</option>
              <option value="RESOLVED">Đã đóng (Closed)</option>
            </select>

            <select
              value={filter.sensorType}
              onChange={(e) =>
                dispatch(
                  setAlertFilterSensorType(e.target.value as AlertSourceType | 'ALL')
                )
              }
            >
              <option value="ALL">Mọi nguồn cảm biến / UAV</option>
              <option value="TEMPERATURE">Nhiệt độ (°C)</option>
              <option value="HUMIDITY">Độ ẩm KK (%)</option>
              <option value="SOIL_MOISTURE">Độ ẩm đất (%)</option>
              <option value="LIGHT">Ánh sáng (lux)</option>
              <option value="CO2">Nồng độ CO₂ (ppm)</option>
              <option value="UAV_BATTERY">Pin UAV (%)</option>
            </select>

            <label className="ta-unread-checkbox">
              <input
                type="checkbox"
                checked={filter.onlyUnread}
                onChange={(e) => dispatch(setAlertFilterUnreadOnly(e.target.checked))}
              />
              <span>Chỉ hiện chưa đọc</span>
            </label>

            <button
              type="button"
              className="ta-btn-ghost"
              onClick={() => dispatch(resetAlertFilters())}
            >
              <RotateCcw size={14} /> Đặt lại lọc
            </button>
          </div>

          {/* Bảng danh sách Alert */}
          <div className="ta-table-wrapper">
            <table className="ta-alert-table">
              <thead>
                <tr>
                  <th>Mã &amp; Thời gian</th>
                  <th>Mức độ</th>
                  <th>Phân khu &amp; Thiết bị</th>
                  <th>Giá trị đo / Ngưỡng</th>
                  <th>Nội dung cảnh báo &amp; Ghi chú xử lý</th>
                  <th>Trạng thái</th>
                  <th>Thao tác (F08)</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="ta-empty-row">
                      Không có cảnh báo nào khớp với bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => {
                    const SourceIcon = SENSOR_ICONS[item.sensorType] || Info;
                    return (
                      <tr
                        key={item.id}
                        className={`ta-alert-row ${item.alertLevel.toLowerCase()} ${
                          !item.isRead ? 'unread' : ''
                        }`}
                      >
                        <td>
                          <div className="ta-code-cell">
                            <strong>{item.alertCode}</strong>
                            {!item.isRead && <span className="ta-unread-dot" title="Chưa đọc" />}
                          </div>
                          <span className="ta-time-sub">{formatDateTime(item.createdAt)}</span>
                        </td>

                        <td>
                          <span className={`ta-level-badge ${item.alertLevel.toLowerCase()}`}>
                            {item.alertLevel === 'CRITICAL' ? (
                              <ShieldAlert size={13} />
                            ) : item.alertLevel === 'WARNING' ? (
                              <TriangleAlert size={13} />
                            ) : (
                              <Info size={13} />
                            )}
                            {ALERT_LEVEL_LABELS[item.alertLevel]}
                          </span>
                        </td>

                        <td>
                          <div className="ta-device-cell">
                            <span className="ta-zone-tag">{item.zoneName}</span>
                            <span className="ta-sensor-tag">
                              <SourceIcon size={13} />
                              {item.sensorCode} ({ALERT_SOURCE_LABELS[item.sensorType]})
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="ta-reading-cell">
                            <strong className={item.alertLevel.toLowerCase()}>
                              {item.measuredValue} {item.unit}
                            </strong>
                            <span>
                              Ngưỡng: [{item.thresholdMin} – {item.thresholdMax} {item.unit}]
                            </span>
                          </div>
                        </td>

                        <td className="ta-msg-cell">
                          <p className="ta-alert-msg">{item.message}</p>
                          {item.resolvedNote && (
                            <p className="ta-resolved-note">
                              <CircleCheck size={13} />
                              <span>
                                <strong>Ghi chú đóng:</strong> {item.resolvedNote} (
                                {formatDateTime(item.resolvedAt)})
                              </span>
                            </p>
                          )}
                        </td>

                        <td>
                          <span className={`ta-status-badge ${item.status.toLowerCase()}`}>
                            {ALERT_STATUS_LABELS[item.status]}
                          </span>
                        </td>

                        <td>
                          <div className="ta-row-actions">
                            {!item.isRead && item.status === 'OPEN' && (
                              <button
                                type="button"
                                className="ta-act-btn ack"
                                onClick={() => dispatch(acknowledgeAlertById(item.id))}
                                title="Xác nhận đã đọc và đang xử lý"
                              >
                                <Eye size={14} /> Tiếp nhận
                              </button>
                            )}

                            {item.status !== 'RESOLVED' ? (
                              <button
                                type="button"
                                className="ta-act-btn close"
                                onClick={() => handleOpenCloseModal(item)}
                                title="Đóng cảnh báo (Close/Resolve Alert)"
                              >
                                <Check size={14} /> Close Alert
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="ta-act-btn view"
                                onClick={() => handleOpenCloseModal(item)}
                              >
                                <Eye size={14} /> Xem chi tiết
                              </button>
                            )}

                            <button
                              type="button"
                              className="ta-act-btn delete"
                              onClick={() => dispatch(deleteAlertById(item.id))}
                              title="Xóa bản ghi cảnh báo"
                            >
                              <Trash2 size={14} />
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
      )}

      {/* ==================== MODAL XÁC NHẬN ĐÓNG CẢNH BÁO (CLOSE ALERT) ==================== */}
      {selectedAlert && (
        <div
          className="ta-modal-backdrop"
          onClick={() => dispatch(selectAlertForModal(null))}
        >
          <div className="ta-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ta-modal-header">
              <div>
                <span className={`ta-level-badge ${selectedAlert.alertLevel.toLowerCase()}`}>
                  {ALERT_LEVEL_LABELS[selectedAlert.alertLevel]}
                </span>
                <h3>
                  {selectedAlert.status === 'RESOLVED'
                    ? `Chi tiết Cảnh báo #${selectedAlert.alertCode}`
                    : `Đóng Cảnh báo (Close Alert) — ${selectedAlert.alertCode}`}
                </h3>
              </div>
              <button
                type="button"
                className="ta-modal-close"
                onClick={() => dispatch(selectAlertForModal(null))}
              >
                <X size={18} />
              </button>
            </div>

            <div className="ta-modal-body">
              <div className="ta-modal-grid">
                <div>
                  <span className="lbl">Phân khu (Zone)</span>
                  <strong>{selectedAlert.zoneName}</strong>
                </div>
                <div>
                  <span className="lbl">Thiết bị phát sinh</span>
                  <strong>
                    {selectedAlert.sensorCode} ({ALERT_SOURCE_LABELS[selectedAlert.sensorType]})
                  </strong>
                </div>
                <div>
                  <span className="lbl">Giá trị đo vi phạm</span>
                  <strong className="crit-val">
                    {selectedAlert.measuredValue} {selectedAlert.unit}
                  </strong>
                </div>
                <div>
                  <span className="lbl">Dải ngưỡng an toàn</span>
                  <strong>
                    [{selectedAlert.thresholdMin} – {selectedAlert.thresholdMax}{' '}
                    {selectedAlert.unit}]
                  </strong>
                </div>
              </div>

              <div className="ta-modal-msg">
                <strong>Nội dung phát hiện từ Alert Engine:</strong>
                <p>{selectedAlert.message}</p>
              </div>

              <div className="ta-modal-note-field">
                <label>Ghi chú biên bản xử lý kỹ thuật (Resolution Note):</label>
                <textarea
                  rows={3}
                  value={resolveNoteInput}
                  onChange={(e) => setResolveNoteInput(e.target.value)}
                  placeholder="Nhập biện pháp khắc phục đã thực hiện trước khi đóng cảnh báo..."
                />
              </div>
            </div>

            <div className="ta-modal-footer">
              <button
                type="button"
                className="ta-btn-ghost"
                onClick={() => dispatch(selectAlertForModal(null))}
              >
                Hủy
              </button>
              <button
                type="button"
                className="ta-btn-confirm-close"
                onClick={handleConfirmCloseAlert}
              >
                <CircleCheck size={16} />
                {selectedAlert.status === 'RESOLVED'
                  ? 'Cập nhật ghi chú xử lý'
                  : 'Xác nhận Đóng Cảnh báo (Close Alert)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
