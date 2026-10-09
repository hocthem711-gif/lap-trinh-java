import { createSlice } from '@reduxjs/toolkit';

/**
 * Waypoint Slice - Quản lý danh sách các điểm bay (Waypoints) trên bản đồ
 * Task: LTJ-4 - Setup React Redux state management for Mission Dashboard
 * Author: Quatrungvoon
 */

// Các hằng số cho loại waypoint
export const WAYPOINT_TYPES = {
  NORMAL: 'NORMAL',
  TAKEOFF: 'TAKEOFF',
  LANDING: 'LANDING',
  HOVER: 'HOVER',
  RETURN_HOME: 'RETURN_HOME',
};

let nextWaypointId = 1;

const initialState = {
  waypoints: [],
  selectedWaypointId: null,
  isEditing: false,
  totalDistance: 0,
};

/**
 * Tính khoảng cách giữa 2 điểm tọa độ (theo công thức Haversine đơn giản)
 */
const calculateDistance = (wp1, wp2) => {
  if (!wp1 || !wp2) return 0;
  const dx = (wp2.latitude - wp1.latitude);
  const dy = (wp2.longitude - wp1.longitude);
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Tính tổng khoảng cách bay qua tất cả các waypoints
 */
const calculateTotalDistance = (waypoints) => {
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
    addWaypoint: (state, action) => {
      const newWaypoint = {
        id: nextWaypointId++,
        type: WAYPOINT_TYPES.NORMAL,
        altitude: 50,
        ...action.payload,
        order: state.waypoints.length + 1,
      };
      state.waypoints.push(newWaypoint);
      state.totalDistance = calculateTotalDistance(state.waypoints);
    },
    removeWaypoint: (state, action) => {
      state.waypoints = state.waypoints
        .filter(wp => wp.id !== action.payload)
        .map((wp, index) => ({ ...wp, order: index + 1 }));
      if (state.selectedWaypointId === action.payload) {
        state.selectedWaypointId = null;
      }
      state.totalDistance = calculateTotalDistance(state.waypoints);
    },
    updateWaypoint: (state, action) => {
      const index = state.waypoints.findIndex(wp => wp.id === action.payload.id);
      if (index !== -1) {
        state.waypoints[index] = { ...state.waypoints[index], ...action.payload };
        state.totalDistance = calculateTotalDistance(state.waypoints);
      }
    },
    selectWaypoint: (state, action) => {
      state.selectedWaypointId = action.payload;
    },
    clearWaypoints: (state) => {
      state.waypoints = [];
      state.selectedWaypointId = null;
      state.isEditing = false;
      state.totalDistance = 0;
      nextWaypointId = 1;
    },
    reorderWaypoints: (state, action) => {
      const { fromIndex, toIndex } = action.payload;
      const [moved] = state.waypoints.splice(fromIndex, 1);
      state.waypoints.splice(toIndex, 0, moved);
      state.waypoints = state.waypoints.map((wp, index) => ({
        ...wp,
        order: index + 1,
      }));
      state.totalDistance = calculateTotalDistance(state.waypoints);
    },
    setEditing: (state, action) => {
      state.isEditing = action.payload;
    },
  },
});

// Selectors
export const selectAllWaypoints = (state) => state.waypoint.waypoints;
export const selectSelectedWaypointId = (state) => state.waypoint.selectedWaypointId;
export const selectSelectedWaypoint = (state) => {
  const id = state.waypoint.selectedWaypointId;
  return state.waypoint.waypoints.find(wp => wp.id === id) || null;
};
export const selectWaypointCount = (state) => state.waypoint.waypoints.length;
export const selectTotalDistance = (state) => state.waypoint.totalDistance;
export const selectIsEditing = (state) => state.waypoint.isEditing;

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
