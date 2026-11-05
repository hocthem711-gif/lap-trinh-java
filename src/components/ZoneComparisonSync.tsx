/**
 * ZoneComparisonSync — Giao diện So sánh 2 Zone (F07) & Lịch sử Đồng bộ UAV
 * Task: LTJ-24 - Sprint 5
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Gồm 2 phân hệ chính:
 * 1. Biểu đồ So sánh 2 Khu vực (Zone A vs Zone B):
 *    - Hỗ trợ 5 chỉ số môi trường (Nhiệt độ, Độ ẩm KK, Độ ẩm đất, Ánh sáng, CO₂)
 *    - Hỗ trợ 3 khung thời gian (24 giờ, 7 ngày, 30 ngày)
 *    - Chuyển đổi linh hoạt Biểu đồ Đường (Line) & Biểu đồ Cột (Bar)
 *    - Thẻ thống kê đối chiếu (Avg / Min / Max / Delta chênh lệch)
 * 2. Bảng Lịch sử Đồng bộ Dữ liệu Offline UAV (SQLite Local → MQTT Bulk):
 *    - Khớp luồng 3 topic MQTT của Dev 5 (LTJ-25): Handshake → Bulk (10 bản ghi/lô) → Complete
 *    - Cho phép lọc, tìm kiếm, giả lập phiên đồng bộ mới, đồng bộ lại phiên gián đoạn (Retry)
 *    - Modal xem chi tiết từng lô dữ liệu cảm biến & JSON Bulk Payload
 */

import { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  ChartColumn,
  ChartLine,
  ArrowLeftRight,
  CloudUpload,
  Database,
  RefreshCw,
  Zap,
  Eye,
  X,
  Copy,
  CircleCheck,
  TriangleAlert,
  Clock,
  Plane,
  Search,
  Layers,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  WifiOff,
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store';
import {
  initAnalyticsMetadata,
  loadComparisonSeries,
  loadUavSyncSessions,
  setZoneAId,
  setZoneBId,
  swapZones,
  setComparisonMetric,
  setTimeRange,
  setChartMode,
  setSyncFilterUav,
  setSyncFilterStatus,
  setSyncFilterSearch,
  resetSyncFilter,
  selectSyncSession,
  retrySyncSession,
  simulateNewSyncSession,
  selectFilteredSyncSessions,
  selectSyncStats,
  selectSelectedSyncSession,
} from '../store/slices/analyticsSlice';
import {
  METRIC_CONFIG,
  TIME_RANGE_LABELS,
  SYNC_STATUS_LABELS,
  SYNC_TOPICS,
  type ComparisonMetric,
  type TimeRangePreset,
  type SyncStatus,
  type UavSyncSession,
} from '../types/analytics';
import { buildBulkPayload, formatDuration, roundTo } from '../services/analyticsService';
import './ZoneComparisonSync.css';

// Đăng ký đầy đủ cả LineElement và BarElement cho Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
);

export default function ZoneComparisonSync() {
  const dispatch = useDispatch<AppDispatch>();
  const {
    zones,
    uavs,
    zoneAId,
    zoneBId,
    metric,
    timeRange,
    chartMode,
    seriesA,
    seriesB,
    loadingSeries,
    syncFilter,
  } = useSelector((state: RootState) => state.analytics);

  const filteredSessions = useSelector(selectFilteredSyncSessions);
  const syncStats = useSelector(selectSyncStats);
  const selectedSession = useSelector(selectSelectedSyncSession);

  const [simToast, setSimToast] = useState<string | null>(null);

  // Khởi tạo danh sách Zone/UAV và tải dữ liệu lần đầu
  useEffect(() => {
    dispatch(initAnalyticsMetadata()).then(() => {
      dispatch(loadComparisonSeries());
      dispatch(loadUavSyncSessions());
    });
  }, [dispatch]);

  // Tự động tải lại chuỗi thời gian khi đổi Zone A, Zone B, Chỉ số hoặc Khung thời gian
  useEffect(() => {
    dispatch(loadComparisonSeries());
  }, [dispatch, zoneAId, zoneBId, metric, timeRange]);

  const metricCfg = METRIC_CONFIG[metric];
  const zoneAName = zones.find(z => z.id === zoneAId)?.name ?? seriesA.zoneName;
  const zoneBName = zones.find(z => z.id === zoneBId)?.name ?? seriesB.zoneName;

  // Tính toán độ lệch Delta (Zone A - Zone B)
  const deltaAvg = roundTo(seriesA.stats.avg - seriesB.stats.avg, metricCfg.decimals);
  const deltaMax = roundTo(seriesA.stats.max - seriesB.stats.max, metricCfg.decimals);
  const deltaMin = roundTo(seriesA.stats.min - seriesB.stats.min, metricCfg.decimals);
  const deltaPct = seriesB.stats.avg > 0
    ? roundTo(((seriesA.stats.avg - seriesB.stats.avg) / seriesB.stats.avg) * 100, 1)
    : 0;

  // Cấu hình dữ liệu cho Chart.js
  const chartData = useMemo(() => {
    const labels = seriesA.points.map(p => p.label);
    return {
      labels,
      datasets: [
        {
          label: zoneAName,
          data: seriesA.points.map(p => p.value),
          borderColor: '#6366f1',
          backgroundColor: chartMode === 'bar' ? 'rgba(99, 102, 241, 0.72)' : 'rgba(99, 102, 241, 0.14)',
          borderWidth: 2.5,
          fill: chartMode === 'line',
          tension: 0.35,
          pointRadius: timeRange === '30D' ? 2.5 : 3.5,
          pointHoverRadius: 6,
          borderRadius: chartMode === 'bar' ? 6 : 0,
        },
        {
          label: zoneBName,
          data: seriesB.points.map(p => p.value),
          borderColor: '#10b981',
          backgroundColor: chartMode === 'bar' ? 'rgba(16, 185, 129, 0.72)' : 'rgba(16, 185, 129, 0.12)',
          borderWidth: 2.5,
          fill: chartMode === 'line',
          tension: 0.35,
          pointRadius: timeRange === '30D' ? 2.5 : 3.5,
          pointHoverRadius: 6,
          borderRadius: chartMode === 'bar' ? 6 : 0,
        },
      ],
    };
  }, [seriesA, seriesB, zoneAName, zoneBName, chartMode, timeRange]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          padding: 18,
          font: { size: 12, weight: 600 as const },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.94)',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(99, 102, 241, 0.35)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const val = ctx.parsed.y;
            if (val === null || val === undefined) return `${ctx.dataset.label}: Không có số đo`;
            return `${ctx.dataset.label}: ${val.toLocaleString('vi-VN')} ${metricCfg.unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 11 },
          callback: (value: string | number) => `${value} ${metricCfg.unit}`,
        },
      },
    },
  }), [metricCfg.unit]);

  // Xử lý giả lập phiên đồng bộ UAV mới
  const handleSimulateNewSync = () => {
    dispatch(simulateNewSyncSession({ totalRecords: 30 }));
    setSimToast('Đã giả lập phiên đồng bộ UAV mới (30 bản ghi / 3 lô qua MQTT iot/ltj/sync/bulk)!');
    setTimeout(() => setSimToast(null), 4500);
  };

  // Xử lý đồng bộ lại phiên gián đoạn
  const handleRetrySync = (session: UavSyncSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = session.totalRecords - session.syncedRecords;
    dispatch(retrySyncSession(session.id));
    setSimToast(`Đã đồng bộ bù thành công ${remaining} bản ghi tồn trong SQLite của phiên ${session.syncSessionId}!`);
    setTimeout(() => setSimToast(null), 4000);
  };

  const hasSyncFilter =
    syncFilter.uavId !== 'ALL' || syncFilter.status !== 'ALL' || syncFilter.search.trim() !== '';

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="zcs-page">
      {/* Thông báo nhanh khi giả lập / đồng bộ bù */}
      {simToast && (
        <div className="zcs-toast">
          <CircleCheck size={16} />
          <span>{simToast}</span>
          <button type="button" onClick={() => setSimToast(null)}><X size={14} /></button>
        </div>
      )}

      {/* ====================================================================
          PHẦN 1: BIỂU ĐỒ SO SÁNH 2 KHU VỰC (ZONE COMPARISON - F07)
         ==================================================================== */}
      <section className="zcs-section">
        <div className="zcs-section-header">
          <div>
            <div className="zcs-badge-row">
              <span className="zcs-feature-tag">F07 · ZONE COMPARISON</span>
              <span className="zcs-source-badge">
                {seriesA.source === 'API' ? '🟢 Dữ liệu Backend API' : '⚡ Dữ liệu Mô phỏng Chuẩn'}
              </span>
            </div>
            <h2>Biểu đồ So sánh Môi trường giữa 2 Khu vực (Zone A &amp; Zone B)</h2>
            <p>Đối chiếu trực quan biến thiên nhiệt độ, độ ẩm, ánh sáng và CO₂ theo thời gian giữa hai vùng canh tác.</p>
          </div>

          <div className="zcs-chart-mode-group">
            <button
              type="button"
              className={`zcs-mode-btn ${chartMode === 'line' ? 'active' : ''}`}
              onClick={() => dispatch(setChartMode('line'))}
            >
              <ChartLine size={15} />
              Biểu đồ Đường
            </button>
            <button
              type="button"
              className={`zcs-mode-btn ${chartMode === 'bar' ? 'active' : ''}`}
              onClick={() => dispatch(setChartMode('bar'))}
            >
              <ChartColumn size={15} />
              Biểu đồ Cột
            </button>
          </div>
        </div>

        {/* Thanh bộ lọc chọn 2 Zone, Chỉ số & Khung thời gian */}
        <div className="zcs-controls-bar">
          <div className="zcs-zone-pickers">
            <div className="zcs-control-field zone-a">
              <label>
                <span className="zone-dot-indicator indigo" />
                Khu vực 1 (Zone A)
              </label>
              <select
                value={zoneAId}
                onChange={e => dispatch(setZoneAId(Number(e.target.value)))}
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.cropType})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="zcs-swap-btn"
              onClick={() => dispatch(swapZones())}
              title="Đảo vị trí 2 Khu vực"
            >
              <ArrowLeftRight size={16} />
            </button>

            <div className="zcs-control-field zone-b">
              <label>
                <span className="zone-dot-indicator emerald" />
                Khu vực 2 (Zone B)
              </label>
              <select
                value={zoneBId}
                onChange={e => dispatch(setZoneBId(Number(e.target.value)))}
              >
                {zones.map(z => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.cropType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="zcs-metric-time-pickers">
            <div className="zcs-control-field">
              <label>Chỉ số so sánh</label>
              <select
                value={metric}
                onChange={e => dispatch(setComparisonMetric(e.target.value as ComparisonMetric))}
              >
                {(Object.keys(METRIC_CONFIG) as ComparisonMetric[]).map(m => (
                  <option key={m} value={m}>
                    {METRIC_CONFIG[m].icon} {METRIC_CONFIG[m].label} ({METRIC_CONFIG[m].unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="zcs-control-field">
              <label>Khung thời gian</label>
              <div className="zcs-time-pills">
                {(['24H', '7D', '30D'] as TimeRangePreset[]).map(range => (
                  <button
                    type="button"
                    key={range}
                    className={`zcs-time-pill ${timeRange === range ? 'active' : ''}`}
                    onClick={() => dispatch(setTimeRange(range))}
                  >
                    {TIME_RANGE_LABELS[range]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3 Thẻ KPI Đối chiếu giữa Zone A và Zone B */}
        <div className="zcs-compare-cards">
          {/* Card Zone A */}
          <div className="zcs-compare-card zone-a-card">
            <div className="card-head">
              <span className="zone-pill indigo">ZONE A</span>
              <h4>{zoneAName}</h4>
            </div>
            <div className="card-main-val">
              <strong>{seriesA.stats.avg.toLocaleString('vi-VN')}</strong>
              <span>{metricCfg.unit} (Trung bình)</span>
            </div>
            <div className="card-sub-stats">
              <div>
                <span>Thấp nhất (Min)</span>
                <strong>{seriesA.stats.min.toLocaleString('vi-VN')} {metricCfg.unit}</strong>
              </div>
              <div>
                <span>Cao nhất (Max)</span>
                <strong>{seriesA.stats.max.toLocaleString('vi-VN')} {metricCfg.unit}</strong>
              </div>
              <div>
                <span>Mới nhất</span>
                <strong>{seriesA.stats.latest.toLocaleString('vi-VN')} {metricCfg.unit}</strong>
              </div>
            </div>
          </div>

          {/* Card Zone B */}
          <div className="zcs-compare-card zone-b-card">
            <div className="card-head">
              <span className="zone-pill emerald">ZONE B</span>
              <h4>{zoneBName}</h4>
            </div>
            <div className="card-main-val">
              <strong>{seriesB.stats.avg.toLocaleString('vi-VN')}</strong>
              <span>{metricCfg.unit} (Trung bình)</span>
            </div>
            <div className="card-sub-stats">
              <div>
                <span>Thấp nhất (Min)</span>
                <strong>{seriesB.stats.min.toLocaleString('vi-VN')} {metricCfg.unit}</strong>
              </div>
              <div>
                <span>Cao nhất (Max)</span>
                <strong>{seriesB.stats.max.toLocaleString('vi-VN')} {metricCfg.unit}</strong>
              </div>
              <div>
                <span>Mới nhất</span>
                <strong>{seriesB.stats.latest.toLocaleString('vi-VN')} {metricCfg.unit}</strong>
              </div>
            </div>
          </div>

          {/* Card Delta Chênh lệch */}
          <div className="zcs-compare-card delta-card">
            <div className="card-head">
              <span className="zone-pill amber">ĐỘ LỆCH (Δ = A − B)</span>
              <h4>Phân tích Chênh lệch</h4>
            </div>
            <div className="card-main-val">
              <strong className={deltaAvg > 0 ? 'pos' : deltaAvg < 0 ? 'neg' : ''}>
                {deltaAvg > 0 ? `+${deltaAvg.toLocaleString('vi-VN')}` : deltaAvg.toLocaleString('vi-VN')}
              </strong>
              <span>{metricCfg.unit} ({deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`})</span>
            </div>
            <div className="card-sub-stats">
              <div>
                <span>Δ Cao nhất</span>
                <strong>{deltaMax > 0 ? `+${deltaMax}` : deltaMax} {metricCfg.unit}</strong>
              </div>
              <div>
                <span>Δ Thấp nhất</span>
                <strong>{deltaMin > 0 ? `+${deltaMin}` : deltaMin} {metricCfg.unit}</strong>
              </div>
              <div>
                <span>Xu hướng</span>
                <strong className="trend-label">
                  {deltaAvg > 0 ? (
                    <><TrendingUp size={13} /> Zone A cao hơn</>
                  ) : deltaAvg < 0 ? (
                    <><TrendingDown size={13} /> Zone B cao hơn</>
                  ) : (
                    <><Minus size={13} /> Tương đương</>
                  )}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Khung Biểu đồ Chart.js */}
        <div className="zcs-chart-box">
          {loadingSeries ? (
            <div className="zcs-chart-loading">Đang tổng hợp dữ liệu so sánh...</div>
          ) : chartMode === 'line' ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </section>

      {/* ====================================================================
          PHẦN 2: LỊCH SỬ ĐỒNG BỘ DỮ LIỆU UAV (OFFLINE SQLITE -> MQTT BULK)
         ==================================================================== */}
      <section className="zcs-section">
        <div className="zcs-section-header">
          <div>
            <div className="zcs-badge-row">
              <span className="zcs-feature-tag">UAV OFFLINE SYNC HISTORY</span>
              <span className="zcs-mqtt-badge">MQTT Topic: {SYNC_TOPICS.BULK}</span>
            </div>
            <h2>Lịch sử Đồng bộ Dữ liệu từ UAV (SQLite Local → MQTT Bulk)</h2>
            <p>
              Theo dõi các phiên UAV thu gom dữ liệu cảm biến vào bộ nhớ đệm <code>iot_offline.db</code> khi bay qua vùng mất sóng và tự động đồng bộ theo lô (10 bản ghi/lô) khi có mạng trở lại.
            </p>
          </div>

          <button
            type="button"
            className="zcs-btn-simulate"
            onClick={handleSimulateNewSync}
            title="Mô phỏng UAV bay về trạm và đẩy 30 bản ghi từ SQLite lên MQTT"
          >
            <Zap size={16} />
            Giả lập UAV Đồng bộ mới
          </button>
        </div>

        {/* 4 Thẻ KPI Tổng hợp Lịch sử Đồng bộ */}
        <div className="zcs-sync-kpis">
          <div className="zcs-sync-kpi">
            <div className="kpi-icon blue"><CloudUpload size={20} /></div>
            <div>
              <strong>{syncStats.totalSessions} phiên</strong>
              <span>Tổng số phiên đồng bộ</span>
            </div>
          </div>
          <div className="zcs-sync-kpi">
            <div className="kpi-icon green"><Database size={20} /></div>
            <div>
              <strong>
                {syncStats.syncedRecords.toLocaleString('vi-VN')} / {syncStats.totalRecords.toLocaleString('vi-VN')}
              </strong>
              <span>Điểm dữ liệu đã đồng bộ ({syncStats.pendingRecords} tồn SQLite)</span>
            </div>
          </div>
          <div className="zcs-sync-kpi">
            <div className="kpi-icon purple"><CircleCheck size={20} /></div>
            <div>
              <strong>{syncStats.successRate}%</strong>
              <span>Tỷ lệ đồng bộ thành công</span>
            </div>
          </div>
          <div className="zcs-sync-kpi">
            <div className="kpi-icon amber"><Clock size={20} /></div>
            <div>
              <strong>{formatDuration(syncStats.avgFlightSeconds)}</strong>
              <span>Thời gian bay thu thập TB</span>
            </div>
          </div>
        </div>

        {/* Thanh lọc & tìm kiếm bảng Sync */}
        <div className="zcs-sync-toolbar">
          <div className="zcs-sync-filters">
            <select
              value={syncFilter.uavId}
              onChange={e => dispatch(setSyncFilterUav(e.target.value))}
            >
              <option value="ALL">Tất cả thiết bị UAV</option>
              {uavs.map(u => (
                <option key={u.id} value={u.id}>{u.id} — {u.name}</option>
              ))}
            </select>

            <select
              value={syncFilter.status}
              onChange={e => dispatch(setSyncFilterStatus(e.target.value as SyncStatus | 'ALL'))}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="COMPLETED">🟢 Hoàn tất (100%)</option>
              <option value="PARTIAL">🟡 Gián đoạn (Còn tồn SQLite)</option>
              <option value="FAILED">🔴 Thất bại Handshake</option>
            </select>

            {hasSyncFilter && (
              <button
                type="button"
                className="zcs-btn-reset"
                onClick={() => dispatch(resetSyncFilter())}
              >
                <X size={14} /> Xóa lọc
              </button>
            )}
          </div>

          <div className="zcs-sync-search">
            <Search size={15} />
            <input
              type="text"
              placeholder="Tìm mã phiên SYNC-..., mã UAV hoặc Zone..."
              value={syncFilter.search}
              onChange={e => dispatch(setSyncFilterSearch(e.target.value))}
            />
          </div>
        </div>

        {/* Bảng Lịch sử Đồng bộ UAV */}
        <div className="zcs-table-wrap">
          <table className="zcs-table">
            <thead>
              <tr>
                <th>Mã phiên (Session ID)</th>
                <th>Thiết bị UAV</th>
                <th>Khu vực bay</th>
                <th>Thời gian bay thu thập</th>
                <th>Điểm dữ liệu gom được</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="zcs-empty-row">
                    Không tìm thấy phiên đồng bộ UAV nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredSessions.map(session => {
                  const pct = session.totalRecords > 0
                    ? Math.round((session.syncedRecords / session.totalRecords) * 100)
                    : 0;
                  const sentBatches = Math.ceil(session.syncedRecords / session.batchSize);

                  return (
                    <tr
                      key={session.id}
                      onClick={() => dispatch(selectSyncSession(session.id))}
                      className="zcs-clickable-row"
                    >
                      <td>
                        <span className="zcs-session-code">{session.syncSessionId}</span>
                      </td>
                      <td>
                        <div className="zcs-uav-cell">
                          <strong><Plane size={13} /> {session.uavId}</strong>
                          <span>{session.uavName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="zcs-zone-chip">
                          <Layers size={12} /> {session.zoneName}
                        </span>
                      </td>
                      <td>
                        <div className="zcs-flight-time-cell">
                          <strong>{formatDuration(session.flightDurationSeconds)}</strong>
                          <span>
                            {formatDateTime(session.flightStartTime)} → {formatDateTime(session.flightEndTime)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="zcs-progress-cell">
                          <div className="zcs-progress-top">
                            <strong>{session.syncedRecords}/{session.totalRecords} điểm</strong>
                            <span>({sentBatches}/{session.batchCount} lô · {pct}%)</span>
                          </div>
                          <div className="zcs-progress-bar">
                            <div
                              className={`zcs-progress-fill ${session.status.toLowerCase()}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`zcs-status-badge ${session.status.toLowerCase()}`}>
                          {session.status === 'COMPLETED' && <CircleCheck size={12} />}
                          {session.status === 'PARTIAL' && <TriangleAlert size={12} />}
                          {session.status === 'FAILED' && <WifiOff size={12} />}
                          {session.status === 'SYNCING' && <RefreshCw size={12} />}
                          {SYNC_STATUS_LABELS[session.status]}
                        </span>
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="zcs-row-actions">
                          <button
                            type="button"
                            className="zcs-action-btn"
                            onClick={() => dispatch(selectSyncSession(session.id))}
                            title="Xem chi tiết luồng Handshake & gói JSON Bulk"
                          >
                            <Eye size={14} /> Chi tiết
                          </button>
                          {session.status !== 'COMPLETED' && (
                            <button
                              type="button"
                              className="zcs-action-btn retry"
                              onClick={e => handleRetrySync(session, e)}
                              title="Đồng bộ bù các bản ghi còn tồn trong SQLite (is_synced = 0)"
                            >
                              <RotateCcw size={14} /> Đồng bộ bù
                            </button>
                          )}
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

      {/* ====================================================================
          MODAL CHI TIẾT PHIÊN ĐỒNG BỘ & GÓI BULK JSON (LTJ-25 COMPATIBLE)
         ==================================================================== */}
      {selectedSession && (
        <SyncSessionDetailModal
          session={selectedSession}
          onClose={() => dispatch(selectSyncSession(null))}
          onRetry={e => handleRetrySync(selectedSession, e)}
        />
      )}
    </div>
  );
}

// ==================== MODAL CHI TIẾT PHIÊN ĐỒNG BỘ ====================

function SyncSessionDetailModal({
  session,
  onClose,
  onRetry,
}: {
  session: UavSyncSession;
  onClose: () => void;
  onRetry: (e: React.MouseEvent) => void;
}) {
  const [batchIdx, setBatchIdx] = useState(0);
  const [viewTab, setViewTab] = useState<'table' | 'json'>('table');
  const [copied, setCopied] = useState(false);

  const bulkPayload = useMemo(
    () => buildBulkPayload(session, batchIdx),
    [session, batchIdx],
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(bulkPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sentBatches = Math.ceil(session.syncedRecords / session.batchSize);

  return (
    <div className="zcs-modal-overlay" onClick={onClose}>
      <div className="zcs-modal" onClick={e => e.stopPropagation()}>
        <div className="zcs-modal-header">
          <div>
            <span className="zcs-feature-tag">CHI TIẾT PHIÊN ĐỒNG BỘ UAV</span>
            <h3>{session.syncSessionId}</h3>
          </div>
          <button type="button" className="zcs-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Luồng 3 bước MQTT Handshake -> Bulk -> Complete */}
        <div className="zcs-mqtt-pipeline">
          <div className={`pipeline-step ${session.handshakeAt ? 'done' : 'err'}`}>
            <div className="step-num">Bước 1 · Handshake</div>
            <code>{SYNC_TOPICS.HANDSHAKE_REQUEST}</code>
            <span>
              {session.handshakeAt
                ? `Đã bắt tay lúc ${new Date(session.handshakeAt).toLocaleTimeString('vi-VN')}`
                : 'Timeout kết nối Broker'}
            </span>
          </div>

          <div className={`pipeline-step ${sentBatches === session.batchCount ? 'done' : sentBatches > 0 ? 'warn' : 'err'}`}>
            <div className="step-num">Bước 2 · Gửi theo lô ({session.batchSize} bản ghi/lô)</div>
            <code>{SYNC_TOPICS.BULK}</code>
            <span>
              Đã đẩy {sentBatches}/{session.batchCount} lô ({session.syncedRecords}/{session.totalRecords} bản ghi)
            </span>
          </div>

          <div className={`pipeline-step ${session.completedAt ? 'done' : 'pending'}`}>
            <div className="step-num">Bước 3 · Hoàn tất phiên</div>
            <code>{SYNC_TOPICS.HANDSHAKE_COMPLETE}</code>
            <span>
              {session.completedAt
                ? `Hoàn tất lúc ${new Date(session.completedAt).toLocaleTimeString('vi-VN')}`
                : 'Chưa hoàn tất (còn bản ghi is_synced = 0)'}
            </span>
          </div>
        </div>

        {/* Cảnh báo lỗi nếu phiên bị gián đoạn */}
        {session.errorMessage && (
          <div className="zcs-modal-alert">
            <TriangleAlert size={16} />
            <span>{session.errorMessage}</span>
            <button type="button" className="zcs-action-btn retry" onClick={onRetry}>
              <RotateCcw size={14} /> Đồng bộ bù ngay
            </button>
          </div>
        )}

        {/* Thanh chọn Lô (Batch 1, Batch 2...) và chế độ xem Bảng / JSON */}
        <div className="zcs-modal-toolbar">
          <div className="zcs-batch-tabs">
            {Array.from({ length: session.batchCount }, (_, i) => {
              const isSent = i < sentBatches;
              return (
                <button
                  type="button"
                  key={i}
                  className={`zcs-batch-btn ${batchIdx === i ? 'active' : ''} ${isSent ? 'sent' : 'unsent'}`}
                  onClick={() => setBatchIdx(i)}
                >
                  Lô #{i + 1} ({isSent ? 'Đã gửi' : 'Tồn SQLite'})
                </button>
              );
            })}
          </div>

          <div className="zcs-view-switch">
            <button
              type="button"
              className={viewTab === 'table' ? 'active' : ''}
              onClick={() => setViewTab('table')}
            >
              Bảng điểm dữ liệu ({bulkPayload.records.length})
            </button>
            <button
              type="button"
              className={viewTab === 'json' ? 'active' : ''}
              onClick={() => setViewTab('json')}
            >
              Gói JSON Bulk
            </button>
          </div>
        </div>

        {/* Nội dung Lô đang chọn */}
        {viewTab === 'table' ? (
          <div className="zcs-modal-table-wrap">
            <table className="zcs-table compact">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã thiết bị (Device ID)</th>
                  <th>Nhiệt độ</th>
                  <th>Độ ẩm KK</th>
                  <th>Độ ẩm đất</th>
                  <th>Ánh sáng</th>
                  <th>Trạng thái</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {bulkPayload.records.map((rec, idx) => (
                  <tr key={`${rec.deviceId}-${rec.timestamp}-${idx}`}>
                    <td>{batchIdx * session.batchSize + idx + 1}</td>
                    <td><code>{rec.deviceId}</code></td>
                    <td>{rec.temperature.toFixed(1)}°C</td>
                    <td>{rec.humidity.toFixed(1)}%</td>
                    <td>{rec.soilMoisture.toFixed(1)}%</td>
                    <td>{rec.light} lux</td>
                    <td>
                      <span className={`zcs-rec-status ${rec.status.toLowerCase()}`}>
                        {rec.status}
                      </span>
                    </td>
                    <td>{new Date(rec.timestamp * 1000).toLocaleTimeString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="zcs-json-box">
            <div className="zcs-json-head">
              <span>Topic: <code>{SYNC_TOPICS.BULK}</code> — Lô #{batchIdx + 1}</span>
              <button type="button" className="zcs-copy-btn" onClick={handleCopy}>
                <Copy size={13} />
                {copied ? 'Đã sao chép!' : 'Sao chép JSON'}
              </button>
            </div>
            <pre>{JSON.stringify(bulkPayload, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
