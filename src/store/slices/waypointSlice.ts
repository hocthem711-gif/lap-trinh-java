import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Waypoint Slice - Quản lý danh sách các điểm bay (Waypoints) trên bản đồ
 * Task: LTJ-4 - Setup React Redux state management for Mission Dashboard
 * Author: Quatrungvoon
 */

export enum WaypointType {
  NORMAL = 'NORMAL',
  TAKEOFF = 'TAKEOFF',
  LANDING = 'LANDING',
  HOVER = 'HOVER',
  RETURN_HOME = 'RETURN_HOME',
}

export interface Waypoint {
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  type: WaypointType;
  order: number;
}

interface WaypointState {
  waypoints: Waypoint[];
  selectedWaypointId: number | null;
  isEditing: boolean;
  totalDistance: number;
}

let nextWaypointId = 1;

const initialState: WaypointState = {
  waypoints: [],
  selectedWaypointId: null,
  isEditing: false,
  totalDistance: 0,
};

const calculateDistance = (wp1: Waypoint, wp2: Waypoint) => {
  if (!wp1 || !wp2) return 0;
  const dx = (wp2.latitude - wp1.latitude);
  const dy = (wp2.longitude - wp1.longitude);
  return Math.sqrt(dx * dx + dy * dy);
};

const calculateTotalDistance = (waypoints: Waypoint[]) => {
  let total = 0;
  for (let i = 1; i < waypoints.length; i++) {
    total += calculateDistance(waypoints[i - 1], waypoints[i]);
  }
  return Math.round(total * 100) / 100;
};

const waypointSlice = createSlice({
  name: 'waypoint',
  initialState,
  reducers: {
    addWaypoint: (state, action: PayloadAction<Omit<Waypoint, 'id' | 'order'>>) => {
      const newWaypoint: Waypoint = {
        id: nextWaypointId++,
        ...action.payload,
        order: state.waypoints.length + 1,
      };
      state.waypoints.push(newWaypoint);
      state.totalDistance = calculateTotalDistance(state.waypoints);
    },
    removeWaypoint: (state, action: PayloadAction<number>) => {
      state.waypoints = state.waypoints
        .filter(wp => wp.id !== action.payload)
        .map((wp, index) => ({ ...wp, order: index + 1 }));
      if (state.selectedWaypointId === action.payload) {
        state.selectedWaypointId = null;
      }
      state.totalDistance = calculateTotalDistance(state.waypoints);
    },
    updateWaypoint: (state, action: PayloadAction<Partial<Waypoint> & { id: number }>) => {
      const index = state.waypoints.findIndex(wp => wp.id === action.payload.id);
      if (index !== -1) {
        state.waypoints[index] = { ...state.waypoints[index], ...action.payload };
        state.totalDistance = calculateTotalDistance(state.waypoints);
      }
    },
    selectWaypoint: (state, action: PayloadAction<number | null>) => {
      state.selectedWaypointId = action.payload;
    },
    clearWaypoints: (state) => {
      state.waypoints = [];
      state.selectedWaypointId = null;
      state.isEditing = false;
      state.totalDistance = 0;
      nextWaypointId = 1;
    },
    reorderWaypoints: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [moved] = state.waypoints.splice(fromIndex, 1);
      state.waypoints.splice(toIndex, 0, moved);
      state.waypoints = state.waypoints.map((wp, index) => ({
        ...wp,
        order: index + 1,
      }));
      state.totalDistance = calculateTotalDistance(state.waypoints);
    },
    setEditing: (state, action: PayloadAction<boolean>) => {
      state.isEditing = action.payload;
    },
  },
});

export const {
  addWaypoint,
  removeWaypoint,
  updateWaypoint,
  selectWaypoint,
  clearWaypoints,
  reorderWaypoints,
  setEditing,
} = waypointSlice.actions;

export default waypointSlice.reducer;
