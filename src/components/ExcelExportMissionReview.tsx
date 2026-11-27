import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
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
  setExportDatasetType,
  setExportFileFormat,
  setExportTimeRange,
  setExportZoneFilter,
  setSelectedMissionId,
  submitMissionReviewSignOff,
  triggerDatasetFileExport,
} from '../store/slices/missionReviewExportSlice';
import {
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

// ==================== FORM KÝ DUYỆT GỌN GÀNG ====================

interface SimpleSignOffProps {
  mission: MissionReviewRecord;
  submitting: boolean;
  onSubmit: (
    decision: MissionReviewDecision,
    rubric: MissionReviewRubricScores,
    summaryNote: string,
  ) => void;
  onExportMission: () => void;
}

const SimpleSignOffCard: React.FC<SimpleSignOffProps> = ({
  mission,
  submitting,
  onSubmit,
  onExportMission,
}) => {
  const [rubric, setRubric] = useState<MissionReviewRubricScores>({
    ...mission.rubricScores,
  });
  const [summaryNote, setSummaryNote] = useState(mission.reviewSummaryNote);

  const liveScore = useMemo(
    () => calculateOverallMissionScore(rubric, mission.errorWaypoints),
    [rubric, mission.errorWaypoints],
  );
  const liveGrade = useMemo(() => determineQualityGrade(liveScore), [liveScore]);

  const sliders: { key: keyof MissionReviewRubricScores; label: string }[] = [
    { key: 'flightPathAccuracy', label: 'Độ chính xác đường bay' },
    { key: 'sensorDataCompleteness', label: 'Dữ liệu thu thập đầy đủ' },
    { key: 'safetyCompliance', label: 'An toàn bay & mức Pin' },
  ];

  return (
    <div className="mr-clean-card mr-signoff-box">
      <div className="mr-card-head">
        <div>
          <h3>Đánh giá &amp; Ký duyệt Kết quả</h3>
          <p>Chấm điểm nhanh và xác nhận nghiệm thu chuyến bay</p>
        </div>
        <div className={`mr-score-pill grade-${liveGrade.toLowerCase()}`}>
          <strong>{liveScore}/100</strong>
          <span>Hạng {liveGrade}</span>
        </div>
      </div>

      <div className="mr-sliders-list">
        {sliders.map((s) => (
          <div className="mr-slider-item" key={s.key}>
            <div className="mr-slider-label">
              <span>{s.label}</span>
              <strong>{rubric[s.key]}/100</strong>
            </div>
            <input
              type="range"
              min={20}
              max={100}
              value={rubric[s.key]}
              onChange={(e) => {
                const v = Number(e.target.value);
                setRubric((prev) => ({
                  ...prev,
                  [s.key]: v,
                  ...(s.key === 'safetyCompliance'
                    ? { batteryEfficiencyRating: v }
                    : {}),
                  ...(s.key === 'sensorDataCompleteness'
                    ? { commLinkStability: v }
                    : {}),
                }));
              }}
            />
          </div>
        ))}
      </div>

      <div className="mr-field">
        <label htmlFor="mr-summary-note">Nhận xét kết luận</label>
        <textarea
          id="mr-summary-note"
          rows={3}
          value={summaryNote}
          onChange={(e) => setSummaryNote(e.target.value)}
          placeholder="Nhập nhận xét ngắn gọn sau chuyến bay (VD: Đường bay ổn định, đủ dữ liệu)..."
        />
      </div>

      <div className="mr-action-stack">
        <div className="mr-decision-btns">
          <button
            type="button"
            className="mr-btn btn-approve"
            disabled={submitting}
            onClick={() => onSubmit('APPROVED', rubric, summaryNote)}
          >
            <CheckCircle2 size={16} />
            <span>Duyệt Đạt chuẩn</span>
          </button>

          <button
            type="button"
            className="mr-btn btn-reflight"
            disabled={submitting}
            onClick={() => onSubmit('NEEDS_REFLIGHT', rubric, summaryNote)}
          >
            <XCircle size={16} />
            <span>Yêu cầu Bay lại</span>
          </button>
        </div>

        <button
          type="button"
          className="mr-btn btn-green"
          onClick={onExportMission}
        >
          <FileSpreadsheet size={16} />
          <span>Tải bảng Excel riêng của {mission.uavId} (.xls)</span>
        </button>
      </div>
    </div>
  );
};

// ==================== DANH MỤC LOẠI BÁO CÁO ĐƠN GIẢN ====================

const SIMPLE_DATASETS: {
  id: ExportDatasetType;
  title: string;
  desc: string;
}[] = [
  {
    id: 'FULL_WORKBOOK',
    title: 'Tổng hợp Tất cả (5 Sheet)',
    desc: 'Gồm đủ Cảm biến, Cảnh báo, Đồng bộ UAV & Chuyến bay trong 1 file',
  },
  {
    id: 'SENSOR_TELEMETRY',
    title: 'Dữ liệu Cảm biến',
    desc: 'Nhiệt độ, độ ẩm không khí, độ ẩm đất và ánh sáng các khu',
  },
  {
    id: 'ALERT_REPORT',
    title: 'Lịch sử Cảnh báo',
    desc: 'Danh sách cảnh báo vượt ngưỡng và trạng thái xử lý',
  },
  {
    id: 'UAV_OFFLINE_SYNC',
    title: 'Đồng bộ Offline UAV',
    desc: 'Các phiên đồng bộ dữ liệu SQLite khi UAV mất sóng',
  },
  {
    id: 'MISSION_FLIGHT_NOTES',
    title: 'Chuyến bay & Ghi chú',
    desc: 'Tiến độ các điểm bay Waypoints và sổ nhật ký thực địa',
  },
];

const SIMPLE_STATUS_LABELS: Record<string, string> = {
  FLYING: 'Đang bay',
  RETURNING: 'Đang về trạm',
  COMPLETED: 'Đã hoàn thành',
  STANDBY: 'Chờ lệnh',
  COLLECTION_ERROR: 'Có lỗi thu thập',
};

// ==================== COMPONENT CHÍNH ====================

const ExcelExportMissionReview: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const {
    exportConfig,
    loading,
    exporting,
    submittingReview,
    statusBanner,
  } = useSelector((state: RootState) => state.missionReviewExport);

  const reviews = useSelector(selectFilteredMissionReviews);
  const activeMission = useSelector(selectActiveMissionReview);
  const filteredExportRows = useSelector(selectFilteredExportRows);

  const [activeTab, setActiveTab] = useState<'REVIEW' | 'EXPORT'>('REVIEW');

  useEffect(() => {
    dispatch(initializeMissionReviewExportData());
  }, [dispatch]);

  const handleExportFormat = (format: ExportFileFormat) => {
    if (filteredExportRows.length === 0) return;
    dispatch(setExportFileFormat(format));
    dispatch(triggerDatasetFileExport({ fileFormat: format }));
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="mr-simple-loading">
        Đang tải kết quả chuyến bay và dữ liệu báo cáo...
      </div>
    );
  }

  return (
    <div className="mr-clean-page">
      {/* 1. THANH CHUYỂN CHẾ ĐỘ GỌN GÀNG (2 TAB RÕ RÀNG) */}
      <div className="mr-clean-topbar">
        <div className="mr-tab-pills">
          <button
            type="button"
            className={`mr-tab-btn ${activeTab === 'REVIEW' ? 'active' : ''}`}
            onClick={() => setActiveTab('REVIEW')}
          >
            <ClipboardCheck size={17} />
            <span>1. Xem Kết quả &amp; Duyệt Chuyến bay</span>
          </button>

          <button
            type="button"
            className={`mr-tab-btn ${activeTab === 'EXPORT' ? 'active' : ''}`}
            onClick={() => setActiveTab('EXPORT')}
          >
            <FileSpreadsheet size={17} />
            <span>2. Xuất Báo cáo Excel ({filteredExportRows.length} dòng)</span>
          </button>
        </div>

        <div className="mr-top-actions">
          <button
            type="button"
            className="mr-btn btn-green"
            disabled={exporting || filteredExportRows.length === 0}
            onClick={() =>
              dispatch(
                triggerDatasetFileExport({
                  datasetType: 'FULL_WORKBOOK',
                  fileFormat: 'XLSX',
                }),
              )
            }
          >
            <Download size={16} />
            <span>{exporting ? 'Đang tải...' : 'Tải nhanh Excel Tổng hợp (.xls)'}</span>
          </button>

          <button
            type="button"
            className="mr-btn btn-outline"
            onClick={() => dispatch(resetMissionReviewDemoData())}
          >
            <RotateCcw size={15} />
            <span>Khôi phục mẫu</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO THAO TÁC */}
      {statusBanner && (
        <div className="mr-clean-toast">
          <span>{statusBanner.text}</span>
          <button type="button" onClick={() => dispatch(clearStatusBanner())}>
            Đóng
          </button>
        </div>
      )}

      {/* BANNER THÔNG BÁO CHUYẾN BAY ĐÃ HOÀN THÀNH SẴN SÀNG TẢI DỮ LIỆU */}
      {activeMission && activeMission.operationalState === 'COMPLETED' && (
        <div className="mr-completed-alert-banner">
          <div>
            <strong>
              ✓ Chuyến bay của {activeMission.uavId} (&ldquo;{activeMission.missionTitle}&rdquo;) đã
              bay xong {activeMission.completedWaypoints}/{activeMission.totalWaypoints} điểm!
            </strong>
            <p>
              Pin cuối chuyến: {activeMission.endBatteryPercent}% • Toàn bộ tọa độ các điểm đã đi
              qua và ghi chú đã sẵn sàng để tải về máy.
            </p>
          </div>

          <button
            type="button"
            className="mr-btn btn-green"
            disabled={exporting}
            onClick={() =>
              dispatch(
                triggerDatasetFileExport({
                  datasetType: 'MISSION_FLIGHT_NOTES',
                  missionIdFilter: activeMission.missionId,
                  customFileNamePrefix: `BaoCao_ChuyenBay_${activeMission.uavId}`,
                  fileFormat: 'XLSX',
                }),
              )
            }
          >
            <Download size={16} />
            <span>Tải ngay Bảng Dữ liệu của {activeMission.uavId} (.xls)</span>
          </button>
        </div>
      )}

      {/* ==================== TAB 1: KẾT QUẢ CHUYẾN BAY SAU KHI HẠ CÁNH ==================== */}
      {activeTab === 'REVIEW' ? (
        <>
          {/* Hàng chọn chuyến bay theo từng UAV */}
          <div className="mr-mission-selector">
            {reviews.map((rev) => {
              const isSelected = activeMission?.missionId === rev.missionId;
              const decMeta = MISSION_REVIEW_DECISION_META[rev.reviewDecision];
              return (
                <button
                  key={rev.missionId}
                  type="button"
                  className={`mr-mission-pill ${isSelected ? 'active' : ''}`}
                  onClick={() => dispatch(setSelectedMissionId(rev.missionId))}
                >
                  <div className="mr-mp-top">
                    <strong>{rev.uavId}</strong>
                    <span
                      className={`mr-decision-tag ${
                        rev.operationalState === 'COMPLETED' &&
                        rev.reviewDecision === 'PENDING_REVIEW'
                          ? 'dec-approved'
                          : `dec-${rev.reviewDecision.toLowerCase()}`
                      }`}
                    >
                      {rev.operationalState === 'COMPLETED' &&
                      rev.reviewDecision === 'PENDING_REVIEW'
                        ? '✓ Vừa bay xong'
                        : decMeta.label}
                    </span>
                  </div>
                  <div className="mr-mp-title">{rev.missionTitle}</div>
                  <div className="mr-mp-sub">
                    <span>
                      Điểm bay: {rev.completedWaypoints}/{rev.totalWaypoints}
                    </span>
                    <strong>{rev.overallScore}/100 đ</strong>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nội dung chi tiết của chuyến bay đang chọn */}
          {activeMission && (
            <div className="mr-review-grid">
              {/* Cột trái: Thông tin tóm tắt chuyến bay, các điểm đã qua & ghi chú */}
              <div className="mr-clean-card mr-summary-col">
                <div className="mr-card-head">
                  <div>
                    <h3>
                      {activeMission.uavName} — {activeMission.missionTitle}
                    </h3>
                    <p>
                      Khu vực: <strong>{activeMission.zoneName}</strong> • Trạng thái:{' '}
                      <strong>
                        {SIMPLE_STATUS_LABELS[activeMission.operationalState] ??
                          activeMission.operationalState}
                      </strong>
                    </p>
                  </div>
                  <span className="mr-code-badge">{activeMission.missionCode}</span>
                </div>

                {/* 4 ô kết quả to, dễ nhìn */}
                <div className="mr-stat-boxes">
                  <div className="mr-stat-box">
                    <span>Điểm đã hoàn thành</span>
                    <strong>
                      {activeMission.completedWaypoints}/{activeMission.totalWaypoints} điểm
                    </strong>
                  </div>
                  <div className="mr-stat-box">
                    <span>Quãng đường bay</span>
                    <strong>{activeMission.plannedDistanceM} m</strong>
                  </div>
                  <div className="mr-stat-box">
                    <span>Pin cuối chuyến</span>
                    <strong>{activeMission.endBatteryPercent}%</strong>
                  </div>
                  <div className="mr-stat-box">
                    <span>Thời gian bay</span>
                    <strong>{activeMission.plannedDurationMin} phút</strong>
                  </div>
                </div>

                {/* Bảng gọn các điểm Waypoint đã đi qua */}
                <div className="mr-sub-section">
                  <h4>Chi tiết các điểm bay trên lộ trình ({activeMission.waypointAudits.length} điểm)</h4>
                  <div className="mr-table-wrap">
                    <table className="mr-simple-table">
                      <thead>
                        <tr>
                          <th>Điểm</th>
                          <th>Tọa độ GPS</th>
                          <th>Độ cao</th>
                          <th>Tốc độ</th>
                          <th>Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeMission.waypointAudits.map((wp) => (
                          <tr key={wp.waypointId}>
                            <td>
                              <strong>Điểm #{wp.sequenceNumber}</strong>
                            </td>
                            <td>
                              {wp.actualLat.toFixed(4)}, {wp.actualLng.toFixed(4)}
                            </td>
                            <td>{wp.actualAltitudeM} m</td>
                            <td>{wp.actualSpeedMS} m/s</td>
                            <td>
                              <span
                                className={`mr-wp-badge ${
                                  wp.executionStatus === 'SKIPPED_ERROR'
                                    ? 'err'
                                    : wp.executionStatus === 'REACHED'
                                      ? 'ok'
                                      : 'wait'
                                }`}
                              >
                                {wp.executionStatus === 'REACHED'
                                  ? 'Đã bay qua'
                                  : wp.executionStatus === 'SKIPPED_ERROR'
                                    ? 'Lỗi thu thập'
                                    : 'Đang chờ'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Ghi chú thực địa thu nhận từ trang Giám sát */}
                <div className="mr-sub-section">
                  <h4>
                    Ghi chú thực địa trong chuyến bay ({activeMission.fieldNotesSummary.length})
                  </h4>
                  {activeMission.fieldNotesSummary.length === 0 ? (
                    <div className="mr-empty-box">
                      Chuyến bay này không có ghi chú sự cố nào.
                    </div>
                  ) : (
                    <div className="mr-notes-stack">
                      {activeMission.fieldNotesSummary.map((note) => (
                        <div key={note.id} className="mr-note-row">
                          <div>
                            <strong>{note.title}</strong>
                            <p>{note.content}</p>
                          </div>
                          <span className="mr-note-pin">
                            Pin lúc ghi: {note.batterySnapshotPercent ?? '--'}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cột phải: Chấm điểm & Phê duyệt */}
              <SimpleSignOffCard
                key={activeMission.missionId}
                mission={activeMission}
                submitting={submittingReview}
                onSubmit={(decision, rubric, summaryNote) => {
                  dispatch(
                    submitMissionReviewSignOff({
                      missionId: activeMission.missionId,
                      reviewDecision: decision,
                      rubricScores: rubric,
                      reviewerName: activeMission.reviewerName || 'Quản trị viên',
                      reviewerRole: activeMission.reviewerRole || 'Người kiểm duyệt',
                      reviewSummaryNote: summaryNote,
                      correctiveActionPlan: activeMission.correctiveActionPlan,
                    }),
                  );
                }}
                onExportMission={() =>
                  dispatch(
                    triggerDatasetFileExport({
                      datasetType: 'MISSION_FLIGHT_NOTES',
                      missionIdFilter: activeMission.missionId,
                      customFileNamePrefix: `BaoCao_ChuyenBay_${activeMission.uavId}`,
                      fileFormat: 'XLSX',
                    }),
                  )
                }
              />
            </div>
          )}
        </>
      ) : (
        /* ==================== TAB 2: XUẤT BÁO CÁO EXCEL ĐƠN GIẢN ==================== */
        <div className="mr-clean-card mr-export-panel">
          <div className="mr-card-head">
            <div>
              <h3>Chọn Loại Báo cáo Muốn Tải Về Máy</h3>
              <p>Chọn 1 trong 5 bộ dữ liệu bên dưới rồi nhấn nút Tải Excel</p>
            </div>
          </div>

          {/* 5 thẻ chọn loại dữ liệu dễ hiểu */}
          <div className="mr-dataset-cards">
            {SIMPLE_DATASETS.map((ds) => {
              const active = exportConfig.datasetType === ds.id;
              return (
                <button
                  key={ds.id}
                  type="button"
                  className={`mr-ds-card ${active ? 'active' : ''}`}
                  onClick={() => dispatch(setExportDatasetType(ds.id))}
                >
                  <strong>{ds.title}</strong>
                  <span>{ds.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Hàng lọc đơn giản + Nút tải xuống */}
          <div className="mr-export-toolbar">
            <div className="mr-filter-pair">
              <div className="mr-field">
                <label htmlFor="mr-zone-sel">Khu vực</label>
                <select
                  id="mr-zone-sel"
                  value={exportConfig.zoneFilter}
                  onChange={(e) => dispatch(setExportZoneFilter(e.target.value))}
                >
                  <option value="ALL">Tất cả khu vực</option>
                  <option value="ZONE-A">Khu vực A</option>
                  <option value="ZONE-B">Khu vực B</option>
                  <option value="ZONE-C">Khu vực C</option>
                </select>
              </div>

              <div className="mr-field">
                <label htmlFor="mr-time-sel">Khoảng thời gian</label>
                <select
                  id="mr-time-sel"
                  value={exportConfig.timeRange}
                  onChange={(e) =>
                    dispatch(setExportTimeRange(e.target.value as ExportTimeRange))
                  }
                >
                  <option value="ALL">Toàn bộ thời gian</option>
                  <option value="24H">24 giờ qua</option>
                  <option value="7D">7 ngày qua</option>
                  <option value="30D">30 ngày qua</option>
                </select>
              </div>
            </div>

            <div className="mr-download-btns">
              <button
                type="button"
                className="mr-btn btn-green"
                disabled={exporting || filteredExportRows.length === 0}
                onClick={() => handleExportFormat('XLSX')}
              >
                <FileSpreadsheet size={16} />
                <span>Tải Excel (.xls)</span>
              </button>

              <button
                type="button"
                className="mr-btn btn-outline"
                disabled={exporting || filteredExportRows.length === 0}
                onClick={() => handleExportFormat('CSV')}
              >
                <FileText size={16} />
                <span>Tải CSV</span>
              </button>

              <button
                type="button"
                className="mr-btn btn-outline"
                disabled={exporting || filteredExportRows.length === 0}
                onClick={() => handleExportFormat('HTML_PRINT')}
              >
                <Printer size={16} />
                <span>Bản In / PDF</span>
              </button>
            </div>
          </div>

          {/* Bảng xem trước gọn gàng */}
          <div className="mr-sub-section">
            <h4>Xem trước dữ liệu sẽ xuất ({filteredExportRows.length} dòng)</h4>
            <div className="mr-table-wrap">
              <table className="mr-simple-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Khu vực</th>
                    <th>Thiết bị</th>
                    <th>Hạng mục</th>
                    <th>Thông số chính</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExportRows.slice(0, 12).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.id}</strong>
                      </td>
                      <td>{row.zoneName}</td>
                      <td>{row.sourceCode}</td>
                      <td>{row.categoryLabel}</td>
                      <td>{row.primaryMetric}</td>
                      <td>{row.statusLabel}</td>
                    </tr>
                  ))}
                  {filteredExportRows.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>
                        Không có dòng dữ liệu nào khớp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelExportMissionReview;
