/**
 * Redux Toolkit Slice — Sidebar Giám sát Chuyến bay & Note Mission (F16)
 * Task: LTJ-34 - Sprint 7
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type {
  FlightMonitorStatus,
  MissionNote,
  MissionNoteCategory,
  MissionNoteDraft,
  MissionNoteFilter,
  MissionNotePriority,
  UavFlightSession,
} from '../../types/flightMonitor';
import {
  FLIGHT_STATUS_CONFIG,
} from '../../types/flightMonitor';
import {
  advanceFlightSessionTick,
  createMissionNoteApi,
  deleteMissionNoteApi,
  fetchFlightSessions,
  fetchMissionNotes,
  resetFlightMonitorDemoData,
  saveStoredNotes,
  saveStoredSessions,
  updateMissionFlightStatusApi,
  updateMissionNoteApi,
  upsertPlannedRouteIntoSessions,
  loadStoredSessions,
  type PlannedMissionSyncPayload,
} from '../../services/flightMonitorService';
import { createUAV, deleteUAV } from './deviceSlice';

// ==================== STATE INTERFACE ====================

export interface FlightMonitorState {
  sessions: UavFlightSession[];
  selectedUavId: string;
  isStreaming: boolean;
  notes: MissionNote[];
  noteFilter: MissionNoteFilter;
  editingNoteId: number | null;
  loading: boolean;
  lastActionMessage: string | null;
}

const initialState: FlightMonitorState = {
  sessions: [],
  selectedUavId: 'UAV-001',
  isStreaming: true,
  notes: [],
  noteFilter: {
    uavId: 'ALL',
    category: 'ALL',
    priority: 'ALL',
    flightStatus: 'ALL',
    onlyPinned: false,
    searchQuery: '',
  },
  editingNoteId: null,
  loading: false,
  lastActionMessage: null,
};

// ==================== ASYNC THUNKS ====================

export const initFlightMonitorData = createAsyncThunk(
  'flightMonitor/initData',
  async () => {
    const [sessions, notes] = await Promise.all([
      fetchFlightSessions(),
      fetchMissionNotes(),
    ]);
    return { sessions, notes };
  },
);

export const changeUavFlightStatus = createAsyncThunk(
  'flightMonitor/changeStatus',
  async ({
    missionId,
    newStatus,
    customErrorReason,
  }: {
    missionId: number;
    newStatus: FlightMonitorStatus;
    customErrorReason?: string;
  }) => {
    await updateMissionFlightStatusApi(missionId, newStatus);
    return { missionId, newStatus, customErrorReason };
  },
);

export const addManualMissionNote = createAsyncThunk(
  'flightMonitor/addNote',
  async ({
    draft,
    session,
  }: {
    draft: MissionNoteDraft;
    session: UavFlightSession;
  }) => {
    return await createMissionNoteApi(draft, session);
  },
);

export const editManualMissionNote = createAsyncThunk(
  'flightMonitor/editNote',
  async ({
    noteId,
    updates,
  }: {
    noteId: number;
    updates: Partial<
      Pick<
        MissionNote,
        | 'title'
        | 'content'
        | 'category'
        | 'priority'
        | 'waypointOrder'
        | 'author'
        | 'isPinned'
      >
    >;
  }) => {
    return await updateMissionNoteApi(noteId, updates);
  },
);

export const removeManualMissionNote = createAsyncThunk(
  'flightMonitor/removeNote',
  async (noteId: number) => {
    return await deleteMissionNoteApi(noteId);
  },
);

// ==================== SLICE ====================

const flightMonitorSlice = createSlice({
  name: 'flightMonitor',
  initialState,
  reducers: {
    selectFlightUav: (state, action: PayloadAction<string>) => {
      state.selectedUavId = action.payload;
    },

    toggleTelemetryStream: (state) => {
      state.isStreaming = !state.isStreaming;
      state.lastActionMessage = state.isStreaming
        ? 'Đã bật luồng nội suy Telemetry chuyến bay thời gian thực (2s/nhịp).'
        : 'Đã tạm dừng luồng Telemetry trực tiếp.';
    },

    tickAllFlightSessions: (state) => {
      state.sessions = state.sessions.map((s) => advanceFlightSessionTick(s));
      saveStoredSessions(state.sessions);
    },

    adjustUavBatteryManual: (
      state,
      action: PayloadAction<{ uavId: string; batteryPercent: number }>,
    ) => {
      const { uavId, batteryPercent } = action.payload;
      const clamped = Math.max(5, Math.min(100, Math.round(batteryPercent)));
      state.sessions = state.sessions.map((s) => {
        if (s.uavId !== uavId) return s;
        const nextStatus: FlightMonitorStatus =
          clamped <= 20 && s.status === 'FLYING' ? 'RETURNING' : s.status;
        return {
          ...s,
          batteryPercent: clamped,
          batteryVoltageV: Number((42 + (clamped / 100) * 10.4).toFixed(1)),
          status: nextStatus,
          segmentProgress:
            nextStatus === 'RETURNING' && s.status !== 'RETURNING' ? 0 : s.segmentProgress,
          lastTelemetryAt: new Date().toISOString(),
        };
      });
      saveStoredSessions(state.sessions);
      state.lastActionMessage = `Đã cập nhật mức pin của ${uavId} thành ${clamped}%${
        clamped <= 20 ? ' (Tự động kích hoạt chế độ Về trạm RTH do pin yếu!)' : ''
      }.`;
    },

    jumpToWaypoint: (
      state,
      action: PayloadAction<{ uavId: string; waypointOrder: number }>,
    ) => {
      const { uavId, waypointOrder } = action.payload;
      const timeStr = new Date().toTimeString().slice(0, 8);
      state.sessions = state.sessions.map((s) => {
        if (s.uavId !== uavId) return s;
        const targetWp = s.waypoints.find((w) => w.order === waypointOrder);
        if (!targetWp) return s;

        const updatedWps = s.waypoints.map((w) => {
          if (w.order < waypointOrder) {
            return {
              ...w,
              visitState: 'COMPLETED' as const,
              reachedAt: w.reachedAt || timeStr,
            };
          }
          if (w.order === waypointOrder) {
            return {
              ...w,
              visitState:
                s.status === 'COLLECTION_ERROR'
                  ? ('ERROR' as const)
                  : ('ACTIVE' as const),
              reachedAt: timeStr,
            };
          }
          return {
            ...w,
            visitState: 'PENDING' as const,
            reachedAt: null,
          };
        });

        const completedCount = Math.max(0, waypointOrder - 1);
        const pct = Math.round((completedCount / Math.max(1, s.totalWaypoints)) * 100);

        return {
          ...s,
          latitude: targetWp.latitude,
          longitude: targetWp.longitude,
          altitudeM: targetWp.altitudeM,
          speedMs: targetWp.targetSpeedMs,
          currentWaypointOrder: waypointOrder,
          completedWaypoints: completedCount,
          segmentProgress: 0,
          progressPercent: pct,
          lastTelemetryAt: new Date().toISOString(),
          waypoints: updatedWps,
        };
      });
      saveStoredSessions(state.sessions);
      state.lastActionMessage = `Đã di chuyển ${uavId} tới Waypoint #${waypointOrder}.`;
    },

    setNoteFilterUav: (state, action: PayloadAction<string | 'ALL'>) => {
      state.noteFilter.uavId = action.payload;
    },

    setNoteFilterCategory: (
      state,
      action: PayloadAction<MissionNoteCategory | 'ALL'>,
    ) => {
      state.noteFilter.category = action.payload;
    },

    setNoteFilterPriority: (
      state,
      action: PayloadAction<MissionNotePriority | 'ALL'>,
    ) => {
      state.noteFilter.priority = action.payload;
    },

    setNoteFilterStatus: (
      state,
      action: PayloadAction<FlightMonitorStatus | 'ALL'>,
    ) => {
      state.noteFilter.flightStatus = action.payload;
    },

    toggleNoteFilterPinned: (state) => {
      state.noteFilter.onlyPinned = !state.noteFilter.onlyPinned;
    },

    setNoteSearchQuery: (state, action: PayloadAction<string>) => {
      state.noteFilter.searchQuery = action.payload;
    },

    resetNoteFilters: (state) => {
      state.noteFilter = {
        uavId: 'ALL',
        category: 'ALL',
        priority: 'ALL',
        flightStatus: 'ALL',
        onlyPinned: false,
        searchQuery: '',
      };
    },

    setEditingNoteId: (state, action: PayloadAction<number | null>) => {
      state.editingNoteId = action.payload;
    },

    togglePinNoteLocal: (state, action: PayloadAction<number>) => {
      state.notes = state.notes.map((n) =>
        n.id === action.payload
          ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() }
          : n,
      );
      saveStoredNotes(state.notes);
    },

    restoreFlightMonitorDefaults: (state) => {
      const { sessions, notes } = resetFlightMonitorDemoData();
      state.sessions = sessions;
      state.notes = notes;
      state.selectedUavId = 'UAV-001';
      state.editingNoteId = null;
      state.lastActionMessage =
        'Đã khôi phục toàn bộ dữ liệu mẫu cho 4 chuyến bay UAV và danh sách Note Mission (F16).';
    },

    syncPlannedMissionToMonitor: (
      state,
      action: PayloadAction<PlannedMissionSyncPayload>,
    ) => {
      state.sessions = upsertPlannedRouteIntoSessions(
        state.sessions,
        action.payload,
      );
      state.selectedUavId = action.payload.uavId;
      state.isStreaming = true;
      state.lastActionMessage = `Đã đồng bộ lộ trình "${action.payload.missionName}" (${action.payload.waypoints.length} Waypoints) cho ${action.payload.uavId}.`;
    },

    clearFlightActionMessage: (state) => {
      state.lastActionMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initFlightMonitorData.pending, (state) => {
        state.loading = true;
      })
      .addCase(initFlightMonitorData.fulfilled, (state, action) => {
        state.loading = false;
        state.sessions = action.payload.sessions;
        state.notes = action.payload.notes;
      })
      .addCase(initFlightMonitorData.rejected, (state) => {
        state.loading = false;
      })
      .addCase(changeUavFlightStatus.fulfilled, (state, action) => {
        const { missionId, newStatus, customErrorReason } = action.payload;
        let restartedNote = '';
        state.sessions = state.sessions.map((s) => {
          if (s.missionId !== missionId) return s;

          // Khi bấm "Đang bay" (FLYING) trên chuyến bay đã COMPLETED hoặc đã chạm WP cuối,
          // tự động reset lộ trình về Waypoint #1 -> #2 để không bị advanceFlightSessionTick giật ngược về RETURNING sau 2s.
          const isRouteFinished =
            s.status === 'COMPLETED' ||
            s.status === 'STANDBY' ||
            s.completedWaypoints >= s.totalWaypoints ||
            (s.currentWaypointOrder >= s.totalWaypoints && s.segmentProgress >= 1);
          const shouldRestartRoute = newStatus === 'FLYING' && isRouteFinished;
          const needsSafeBattery = newStatus === 'FLYING' && s.batteryPercent < 45;

          if (shouldRestartRoute || needsSafeBattery) {
            restartedNote = needsSafeBattery
              ? ' (Đã sạc pin an toàn 92% & xuất phát từ điểm #1)'
              : ' (Đã xuất phát lại từ điểm #1)';
          }

          if (shouldRestartRoute) {
            const firstWp = s.waypoints[0];
            const nextOrder = s.waypoints.length > 1 ? 2 : 1;
            const nextBattery = needsSafeBattery ? 92 : s.batteryPercent;
            const resetWaypoints = s.waypoints.map((wp, idx) => ({
              ...wp,
              visitState:
                idx === 0
                  ? ('COMPLETED' as const)
                  : idx === 1
                    ? ('ACTIVE' as const)
                    : ('PENDING' as const),
              reachedAt: idx === 0 ? new Date().toTimeString().slice(0, 8) : null,
            }));

            return {
              ...s,
              status: 'FLYING',
              latitude: firstWp ? firstWp.latitude : s.homeLatitude,
              longitude: firstWp ? firstWp.longitude : s.homeLongitude,
              altitudeM: firstWp ? firstWp.altitudeM : 30,
              speedMs: firstWp ? firstWp.targetSpeedMs : 8.5,
              batteryPercent: nextBattery,
              batteryVoltageV: Number((42 + (nextBattery / 100) * 10.4).toFixed(1)),
              currentWaypointOrder: nextOrder,
              completedWaypoints: 1,
              segmentProgress: 0,
              progressPercent: 0,
              distanceTraveledM: 0,
              errorReason: null,
              lastTelemetryAt: new Date().toISOString(),
              waypoints: resetWaypoints,
            };
          }

          const nextBattery = needsSafeBattery ? 92 : s.batteryPercent;
          const updatedWaypoints = s.waypoints.map((wp) => {
            if (wp.order === s.currentWaypointOrder) {
              return {
                ...wp,
                visitState:
                  newStatus === 'COLLECTION_ERROR'
                    ? ('ERROR' as const)
                    : ('ACTIVE' as const),
                errorPackets:
                  newStatus === 'COLLECTION_ERROR'
                    ? Math.max(5, wp.errorPackets + 4)
                    : wp.errorPackets,
              };
            }
            return wp;
          });

          return {
            ...s,
            status: newStatus,
            batteryPercent: nextBattery,
            batteryVoltageV: Number((42 + (nextBattery / 100) * 10.4).toFixed(1)),
            // Bắt đầu chặng RTH mới luôn từ alpha = 0 tại vị trí hiện tại (tránh teleport về Home)
            segmentProgress:
              newStatus === 'RETURNING' && s.status !== 'RETURNING'
                ? 0
                : s.segmentProgress,
            speedMs:
              newStatus === 'FLYING'
                ? 8.5
                : newStatus === 'RETURNING'
                  ? 10.2
                  : newStatus === 'COLLECTION_ERROR'
                    ? 0.3
                    : 0,
            packetErrors:
              newStatus === 'COLLECTION_ERROR'
                ? Math.max(8, s.packetErrors + 5)
                : s.packetErrors,
            errorReason:
              newStatus === 'COLLECTION_ERROR'
                ? customErrorReason ||
                  `Lỗi thu thập gói tin cảm biến tại Waypoint #${s.currentWaypointOrder} (Mất kết nối MQTT nút dưới đất & CRC Timeout)`
                : null,
            lastTelemetryAt: new Date().toISOString(),
            waypoints: updatedWaypoints,
          };
        });
        saveStoredSessions(state.sessions);
        const label = FLIGHT_STATUS_CONFIG[newStatus].label;
        state.lastActionMessage = `Đã chuyển trạng thái nhiệm vụ #${missionId} sang "${label}"${restartedNote}.`;
      })
      .addCase(addManualMissionNote.fulfilled, (state, action) => {
        state.notes = [action.payload, ...state.notes];
        state.lastActionMessage = `Đã lưu ghi chú thủ công (F16): "${action.payload.title}" kèm tọa độ GPS & trạng thái bay.`;
      })
      .addCase(editManualMissionNote.fulfilled, (state, action) => {
        const { noteId, updates } = action.payload;
        state.notes = state.notes.map((n) =>
          n.id === noteId ? { ...n, ...updates } : n,
        );
        state.editingNoteId = null;
        state.lastActionMessage = `Đã cập nhật thành công ghi chú #${noteId}.`;
      })
      .addCase(removeManualMissionNote.fulfilled, (state, action) => {
        state.notes = state.notes.filter((n) => n.id !== action.payload);
        if (state.editingNoteId === action.payload) {
          state.editingNoteId = null;
        }
        state.lastActionMessage = `Đã xóa ghi chú #${action.payload} khỏi nhật ký nhiệm vụ.`;
      })
      .addCase(createUAV.fulfilled, (state, action) => {
        const base = state.sessions.length > 0 ? state.sessions : loadStoredSessions();
        if (!base.some((s) => s.uavId === action.payload.id)) {
          const uav = action.payload;
          const seq = 70 + base.length + 1;
          const nowIso = new Date().toISOString();
          const newSession: UavFlightSession = {
            missionId: 700 + base.length + 1,
            missionCode: `MSN-2026-${String(seq).padStart(3, '0')}`,
            missionName: `Nhiệm vụ khảo sát định kỳ (${uav.id})`,
            uavId: uav.id,
            uavName: uav.name,
            uavModel: uav.model,
            zoneId: 1,
            zoneName: uav.location || 'Khu A - Trang Trại Công Nghệ Cao Đà Lạt',
            status: uav.status === 'ACTIVE' ? 'FLYING' : 'STANDBY',
            batteryPercent: uav.battery,
            batteryVoltageV: Number((42 + (uav.battery / 100) * 10.4).toFixed(1)),
            batteryTempC: 30.5,
            signalStrength: uav.signal || 95,
            altitudeM: uav.status === 'ACTIVE' ? 35 : 0,
            speedMs: uav.status === 'ACTIVE' ? 8 : 0,
            headingDeg: 45,
            satellites: 18,
            latitude: 11.9408,
            longitude: 108.4589,
            homeLatitude: 11.9408,
            homeLongitude: 108.4589,
            currentWaypointOrder: uav.status === 'ACTIVE' ? 2 : 1,
            completedWaypoints: uav.status === 'ACTIVE' ? 1 : 0,
            totalWaypoints: 3,
            segmentProgress: 0,
            progressPercent: 0,
            distanceTraveledM: 0,
            totalRouteDistanceM: 420,
            elapsedSeconds: 0,
            estimatedRemainingSeconds: 120,
            packetsCollected: 0,
            packetErrors: 0,
            errorReason: null,
            startedAt: nowIso,
            lastTelemetryAt: nowIso,
            waypoints: [
              {
                order: 1,
                label: 'WP-01 • Điểm xuất phát (TAKEOFF)',
                latitude: 11.9408,
                longitude: 108.4589,
                altitudeM: 35,
                targetSpeedMs: 8,
                visitState: uav.status === 'ACTIVE' ? 'COMPLETED' : 'PENDING',
                reachedAt: uav.status === 'ACTIVE' ? nowIso.slice(11, 19) : null,
                collectedPackets: 0,
                errorPackets: 0,
              },
              {
                order: 2,
                label: 'WP-02 • Điểm tuần tra trung tâm (NORMAL)',
                latitude: 11.9422,
                longitude: 108.4602,
                altitudeM: 45,
                targetSpeedMs: 8,
                visitState: uav.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING',
                reachedAt: null,
                collectedPackets: 0,
                errorPackets: 0,
              },
              {
                order: 3,
                label: 'WP-03 • Trạm thu hồi (LANDING)',
                latitude: 11.9431,
                longitude: 108.4594,
                altitudeM: 25,
                targetSpeedMs: 5,
                visitState: 'PENDING',
                reachedAt: null,
                collectedPackets: 0,
                errorPackets: 0,
              },
            ],
          };
          state.sessions = [...base, newSession];
          saveStoredSessions(state.sessions);
        }
      })
      .addCase(deleteUAV.fulfilled, (state, action) => {
        const base = state.sessions.length > 0 ? state.sessions : loadStoredSessions();
        const filtered = base.filter((s) => s.uavId !== action.payload);
        state.sessions = filtered;
        if (state.selectedUavId === action.payload) {
          state.selectedUavId = filtered[0]?.uavId ?? '';
        }
        saveStoredSessions(filtered);
      });
  },
});

export const {
  selectFlightUav,
  toggleTelemetryStream,
  tickAllFlightSessions,
  adjustUavBatteryManual,
  jumpToWaypoint,
  setNoteFilterUav,
  setNoteFilterCategory,
  setNoteFilterPriority,
  setNoteFilterStatus,
  toggleNoteFilterPinned,
  setNoteSearchQuery,
  resetNoteFilters,
  setEditingNoteId,
  togglePinNoteLocal,
  restoreFlightMonitorDefaults,
  syncPlannedMissionToMonitor,
  clearFlightActionMessage,
} = flightMonitorSlice.actions;

// ==================== SELECTORS ====================

const selectFlightMonitorRoot = (state: RootState) => state.flightMonitor;

export const selectAllFlightSessions = createSelector(
  [selectFlightMonitorRoot],
  (fm) => fm.sessions,
);

export const selectActiveFlightSession = createSelector(
  [selectFlightMonitorRoot],
  (fm): UavFlightSession | null => {
    if (fm.sessions.length === 0) return null;
    return (
      fm.sessions.find((s) => s.uavId === fm.selectedUavId) || fm.sessions[0]
    );
  },
);

export const selectFilteredMissionNotes = createSelector(
  [selectFlightMonitorRoot],
  (fm): MissionNote[] => {
    const { uavId, category, priority, flightStatus, onlyPinned, searchQuery } =
      fm.noteFilter;
    const q = searchQuery.trim().toLowerCase();

    return fm.notes
      .filter((note) => {
        if (uavId !== 'ALL' && note.uavId !== uavId) return false;
        if (category !== 'ALL' && note.category !== category) return false;
        if (priority !== 'ALL' && note.priority !== priority) return false;
        if (
          flightStatus !== 'ALL' &&
          note.flightStatusAtNote !== flightStatus
        ) {
          return false;
        }
        if (onlyPinned && !note.isPinned) return false;
        if (q) {
          const haystack =
            `${note.title} ${note.content} ${note.uavId} ${note.uavName} ${note.missionCode} ${note.zoneName} ${note.author}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  },
);

export const selectFlightMonitorKpis = createSelector(
  [selectFlightMonitorRoot],
  (fm) => {
    const flyingCount = fm.sessions.filter((s) => s.status === 'FLYING').length;
    const returningCount = fm.sessions.filter(
      (s) => s.status === 'RETURNING',
    ).length;
    const errorCount = fm.sessions.filter(
      (s) => s.status === 'COLLECTION_ERROR',
    ).length;
    const avgBattery =
      fm.sessions.length > 0
        ? Math.round(
            fm.sessions.reduce((acc, s) => acc + s.batteryPercent, 0) /
              fm.sessions.length,
          )
        : 0;
    const totalNotes = fm.notes.length;
    const urgentNotes = fm.notes.filter((n) => n.priority === 'URGENT').length;

    return {
      flyingCount,
      returningCount,
      errorCount,
      avgBattery,
      totalNotes,
      urgentNotes,
    };
  },
);

export default flightMonitorSlice.reducer;
