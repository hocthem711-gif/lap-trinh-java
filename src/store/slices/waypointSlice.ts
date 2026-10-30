import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

/**
 * Waypoint Slice - Quản lý danh sách các điểm bay (Waypoints) trên bản đồ
 * Task: LTJ-4 (Sprint 1) → Nâng cấp LTJ-19 (Sprint 4)
 * Author: Quatrungvoon
 *
 * Sprint 4 Enhancements:
 * - Haversine formula for real GPS distance calculation
 * - Per-waypoint altitude & speed configuration
 * - Undo last waypoint / Clear all route
 * - Drag-and-drop GPS coordinate update
 * - Geofence boundary validation
 * - Estimated flight time & battery consumption
 * - Export JSON payload for backend REST API (Dev 2 - LTJ-17)
 */

// ==================== Constants ====================

export const WaypointType = {
  NORMAL: 'NORMAL',
  TAKEOFF: 'TAKEOFF',
  LANDING: 'LANDING',
  HOVER: 'HOVER',
  RETURN_HOME: 'RETURN_HOME',
} as const;
export type WaypointType = (typeof WaypointType)[keyof typeof WaypointType];

/** Default flight parameters */
export const DEFAULT_ALTITUDE = 50;   // meters
export const DEFAULT_SPEED = 8;       // m/s
export const BATTERY_DRAIN_RATE = 0.35; // % per minute of flight

/** Geofence boundary — SmartFarm area (polygon bounding box) */
export const GEOFENCE_BOUNDS = {
  minLat: 10.840,
  maxLat: 10.860,
  minLng: 106.760,
  maxLng: 106.790,
};

// ==================== Interfaces ====================

export interface Waypoint {
  id: number;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  type: WaypointType;
  order: number;
  isOutOfBounds: boolean;
}

export interface FlightTelemetry {
  totalDistanceM: number;       // meters
  totalDistanceKm: number;      // kilometers
  estimatedTimeSeconds: number; // seconds
  estimatedTimeFormatted: string; // "mm:ss"
  estimatedBatteryDrain: number;  // percentage
}

interface WaypointState {
  waypoints: Waypoint[];
  selectedWaypointId: number | null;
  isDrawingMode: boolean;
  defaultAltitude: number;
  defaultSpeed: number;
  telemetry: FlightTelemetry;
}

// ==================== Haversine Distance ====================

/**
 * Calculate the great-circle distance between two GPS coordinates
 * using the Haversine formula. Returns distance in METERS.
 */
const haversineDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number => {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/** Check if a coordinate is within the geofence boundary */
const isWithinGeofence = (lat: number, lng: number): boolean => {
  return (
    lat >= GEOFENCE_BOUNDS.minLat &&
    lat <= GEOFENCE_BOUNDS.maxLat &&
    lng >= GEOFENCE_BOUNDS.minLng &&
    lng <= GEOFENCE_BOUNDS.maxLng
  );
};

/** Recalculate all flight telemetry from waypoints array */
const recalcTelemetry = (waypoints: Waypoint[]): FlightTelemetry => {
  if (waypoints.length < 2) {
    return {
      totalDistanceM: 0,
      totalDistanceKm: 0,
      estimatedTimeSeconds: 0,
      estimatedTimeFormatted: '00:00',
      estimatedBatteryDrain: 0,
    };
  }

  let totalDistanceM = 0;
  let totalTimeSeconds = 0;

  for (let i = 1; i < waypoints.length; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];

    // Horizontal distance via Haversine
    const hDist = haversineDistance(
      prev.latitude, prev.longitude,
      curr.latitude, curr.longitude,
    );

    // Vertical difference (altitude change)
    const vDist = Math.abs(curr.altitude - prev.altitude);

    // 3D distance (hypotenuse)
    const segDist = Math.sqrt(hDist * hDist + vDist * vDist);
    totalDistanceM += segDist;

    // Time for this segment based on the destination waypoint's speed
    const speed = curr.speed > 0 ? curr.speed : DEFAULT_SPEED;
    totalTimeSeconds += segDist / speed;
  }

  const totalMinutes = totalTimeSeconds / 60;
  const mins = Math.floor(totalMinutes);
  const secs = Math.floor(totalTimeSeconds % 60);

  return {
    totalDistanceM: Math.round(totalDistanceM * 100) / 100,
    totalDistanceKm: Math.round((totalDistanceM / 1000) * 1000) / 1000,
    estimatedTimeSeconds: Math.round(totalTimeSeconds),
    estimatedTimeFormatted: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
    estimatedBatteryDrain: Math.round(totalMinutes * BATTERY_DRAIN_RATE * 100) / 100,
  };
};

// ==================== Slice ====================

let nextWaypointId = 1;

const initialState: WaypointState = {
  waypoints: [],
  selectedWaypointId: null,
  isDrawingMode: false,
  defaultAltitude: DEFAULT_ALTITUDE,
  defaultSpeed: DEFAULT_SPEED,
  telemetry: {
    totalDistanceM: 0,
    totalDistanceKm: 0,
    estimatedTimeSeconds: 0,
    estimatedTimeFormatted: '00:00',
    estimatedBatteryDrain: 0,
  },
};

const waypointSlice = createSlice({
  name: 'waypoint',
  initialState,
  reducers: {
    /** Add a new waypoint from map click */
    addWaypoint: (state, action: PayloadAction<{
      latitude: number;
      longitude: number;
      altitude?: number;
      speed?: number;
      type?: WaypointType;
    }>) => {
      const { latitude, longitude } = action.payload;
      const newWaypoint: Waypoint = {
        id: nextWaypointId++,
        latitude,
        longitude,
        altitude: action.payload.altitude ?? state.defaultAltitude,
        speed: action.payload.speed ?? state.defaultSpeed,
        type: action.payload.type ?? WaypointType.NORMAL,
        order: state.waypoints.length + 1,
        isOutOfBounds: !isWithinGeofence(latitude, longitude),
      };
      state.waypoints.push(newWaypoint);
      state.telemetry = recalcTelemetry(state.waypoints);
    },

    /** Remove a specific waypoint by ID */
    removeWaypoint: (state, action: PayloadAction<number>) => {
      state.waypoints = state.waypoints
        .filter(wp => wp.id !== action.payload)
        .map((wp, index) => ({ ...wp, order: index + 1 }));
      if (state.selectedWaypointId === action.payload) {
        state.selectedWaypointId = null;
      }
      state.telemetry = recalcTelemetry(state.waypoints);
    },

    /** Undo: remove the last waypoint added */
    undoLastWaypoint: (state) => {
      if (state.waypoints.length > 0) {
        const removed = state.waypoints.pop();
        if (removed && state.selectedWaypointId === removed.id) {
          state.selectedWaypointId = null;
        }
        state.telemetry = recalcTelemetry(state.waypoints);
      }
    },

    /** Update waypoint properties (e.g. after drag, edit altitude/speed) */
    updateWaypoint: (state, action: PayloadAction<Partial<Waypoint> & { id: number }>) => {
      const index = state.waypoints.findIndex(wp => wp.id === action.payload.id);
      if (index !== -1) {
        const updated = { ...state.waypoints[index], ...action.payload };
        // Re-check geofence if coordinates changed
        if (action.payload.latitude !== undefined || action.payload.longitude !== undefined) {
          updated.isOutOfBounds = !isWithinGeofence(updated.latitude, updated.longitude);
        }
        state.waypoints[index] = updated;
        state.telemetry = recalcTelemetry(state.waypoints);
      }
    },

    /** Select/deselect a waypoint */
    selectWaypoint: (state, action: PayloadAction<number | null>) => {
      state.selectedWaypointId = action.payload;
    },

    /** Clear all waypoints and reset */
    clearWaypoints: (state) => {
      state.waypoints = [];
      state.selectedWaypointId = null;
      state.isDrawingMode = false;
      state.telemetry = recalcTelemetry([]);
      nextWaypointId = 1;
    },

    /** Reorder waypoints (drag in list) */
    reorderWaypoints: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      const [moved] = state.waypoints.splice(fromIndex, 1);
      state.waypoints.splice(toIndex, 0, moved);
      state.waypoints = state.waypoints.map((wp, index) => ({
        ...wp,
        order: index + 1,
      }));
      state.telemetry = recalcTelemetry(state.waypoints);
    },

    /** Toggle drawing mode on/off */
    setDrawingMode: (state, action: PayloadAction<boolean>) => {
      state.isDrawingMode = action.payload;
    },

    /** Update default altitude for new waypoints */
    setDefaultAltitude: (state, action: PayloadAction<number>) => {
      state.defaultAltitude = Math.max(5, Math.min(500, action.payload));
    },

    /** Update default speed for new waypoints */
    setDefaultSpeed: (state, action: PayloadAction<number>) => {
      state.defaultSpeed = Math.max(1, Math.min(30, action.payload));
    },

    /** Batch update altitude for all waypoints */
    setAllAltitude: (state, action: PayloadAction<number>) => {
      const alt = Math.max(5, Math.min(500, action.payload));
      state.waypoints = state.waypoints.map(wp => ({ ...wp, altitude: alt }));
      state.defaultAltitude = alt;
      state.telemetry = recalcTelemetry(state.waypoints);
    },

    /** Batch update speed for all waypoints */
    setAllSpeed: (state, action: PayloadAction<number>) => {
      const spd = Math.max(1, Math.min(30, action.payload));
      state.waypoints = state.waypoints.map(wp => ({ ...wp, speed: spd }));
      state.defaultSpeed = spd;
      state.telemetry = recalcTelemetry(state.waypoints);
    },
  },
});

export const {
  addWaypoint,
  removeWaypoint,
  undoLastWaypoint,
  updateWaypoint,
  selectWaypoint,
  clearWaypoints,
  reorderWaypoints,
  setDrawingMode,
  setDefaultAltitude,
  setDefaultSpeed,
  setAllAltitude,
  setAllSpeed,
} = waypointSlice.actions;

// ==================== Selectors ====================

export const selectWaypoints = (state: { waypoint: WaypointState }) => state.waypoint.waypoints;
export const selectTelemetry = (state: { waypoint: WaypointState }) => state.waypoint.telemetry;
export const selectIsDrawingMode = (state: { waypoint: WaypointState }) => state.waypoint.isDrawingMode;
export const selectSelectedWaypointId = (state: { waypoint: WaypointState }) => state.waypoint.selectedWaypointId;
export const selectDefaultAltitude = (state: { waypoint: WaypointState }) => state.waypoint.defaultAltitude;
export const selectDefaultSpeed = (state: { waypoint: WaypointState }) => state.waypoint.defaultSpeed;
export const selectHasOutOfBoundsWaypoints = (state: { waypoint: WaypointState }) =>
  state.waypoint.waypoints.some(wp => wp.isOutOfBounds);

/**
 * Generate JSON payload for backend REST API (Dev 2 - Task LTJ-17)
 * POST /api/v1/missions
 */
export const selectMissionPayload = (state: { waypoint: WaypointState }) => ({
  waypoints: state.waypoint.waypoints.map(wp => ({
    order: wp.order,
    latitude: wp.latitude,
    longitude: wp.longitude,
    altitude: wp.altitude,
    speed: wp.speed,
    type: wp.type,
  })),
  totalDistanceM: state.waypoint.telemetry.totalDistanceM,
  estimatedTimeSeconds: state.waypoint.telemetry.estimatedTimeSeconds,
  estimatedBatteryDrain: state.waypoint.telemetry.estimatedBatteryDrain,
});

export default waypointSlice.reducer;
