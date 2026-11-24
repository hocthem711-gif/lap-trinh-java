package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.MissionRequestDTO;
import com.smartfarm.backend.dto.request.StatusUpdateRequestDTO;
import com.smartfarm.backend.dto.request.SubmitMissionReviewPayload;
import com.smartfarm.backend.dto.request.UavTelemetryPayload;
import com.smartfarm.backend.dto.response.MissionProgressResponse;
import com.smartfarm.backend.entity.Mission;
import com.smartfarm.backend.entity.MissionNote;
import com.smartfarm.backend.service.MissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Mission & Waypoint Management", description = "APIs quản lý nhiệm vụ bay, lộ trình Waypoint và giám sát tiến độ (LTJ-17, LTJ-32)")
public class MissionController {

    private final MissionService missionService;

    @GetMapping({"/api/v1/missions", "/missions"})
    @Operation(summary = "Lấy danh sách tất cả nhiệm vụ bay")
    public ResponseEntity<ApiResponse<List<Mission>>> getAllMissions() {
        List<Mission> list = missionService.getAllMissions();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách nhiệm vụ thành công", list));
    }

    @GetMapping({"/api/v1/missions/{id}", "/missions/{id}"})
    @Operation(summary = "Lấy chi tiết nhiệm vụ và danh sách Waypoints")
    public ResponseEntity<ApiResponse<Mission>> getMissionById(@PathVariable Long id) {
        Mission mission = missionService.getMissionById(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy chi tiết nhiệm vụ thành công", mission));
    }

    @PostMapping({"/api/v1/missions", "/missions"})
    @Operation(summary = "Tạo mới nhiệm vụ bay kèm danh sách Waypoints (LTJ-17)")
    public ResponseEntity<ApiResponse<Mission>> createMission(@RequestBody MissionRequestDTO request) {
        Mission created = missionService.createMission(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo nhiệm vụ bay thành công", created));
    }

    @PatchMapping({"/api/v1/missions/{id}/status", "/missions/{id}/status"})
    @Operation(summary = "Cập nhật trạng thái nhiệm vụ (CREATED, FLYING, RETURNING, COMPLETED)")
    public ResponseEntity<ApiResponse<Mission>> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequestDTO request) {
        String status = (request != null) ? request.getStatus() : "CREATED";
        Mission updated = missionService.updateMissionStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái nhiệm vụ thành công", updated));
    }

    @GetMapping({"/api/v1/missions/{id}/progress", "/missions/{id}/progress"})
    @Operation(summary = "Lấy tiến độ chi tiết chuyến bay theo Mission ID (LTJ-32)")
    public ResponseEntity<ApiResponse<MissionProgressResponse>> getProgress(@PathVariable Long id) {
        MissionProgressResponse progress = missionService.getMissionProgress(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy tiến độ chuyến bay thành công", progress));
    }

    @PostMapping({"/api/v1/missions/{id}/telemetry", "/missions/{id}/telemetry"})
    @Operation(summary = "Nhận telemetry theo ID nhiệm vụ và cập nhật tiến độ (LTJ-32)")
    public ResponseEntity<ApiResponse<MissionProgressResponse>> updateProgressByMissionId(
            @PathVariable Long id,
            @RequestBody UavTelemetryPayload payload) {
        Mission mission = missionService.getMissionById(id);
        if (payload != null && (payload.getMissionName() == null || payload.getMissionName().isBlank())) {
            payload.setMissionName(mission.getName());
        }
        MissionProgressResponse response = missionService.updateMissionProgressFromTelemetry(payload);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật viễn trắc nhiệm vụ thành công", response));
    }

    // ==================== MISSION NOTES ENDPOINTS (Dev 4 - LTJ-34) ====================

    @GetMapping({"/api/v1/missions/notes", "/missions/notes"})
    @Operation(summary = "Lấy toàn bộ ghi chú nhật ký nhiệm vụ bay (F16)")
    public ResponseEntity<ApiResponse<List<MissionNote>>> getAllMissionNotes() {
        List<MissionNote> list = missionService.getAllMissionNotes();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách ghi chú thành công", list));
    }

    @PostMapping({"/api/v1/missions/{id}/notes", "/missions/{id}/notes"})
    @Operation(summary = "Tạo ghi chú nhiệm vụ bay theo Mission ID (F16)")
    public ResponseEntity<ApiResponse<MissionNote>> createMissionNote(
            @PathVariable Long id,
            @RequestBody MissionNote note) {
        MissionNote created = missionService.createMissionNote(id, note);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo ghi chú thành công", created));
    }

    @PutMapping({"/api/v1/missions/notes/{noteId}", "/missions/notes/{noteId}"})
    @Operation(summary = "Cập nhật ghi chú nhiệm vụ bay (F16)")
    public ResponseEntity<ApiResponse<MissionNote>> updateMissionNote(
            @PathVariable Long noteId,
            @RequestBody MissionNote note) {
        MissionNote updated = missionService.updateMissionNote(noteId, note);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật ghi chú thành công", updated));
    }

    @DeleteMapping({"/api/v1/missions/notes/{noteId}", "/missions/notes/{noteId}"})
    @Operation(summary = "Xóa ghi chú nhiệm vụ bay (F16)")
    public ResponseEntity<ApiResponse<Long>> deleteMissionNote(@PathVariable Long noteId) {
        missionService.deleteMissionNote(noteId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa ghi chú thành công", noteId));
    }

    // ==================== MISSION REVIEW ENDPOINT (Dev 4 - LTJ-39) ====================

    @PutMapping({"/api/v1/uav/missions/{missionId}/review", "/uav/missions/{missionId}/review",
                 "/api/v1/missions/{missionId}/review", "/missions/{missionId}/review"})
    @Operation(summary = "Phê duyệt và chấm điểm nghiệm thu nhiệm vụ bay (F17)")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> submitReview(
            @PathVariable String missionId,
            @RequestBody SubmitMissionReviewPayload payload) {
        java.util.Map<String, Object> result = missionService.submitMissionReview(missionId, payload);
        return ResponseEntity.ok(ApiResponse.success("Phê duyệt nghiệm thu nhiệm vụ thành công", result));
    }
}
