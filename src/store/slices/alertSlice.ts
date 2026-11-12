/**
 * Redux Toolkit Slice — Threshold Configuration (F09) & Alert Management (F08)
 * Task: LTJ-29 - Sprint 6
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { Farm, Zone } from '../../types';
import { farmApi, zoneApi } from '../../services/api';
import { thresholdApi, alertApi } from '../../services/alertService';
import type {
  AlertFilterState,
  AlertItem,
  AlertSourceType,
  AlertStatus,
  AlertSummaryStats,
  BackendAlertLevel,
  ThresholdRule,
  ThresholdUpdatePayload,
} from '../../types/alert';

export interface AlertState {
  farms: Farm[];
  zones: Zone[];
  selectedFarmId: number;
  selectedZoneId: number;
  zoneThresholds: ThresholdRule[];
  allThresholds: ThresholdRule[];
  alerts: AlertItem[];
  filter: AlertFilterState;
  selectedAlertId: number | null;
  loadingThresholds: boolean;
  savingThresholdSensor: string | null;
  loadingAlerts: boolean;
  simulatingExtreme: boolean;
  lastActionBanner: string | null;
  error: string | null;
}

const initialState: AlertState = {
  farms: [],
  zones: [],
  selectedFarmId: 1,
  selectedZoneId: 1,
  zoneThresholds: [],
  allThresholds: [],
  alerts: [],
  filter: {
    zoneId: 'ALL',
    level: 'ALL',
    status: 'ALL',
    sensorType: 'ALL',
    onlyUnread: false,
    searchQuery: '',
  },
  selectedAlertId: null,
  loadingThresholds: false,
  savingThresholdSensor: null,
  loadingAlerts: false,
  simulatingExtreme: false,
  lastActionBanner: null,
  error: null,
};

// ==================== Async Thunks ====================

export const initThresholdAlertModule = createAsyncThunk(
  'alert/initThresholdAlertModule',
  async () => {
    const [farms, zones, allThresholds, alerts] = await Promise.all([
      farmApi.getAll(),
      zoneApi.getAll(),
      thresholdApi.getAll(),
      alertApi.getAll(),
    ]);

    const firstFarmId = farms[0]?.id ?? 1;
    const farmZones = zones.filter((z) => z.farmId === firstFarmId);
    const defaultZone = farmZones[0] ?? zones[0];
    const zoneThresholds = defaultZone
      ? await thresholdApi.getByZone(defaultZone)
      : [];

    return {
      farms,
      zones,
      selectedFarmId: firstFarmId,
      selectedZoneId: defaultZone?.id ?? 1,
      zoneThresholds,
      allThresholds,
      alerts,
    };
  }
);

export const loadThresholdsForZone = createAsyncThunk(
  'alert/loadThresholdsForZone',
  async (zoneId: number, { getState }) => {
    const state = getState() as RootState;
    const zone =
      state.alert.zones.find((z) => z.id === zoneId) ?? {
        id: zoneId,
        name: `Khu vực #${zoneId}`,
        cropType: 'Canh tác thông minh',
        farmId: state.alert.selectedFarmId,
        farmName: 'Nông trại Thông minh',
        totalSensors: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    const rules = await thresholdApi.getByZone(zone);
    const allThresholds = await thresholdApi.getAll();
    return { zoneId, rules, allThresholds };
  }
);

export const saveZoneThresholdRule = createAsyncThunk(
  'alert/saveZoneThresholdRule',
  async (payload: ThresholdUpdatePayload, { getState }) => {
    const state = getState() as RootState;
    const zone =
      state.alert.zones.find((z) => z.id === payload.zoneId) ?? {
        id: payload.zoneId,
        name: `Khu vực #${payload.zoneId}`,
        cropType: 'Canh tác thông minh',
        farmId: state.alert.selectedFarmId,
        farmName: 'Nông trại Thông minh',
        totalSensors: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    const saved = await thresholdApi.saveRule(payload, zone);
    const allThresholds = await thresholdApi.getAll();
    return { saved, allThresholds };
  }
);

export const resetZoneThresholds = createAsyncThunk(
  'alert/resetZoneThresholds',
  async (zoneId: number, { getState }) => {
    const state = getState() as RootState;
    const zone =
      state.alert.zones.find((z) => z.id === zoneId) ?? {
        id: zoneId,
        name: `Khu vực #${zoneId}`,
        cropType: 'Canh tác thông minh',
        farmId: state.alert.selectedFarmId,
        farmName: 'Nông trại Thông minh',
        totalSensors: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    const rules = await thresholdApi.resetZoneToDefaults(zone);
    const allThresholds = await thresholdApi.getAll();
    return { zoneName: zone.name, rules, allThresholds };
  }
);

export const refreshAlertsList = createAsyncThunk(
  'alert/refreshAlertsList',
  async () => {
    return await alertApi.getAll();
  }
);

export const acknowledgeAlertById = createAsyncThunk(
  'alert/acknowledgeAlertById',
  async (alertId: number) => {
    return await alertApi.acknowledge(alertId);
  }
);

export const closeAlertById = createAsyncThunk(
  'alert/closeAlertById',
  async ({ alertId, note }: { alertId: number; note: string }) => {
    return await alertApi.resolve(alertId, note);
  }
);

export const closeAllOpenAlerts = createAsyncThunk(
  'alert/closeAllOpenAlerts',
  async (zoneId?: number | 'ALL') => {
    return await alertApi.resolveAllOpen(zoneId);
  }
);

export const deleteAlertById = createAsyncThunk(
  'alert/deleteAlertById',
  async (alertId: number) => {
    return await alertApi.deleteAlert(alertId);
  }
);

export const triggerExtremeTelemetryBurst = createAsyncThunk(
  'alert/triggerExtremeTelemetryBurst',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const zone =
      state.alert.zones.find((z) => z.id === state.alert.selectedZoneId) ??
      state.alert.zones[0] ?? {
        id: 1,
        name: 'Khu A — Cánh đồng Lúa Nước',
        cropType: 'Lúa ST25',
        farmId: 1,
        farmName: 'Nông trại Thông minh Thủ Đức',
        totalSensors: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    const created = await alertApi.simulateExtremeDataBurst(zone);
    return { zoneName: zone.name, created };
  }
);

// ==================== Slice ====================

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    setSelectedThresholdFarmId(state, action: PayloadAction<number>) {
      state.selectedFarmId = action.payload;
      const farmZones = state.zones.filter((z) => z.farmId === action.payload);
      if (farmZones.length > 0 && !farmZones.some((z) => z.id === state.selectedZoneId)) {
        state.selectedZoneId = farmZones[0].id;
      }
    },
    setSelectedThresholdZoneId(state, action: PayloadAction<number>) {
      state.selectedZoneId = action.payload;
    },
    setAlertFilterZone(state, action: PayloadAction<number | 'ALL'>) {
      state.filter.zoneId = action.payload;
    },
    setAlertFilterLevel(state, action: PayloadAction<BackendAlertLevel | 'ALL'>) {
      state.filter.level = action.payload;
    },
    setAlertFilterStatus(state, action: PayloadAction<AlertStatus | 'ALL'>) {
      state.filter.status = action.payload;
    },
    setAlertFilterSensorType(state, action: PayloadAction<AlertSourceType | 'ALL'>) {
      state.filter.sensorType = action.payload;
    },
    setAlertFilterUnreadOnly(state, action: PayloadAction<boolean>) {
      state.filter.onlyUnread = action.payload;
    },
    setAlertFilterSearch(state, action: PayloadAction<string>) {
      state.filter.searchQuery = action.payload;
    },
    resetAlertFilters(state) {
      state.filter = {
        zoneId: 'ALL',
        level: 'ALL',
        status: 'ALL',
        sensorType: 'ALL',
        onlyUnread: false,
        searchQuery: '',
      };
    },
    selectAlertForModal(state, action: PayloadAction<number | null>) {
      state.selectedAlertId = action.payload;
    },
    clearActionBanner(state) {
      state.lastActionBanner = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initThresholdAlertModule.pending, (state) => {
        state.loadingThresholds = true;
        state.loadingAlerts = true;
      })
      .addCase(initThresholdAlertModule.fulfilled, (state, action) => {
        state.loadingThresholds = false;
        state.loadingAlerts = false;
        state.farms = action.payload.farms;
        state.zones = action.payload.zones;
        state.selectedFarmId = action.payload.selectedFarmId;
        state.selectedZoneId = action.payload.selectedZoneId;
        state.zoneThresholds = action.payload.zoneThresholds;
        state.allThresholds = action.payload.allThresholds;
        state.alerts = action.payload.alerts;
      })
      .addCase(initThresholdAlertModule.rejected, (state, action) => {
        state.loadingThresholds = false;
        state.loadingAlerts = false;
        state.error = action.error.message ?? 'Không thể khởi tạo dữ liệu Ngưỡng & Cảnh báo';
      })
      .addCase(loadThresholdsForZone.pending, (state) => {
        state.loadingThresholds = true;
      })
      .addCase(loadThresholdsForZone.fulfilled, (state, action) => {
        state.loadingThresholds = false;
        state.selectedZoneId = action.payload.zoneId;
        state.zoneThresholds = action.payload.rules;
        state.allThresholds = action.payload.allThresholds;
      })
      .addCase(saveZoneThresholdRule.pending, (state, action) => {
        state.savingThresholdSensor = action.meta.arg.sensorType;
      })
      .addCase(saveZoneThresholdRule.fulfilled, (state, action) => {
        state.savingThresholdSensor = null;
        const { saved, allThresholds } = action.payload;
        state.allThresholds = allThresholds;
        const idx = state.zoneThresholds.findIndex(
          (r) => r.id === saved.id || r.sensorType === saved.sensorType
        );
        if (idx !== -1) {
          state.zoneThresholds[idx] = saved;
        } else {
          state.zoneThresholds.push(saved);
        }
        state.lastActionBanner = `Đã lưu ngưỡng cấu hình ${saved.sensorType} cho ${saved.zoneName} ([${saved.minValue} – ${saved.maxValue}]).`;
      })
      .addCase(resetZoneThresholds.fulfilled, (state, action) => {
        state.zoneThresholds = action.payload.rules;
        state.allThresholds = action.payload.allThresholds;
        state.lastActionBanner = `Đã khôi phục ngưỡng mặc định khuyến nghị cho ${action.payload.zoneName}.`;
      })
      .addCase(refreshAlertsList.fulfilled, (state, action) => {
        state.alerts = action.payload;
      })
      .addCase(acknowledgeAlertById.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.alerts.findIndex((a) => a.id === updated.id);
        if (idx !== -1) {
          state.alerts[idx] = updated;
        }
        state.lastActionBanner = `Đã xác nhận tiếp nhận cảnh báo ${updated.alertCode} (${updated.sensorCode}).`;
      })
      .addCase(closeAlertById.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.alerts.findIndex((a) => a.id === updated.id);
        if (idx !== -1) {
          state.alerts[idx] = updated;
        }
        state.selectedAlertId = null;
        state.lastActionBanner = `Đã đóng (Resolve) cảnh báo ${updated.alertCode} thành công.`;
      })
      .addCase(closeAllOpenAlerts.fulfilled, (state, action) => {
        state.alerts = action.payload;
        state.lastActionBanner = 'Đã đóng toàn bộ các cảnh báo đang mở theo bộ lọc hiện tại.';
      })
      .addCase(deleteAlertById.fulfilled, (state, action) => {
        state.alerts = state.alerts.filter((a) => a.id !== action.payload);
        state.lastActionBanner = `Đã xóa bản ghi cảnh báo #${action.payload}.`;
      })
      .addCase(triggerExtremeTelemetryBurst.pending, (state) => {
        state.simulatingExtreme = true;
      })
      .addCase(triggerExtremeTelemetryBurst.fulfilled, (state, action) => {
        state.simulatingExtreme = false;
        state.alerts = [...action.payload.created, ...state.alerts];
        state.lastActionBanner = `[LTJ-30 Extreme Test] Đã bắn gói dữ liệu cực đoan (Nhiệt độ 60°C & Pin UAV 5%) tại ${action.payload.zoneName} → Kích hoạt ${action.payload.created.length} cảnh báo CRITICAL!`;
      });
  },
});

export const {
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
} = alertSlice.actions;

// ==================== Selectors ====================

const selectAlertSlice = (state: RootState) => state.alert;

export const selectFilteredAlerts = createSelector([selectAlertSlice], (alertState) => {
  const { alerts, filter } = alertState;
  const q = filter.searchQuery.trim().toLowerCase();

  return alerts.filter((item) => {
    if (filter.zoneId !== 'ALL' && item.zoneId !== filter.zoneId) return false;
    if (filter.level !== 'ALL' && item.alertLevel !== filter.level) return false;
    if (filter.status !== 'ALL' && item.status !== filter.status) return false;
    if (filter.sensorType !== 'ALL' && item.sensorType !== filter.sensorType) return false;
    if (filter.onlyUnread && item.isRead) return false;

    if (q) {
      const haystack = `${item.alertCode} ${item.sensorCode} ${item.zoneName} ${item.message}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
});

export const selectAlertSummaryStats = createSelector(
  [selectAlertSlice],
  (alertState): AlertSummaryStats => {
    const { alerts, allThresholds } = alertState;
    let openCount = 0;
    let acknowledgedCount = 0;
    let resolvedCount = 0;
    let criticalOpenCount = 0;
    let warningOpenCount = 0;
    let unreadCount = 0;

    for (const a of alerts) {
      if (a.status === 'OPEN') openCount++;
      else if (a.status === 'ACKNOWLEDGED') acknowledgedCount++;
      else if (a.status === 'RESOLVED') resolvedCount++;

      if (a.status !== 'RESOLVED' && a.alertLevel === 'CRITICAL') criticalOpenCount++;
      if (a.status !== 'RESOLVED' && a.alertLevel === 'WARNING') warningOpenCount++;
      if (!a.isRead) unreadCount++;
    }

    const activeThresholdCount = allThresholds.filter((t) => t.enabled).length;

    return {
      totalAlerts: alerts.length,
      openCount,
      acknowledgedCount,
      resolvedCount,
      criticalOpenCount,
      warningOpenCount,
      unreadCount,
      activeThresholdCount,
    };
  }
);

export const selectSelectedAlertItem = createSelector([selectAlertSlice], (alertState) => {
  if (!alertState.selectedAlertId) return null;
  return alertState.alerts.find((a) => a.id === alertState.selectedAlertId) ?? null;
});

export default alertSlice.reducer;
