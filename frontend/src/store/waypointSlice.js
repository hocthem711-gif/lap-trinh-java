import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  waypoints: [],
  selectedWaypointId: null,
};

const waypointSlice = createSlice({
  name: 'waypoint',
  initialState,
  reducers: {
    addWaypoint: (state, action) => {
      state.waypoints.push(action.payload);
    },
    removeWaypoint: (state, action) => {
      state.waypoints = state.waypoints.filter(wp => wp.id !== action.payload);
    },
    updateWaypoint: (state, action) => {
      const index = state.waypoints.findIndex(wp => wp.id === action.payload.id);
      if (index !== -1) {
        state.waypoints[index] = { ...state.waypoints[index], ...action.payload };
      }
    },
    selectWaypoint: (state, action) => {
      state.selectedWaypointId = action.payload;
    },
    clearWaypoints: (state) => {
      state.waypoints = [];
      state.selectedWaypointId = null;
    }
  },
});

export const { addWaypoint, removeWaypoint, updateWaypoint, selectWaypoint, clearWaypoints } = waypointSlice.actions;
export default waypointSlice.reducer;
