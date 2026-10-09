import { createSlice } from '@reduxjs/toolkit';

/**
 * Mission Slice - Quản lý trạng thái nhiệm vụ bay của Drone/UAV
 * Task: LTJ-4 - Setup React Redux state management for Mission Dashboard
 * Author: Quatrungvoon
 */

// Các hằng số cho chế độ bay
export const FLIGHT_MODES = {
  MANUAL: 'MANUAL',
  AUTOMATED: 'AUTOMATED',
};

// Các hằng số cho trạng thái nhiệm vụ
export const MISSION_STATUS = {
  STANDBY: 'STANDBY',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
};

// Các hằng số cho mức tín hiệu
export const SIGNAL_LEVELS = {
  STRONG: 'STRONG',
  MEDIUM: 'MEDIUM',
  WEAK: 'WEAK',
  LOST: 'LOST',
};

const initialState = {
  currentMission: null,
  mode: FLIGHT_MODES.MANUAL,
  status: MISSION_STATUS.STANDBY,
  droneDetails: {
    altitude: 0,
    speed: 0,
    battery: 100,
    signal: SIGNAL_LEVELS.STRONG,
    satellites: 0,
    latitude: 0,
    longitude: 0,
  },
  missionHistory: [],
  error: null,
};

const missionSlice = createSlice({
  name: 'mission',
  initialState,
  reducers: {
    setMission: (state, action) => {
      state.currentMission = action.payload;
      state.error = null;
    },
    setMode: (state, action) => {
      if (Object.values(FLIGHT_MODES).includes(action.payload)) {
        state.mode = action.payload;
      }
    },
    updateDroneDetails: (state, action) => {
      state.droneDetails = { ...state.droneDetails, ...action.payload };
    },
    setStatus: (state, action) => {
      if (Object.values(MISSION_STATUS).includes(action.payload)) {
        state.status = action.payload;
      }
    },
    abortMission: (state) => {
      state.status = MISSION_STATUS.ABORTED;
      state.mode = FLIGHT_MODES.MANUAL;
    },
    completeMission: (state) => {
      if (state.currentMission) {
        state.missionHistory.push({
          ...state.currentMission,
          completedAt: new Date().toISOString(),
          finalStatus: state.status,
        });
      }
      state.status = MISSION_STATUS.COMPLETED;
    },
    resetMission: (state) => {
      state.currentMission = null;
      state.mode = FLIGHT_MODES.MANUAL;
      state.status = MISSION_STATUS.STANDBY;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

// Selectors
export const selectCurrentMission = (state) => state.mission.currentMission;
export const selectMissionStatus = (state) => state.mission.status;
export const selectFlightMode = (state) => state.mission.mode;
export const selectDroneDetails = (state) => state.mission.droneDetails;
export const selectMissionHistory = (state) => state.mission.missionHistory;
export const selectMissionError = (state) => state.mission.error;

export const {
  setMission,
  setMode,
  updateDroneDetails,
  setStatus,
  abortMission,
  completeMission,
  resetMission,
  setError,
} = missionSlice.actions;

export default missionSlice.reducer;
