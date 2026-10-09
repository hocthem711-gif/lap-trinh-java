import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './slices/missionSlice';
import waypointReducer from './slices/waypointSlice';

export const store = configureStore({
  reducer: {
    mission: missionReducer,
    waypoint: waypointReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
