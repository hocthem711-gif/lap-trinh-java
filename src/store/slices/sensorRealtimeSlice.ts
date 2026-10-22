/**
 * Redux Slice — Sensor Realtime State Management
 * Task: LTJ-14 - Sprint 3
 * Author: Quatrungvoon (Nguyễn Trường An)
 *
 * Quản lý trạng thái:
 * - Danh sách cảm biến realtime (readings cập nhật liên tục)
 * - Bộ lọc (Zone, Trạng thái, Loại, Tìm kiếm)
 * - Cảnh báo vượt ngưỡng (alerts)
 * - Thống kê tổng hợp (stats)
 * - Toggle bật/tắt stream realtime
 * - Sensor đang chọn để hiện Popup trên bản đồ
 */

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  RealtimeSensorNode,
  RealtimeFilter,
  SensorAlert,
  RealtimeStats,
  RealtimeStatus,
} from '../../types/realtime';
import type { SensorType } from '../../types';
import { generateInitialSensors, computeRealtimeStats } from '../../services/realtimeStream';

// ==================== State Interface ====================

interface SensorRealtimeState {
  sensors: RealtimeSensorNode[];
  filter: RealtimeFilter;
  alerts: SensorAlert[];
  stats: RealtimeStats;
  isStreaming: boolean;
  selectedSensorId: number | null;
  streamIntervalMs: number;
}

// ==================== Initial State ====================

const initialSensors = generateInitialSensors();

const initialState: SensorRealtimeState = {
  sensors: initialSensors,
  filter: {
    zoneId: null,
    status: 'ALL',
    sensorType: 'ALL',
    searchQuery: '',
  },
  alerts: [],
  stats: computeRealtimeStats(initialSensors),
  isStreaming: true,
  selectedSensorId: null,
  streamIntervalMs: 4000,
};

// ==================== Slice ====================

const sensorRealtimeSlice = createSlice({
  name: 'sensorRealtime',
  initialState,
  reducers: {
    /**
     * Cập nhật toàn bộ danh sách sensor sau mỗi tick realtime.
     * Được dispatch từ useEffect interval trong component.
     */
    updateSensors(state, action: PayloadAction<RealtimeSensorNode[]>) {
      state.sensors = action.payload;
      state.stats = computeRealtimeStats(action.payload);
    },

    /**
     * Thêm danh sách cảnh báo mới vào hàng đợi.
     * Chỉ giữ tối đa 50 cảnh báo gần nhất.
     */
    addAlerts(state, action: PayloadAction<SensorAlert[]>) {
      state.alerts = [...action.payload, ...state.alerts].slice(0, 50);
    },

    /** Xóa toàn bộ danh sách cảnh báo */
    clearAlerts(state) {
      state.alerts = [];
    },

    /** Bật/tắt luồng dữ liệu realtime */
    toggleStreaming(state) {
      state.isStreaming = !state.isStreaming;
    },

    /** Đặt trạng thái streaming cụ thể */
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },

    /** Thay đổi tốc độ cập nhật (ms) */
    setStreamInterval(state, action: PayloadAction<number>) {
      state.streamIntervalMs = action.payload;
    },

    /** Chọn sensor để hiện popup trên bản đồ */
    selectSensorForPopup(state, action: PayloadAction<number | null>) {
      state.selectedSensorId = action.payload;
    },

    // ===== Bộ lọc =====
    setFilterZone(state, action: PayloadAction<number | null>) {
      state.filter.zoneId = action.payload;
    },

    setFilterStatus(state, action: PayloadAction<RealtimeStatus | 'ALL'>) {
      state.filter.status = action.payload;
    },

    setFilterSensorType(state, action: PayloadAction<SensorType | 'ALL'>) {
      state.filter.sensorType = action.payload;
    },

    setSearchQuery(state, action: PayloadAction<string>) {
      state.filter.searchQuery = action.payload;
    },

    resetFilters(state) {
      state.filter = {
        zoneId: null,
        status: 'ALL',
        sensorType: 'ALL',
        searchQuery: '',
      };
    },
  },
});

// ==================== Selectors ====================

import type { RootState } from '..';

/** Lấy danh sách sensor đã lọc theo bộ lọc hiện tại */
export const selectFilteredSensors = (state: RootState): RealtimeSensorNode[] => {
  const { sensors, filter } = state.sensorRealtime;

  return sensors.filter(sensor => {
    if (filter.zoneId !== null && sensor.zoneId !== filter.zoneId) return false;
    if (filter.status !== 'ALL' && sensor.status !== filter.status) return false;
    if (filter.sensorType !== 'ALL' && sensor.sensorType !== filter.sensorType) return false;
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase();
      if (
        !sensor.sensorCode.toLowerCase().includes(q) &&
        !sensor.zoneName.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
};

/** Lấy sensor đang được chọn cho Popup */
export const selectSelectedSensor = (state: RootState): RealtimeSensorNode | undefined => {
  return state.sensorRealtime.sensors.find(
    s => s.id === state.sensorRealtime.selectedSensorId,
  );
};

/** Lấy thống kê tổng hợp */
export const selectRealtimeStats = (state: RootState): RealtimeStats => {
  return state.sensorRealtime.stats;
};

/** Lấy danh sách cảnh báo */
export const selectAlerts = (state: RootState): SensorAlert[] => {
  return state.sensorRealtime.alerts;
};

// ==================== Export ====================

export const {
  updateSensors,
  addAlerts,
  clearAlerts,
  toggleStreaming,
  setStreaming,
  setStreamInterval,
  selectSensorForPopup,
  setFilterZone,
  setFilterStatus,
  setFilterSensorType,
  setSearchQuery,
  resetFilters,
} = sensorRealtimeSlice.actions;

export default sensorRealtimeSlice.reducer;
