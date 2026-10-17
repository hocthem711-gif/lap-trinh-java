import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { SensorNode, SensorType } from '../../types';
import { sensorApi } from '../../services/api';

/**
 * Sensor Slice — Quản lý cảm biến & gán vào Zone
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

interface SensorState {
  sensors: SensorNode[];
  selectedFarmId: number | null;
  selectedZoneId: number | null;
  typeFilter: string;
  loading: boolean;
  error: string | null;
}

const initialState: SensorState = {
  sensors: [],
  selectedFarmId: null,
  selectedZoneId: null,
  typeFilter: 'ALL',
  loading: false,
  error: null,
};

// Async Thunks
export const fetchAllSensors = createAsyncThunk('sensor/fetchAll', async () => {
  return await sensorApi.getAll();
});

export const fetchSensorsByZone = createAsyncThunk(
  'sensor/fetchByZone',
  async (zoneId: number) => {
    return await sensorApi.getByZoneId(zoneId);
  }
);

export const addSensor = createAsyncThunk(
  'sensor/add',
  async (sensor: { sensorCode: string; sensorType: SensorType; zoneId: number; zoneName: string }) => {
    return await sensorApi.create({
      ...sensor,
      status: 'ACTIVE',
    });
  }
);

export const removeSensor = createAsyncThunk('sensor/remove', async (id: number) => {
  await sensorApi.delete(id);
  return id;
});

const sensorSlice = createSlice({
  name: 'sensor',
  initialState,
  reducers: {
    setSelectedFarmId: (state, action: PayloadAction<number | null>) => {
      state.selectedFarmId = action.payload;
      state.selectedZoneId = null;
    },
    setSelectedZoneId: (state, action: PayloadAction<number | null>) => {
      state.selectedZoneId = action.payload;
    },
    setTypeFilter: (state, action: PayloadAction<string>) => {
      state.typeFilter = action.payload;
    },
    clearSensorError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSensors.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchAllSensors.fulfilled, (state, action) => { state.loading = false; state.sensors = action.payload; })
      .addCase(fetchAllSensors.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Lỗi tải danh sách cảm biến'; });
    builder
      .addCase(fetchSensorsByZone.pending, (state) => { state.loading = true; })
      .addCase(fetchSensorsByZone.fulfilled, (state, action) => { state.loading = false; state.sensors = action.payload; })
      .addCase(fetchSensorsByZone.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Lỗi tải cảm biến theo Zone'; });
    builder.addCase(addSensor.fulfilled, (state, action) => {
      state.sensors.push(action.payload);
    });
    builder.addCase(removeSensor.fulfilled, (state, action) => {
      state.sensors = state.sensors.filter(s => s.id !== action.payload);
    });
  },
});

export const { setSelectedFarmId, setSelectedZoneId, setTypeFilter, clearSensorError } = sensorSlice.actions;

// Selectors
export const selectFilteredSensors = (state: { sensor: SensorState }) => {
  const { sensors, selectedZoneId, typeFilter } = state.sensor;
  return sensors.filter(s => {
    const matchesZone = !selectedZoneId || s.zoneId === selectedZoneId;
    const matchesType = typeFilter === 'ALL' || s.sensorType === typeFilter;
    return matchesZone && matchesType;
  });
};

export default sensorSlice.reducer;
