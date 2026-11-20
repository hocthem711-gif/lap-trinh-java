// ============================================================================
// SPRINT 8 - LTJ-39: GIAO DIỆN XUẤT EXCEL (F11) & REVIEW MISSION UI (F17)
// Dev 4: Nguyễn Trường An (Quatrungvoon)
// ============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Award,
  BatteryCharging,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Database,
  Download,
  FileCode,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  MapPin,
  Navigation,
  Plane,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Table,
  XCircle,
} from 'lucide-react';
import type { AppDispatch, RootState } from '../store';
import {
  clearStatusBanner,
  initializeMissionReviewExportData,
  resetMissionReviewDemoData,
  selectActiveMissionReview,
  selectFilteredExportRows,
  selectFilteredMissionReviews,
  selectSprint8OverviewKpis,
  setActiveWorkspaceTab,
  setCustomFileNamePrefix,
  setExportAlertSeverityFilter,
  setExportDatasetType,
  setExportFileFormat,
  setExportSearchKeyword,
  setExportTimeRange,
  setExportZoneFilter,
  setReviewDecisionFilter,
  setSelectedMissionId,
  setSelectedWaypointIndex,
  submitMissionReviewSignOff,
  toggleExportColumnKey,
  toggleIncludeSummaryHeader,
  triggerDatasetFileExport,
  type Sprint8WorkspaceTab,
} from '../store/slices/missionReviewExportSlice';
import {
  EXPORT_DATASET_CATALOG,
  MISSION_REVIEW_DECISION_META,
  type ExportDatasetType,
  type ExportFileFormat,
  type ExportTimeRange,
  type MissionReviewDecision,
  type MissionReviewRecord,
  type MissionReviewRubricScores,
} from '../types/missionReviewExport';
import {
  calculateOverallMissionScore,
  determineQualityGrade,
} from '../services/missionReviewExportService';
import './ExcelExportMissionReview.css';

// ============================================================================
// SUB-COMPONENT: FORM CHẤM ĐIỂM 5 TIÊU CHÍ & KÝ DUYỆT NGHIỆM THU MISSION (F17)
// Dùng key={mission.missionId} để tự động đồng bộ state chuẩn React mà không cần useEffect
// ============================================================================

interface MissionSignOffPanelProps {
  mission: MissionReviewRecord;
  submitting: boolean;
  onSubmitSignOff: (
    decision: MissionReviewDecision,
    rubric: MissionReviewRubricScores,
    reviewerName: string,
    reviewerRole: string,
    summaryNote: string,
    correctivePlan: string
  ) => void;
  onExportThisMissionExcel: () => void;
}

const MissionSignOffPanel: React.FC<MissionSignOffPanelProps> = ({
  mission,
  submitting,
  onSubmitSignOff,
  onExportThisMissionExcel,
}) => {
  const [rubric, setRubric] = useState<MissionReviewRubricScores>({
    ...mission.rubricScores,
  });
  const [reviewerName, setReviewerName] = useState(mission.reviewerName);
  const [reviewerRole, setReviewerRole] = useState(mission.reviewerRole);
  const [summaryNote, setSummaryNote] = useState(mission.reviewSummaryNote);
  const [correctivePlan, setCorrectivePlan] = useState(
    mission.correctiveActionPlan
  );

  const previewScore = useMemo(
    () => calculateOverallMissionScore(rubric, mission.errorWaypoints),
    [rubric, mission.errorWaypoints]
  );

  const previewGrade = useMemo(
    () => determineQualityGrade(previewScore),
    [previewScore]
  );

  const rubricItems: {
    key: keyof MissionReviewRubricScores;
    label: string;
    weightLabel: string;
  }[] = [
    {
      key: 'flightPathAccuracy',
      label: '1. Độ chính xác bám quỹ đạo Waypoint (RTK Drift)',
      weightLabel: 'Trọng số 28%',
    },
    {
      key: 'sensorDataCompleteness',
      label: '2. Tỷ lệ thu thập gói tin Cảm biến & Đa phổ',
      weightLabel: 'Trọng số 25%',
    },
    {
      key: 'batteryEfficiencyRating',
      label: '3. Hiệu suất năng lượng Pin & Quản lý dòng xả',
      weightLabel: 'Trọng số 18%',
    },
    {
      key: 'commLinkStability',
      label: '4. Độ ổn định truyền thông Lora / Telemetry',
      weightLabel: 'Trọng số 15%',
    },
    {
      key: 'safetyCompliance',
      label: '5. Tuân thủ quy trình an toàn bay & RTH',
      weightLabel: 'Trọng số 14%',
    },
  ];

  return (
    <div className="signoff-card">
      <div className="signoff-card-header">
        <div>
          <h4>
            <Award size={18} /> Hội đồng Chấm điểm &amp; Ký duyệt Nghiệm thu Nhiệm vụ (F17)
          </h4>
          <p>
            Công thức tổng hợp: S = 0.28·Path + 0.25·Data + 0.18·Battery +
            0.15·Link + 0.14·Safety − 4·ErrorWP
          </p>
        </div>
        <div className={`live-score-badge grade-${previewGrade.toLowerCase()}`}>
          <span className="score-num">{previewScore}/100</span>
          <span className="score-grade">Hạng {previewGrade}</span>
        </div>
      </div>

      <div className="rubric-sliders-grid">
        {rubricItems.map((item) => {
          const val = rubric[item.key];
          return (
            <div className="rubric-slider-row" key={item.key}>
              <div className="rubric-label-line">
                <span className="rubric-title">{item.label}</span>
                <span className="rubric-meta">
                  <em>{item.weightLabel}</em> · <strong>{val}/100</strong>
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={100}
                step={1}
                value={val}
                aria-label={item.label}
                onChange={(e) =>
                  setRubric((prev) => ({
                    ...prev,
                    [item.key]: Number(e.target.value),
                  }))
                }
              />
            </div>
          );
        })}
      </div>

      <div className="signoff-form-grid">
        <div className="signoff-field">
          <label htmlFor="reviewer-name-input">Người thẩm định / Ký duyệt</label>
          <input
            id="reviewer-name-input"
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Nhập họ tên người nghiệm thu..."
          />
        </div>
        <div className="signoff-field">
          <label htmlFor="reviewer-role-input">Chức danh / Vai trò</label>
          <input
            id="reviewer-role-input"
            type="text"
            value={reviewerRole}
            onChange={(e) => setReviewerRole(e.target.value)}
            placeholder="Nhập chức danh..."
          />
        </div>
        <div className="signoff-field full-width">
          <label htmlFor="review-summary-textarea">
            Nhận xét đánh giá tổng kết sau chuyến bay (Post-Flight Debrief Summary)
          </label>
          <textarea
            id="review-summary-textarea"
            rows={2}
            value={summaryNote}
            onChange={(e) => setSummaryNote(e.target.value)}
            placeholder="Nhập kết luận đối soát quỹ đạo, dữ liệu cảm biến và tình trạng thiết bị..."
          />
        </div>
        <div className="signoff-field full-width">
          <label htmlFor="corrective-plan-textarea">
            Khuyến nghị kỹ thuật &amp; Kế hoạch hành động tiếp theo (Corrective Action Plan)
          </label>
          <textarea
            id="corrective-plan-textarea"
            rows={2}
            value={correctivePlan}
            onChange={(e) => setCorrectivePlan(e.target.value)}
            placeholder="Nhập chỉ đạo bảo trì, điều chỉnh tưới tiêu hoặc lịch bay bù..."
          />
        </div>
      </div>

      <div className="signoff-actions-bar">
        <button
          type="button"
          className="btn-signoff approve"
          disabled={submitting}
          onClick={() =>
            onSubmitSignOff(
              'APPROVED',
              rubric,
              reviewerName,
              reviewerRole,
              summaryNote,
              correctivePlan
            )
          }
        >
          <CheckCircle2 size={16} />
          Phê duyệt Đạt chuẩn (Approve)
        </button>

        <button
          type="button"
          className="btn-signoff reflight"
          disabled={submitting}
          onClick={() =>
            onSubmitSignOff(
              'NEEDS_REFLIGHT',
              rubric,
              reviewerName,
              reviewerRole,
              summaryNote,
              correctivePlan
            )
          }
        >
          <XCircle size={16} />
          Yêu cầu Bay bù (Needs Reflight)
        </button>

        <button
          type="button"
          className="btn-signoff archive"
          disabled={submitting}
          onClick={() =>
            onSubmitSignOff(
              'ARCHIVED',
              rubric,
              reviewerName,
              reviewerRole,
              summaryNote,
              correctivePlan
            )
          }
        >
          <History size={16} />
          Lưu trữ Hồ sơ (Archive)
        </button>

        <button
          type="button"
          className="btn-signoff export-mission"
          onClick={onExportThisMissionExcel}
        >
          <FileSpreadsheet size={16} />
          Xuất Hồ sơ Mission ra Excel (.xls)
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: EXCEL EXPORT (F11) & MISSION REVIEW UI (F17)
// ============================================================================

const ExcelExportMissionReview: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    activeWorkspaceTab,
    reviewDecisionFilter,
    selectedWaypointIndex,
    exportConfig,
    exportHistory,
    loading,
    exporting,
    submittingReview,
    statusBanner,
  } = useSelector((state: RootState) => state.missionReviewExport);

  const filteredReviews = useSelector(selectFilteredMissionReviews);
  const activeMission = useSelector(selectActiveMissionReview);
  const filteredExportRows = useSelector(selectFilteredExportRows);
  const kpis = useSelector(selectSprint8OverviewKpis);

  useEffect(() => {
    dispatch(initializeMissionReviewExportData());
  }, [dispatch]);

  const currentDatasetMeta = EXPORT_DATASET_CATALOG[exportConfig.datasetType];
  const visibleColumns = useMemo(
    () =>
      currentDatasetMeta.defaultColumns.filter((col) =>
        exportConfig.selectedColumnKeys.includes(col.key)
      ),
    [currentDatasetMeta, exportConfig.selectedColumnKeys]
  );

  // Tính toán tọa độ SVG cho biểu đồ đối soát quỹ đạo Waypoint (Planned vs Actual)
  const trajectorySvgPoints = useMemo(() => {
    if (!activeMission || activeMission.waypointAudits.length === 0) return [];
    const wps = activeMission.waypointAudits;
    const lats = wps.flatMap((w) => [w.plannedLat, w.actualLat]);
    const lngs = wps.flatMap((w) => [w.plannedLng, w.actualLng]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latSpan = Math.max(0.0005, maxLat - minLat);
    const lngSpan = Math.max(0.0005, maxLng - minLng);

    return wps.map((wp, idx) => {
      const px = 42 + ((wp.plannedLng - minLng) / lngSpan) * 336;
      const py = 185 - ((wp.plannedLat - minLat) / latSpan) * 145;
      // Phóng đại nhẹ độ lệch thực tế để dễ quan sát bằng mắt trên Radar Audit
      const dx = (wp.actualLng - wp.plannedLng) * 180000;
      const dy = (wp.actualLat - wp.plannedLat) * 180000;
      const ax = Math.max(24, Math.min(395, px + dx));
      const ay = Math.max(22, Math.min(200, py - dy));
      return {
        ...wp,
        idx,
        px: Number(px.toFixed(1)),
        py: Number(py.toFixed(1)),
        ax: Number(ax.toFixed(1)),
        ay: Number(ay.toFixed(1)),
      };
    });
  }, [activeMission]);

  const selectedWaypointAudit =
    activeMission?.waypointAudits[selectedWaypointIndex] ??
    activeMission?.waypointAudits[0] ??
    null;

  const isExportEmpty = filteredExportRows.length === 0;
  const emptyExportTooltip = isExportEmpty
    ? 'Không có bản ghi nào khớp bộ lọc hiện tại để xuất'
    : undefined;

  const handleQuickExportFormat = (format: ExportFileFormat) => {
    if (isExportEmpty) return;
    dispatch(setExportFileFormat(format));
    dispatch(triggerDatasetFileExport({ fileFormat: format }));
  };

  return (
    <div className="s8-review-export-container">
      {/* ==================== TOP HEADER ==================== */}
      <div className="s8-top-banner">
        <div className="s8-banner-left">
          <div className="s8-sprint-pill">
            <Sparkles size={14} />
            <span>SPRINT 8 · TASK LTJ-39 · F11 &amp; F17</span>
          </div>
          <h2>Trung tâm Xuất Báo cáo Excel Đa tầng (F11) &amp; Nghiệm thu Review Mission (F17)</h2>
          <p>
            Trích xuất sổ cái Excel đa Sheet (.xls/.xlsx), CSV UTF-8 BOM, JSON/PDF cho dữ liệu
            Cảm biến, Cảnh báo (LTJ-29/LTJ-37), Đồng bộ UAV (LTJ-24) và Đối soát Nghiệm thu
            Chuyến bay sau nhiệm vụ (LTJ-34/LTJ-39).
          </p>
        </div>

        <div className="s8-banner-actions">
          <button
            type="button"
            className="s8-btn-master-excel"
            disabled={exporting || isExportEmpty}
            title={emptyExportTooltip}
            onClick={() =>
              dispatch(
                triggerDatasetFileExport({
                  datasetType: 'FULL_WORKBOOK',
                  fileFormat: 'XLSX',
                })
              )
            }
          >
            <FileSpreadsheet size={18} />
            <span>
              {exporting
                ? 'Đang đóng gói Workbook...'
                : 'Xuất Master Excel 5 Sheet (.xls)'}
            </span>
          </button>

          <button
            type="button"
            className="s8-btn-reset"
            onClick={() => dispatch(resetMissionReviewDemoData())}
            title="Khôi phục bộ dữ liệu mẫu Sprint 8"
          >
            <RotateCcw size={16} />
            <span>Khôi phục mẫu</span>
          </button>
        </div>
      </div>

      {/* ==================== STATUS NOTIFICATION BANNER ==================== */}
      {statusBanner && (
        <div className={`s8-status-toast ${statusBanner.type}`}>
          <div className="s8-toast-content">
            <CheckCircle2 size={18} />
            <span>{statusBanner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearStatusBanner())}
            className="s8-toast-close"
          >
            Đóng
          </button>
        </div>
      )}

      {/* ==================== 4 KPI CARDS ==================== */}
      <div className="s8-kpi-grid">
        <article className="s8-kpi-card cyan">
          <div className="s8-kpi-icon">
            <ClipboardCheck size={22} />
          </div>
          <div className="s8-kpi-body">
            <span className="s8-kpi-label">Hồ sơ Nhiệm vụ Bay (F17)</span>
            <strong className="s8-kpi-value">{kpis.totalMissions} Mission</strong>
            <span className="s8-kpi-sub">
              {kpis.approvedCount} Đạt chuẩn · {kpis.needsReflightCount} Cần bay bù
            </span>
          </div>
        </article>

        <article className="s8-kpi-card emerald">
          <div className="s8-kpi-icon">
            <Award size={22} />
          </div>
          <div className="s8-kpi-body">
            <span className="s8-kpi-label">Điểm Chất lượng Bay TB</span>
            <strong className="s8-kpi-value">{kpis.avgQualityScore}/100</strong>
            <span className="s8-kpi-sub">
              Đánh giá theo 5 tiêu chí RTK &amp; Telemetry
            </span>
          </div>
        </article>

        <article className="s8-kpi-card amber">
          <div className="s8-kpi-icon">
            <Database size={22} />
          </div>
          <div className="s8-kpi-body">
            <span className="s8-kpi-label">Bản ghi Sẵn sàng Xuất (F11)</span>
            <strong className="s8-kpi-value">{kpis.exportableRowCount} dòng</strong>
            <span className="s8-kpi-sub">
              Tập dữ liệu: {currentDatasetMeta.shortLabel}
            </span>
          </div>
        </article>

        <article className="s8-kpi-card purple">
          <div className="s8-kpi-icon">
            <FileSpreadsheet size={22} />
          </div>
          <div className="s8-kpi-body">
            <span className="s8-kpi-label">Lượt Xuất Báo cáo Excel/CSV</span>
            <strong className="s8-kpi-value">{kpis.totalExportsExecuted} tệp</strong>
            <span className="s8-kpi-sub">
              Hỗ trợ Apache POI API &amp; Hybrid Multi-Sheet
            </span>
          </div>
        </article>
      </div>

      {/* ==================== WORKSPACE MODE SWITCHER ==================== */}
      <div className="s8-mode-bar">
        <div className="s8-mode-tabs" role="tablist">
          {(
            [
              {
                id: 'SPLIT_VIEW',
                label: 'Chế độ Toàn diện (F11 Xuất Excel + F17 Review Mission)',
                icon: Layers,
              },
              {
                id: 'EXCEL_EXPORT_F11',
                label: '1. Phân hệ Xuất Báo cáo Excel & Tải File (F11)',
                icon: FileSpreadsheet,
              },
              {
                id: 'MISSION_REVIEW_F17',
                label: '2. Phân hệ Tổng kết & Review Mission UI (F17)',
                icon: ClipboardCheck,
              },
            ] as {
              id: Sprint8WorkspaceTab;
              label: string;
              icon: React.ComponentType<{ size?: number }>;
            }[]
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeWorkspaceTab === tab.id}
                className={`s8-mode-tab ${activeWorkspaceTab === tab.id ? 'active' : ''}`}
                onClick={() => dispatch(setActiveWorkspaceTab(tab.id))}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="s8-btn-refresh"
          disabled={loading}
          onClick={() => dispatch(initializeMissionReviewExportData())}
        >
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          <span>Đồng bộ dữ liệu</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* PHÂN KHU 1: GIAO DIỆN XUẤT EXCEL & TẢI FILE ĐA TẦNG (F11)            */}
      {/* ==================================================================== */}
      {(activeWorkspaceTab === 'SPLIT_VIEW' ||
        activeWorkspaceTab === 'EXCEL_EXPORT_F11') && (
        <section className="s8-section-panel">
          <div className="s8-section-header">
            <div>
              <span className="s8-section-tag f11">CHỨC NĂNG F11 · EXCEL &amp; REPORT EXPORT</span>
              <h3>Trích xuất Báo cáo Excel Đa Sheet (.xls/.xlsx), CSV, JSON &amp; PDF</h3>
              <p>
                Chọn phân hệ dữ liệu, thiết lập bộ lọc khu vực/thời gian, tùy chỉnh cột hiển thị
                và xem trước dữ liệu trước khi tải tệp về máy.
              </p>
            </div>
            <div className="s8-quick-export-buttons">
              <button
                type="button"
                className="s8-download-btn excel"
                disabled={exporting || isExportEmpty}
                title={emptyExportTooltip}
                onClick={() => handleQuickExportFormat('XLSX')}
              >
                <FileSpreadsheet size={17} />
                <span>Xuất Excel (.xls)</span>
              </button>
              <button
                type="button"
                className="s8-download-btn csv"
                disabled={exporting || isExportEmpty}
                title={emptyExportTooltip}
                onClick={() => handleQuickExportFormat('CSV')}
              >
                <Table size={17} />
                <span>Tải CSV (UTF-8)</span>
              </button>
              <button
                type="button"
                className="s8-download-btn json"
                disabled={exporting || isExportEmpty}
                title={emptyExportTooltip}
                onClick={() => handleQuickExportFormat('JSON')}
              >
                <FileCode size={17} />
                <span>Tải JSON</span>
              </button>
              <button
                type="button"
                className="s8-download-btn html"
                disabled={exporting || isExportEmpty}
                title={emptyExportTooltip}
                onClick={() => handleQuickExportFormat('HTML_PRINT')}
              >
                <Printer size={17} />
                <span>Xuất Báo cáo In/PDF</span>
              </button>
            </div>
          </div>

          {/* 5 THẺ CHỌN TẬP DỮ LIỆU XUẤT EXCEL */}
          <div className="s8-dataset-cards">
            {(Object.keys(EXPORT_DATASET_CATALOG) as ExportDatasetType[]).map(
              (dsKey) => {
                const meta = EXPORT_DATASET_CATALOG[dsKey];
                const isSelected = exportConfig.datasetType === dsKey;
                return (
                  <button
                    key={dsKey}
                    type="button"
                    className={`s8-dataset-card ${isSelected ? 'selected' : ''}`}
                    style={
                      isSelected
                        ? {
                            borderColor: meta.accentColor,
                            background: meta.badgeBg,
                          }
                        : undefined
                    }
                    onClick={() => dispatch(setExportDatasetType(dsKey))}
                  >
                    <div className="s8-ds-card-top">
                      <span
                        className="s8-ds-sheet-badge"
                        style={{ color: meta.accentColor }}
                      >
                        {meta.sheetName}
                      </span>
                      {isSelected && <CheckCircle2 size={16} color={meta.accentColor} />}
                    </div>
                    <strong>{meta.shortLabel}</strong>
                    <p>{meta.description}</p>
                  </button>
                );
              }
            )}
          </div>

          {/* BỘ LỌC & TÙY CHỈNH THÔNG SỐ XUẤT FILE */}
          <div className="s8-export-controls-grid">
            <div className="s8-control-group">
              <label htmlFor="export-zone-select">
                <MapPin size={14} /> Phân khu Nông trại (Zone)
              </label>
              <select
                id="export-zone-select"
                value={exportConfig.zoneFilter}
                onChange={(e) => dispatch(setExportZoneFilter(e.target.value))}
              >
                <option value="ALL">Tất cả Phân khu (Khu A, Khu B, Khu C)</option>
                <option value="ZONE-A">Khu A - Nhà kính Dâu tây Công nghệ cao</option>
                <option value="ZONE-B">Khu B - Cánh đồng Rau Thủy canh</option>
                <option value="ZONE-C">Khu C - Vườn Ươm &amp; Cảm biến Đất sâu</option>
              </select>
            </div>

            <div className="s8-control-group">
              <label htmlFor="export-range-select">
                <History size={14} /> Khung Thời gian Trích xuất
              </label>
              <select
                id="export-range-select"
                value={exportConfig.timeRange}
                onChange={(e) =>
                  dispatch(setExportTimeRange(e.target.value as ExportTimeRange))
                }
              >
                <option value="24H">24 Giờ gần nhất (Realtime &amp; Hôm nay)</option>
                <option value="7D">7 Ngày qua (Tuần hiện tại)</option>
                <option value="30D">30 Ngày qua (Tháng hiện tại)</option>
                <option value="ALL">Toàn bộ Lịch sử Lưu trữ</option>
              </select>
            </div>

            <div className="s8-control-group">
              <label htmlFor="export-severity-select">
                <ShieldAlert size={14} /> Mức độ Cảnh báo / Đánh giá
              </label>
              <select
                id="export-severity-select"
                value={exportConfig.alertSeverityFilter}
                onChange={(e) =>
                  dispatch(
                    setExportAlertSeverityFilter(
                      e.target.value as 'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'
                    )
                  )
                }
              >
                <option value="ALL">Tất cả Mức độ (Critical / Warning / Normal)</option>
                <option value="CRITICAL">Chỉ Báo động Đỏ (CRITICAL)</option>
                <option value="WARNING">Chỉ Cảnh báo Vàng (WARNING)</option>
                <option value="INFO">Thông tin / Bình thường (INFO/NORMAL)</option>
              </select>
            </div>

            <div className="s8-control-group">
              <label htmlFor="export-prefix-input">
                <FileText size={14} /> Tiền tố Tên File Tải xuống
              </label>
              <input
                id="export-prefix-input"
                type="text"
                value={exportConfig.customFileNamePrefix}
                onChange={(e) => dispatch(setCustomFileNamePrefix(e.target.value))}
                placeholder="VD: SmartFarm_BaoCao_Sprint8"
              />
            </div>

            <div className="s8-control-group search-wide">
              <label htmlFor="export-keyword-input">
                <Search size={14} /> Tìm kiếm nhanh trong Bảng Xem trước
              </label>
              <input
                id="export-keyword-input"
                type="search"
                value={exportConfig.searchKeyword}
                onChange={(e) => dispatch(setExportSearchKeyword(e.target.value))}
                placeholder="Tìm mã cảm biến, UAV, tọa độ GPS, nội dung cảnh báo hoặc ghi chú..."
              />
            </div>
          </div>

          {/* TÙY CHỌN CỘT DỮ LIỆU TRONG FILE EXCEL */}
          <div className="s8-column-selector-bar">
            <span className="s8-col-label">
              <Filter size={14} /> Cột xuất ra Excel ({visibleColumns.length}/
              {currentDatasetMeta.defaultColumns.length}):
            </span>
            <div className="s8-col-chips">
              {currentDatasetMeta.defaultColumns.map((col) => {
                const active = exportConfig.selectedColumnKeys.includes(col.key);
                return (
                  <button
                    key={col.key}
                    type="button"
                    className={`s8-col-chip ${active ? 'active' : ''}`}
                    onClick={() => dispatch(toggleExportColumnKey(col.key))}
                  >
                    {active ? '✓ ' : '+ '}
                    {col.header}
                  </button>
                );
              })}
            </div>
            <label className="s8-header-checkbox">
              <input
                type="checkbox"
                checked={exportConfig.includeSummaryHeader}
                onChange={() => dispatch(toggleIncludeSummaryHeader())}
              />
              <span>Đính kèm Quốc hiệu / Tiêu đề tổng hợp ở đầu Sheet</span>
            </label>
          </div>

          {/* BẢNG XEM TRƯỚC DỮ LIỆU TRƯỚC KHI TẢI (PREVIEW TABLE) */}
          <div className="s8-preview-table-wrapper">
            <div className="s8-preview-table-head">
              <div>
                <strong>
                  Bảng Xem trước Dữ liệu Xuất ({filteredExportRows.length} bản ghi khớp bộ
                  lọc)
                </strong>
                <span>
                  Endpoint: <code>/api/v1{currentDatasetMeta.apiEndpoint}</code>
                </span>
              </div>
              <span className="s8-encoding-badge">
                UTF-8 BOM · Tương thích Microsoft Excel 2016/2021/365
              </span>
            </div>

            <div className="s8-table-scroll">
              <table className="s8-data-table">
                <thead>
                  <tr>
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          minWidth: col.widthPx,
                          textAlign: col.align ?? 'left',
                        }}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredExportRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(1, visibleColumns.length)}
                        className="s8-empty-row"
                      >
                        Không có bản ghi nào khớp với điều kiện lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredExportRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`severity-row-${row.severityLevel.toLowerCase()}`}
                      >
                        {visibleColumns.map((col) => {
                          const cellVal = String(
                            (row as unknown as Record<string, unknown>)[col.key] ?? ''
                          );
                          return (
                            <td
                              key={col.key}
                              style={{ textAlign: col.align ?? 'left' }}
                            >
                              {col.key === 'statusLabel' ? (
                                <span
                                  className={`s8-status-chip ${row.severityLevel.toLowerCase()}`}
                                >
                                  {cellVal}
                                </span>
                              ) : col.key === 'id' || col.key === 'sourceCode' ? (
                                <code>{cellVal}</code>
                              ) : (
                                cellVal
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* NHẬT KÝ CÁC LẦN XUẤT FILE EXCEL GẦN ĐÂY */}
          <div className="s8-export-history-box">
            <div className="s8-history-header">
              <h4>
                <History size={16} /> Nhật ký Trích xuất &amp; Tải Báo cáo Gần đây (
                {exportHistory.length})
              </h4>
              <span>Lưu tự động vào LocalStorage phiên làm việc</span>
            </div>
            <div className="s8-history-list">
              {exportHistory.slice(0, 5).map((item) => (
                <div className="s8-history-item" key={item.id}>
                  <div className="s8-history-main">
                    <FileSpreadsheet size={18} className="s8-history-icon" />
                    <div>
                      <strong>{item.fileName}</strong>
                      <span>
                        {item.datasetLabel} · {item.rowCount} dòng · {item.sheetCount}{' '}
                        Sheet · {item.fileSizeKb} KB · Khu vực: {item.zoneFilter}
                      </span>
                    </div>
                  </div>
                  <div className="s8-history-meta">
                    <span className="s8-engine-tag">{item.executionSource}</span>
                    <span className="s8-time-tag">
                      {new Date(item.exportedAt).toLocaleString('vi-VN')}
                    </span>
                    <button
                      type="button"
                      className="s8-btn-reexport"
                      disabled={exporting}
                      onClick={() =>
                        dispatch(
                          triggerDatasetFileExport({
                            datasetType: item.datasetType,
                            fileFormat: item.fileFormat,
                          })
                        )
                      }
                    >
                      <Download size={13} /> Tải lại
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================================================================== */}
      {/* PHÂN KHU 2: MÀN HÌNH TỔNG KẾT & REVIEW MISSION UI (F17)              */}
      {/* ==================================================================== */}
      {(activeWorkspaceTab === 'SPLIT_VIEW' ||
        activeWorkspaceTab === 'MISSION_REVIEW_F17') && (
        <section className="s8-section-panel">
          <div className="s8-section-header">
            <div>
              <span className="s8-section-tag f17">
                CHỨC NĂNG F17 · POST-FLIGHT MISSION REVIEW &amp; DEBRIEFING UI
              </span>
              <h3>Màn hình Đối soát Quỹ đạo, Tổng kết Telemetry &amp; Nghiệm thu Nhiệm vụ Bay</h3>
              <p>
                Đánh giá toàn diện kết quả chuyến bay UAV: đối chiếu sai số tọa độ Waypoint
                Haversine (Δd), hiệu suất tiêu hao Pin, nhật ký Note Mission hiện trường (F16)
                và ký duyệt nghiệm thu 5 tiêu chí.
              </p>
            </div>

            {/* BỘ LỌC TRẠNG THÁI NGHIỆM THU */}
            <div className="s8-review-filter-pills">
              {(
                [
                  { key: 'ALL', label: 'Tất cả Mission' },
                  { key: 'APPROVED', label: 'Đạt chuẩn' },
                  { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
                  { key: 'NEEDS_REFLIGHT', label: 'Cần bay bù' },
                ] as { key: 'ALL' | MissionReviewDecision; label: string }[]
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`s8-filter-pill ${reviewDecisionFilter === f.key ? 'active' : ''}`}
                  onClick={() => dispatch(setReviewDecisionFilter(f.key))}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="s8-review-layout">
            {/* CỘT TRÁI: DANH SÁCH NHIỆM VỤ BAY CẦN REVIEW */}
            <aside className="s8-mission-selector-col">
              <h4>Danh sách Hồ sơ Chuyến bay ({filteredReviews.length})</h4>
              <div className="s8-mission-cards-list">
                {filteredReviews.map((rev) => {
                  const isSelected = activeMission?.missionId === rev.missionId;
                  const decisionMeta = MISSION_REVIEW_DECISION_META[rev.reviewDecision];
                  return (
                    <button
                      key={rev.missionId}
                      type="button"
                      className={`s8-mission-select-card ${isSelected ? 'active' : ''}`}
                      onClick={() => dispatch(setSelectedMissionId(rev.missionId))}
                    >
                      <div className="s8-msc-top">
                        <span className="s8-msc-code">{rev.missionCode}</span>
                        <span
                          className="s8-msc-decision"
                          style={{
                            color: decisionMeta.badgeColor,
                            background: decisionMeta.badgeBg,
                            borderColor: decisionMeta.borderColor,
                          }}
                        >
                          {decisionMeta.shortLabel}
                        </span>
                      </div>

                      <strong className="s8-msc-title">{rev.missionTitle}</strong>
                      <span className="s8-msc-zone">{rev.zoneName}</span>

                      <div className="s8-msc-bottom">
                        <div className="s8-msc-uav">
                          <Plane size={14} />
                          <span>
                            {rev.uavId} · WP {rev.completedWaypoints}/{rev.totalWaypoints}
                          </span>
                        </div>
                        <div
                          className={`s8-msc-score grade-${rev.qualityGrade.toLowerCase()}`}
                        >
                          <strong>{rev.overallScore}đ</strong>
                          <span>Hạng {rev.qualityGrade}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* CỘT PHẢI: CHI TIẾT NGHIỆM THU MISSION ĐANG CHỌN */}
            {activeMission && (
              <div className="s8-mission-detail-col">
                {/* 1. HEADER THÔNG TIN CHUYẾN BAY & TRẠNG THÁI */}
                <div className="s8-detail-hero">
                  <div className="s8-detail-hero-info">
                    <div className="s8-hero-badges">
                      <span className="s8-code-badge">{activeMission.missionCode}</span>
                      <span className="s8-uav-badge">
                        <Plane size={14} /> {activeMission.uavId} — {activeMission.uavModel}
                      </span>
                      <span
                        className="s8-decision-pill"
                        style={{
                          color:
                            MISSION_REVIEW_DECISION_META[activeMission.reviewDecision]
                              .badgeColor,
                          background:
                            MISSION_REVIEW_DECISION_META[activeMission.reviewDecision]
                              .badgeBg,
                          borderColor:
                            MISSION_REVIEW_DECISION_META[activeMission.reviewDecision]
                              .borderColor,
                        }}
                      >
                        {
                          MISSION_REVIEW_DECISION_META[activeMission.reviewDecision]
                            .label
                        }
                      </span>
                    </div>
                    <h3>{activeMission.missionTitle}</h3>
                    <p>
                      <strong>Phân khu:</strong> {activeMission.zoneName} ·{' '}
                      <strong>Phi công:</strong> {activeMission.pilotName} ·{' '}
                      <strong>Thời tiết:</strong> {activeMission.weatherCondition} (Gió{' '}
                      {activeMission.windSpeedKmh} km/h)
                    </p>
                  </div>

                  <div
                    className={`s8-hero-score-circle grade-${activeMission.qualityGrade.toLowerCase()}`}
                  >
                    <span className="s8-hsc-value">{activeMission.overallScore}</span>
                    <span className="s8-hsc-label">ĐIỂM / 100</span>
                    <strong className="s8-hsc-grade">
                      HẠNG {activeMission.qualityGrade}
                    </strong>
                  </div>
                </div>

                {/* 2. LƯỚI 6 CHỈ SỐ ĐỐI SOÁT KỸ THUẬT CHUYẾN BAY */}
                <div className="s8-telemetry-audit-grid">
                  <div className="s8-audit-stat">
                    <span className="label">
                      <Navigation size={14} /> Quãng đường Thực tế / KH
                    </span>
                    <strong>
                      {activeMission.actualDistanceM}m{' '}
                      <small>/ {activeMission.plannedDistanceM}m</small>
                    </strong>
                    <span className="sub">
                      Vận tốc TB: {activeMission.avgSpeedMS} m/s · Cao cực đại:{' '}
                      {activeMission.maxAltitudeM}m
                    </span>
                  </div>

                  <div className="s8-audit-stat">
                    <span className="label">
                      <BatteryCharging size={14} /> Tiêu hao Năng lượng Pin
                    </span>
                    <strong>
                      {activeMission.startBatteryPercent}% →{' '}
                      {activeMission.endBatteryPercent}%{' '}
                      <small>(-{activeMission.batteryConsumedPercent}%)</small>
                    </strong>
                    <span className="sub">
                      Hiệu suất: {activeMission.energyEfficiencyWhPerKm} Wh/km
                    </span>
                  </div>

                  <div className="s8-audit-stat">
                    <span className="label">
                      <Compass size={14} /> Sai số Quỹ đạo RTK (Haversine Δd)
                    </span>
                    <strong>
                      ±{activeMission.avgGpsDriftMeters}m{' '}
                      <small>(Max: {activeMission.maxGpsDriftMeters}m)</small>
                    </strong>
                    <span className="sub">
                      Chuẩn RTK nông nghiệp chính xác (&lt; 1.5m)
                    </span>
                  </div>

                  <div className="s8-audit-stat">
                    <span className="label">
                      <MapPin size={14} /> Tiến độ Điểm bay Waypoints
                    </span>
                    <strong>
                      {activeMission.completedWaypoints}/{activeMission.totalWaypoints}{' '}
                      điểm
                    </strong>
                    <span className="sub">
                      Điểm lỗi thu thập: {activeMission.errorWaypoints} điểm
                    </span>
                  </div>

                  <div className="s8-audit-stat">
                    <span className="label">
                      <Database size={14} /> Gói tin Cảm biến &amp; Đa phổ
                    </span>
                    <strong>{activeMission.totalSensorPackets} packets</strong>
                    <span className="sub">
                      RSSI TB: {activeMission.averageRssiDbm} dBm · Trễ:{' '}
                      {activeMission.averageLatencyMs}ms
                    </span>
                  </div>

                  <div className="s8-audit-stat">
                    <span className="label">
                      <History size={14} /> Thời lượng Chuyến bay
                    </span>
                    <strong>
                      {activeMission.actualDurationMin} phút{' '}
                      <small>(KH: {activeMission.plannedDurationMin}p)</small>
                    </strong>
                    <span className="sub">
                      {new Date(activeMission.startedAt).toLocaleTimeString('vi-VN')} →{' '}
                      {new Date(activeMission.completedAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </div>

                {/* 3. BẢN ĐỒ ĐỐI SOÁT QUỸ ĐẠO (PLANNED VS ACTUAL TRAJECTORY REPLAY) */}
                <div className="s8-trajectory-replay-box">
                  <div className="s8-traj-header">
                    <div>
                      <h4>
                        Biểu đồ Đối soát Quỹ đạo Điểm bay &amp; Sai số Haversine (Planned vs
                        Actual Trajectory Replay)
                      </h4>
                      <p>
                        Chọn từng điểm bay (WP-1 → WP-{activeMission.totalWaypoints}) để
                        kiểm tra độ lệch tọa độ thực tế và gói tin thu thập.
                      </p>
                    </div>
                    <div className="s8-traj-legend">
                      <span className="leg-planned">--- Quỹ đạo Thiết kế</span>
                      <span className="leg-actual">─── Quỹ đạo Thực bay RTK</span>
                    </div>
                  </div>

                  <div className="s8-traj-content">
                    <div className="s8-traj-svg-wrap">
                      <svg
                        viewBox="0 0 420 220"
                        className="s8-traj-svg"
                        aria-label="Bản đồ đối soát quỹ đạo Waypoint"
                      >
                        {/* Lưới tọa độ nền */}
                        <line x1="30" y1="40" x2="390" y2="40" stroke="rgba(148,163,184,0.12)" />
                        <line x1="30" y1="110" x2="390" y2="110" stroke="rgba(148,163,184,0.12)" />
                        <line x1="30" y1="180" x2="390" y2="180" stroke="rgba(148,163,184,0.12)" />

                        {/* Đường thiết kế (Planned Path) */}
                        {trajectorySvgPoints.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="2"
                            strokeDasharray="5 4"
                            points={trajectorySvgPoints
                              .map((p) => `${p.px},${p.py}`)
                              .join(' ')}
                          />
                        )}

                        {/* Đường thực tế (Actual Path) */}
                        {trajectorySvgPoints.length > 1 && (
                          <polyline
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2.5"
                            points={trajectorySvgPoints
                              .map((p) => `${p.ax},${p.ay}`)
                              .join(' ')}
                          />
                        )}

                        {/* Các nút Waypoint */}
                        {trajectorySvgPoints.map((pt) => {
                          const isCurrent = pt.idx === selectedWaypointIndex;
                          const isError = pt.executionStatus === 'SKIPPED_ERROR';
                          const nodeColor = isError
                            ? '#ef4444'
                            : pt.executionStatus === 'ACTIVE'
                              ? '#f59e0b'
                              : '#22c55e';

                          return (
                            <g
                              key={pt.waypointId}
                              className="s8-wp-svg-node"
                              onClick={() =>
                                dispatch(setSelectedWaypointIndex(pt.idx))
                              }
                            >
                              {isCurrent && (
                                <circle
                                  cx={pt.ax}
                                  cy={pt.ay}
                                  r={13}
                                  fill="none"
                                  stroke="#38bdf8"
                                  strokeWidth="2"
                                />
                              )}
                              <circle
                                cx={pt.px}
                                cy={pt.py}
                                r={4}
                                fill="#0f172a"
                                stroke="#38bdf8"
                                strokeWidth="1.5"
                              />
                              <circle
                                cx={pt.ax}
                                cy={pt.ay}
                                r={7}
                                fill={nodeColor}
                                stroke="#0f172a"
                                strokeWidth="1.5"
                              />
                              <text
                                x={pt.ax}
                                y={pt.ay - 11}
                                textAnchor="middle"
                                fill="#e2e8f0"
                                fontSize="10"
                                fontWeight="700"
                              >
                                WP-{pt.sequenceNumber} (±{pt.gpsDriftMeters}m)
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {/* Thanh chọn Waypoint Replay */}
                      <div className="s8-wp-step-buttons">
                        {activeMission.waypointAudits.map((wp, idx) => (
                          <button
                            key={wp.waypointId}
                            type="button"
                            className={`s8-wp-step-btn ${selectedWaypointIndex === idx ? 'active' : ''} ${wp.executionStatus === 'SKIPPED_ERROR' ? 'err' : ''}`}
                            onClick={() => dispatch(setSelectedWaypointIndex(idx))}
                          >
                            WP-{wp.sequenceNumber}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hộp thông tin chi tiết của Waypoint đang chọn */}
                    {selectedWaypointAudit && (
                      <div className="s8-wp-inspector-card">
                        <div className="s8-wpi-head">
                          <strong>{selectedWaypointAudit.label}</strong>
                          <span
                            className={`s8-wpi-status ${selectedWaypointAudit.executionStatus.toLowerCase()}`}
                          >
                            {selectedWaypointAudit.executionStatus}
                          </span>
                        </div>
                        <div className="s8-wpi-metrics">
                          <div>
                            <span>Tọa độ Kế hoạch:</span>
                            <code>
                              {selectedWaypointAudit.plannedLat.toFixed(6)},{' '}
                              {selectedWaypointAudit.plannedLng.toFixed(6)}
                            </code>
                          </div>
                          <div>
                            <span>Tọa độ Thực bay:</span>
                            <code>
                              {selectedWaypointAudit.actualLat.toFixed(6)},{' '}
                              {selectedWaypointAudit.actualLng.toFixed(6)}
                            </code>
                          </div>
                          <div>
                            <span>Độ lệch Haversine (Δd):</span>
                            <strong>±{selectedWaypointAudit.gpsDriftMeters} mét</strong>
                          </div>
                          <div>
                            <span>Độ cao AGL (Thực / KH):</span>
                            <strong>
                              {selectedWaypointAudit.actualAltitudeM}m /{' '}
                              {selectedWaypointAudit.plannedAltitudeM}m
                            </strong>
                          </div>
                          <div>
                            <span>Gói tin Cảm biến / Rớt gói:</span>
                            <strong>
                              {selectedWaypointAudit.sensorPacketsCollected} gói (Loss:{' '}
                              {selectedWaypointAudit.packetLossPercent}%)
                            </strong>
                          </div>
                          <div>
                            <span>Pin &amp; Tín hiệu tại WP:</span>
                            <strong>
                              Pin {selectedWaypointAudit.batteryAtWaypointPercent}% ·{' '}
                              {selectedWaypointAudit.signalRssiDbm} dBm
                            </strong>
                          </div>
                        </div>
                        <p className="s8-wpi-action">
                          <strong>Tác vụ:</strong> {selectedWaypointAudit.actionRequired}
                        </p>
                        <p className="s8-wpi-remark">
                          <strong>Kết luận kiểm định WP:</strong>{' '}
                          {selectedWaypointAudit.auditRemark}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. BẢNG ĐỐI SOÁT TOÀN BỘ WAYPOINTS */}
                <div className="s8-wp-audit-table-box">
                  <h4>Bảng Đối soát Chi tiết Từng Điểm bay Waypoint ({activeMission.waypointAudits.length} điểm)</h4>
                  <div className="s8-table-scroll">
                    <table className="s8-data-table compact">
                      <thead>
                        <tr>
                          <th>Điểm bay</th>
                          <th>Tọa độ Thực tế</th>
                          <th>Sai số Δd</th>
                          <th>Độ cao (Thực/KH)</th>
                          <th>Tốc độ</th>
                          <th>Gói tin (Loss%)</th>
                          <th>% Pin</th>
                          <th>Trạng thái</th>
                          <th>Nhận xét Kiểm định</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMission.waypointAudits.map((wp, idx) => (
                          <tr
                            key={wp.waypointId}
                            className={selectedWaypointIndex === idx ? 'wp-active-row' : ''}
                            onClick={() => dispatch(setSelectedWaypointIndex(idx))}
                            style={{ cursor: 'pointer' }}
                          >
                            <td>
                              <strong>WP-{wp.sequenceNumber}</strong>
                            </td>
                            <td>
                              <code>
                                {wp.actualLat.toFixed(4)}, {wp.actualLng.toFixed(4)}
                              </code>
                            </td>
                            <td>
                              <strong>±{wp.gpsDriftMeters}m</strong>
                            </td>
                            <td>
                              {wp.actualAltitudeM}m / {wp.plannedAltitudeM}m
                            </td>
                            <td>{wp.actualSpeedMS} m/s</td>
                            <td>
                              {wp.sensorPacketsCollected} ({wp.packetLossPercent}%)
                            </td>
                            <td>{wp.batteryAtWaypointPercent}%</td>
                            <td>
                              <span
                                className={`s8-status-chip ${wp.executionStatus === 'SKIPPED_ERROR' ? 'critical' : wp.executionStatus === 'ACTIVE' ? 'warning' : 'normal'}`}
                              >
                                {wp.executionStatus}
                              </span>
                            </td>
                            <td>{wp.auditRemark}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 5. TỔNG HỢP NOTE MISSION THỦ CÔNG (ĐỒNG BỘ TỪ F16 - LTJ-34) */}
                <div className="s8-notes-correlation-box">
                  <h4>
                    Biên bản Ghi chú Hiện trường &amp; Snapshot Telemetry Đính kèm (F16 →
                    F17 · {activeMission.fieldNotesSummary.length} ghi chú)
                  </h4>
                  <div className="s8-notes-grid">
                    {activeMission.fieldNotesSummary.map((note) => (
                      <article
                        key={note.id}
                        className={`s8-note-audit-card sev-${note.severity.toLowerCase()}`}
                      >
                        <div className="s8-nac-top">
                          <strong>{note.title}</strong>
                          <span className="s8-nac-sev">{note.severity}</span>
                        </div>
                        <p>{note.content}</p>
                        <div className="s8-nac-meta">
                          <span>
                            <MapPin size={12} /> GPS Snapshot: <code>{note.gpsSnapshot}</code>
                          </span>
                          <span>
                            Pin lúc ghi: <strong>{note.batterySnapshotPercent ?? '--'}%</strong>
                          </span>
                          <span>Người ghi: {note.authorName}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {/* 6. HỘI ĐỒNG CHẤM ĐIỂM 5 TIÊU CHÍ & KÝ DUYỆT NGHIỆM THU (F17) */}
                <MissionSignOffPanel
                  key={activeMission.missionId}
                  mission={activeMission}
                  submitting={submittingReview}
                  onSubmitSignOff={(
                    decision,
                    rubric,
                    reviewerName,
                    reviewerRole,
                    summaryNote,
                    correctivePlan
                  ) => {
                    dispatch(
                      submitMissionReviewSignOff({
                        missionId: activeMission.missionId,
                        reviewDecision: decision,
                        rubricScores: rubric,
                        reviewerName,
                        reviewerRole,
                        reviewSummaryNote: summaryNote,
                        correctiveActionPlan: correctivePlan,
                      })
                    );
                  }}
                  onExportThisMissionExcel={() => {
                    dispatch(setExportDatasetType('MISSION_FLIGHT_NOTES'));
                    dispatch(
                      triggerDatasetFileExport({
                        datasetType: 'MISSION_FLIGHT_NOTES',
                        fileFormat: 'XLSX',
                        missionIdFilter: activeMission.missionId,
                        customFileNamePrefix: `NghiemThu_${activeMission.missionCode}`,
                      })
                    );
                  }}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default ExcelExportMissionReview;
