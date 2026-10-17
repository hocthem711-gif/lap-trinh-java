import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { UAV, Gateway } from '../../types';
import { uavApi, gatewayApi } from '../../services/api';

/**
 * Device Slice — Quản lý danh sách UAV & Gateway
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

export type DeviceTab = 'uav' | 'gateway';

interface DeviceState {
  uavs: UAV[];
  gateways: Gateway[];
  activeTab: DeviceTab;
  searchQuery: string;
  statusFilter: string;
  loading: boolean;
  error: string | null;
}

const initialState: DeviceState = {
  uavs: [],
  gateways: [],
  activeTab: 'uav',
  searchQuery: '',
  statusFilter: 'ALL',
  loading: false,
  error: null,
};

// Async Thunks
export const fetchUAVs = createAsyncThunk('device/fetchUAVs', async () => {
  return await uavApi.getAll();
});

export const fetchGateways = createAsyncThunk('device/fetchGateways', async () => {
  return await gatewayApi.getAll();
});

export const deleteUAV = createAsyncThunk('device/deleteUAV', async (id: string) => {
  await uavApi.delete(id);
  return id;
});

export const deleteGateway = createAsyncThunk('device/deleteGateway', async (id: string) => {
  await gatewayApi.delete(id);
  return id;
});

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<DeviceTab>) => {
      state.activeTab = action.payload;
      state.searchQuery = '';
      state.statusFilter = 'ALL';
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string>) => {
      state.statusFilter = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch UAVs
    builder
      .addCase(fetchUAVs.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchUAVs.fulfilled, (state, action) => { state.loading = false; state.uavs = action.payload; })
      .addCase(fetchUAVs.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Lỗi tải danh sách UAV'; });
    // Fetch Gateways
    builder
      .addCase(fetchGateways.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchGateways.fulfilled, (state, action) => { state.loading = false; state.gateways = action.payload; })
      .addCase(fetchGateways.rejected, (state, action) => { state.loading = false; state.error = action.error.message || 'Lỗi tải danh sách Gateway'; });
    // Delete UAV
    builder.addCase(deleteUAV.fulfilled, (state, action) => {
      state.uavs = state.uavs.filter(u => u.id !== action.payload);
    });
    // Delete Gateway
    builder.addCase(deleteGateway.fulfilled, (state, action) => {
      state.gateways = state.gateways.filter(g => g.id !== action.payload);
    });
  },
});

export const { setActiveTab, setSearchQuery, setStatusFilter, clearError } = deviceSlice.actions;

// Selectors
export const selectFilteredUAVs = (state: { device: DeviceState }) => {
  const { uavs, searchQuery, statusFilter } = state.device;
  return uavs.filter(u => {
    const matchesSearch = !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

export const selectFilteredGateways = (state: { device: DeviceState }) => {
  const { gateways, searchQuery, statusFilter } = state.device;
  return gateways.filter(g => {
    const matchesSearch = !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.ipAddress.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
};

export default deviceSlice.reducer;
