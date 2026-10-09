import { configureStore } from '@reduxjs/toolkit';
import missionReducer from './missionSlice';
import waypointReducer from './waypointSlice';

/**
 * Redux Store - Cấu hình kho lưu trữ trạng thái trung tâm
 * Task: LTJ-4 - Setup React Redux state management for Mission Dashboard
 * Author: Quatrungvoon
 *
 * Store bao gồm:
 * - mission: Quản lý trạng thái nhiệm vụ bay (mode, status, drone details)
 * - waypoint: Quản lý danh sách điểm bay (waypoints, selection, reorder)
 */

export const store = configureStore({
  reducer: {
    mission: missionReducer,
    waypoint: waypointReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;
