import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Mission Slice - Quản lý trạng thái nhiệm vụ bay của Drone/UAV
 * Task: LTJ-4 - Setup React Redux state management for Mission Dashboard
 * Author: Quatrungvoon
 */

// Các hằng số cho chế độ bay
export enum FlightMode {
  MANUAL = 'MANUAL',
  AUTOMATED = 'AUTOMATED',
}

// Các hằng số cho trạng thái nhiệm vụ
export enum MissionStatus {
  STANDBY = 'STANDBY',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

// Các hằng số cho mức tín hiệu
export enum SignalLevel {
  STRONG = 'STRONG',
  MEDIUM = 'MEDIUM',
  WEAK = 'WEAK',
  LOST = 'LOST',
}

export interface DroneDetails {
  altitude: number;
  speed: number;
  battery: number;
  signal: SignalLevel;
  satellites: number;
  latitude: number;
  longitude: number;
}

export interface MissionState {
  currentMission: any | null;
  mode: FlightMode;
  status: MissionStatus;
  droneDetails: DroneDetails;
  missionHistory: any[];
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
    setMission: (state, action: PayloadAction<any>) => {
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
          completedAt: new Date().toISOString(),
          finalStatus: state.status,
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
