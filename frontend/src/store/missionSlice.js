import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentMission: null,
  mode: 'MANUAL', // MANUAL, AUTOMATED
  status: 'STANDBY', // STANDBY, ACTIVE, PAUSED, COMPLETED
  droneDetails: {
    altitude: 0,
    speed: 0,
    battery: 100,
    signal: 'STRONG',
  }
};

const missionSlice = createSlice({
  name: 'mission',
  initialState,
  reducers: {
    setMission: (state, action) => {
      state.currentMission = action.payload;
    },
    setMode: (state, action) => {
      state.mode = action.payload;
    },
    updateDroneDetails: (state, action) => {
      state.droneDetails = { ...state.droneDetails, ...action.payload };
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    }
  },
});

export const { setMission, setMode, updateDroneDetails, setStatus } = missionSlice.actions;
export default missionSlice.reducer;
