import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MissionState {
  list: any[];
  currentMission: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: MissionState = {
  list: [],
  currentMission: null,
  loading: false,
  error: null,
};

const missionSlice = createSlice({
  name: 'missions',
  initialState,
  reducers: {
    setMissions: (state, action: PayloadAction<any[]>) => {
      state.list = action.payload;
    },
    setCurrentMission: (state, action: PayloadAction<any>) => {
      state.currentMission = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setMissions, setCurrentMission, setLoading } = missionSlice.actions;
export default missionSlice.reducer;
