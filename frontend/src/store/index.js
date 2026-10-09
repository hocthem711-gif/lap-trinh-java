import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './missionSlice';
import waypointReducer from './waypointSlice';

export const store = configureStore({
  reducer: {
    mission: missionReducer,
    waypoint: waypointReducer,
  },
});

export default store;
