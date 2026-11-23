// ============================================================================
// SPRINT 8 - LTJ-39: REDUX TOOLKIT SLICE CHO XUẤT EXCEL (F11) & REVIEW MISSION (F17)
// Dev 4: Nguyễn Trường An (Quatrungvoon)
// ============================================================================

import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import {
  EXPORT_DATASET_CATALOG,
  type ExcelExportFilterConfig,
  type ExportDatasetType,
  type ExportExecutionHistoryItem,
  type ExportFileFormat,
  type ExportTimeRange,
  type MissionReviewDecision,
  type MissionReviewRecord,
  type NormalizedExportRow,
  type SubmitMissionReviewPayload,
} from '../../types/missionReviewExport';
import {
  buildExportPreviewDataset,
  loadStoredExportHistory,
  missionReviewExportApi,
} from '../../services/missionReviewExportService';
import type { RootState } from '../index';

export type Sprint8WorkspaceTab =
  | 'SPLIT_VIEW'
  | 'MISSION_REVIEW_F17'
  | 'EXCEL_EXPORT_F11';

interface MissionReviewExportState {
  activeWorkspaceTab: Sprint8WorkspaceTab;
  missionReviews: MissionReviewRecord[];
  selectedMissionId: string;
  reviewDecisionFilter: 'ALL' | MissionReviewDecision;
  selectedWaypointIndex: number;
  exportConfig: ExcelExportFilterConfig;
  allPreviewRows: NormalizedExportRow[];
  exportHistory: ExportExecutionHistoryItem[];
  loading: boolean;
  exporting: boolean;
  submittingReview: boolean;
  error: string | null;
  statusBanner: {
    type: 'success' | 'info' | 'warning';
    text: string;
  } | null;
}

const defaultColumns = EXPORT_DATASET_CATALOG.FULL_WORKBOOK.defaultColumns
  .filter((c) => c.enabledByDefault)
  .map((c) => c.key);

const initialState: MissionReviewExportState = {
  activeWorkspaceTab: 'SPLIT_VIEW',
  missionReviews: [],
  selectedMissionId: 'MSN-2026-071',
  reviewDecisionFilter: 'ALL',
  selectedWaypointIndex: 0,
  exportConfig: {
    datasetType: 'FULL_WORKBOOK',
    fileFormat: 'XLSX',
    timeRange: 'ALL',
    zoneFilter: 'ALL',
    missionIdFilter: 'ALL',
    alertSeverityFilter: 'ALL',
    searchKeyword: '',
    includeSummaryHeader: true,
    includeTelemetrySnapshot: true,
    selectedColumnKeys: defaultColumns,
    customFileNamePrefix: 'SmartFarm_BaoCao_Sprint8',
  },
  allPreviewRows: [],
  exportHistory: [],
  loading: false,
  exporting: false,
  submittingReview: false,
  error: null,
  statusBanner: null,
};

// ============================================================================
// ASYNC THUNKS
// ============================================================================

export const initializeMissionReviewExportData = createAsyncThunk(
  'missionReviewExport/initialize',
  async () => {
    const reviews = await missionReviewExportApi.getMissionReviews();
    const previewRows = await buildExportPreviewDataset(reviews);
    const history = loadStoredExportHistory();
    return { reviews, previewRows, history };
  }
);

export const submitMissionReviewSignOff = createAsyncThunk(
  'missionReviewExport/submitSignOff',
  async (payload: SubmitMissionReviewPayload) => {
    const updatedRecord = await missionReviewExportApi.submitMissionReview(payload);
    const allReviews = await missionReviewExportApi.getMissionReviews();
    const previewRows = await buildExportPreviewDataset(allReviews);
    return { updatedRecord, allReviews, previewRows };
  }
);

const TIME_RANGE_HOURS: Record<Exclude<ExportTimeRange, 'ALL'>, number> = {
  '24H': 24,
  '7D': 24 * 7,
  '30D': 24 * 30,
};

const ZONE_PREFIX_PATTERNS: Record<string, string[]> = {
  'ZONE-A': ['khu a', 'khu vực a'],
  'ZONE-B': ['khu b', 'khu vực b'],
  'ZONE-C': ['khu c', 'khu vực c'],
};

/**
 * Lọc danh sách bản ghi xuất theo đầy đủ cấu hình (datasetType, zoneFilter, timeRange,
 * missionIdFilter, alertSeverityFilter, searchKeyword).
 */
export function filterExportRowsByConfig(
  rows: NormalizedExportRow[],
  cfg: ExcelExportFilterConfig
): NormalizedExportRow[] {
  const keyword = cfg.searchKeyword.trim().toLowerCase();
  const missionTarget =
    cfg.missionIdFilter && cfg.missionIdFilter !== 'ALL'
      ? cfg.missionIdFilter.trim().toLowerCase()
      : null;
  const zonePatterns =
    cfg.zoneFilter !== 'ALL' ? ZONE_PREFIX_PATTERNS[cfg.zoneFilter] : undefined;
  const cutoffMs =
    cfg.timeRange !== 'ALL'
      ? Date.now() - TIME_RANGE_HOURS[cfg.timeRange] * 60 * 60 * 1000
      : null;

  return rows.filter((row) => {
    if (
      cfg.datasetType !== 'FULL_WORKBOOK' &&
      row.datasetType !== cfg.datasetType
    ) {
      return false;
    }

    if (zonePatterns) {
      const normalizedZone = row.zoneName.toLowerCase();
      if (!zonePatterns.some((p) => normalizedZone.includes(p))) {
        return false;
      }
    }

    if (cutoffMs !== null && row.timestamp) {
      const normalizedTs = row.timestamp.includes('T')
        ? row.timestamp
        : row.timestamp.replace(' ', 'T');
      const rowMs = new Date(normalizedTs).getTime();
      if (!Number.isNaN(rowMs) && rowMs < cutoffMs) {
        return false;
      }
    }

    if (missionTarget) {
      const rawMissionId = String(row.rawValues?.missionId ?? '').toLowerCase();
      const matchesMission =
        rawMissionId === missionTarget ||
        row.zoneName.toLowerCase().includes(missionTarget) ||
        row.sourceCode.toLowerCase().includes(missionTarget) ||
        row.operatorOrNote.toLowerCase().includes(missionTarget);
      if (!matchesMission) {
        return false;
      }
    }

    if (
      cfg.alertSeverityFilter !== 'ALL' &&
      row.severityLevel !== cfg.alertSeverityFilter
    ) {
      return false;
    }

    if (keyword) {
      const haystack =
        `${row.id} ${row.zoneName} ${row.sourceCode} ${row.categoryLabel} ${row.primaryMetric} ${row.statusLabel} ${row.operatorOrNote}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
}

export const triggerDatasetFileExport = createAsyncThunk(
  'missionReviewExport/triggerExport',
  async (
    overrideConfig: Partial<ExcelExportFilterConfig> | undefined,
    { getState }
  ) => {
    const state = getState() as RootState;
    const sliceState = state.missionReviewExport;
    const overrideDataset = overrideConfig?.datasetType;
    const isDatasetChanged =
      overrideDataset !== undefined &&
      overrideDataset !== sliceState.exportConfig.datasetType;

    const effectiveConfig: ExcelExportFilterConfig = {
      ...sliceState.exportConfig,
      ...overrideConfig,
      selectedColumnKeys:
        overrideConfig?.selectedColumnKeys ??
        (isDatasetChanged
          ? EXPORT_DATASET_CATALOG[overrideDataset].defaultColumns
              .filter((c) => c.enabledByDefault)
              .map((c) => c.key)
          : sliceState.exportConfig.selectedColumnKeys),
    };

    const filteredRows = filterExportRowsByConfig(
      sliceState.allPreviewRows,
      effectiveConfig
    );

    if (filteredRows.length === 0) {
      throw new Error('Không có bản ghi nào khớp bộ lọc hiện tại để xuất file.');
    }

    const zonePatterns =
      effectiveConfig.zoneFilter !== 'ALL'
        ? ZONE_PREFIX_PATTERNS[effectiveConfig.zoneFilter]
        : undefined;
    const filteredReviews = sliceState.missionReviews.filter((rev) => {
      if (
        effectiveConfig.missionIdFilter !== 'ALL' &&
        rev.missionId !== effectiveConfig.missionIdFilter &&
        rev.missionCode !== effectiveConfig.missionIdFilter
      ) {
        return false;
      }
      if (zonePatterns) {
        const normalizedZone = rev.zoneName.toLowerCase();
        if (
          rev.zoneId !== effectiveConfig.zoneFilter &&
          !zonePatterns.some((p) => normalizedZone.includes(p))
        ) {
          return false;
        }
      }
      return true;
    });

    const result = await missionReviewExportApi.executeFileExport(
      effectiveConfig,
      filteredRows,
      filteredReviews
    );
    return result;
  }
);

export const resetMissionReviewDemoData = createAsyncThunk(
  'missionReviewExport/resetDemoData',
  async () => {
    const reviews = await missionReviewExportApi.resetMissionReviewsToDefault();
    const previewRows = await buildExportPreviewDataset(reviews);
    return { reviews, previewRows };
  }
);

// ============================================================================
// SLICE
// ============================================================================

const missionReviewExportSlice = createSlice({
  name: 'missionReviewExport',
  initialState,
  reducers: {
    setActiveWorkspaceTab(state, action: PayloadAction<Sprint8WorkspaceTab>) {
      state.activeWorkspaceTab = action.payload;
    },
    setSelectedMissionId(state, action: PayloadAction<string>) {
      state.selectedMissionId = action.payload;
      state.selectedWaypointIndex = 0;
    },
    setReviewDecisionFilter(
      state,
      action: PayloadAction<'ALL' | MissionReviewDecision>
    ) {
      state.reviewDecisionFilter = action.payload;
    },
    setSelectedWaypointIndex(state, action: PayloadAction<number>) {
      state.selectedWaypointIndex = action.payload;
    },
    setExportDatasetType(state, action: PayloadAction<ExportDatasetType>) {
      const newType = action.payload;
      state.exportConfig.datasetType = newType;
      state.exportConfig.selectedColumnKeys = EXPORT_DATASET_CATALOG[
        newType
      ].defaultColumns
        .filter((c) => c.enabledByDefault)
        .map((c) => c.key);
    },
    setExportFileFormat(state, action: PayloadAction<ExportFileFormat>) {
      state.exportConfig.fileFormat = action.payload;
    },
    setExportTimeRange(state, action: PayloadAction<ExportTimeRange>) {
      state.exportConfig.timeRange = action.payload;
    },
    setExportZoneFilter(state, action: PayloadAction<string>) {
      state.exportConfig.zoneFilter = action.payload;
    },
    setExportAlertSeverityFilter(
      state,
      action: PayloadAction<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>
    ) {
      state.exportConfig.alertSeverityFilter = action.payload;
    },
    setExportSearchKeyword(state, action: PayloadAction<string>) {
      state.exportConfig.searchKeyword = action.payload;
    },
    setCustomFileNamePrefix(state, action: PayloadAction<string>) {
      state.exportConfig.customFileNamePrefix = action.payload;
    },
    toggleExportColumnKey(state, action: PayloadAction<string>) {
      const key = action.payload;
      const current = state.exportConfig.selectedColumnKeys;
      if (current.includes(key)) {
        if (current.length > 2) {
          state.exportConfig.selectedColumnKeys = current.filter((k) => k !== key);
        }
      } else {
        state.exportConfig.selectedColumnKeys = [...current, key];
      }
    },
    toggleIncludeSummaryHeader(state) {
      state.exportConfig.includeSummaryHeader =
        !state.exportConfig.includeSummaryHeader;
    },
    clearStatusBanner(state) {
      state.statusBanner = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeMissionReviewExportData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeMissionReviewExportData.fulfilled, (state, action) => {
        state.loading = false;
        state.missionReviews = action.payload.reviews;
        state.allPreviewRows = action.payload.previewRows;
        state.exportHistory = action.payload.history;
        if (
          action.payload.reviews.length > 0 &&
          !action.payload.reviews.some(
            (r) => r.missionId === state.selectedMissionId
          )
        ) {
          state.selectedMissionId = action.payload.reviews[0].missionId;
        }
      })
      .addCase(initializeMissionReviewExportData.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || 'Không thể tải dữ liệu Xuất Excel & Review Mission.';
      })
      .addCase(submitMissionReviewSignOff.pending, (state) => {
        state.submittingReview = true;
      })
      .addCase(submitMissionReviewSignOff.fulfilled, (state, action) => {
        state.submittingReview = false;
        state.missionReviews = action.payload.allReviews;
        state.allPreviewRows = action.payload.previewRows;
        const rec = action.payload.updatedRecord;
        state.statusBanner = {
          type: 'success',
          text: `Đã cập nhật nghiệm thu nhiệm vụ ${rec.missionCode}: Điểm chất lượng ${rec.overallScore}/100 (Hạng ${rec.qualityGrade}) — Trạng thái: ${rec.reviewDecision}.`,
        };
      })
      .addCase(submitMissionReviewSignOff.rejected, (state, action) => {
        state.submittingReview = false;
        state.statusBanner = {
          type: 'warning',
          text:
            action.error.message || 'Có lỗi xảy ra khi lưu kết quả nghiệm thu.',
        };
      })
      .addCase(triggerDatasetFileExport.pending, (state) => {
        state.exporting = true;
      })
      .addCase(triggerDatasetFileExport.fulfilled, (state, action) => {
        state.exporting = false;
        state.exportHistory = action.payload.updatedHistory;
        const item = action.payload.historyItem;
        state.statusBanner = {
          type: 'success',
          text: `Đã xuất và tải xuống tệp "${item.fileName}" (${item.rowCount} dòng · ${item.sheetCount} Sheet · ${item.fileSizeKb} KB).`,
        };
      })
      .addCase(triggerDatasetFileExport.rejected, (state, action) => {
        state.exporting = false;
        state.statusBanner = {
          type: 'warning',
          text:
            action.error.message || 'Không thể xuất tệp báo cáo, vui lòng thử lại.',
        };
      })
      .addCase(resetMissionReviewDemoData.fulfilled, (state, action) => {
        state.missionReviews = action.payload.reviews;
        state.allPreviewRows = action.payload.previewRows;
        state.selectedMissionId =
          action.payload.reviews[0]?.missionId ?? 'MSN-2026-071';
        state.selectedWaypointIndex = 0;
        state.statusBanner = {
          type: 'info',
          text: 'Đã khôi phục bộ dữ liệu chuẩn Sprint 8 cho Xuất Excel (F11) & Review Mission (F17).',
        };
      });
  },
});

export const {
  setActiveWorkspaceTab,
  setSelectedMissionId,
  setReviewDecisionFilter,
  setSelectedWaypointIndex,
  setExportDatasetType,
  setExportFileFormat,
  setExportTimeRange,
  setExportZoneFilter,
  setExportAlertSeverityFilter,
  setExportSearchKeyword,
  setCustomFileNamePrefix,
  toggleExportColumnKey,
  toggleIncludeSummaryHeader,
  clearStatusBanner,
} = missionReviewExportSlice.actions;

// ============================================================================
// MEMOIZED SELECTORS
// ============================================================================

const selectSlice = (state: RootState) => state.missionReviewExport;

export const selectFilteredMissionReviews = createSelector(
  [selectSlice],
  (slice) => {
    if (slice.reviewDecisionFilter === 'ALL') return slice.missionReviews;
    return slice.missionReviews.filter(
      (r) => r.reviewDecision === slice.reviewDecisionFilter
    );
  }
);

export const selectActiveMissionReview = createSelector(
  [selectSlice],
  (slice): MissionReviewRecord | null => {
    return (
      slice.missionReviews.find(
        (r) => r.missionId === slice.selectedMissionId
      ) ??
      slice.missionReviews[0] ??
      null
    );
  }
);

export const selectFilteredExportRows = createSelector(
  [selectSlice],
  (slice): NormalizedExportRow[] =>
    filterExportRowsByConfig(slice.allPreviewRows, slice.exportConfig)
);

export const selectSprint8OverviewKpis = createSelector(
  [selectSlice, selectFilteredExportRows],
  (slice, filteredRows) => {
    const totalMissions = slice.missionReviews.length;
    const approvedCount = slice.missionReviews.filter(
      (r) => r.reviewDecision === 'APPROVED'
    ).length;
    const needsReflightCount = slice.missionReviews.filter(
      (r) => r.reviewDecision === 'NEEDS_REFLIGHT'
    ).length;
    const avgQualityScore =
      totalMissions > 0
        ? Math.round(
            slice.missionReviews.reduce((acc, r) => acc + r.overallScore, 0) /
              totalMissions
          )
        : 0;

    return {
      totalMissions,
      approvedCount,
      needsReflightCount,
      avgQualityScore,
      exportableRowCount: filteredRows.length,
      totalExportsExecuted: slice.exportHistory.length,
    };
  }
);

export default missionReviewExportSlice.reducer;
