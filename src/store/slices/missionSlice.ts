import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Mission Slice - Quản lý trạng thái nhiệm vụ bay của Drone/UAV
 * Task: LTJ-4 (Sprint 1) → Nâng cấp LTJ-19 (Sprint 4)
 * Author: Quatrungvoon
 *
 * Sprint 4 Enhancements:
 * - Mission now stores waypoint route data from FlightPathPlanner
 * - Track mission creation timestamp and mission name
 * - Save/load mission route for review or re-editing
 */

// Các hằng số cho chế độ bay
export const FlightMode = {
  MANUAL: 'MANUAL',
  AUTOMATED: 'AUTOMATED',
} as const;
export type FlightMode = (typeof FlightMode)[keyof typeof FlightMode];

// Các hằng số cho trạng thái nhiệm vụ
export const MissionStatus = {
  STANDBY: 'STANDBY',
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
} as const;
export type MissionStatus = (typeof MissionStatus)[keyof typeof MissionStatus];

// Các hằng số cho mức tín hiệu
export const SignalLevel = {
  STRONG: 'STRONG',
  MEDIUM: 'MEDIUM',
  WEAK: 'WEAK',
  LOST: 'LOST',
} as const;
export type SignalLevel = (typeof SignalLevel)[keyof typeof SignalLevel];

export interface DroneDetails {
  altitude: number;
  speed: number;
  battery: number;
  signal: SignalLevel;
  satellites: number;
  latitude: number;
  longitude: number;
}

/** Saved mission route data (Sprint 4) */
export interface MissionRouteData {
  missionName: string;
  waypointCount: number;
  totalDistanceM: number;
  estimatedTimeSeconds: number;
  estimatedBatteryDrain: number;
  createdAt: string;
  waypointsJson: string; // Serialized waypoints JSON for API payload
}

export interface MissionState {
  currentMission: MissionRouteData | null;
  mode: FlightMode;
  status: MissionStatus;
  droneDetails: DroneDetails;
  missionHistory: MissionRouteData[];
  error: string | null;
}

const initialState: MissionState = {
  currentMission: null,
  mode: FlightMode.MANUAL,
  status: MissionStatus.STANDBY,
  droneDetails: {
    altitude: 0,
    speed: 0,
    battery: 100,
    signal: SignalLevel.STRONG,
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
    /** Save a planned mission route (from FlightPathPlanner) */
    saveMissionRoute: (state, action: PayloadAction<MissionRouteData>) => {
      state.currentMission = action.payload;
      state.status = MissionStatus.PLANNING;
      state.error = null;
    },

    setMission: (state, action: PayloadAction<MissionRouteData>) => {
      state.currentMission = action.payload;
      state.error = null;
    },
    setMode: (state, action: PayloadAction<FlightMode>) => {
      state.mode = action.payload;
    },
    updateDroneDetails: (state, action: PayloadAction<Partial<DroneDetails>>) => {
      state.droneDetails = { ...state.droneDetails, ...action.payload };
    },
    setStatus: (state, action: PayloadAction<MissionStatus>) => {
      state.status = action.payload;
    },
    abortMission: (state) => {
      state.status = MissionStatus.ABORTED;
      state.mode = FlightMode.MANUAL;
    },
    completeMission: (state) => {
      if (state.currentMission) {
        state.missionHistory.push({
          ...state.currentMission,
        });
      }
      state.status = MissionStatus.COMPLETED;
    },
    resetMission: (state) => {
      state.currentMission = null;
      state.mode = FlightMode.MANUAL;
      state.status = MissionStatus.STANDBY;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  saveMissionRoute,
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
