/**
 * Analytics Redux Slice — Quản lý trạng thái So sánh 2 Zone (F07) & Lịch sử Sync UAV
 * Task: LTJ-24 - Sprint 5
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { zoneApi, uavApi } from '../../services/api';
import {
  fetchZoneSeries,
  fetchUavSyncHistory,
  generateMockZoneSeries,
  generateMockSyncHistory,
  buildSyncSession,
} from '../../services/analyticsService';
import type {
  ComparisonMetric,
  TimeRangePreset,
  ChartMode,
  ZoneOption,
  ZoneSeries,
  UavSyncSession,
  SyncFilter,
  SyncStats,
  SyncStatus,
} from '../../types/analytics';
import { SYNC_BATCH_SIZE } from '../../types/analytics';

// ==================== DEFAULT ZONES & UAVS ====================

const DEFAULT_ZONES: ZoneOption[] = [
  { id: 1, name: 'Khu Vực A - Dâu Tây Thủy Canh', cropType: 'Dâu Tây Nhật Bản' },
  { id: 2, name: 'Khu Vực B - Rau Xà Lách Thủy Canh', cropType: 'Xà Lách Romaine' },
  { id: 3, name: 'Khu Vực C - Cà Chua Bi Nhà Kính', cropType: 'Cà Chua Cherry' },
  { id: 4, name: 'Khu Vực D - Cây Ăn Quả Công Nghệ Cao', cropType: 'Dưa Lưới Hoàng Kim' },
  { id: 5, name: 'Khu Vực E - Vườn Ươm Thí Nghiệm IoT', cropType: 'Cây Giống Công Nghệ' },
];

const DEFAULT_UAVS: { id: string; name: string }[] = [
  { id: 'UAV-001', name: 'UAV Trinh sát 01' },
  { id: 'UAV-002', name: 'UAV Phun thuốc 01' },
  { id: 'UAV-003', name: 'UAV Giám sát 02' },
  { id: 'UAV-005', name: 'UAV Phun thuốc 02' },
  { id: 'UAV-007', name: 'UAV Trinh sát 03' },
];

// ==================== STATE INTERFACE ====================

interface AnalyticsState {
  zones: ZoneOption[];
  uavs: { id: string; name: string }[];
  zoneAId: number;
  zoneBId: number;
  metric: ComparisonMetric;
  timeRange: TimeRangePreset;
  chartMode: ChartMode;
  seriesA: ZoneSeries;
  seriesB: ZoneSeries;
  loadingSeries: boolean;
  syncSessions: UavSyncSession[];
  syncSource: 'API' | 'MOCK';
  loadingSync: boolean;
  syncFilter: SyncFilter;
  selectedSessionId: number | null;
}

const initialSeriesA = generateMockZoneSeries(1, DEFAULT_ZONES[0].name, 'temperature', '24H');
const initialSeriesB = generateMockZoneSeries(2, DEFAULT_ZONES[1].name, 'temperature', '24H');
const initialSessions = generateMockSyncHistory(DEFAULT_UAVS, DEFAULT_ZONES);

const initialState: AnalyticsState = {
  zones: DEFAULT_ZONES,
  uavs: DEFAULT_UAVS,
  zoneAId: 1,
  zoneBId: 2,
  metric: 'temperature',
  timeRange: '24H',
  chartMode: 'line',
  seriesA: initialSeriesA,
  seriesB: initialSeriesB,
  loadingSeries: false,
  syncSessions: initialSessions,
  syncSource: 'MOCK',
  loadingSync: false,
  syncFilter: {
    uavId: 'ALL',
    status: 'ALL',
    search: '',
  },
  selectedSessionId: null,
};

// ==================== ASYNC THUNKS ====================

/** Tải danh sách Zone & UAV thật từ API (hoặc Mock Fallback) */
export const initAnalyticsMetadata = createAsyncThunk(
  'analytics/initMetadata',
  async () => {
    const [zonesRaw, uavsRaw] = await Promise.all([
      zoneApi.getAll(),
      uavApi.getAll(),
    ]);
    const zones: ZoneOption[] = zonesRaw.map(z => ({
      id: z.id,
      name: z.name,
      cropType: z.cropType,
    }));
    const uavs = uavsRaw.map(u => ({ id: u.id, name: u.name }));
    return {
      zones: zones.length > 0 ? zones : DEFAULT_ZONES,
      uavs: uavs.length > 0 ? uavs : DEFAULT_UAVS,
    };
  },
);

/** Tải chuỗi dữ liệu so sánh cho cả 2 Zone (Zone A & Zone B) */
export const loadComparisonSeries = createAsyncThunk(
  'analytics/loadComparisonSeries',
  async (_, { getState }) => {
    const state = (getState() as { analytics: AnalyticsState }).analytics;
    const zoneA = state.zones.find(z => z.id === state.zoneAId) ?? DEFAULT_ZONES[0];
    const zoneB = state.zones.find(z => z.id === state.zoneBId) ?? DEFAULT_ZONES[1];
    const [seriesA, seriesB] = await Promise.all([
      fetchZoneSeries(zoneA, state.metric, state.timeRange),
      fetchZoneSeries(zoneB, state.metric, state.timeRange),
    ]);
    return { seriesA, seriesB };
  },
);

/** Tải danh sách lịch sử các phiên đồng bộ dữ liệu UAV */
export const loadUavSyncSessions = createAsyncThunk(
  'analytics/loadUavSyncSessions',
  async (_, { getState }) => {
    const state = (getState() as { analytics: AnalyticsState }).analytics;
    return await fetchUavSyncHistory(state.uavs, state.zones);
  },
);

// ==================== SLICE ====================

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setZoneAId(state, action: PayloadAction<number>) {
      state.zoneAId = action.payload;
    },
    setZoneBId(state, action: PayloadAction<number>) {
      state.zoneBId = action.payload;
    },
    swapZones(state) {
      const tmpId = state.zoneAId;
      state.zoneAId = state.zoneBId;
      state.zoneBId = tmpId;
      const tmpSeries = state.seriesA;
      state.seriesA = state.seriesB;
      state.seriesB = tmpSeries;
    },
    setComparisonMetric(state, action: PayloadAction<ComparisonMetric>) {
      state.metric = action.payload;
    },
    setTimeRange(state, action: PayloadAction<TimeRangePreset>) {
      state.timeRange = action.payload;
    },
    setChartMode(state, action: PayloadAction<ChartMode>) {
      state.chartMode = action.payload;
    },
    setSyncFilterUav(state, action: PayloadAction<string>) {
      state.syncFilter.uavId = action.payload;
    },
    setSyncFilterStatus(state, action: PayloadAction<SyncStatus | 'ALL'>) {
      state.syncFilter.status = action.payload;
    },
    setSyncFilterSearch(state, action: PayloadAction<string>) {
      state.syncFilter.search = action.payload;
    },
    resetSyncFilter(state) {
      state.syncFilter = { uavId: 'ALL', status: 'ALL', search: '' };
    },
    selectSyncSession(state, action: PayloadAction<number | null>) {
      state.selectedSessionId = action.payload;
    },

    /**
     * Đồng bộ tiếp (Retry/Resume) cho một phiên bị PARTIAL hoặc FAILED:
     * Mô phỏng cơ chế UavOfflineSyncManager.syncIfOnline() đẩy nốt các bản ghi tồn (is_synced = 0)
     */
    retrySyncSession(state, action: PayloadAction<number>) {
      const target = state.syncSessions.find(s => s.id === action.payload);
      if (!target || target.status === 'COMPLETED') return;
      const nowIso = new Date().toISOString();
      target.syncedRecords = target.totalRecords;
      target.status = 'COMPLETED';
      target.handshakeAt = target.handshakeAt ?? nowIso;
      target.lastBatchAt = nowIso;
      target.completedAt = nowIso;
      target.failedStep = null;
      target.errorMessage = null;
    },

    /**
     * Giả lập một phiên UAV vừa bay về trạm và đồng bộ dữ liệu Offline SQLite → MQTT Bulk
     * Khớp kịch bản demo --test-offline-sync 30 10 của Dev 5 (LTJ-25)
     */
    simulateNewSyncSession(state, action: PayloadAction<{
      uavId?: string;
      zoneId?: number;
      totalRecords?: number;
    } | undefined>) {
      const nextId = state.syncSessions.reduce((max, s) => Math.max(max, s.id), 0) + 1;
      const uav = state.uavs.find(u => u.id === action.payload?.uavId)
        ?? state.uavs[nextId % state.uavs.length]
        ?? DEFAULT_UAVS[0];
      const zone = state.zones.find(z => z.id === action.payload?.zoneId)
        ?? state.zones[nextId % state.zones.length]
        ?? DEFAULT_ZONES[0];
      const totalRecords = action.payload?.totalRecords ?? 30;
      const flightDurationSeconds = 1140; // 19 phút bay thu thập dữ liệu
      const flightStart = new Date(Date.now() - (flightDurationSeconds + 120) * 1000);

      const newSession = buildSyncSession({
        id: nextId,
        uav,
        zone,
        flightStart,
        flightDurationSeconds,
        totalRecords,
        outcome: 'COMPLETED',
        syncedRecords: totalRecords,
        failedStep: null,
        errorMessage: null,
      });

      state.syncSessions.unshift(newSession);
      state.selectedSessionId = newSession.id;
    },
  },
  extraReducers: builder => {
    builder.addCase(initAnalyticsMetadata.fulfilled, (state, action) => {
      state.zones = action.payload.zones;
      state.uavs = action.payload.uavs;
    });
    builder
      .addCase(loadComparisonSeries.pending, state => {
        state.loadingSeries = true;
      })
      .addCase(loadComparisonSeries.fulfilled, (state, action) => {
        state.loadingSeries = false;
        state.seriesA = action.payload.seriesA;
        state.seriesB = action.payload.seriesB;
      })
      .addCase(loadComparisonSeries.rejected, state => {
        state.loadingSeries = false;
      });
    builder
      .addCase(loadUavSyncSessions.pending, state => {
        state.loadingSync = true;
      })
      .addCase(loadUavSyncSessions.fulfilled, (state, action) => {
        state.loadingSync = false;
        state.syncSessions = action.payload.sessions;
        state.syncSource = action.payload.source;
      })
      .addCase(loadUavSyncSessions.rejected, state => {
        state.loadingSync = false;
      });
  },
});

export const {
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
} = analyticsSlice.actions;

// ==================== SELECTORS ====================

export const selectFilteredSyncSessions = (state: { analytics: AnalyticsState }): UavSyncSession[] => {
  const { syncSessions, syncFilter } = state.analytics;
  return syncSessions.filter(session => {
    if (syncFilter.uavId !== 'ALL' && session.uavId !== syncFilter.uavId) return false;
    if (syncFilter.status !== 'ALL' && session.status !== syncFilter.status) return false;
    if (syncFilter.search.trim()) {
      const q = syncFilter.search.trim().toLowerCase();
      const matchSession = session.syncSessionId.toLowerCase().includes(q);
      const matchUav = session.uavId.toLowerCase().includes(q) || session.uavName.toLowerCase().includes(q);
      const matchZone = session.zoneName.toLowerCase().includes(q);
      if (!matchSession && !matchUav && !matchZone) return false;
    }
    return true;
  });
};

export const selectSyncStats = (state: { analytics: AnalyticsState }): SyncStats => {
  const sessions = state.analytics.syncSessions;
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalRecords: 0,
      syncedRecords: 0,
      pendingRecords: 0,
      successRate: 0,
      avgFlightSeconds: 0,
    };
  }
  const totalRecords = sessions.reduce((sum, s) => sum + s.totalRecords, 0);
  const syncedRecords = sessions.reduce((sum, s) => sum + s.syncedRecords, 0);
  const pendingRecords = Math.max(0, totalRecords - syncedRecords);
  const totalFlight = sessions.reduce((sum, s) => sum + s.flightDurationSeconds, 0);
  return {
    totalSessions: sessions.length,
    totalRecords,
    syncedRecords,
    pendingRecords,
    successRate: totalRecords > 0 ? Math.round((syncedRecords / totalRecords) * 1000) / 10 : 0,
    avgFlightSeconds: Math.round(totalFlight / sessions.length),
  };
};

export const selectSelectedSyncSession = (state: { analytics: AnalyticsState }): UavSyncSession | undefined => {
  const { syncSessions, selectedSessionId } = state.analytics;
  return syncSessions.find(s => s.id === selectedSessionId);
};

export { SYNC_BATCH_SIZE };
export default analyticsSlice.reducer;
