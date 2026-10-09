import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './slices/missionSlice';

export const store = configureStore({
  reducer: {
    missions: missionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
