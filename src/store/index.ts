import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './slices/missionSlice';
import waypointReducer from './slices/waypointSlice';
import deviceReducer from './slices/deviceSlice';
import sensorReducer from './slices/sensorSlice';
import sensorRealtimeReducer from './slices/sensorRealtimeSlice';
import analyticsReducer from './slices/analyticsSlice';
import alertReducer from './slices/alertSlice';

export const store = configureStore({
  reducer: {
    mission: missionReducer,
    waypoint: waypointReducer,
    device: deviceReducer,
    sensor: sensorReducer,
    sensorRealtime: sensorRealtimeReducer,
    analytics: analyticsReducer,
    alert: alertReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
