package com.smartfarm.backend.controller;

import com.smartfarm.backend.dto.MissionProgressResponse;
import com.smartfarm.backend.dto.MissionRequestDTO;
import com.smartfarm.backend.dto.StatusUpdateRequestDTO;
import com.smartfarm.backend.dto.UavTelemetryPayload;
import com.smartfarm.backend.entity.Mission;
import com.smartfarm.backend.service.MissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/v1/missions", "/missions"})
@RequiredArgsConstructor
@Tag(name = "Mission & Waypoint Management", description = "APIs quản lý nhiệm vụ bay, lộ trình Waypoint và giám sát tiến độ (LTJ-17, LTJ-32)")
public class MissionController {

    private final MissionService missionService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả nhiệm vụ bay")
    public ResponseEntity<List<Mission>> getAllMissions() {
        return ResponseEntity.ok(missionService.getAllMissions());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết nhiệm vụ và danh sách Waypoints")
    public ResponseEntity<Mission> getMissionById(@PathVariable Long id) {
        return ResponseEntity.ok(missionService.getMissionById(id));
    }

    @PostMapping
    @Operation(summary = "Tạo mới nhiệm vụ bay kèm danh sách Waypoints (LTJ-17)")
    public ResponseEntity<Mission> createMission(@RequestBody MissionRequestDTO request) {
        Mission created = missionService.createMission(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Cập nhật trạng thái nhiệm vụ (CREATED, FLYING, RETURNING, COMPLETED)")
    public ResponseEntity<Mission> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequestDTO request) {
        String status = (request != null) ? request.getStatus() : "CREATED";
        Mission updated = missionService.updateMissionStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/progress")
    @Operation(summary = "Lấy tiến độ chi tiết chuyến bay theo Mission ID (LTJ-32)")
    public ResponseEntity<MissionProgressResponse> getProgress(@PathVariable Long id) {
        return ResponseEntity.ok(missionService.getMissionProgress(id));
    }

    @PostMapping("/{id}/telemetry")
    @Operation(summary = "Nhận telemetry theo ID nhiệm vụ và cập nhật tiến độ (LTJ-32)")
    public ResponseEntity<MissionProgressResponse> updateProgressByMissionId(
            @PathVariable Long id,
            @RequestBody UavTelemetryPayload payload) {
        Mission mission = missionService.getMissionById(id);
        if (payload != null && (payload.getMissionName() == null || payload.getMissionName().isBlank())) {
            payload.setMissionName(mission.getName());
        }
        MissionProgressResponse response = missionService.updateMissionProgressFromTelemetry(payload);
        return ResponseEntity.ok(response);
    }
}
