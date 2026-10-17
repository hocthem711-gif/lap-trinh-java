import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './slices/missionSlice';
import waypointReducer from './slices/waypointSlice';
import deviceReducer from './slices/deviceSlice';
import sensorReducer from './slices/sensorSlice';

export const store = configureStore({
  reducer: {
    mission: missionReducer,
    waypoint: waypointReducer,
    device: deviceReducer,
    sensor: sensorReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Typed hooks helper
export const useAppDispatch = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useDispatch } = require('react-redux');
  return useDispatch<AppDispatch>();
};

export default store;
