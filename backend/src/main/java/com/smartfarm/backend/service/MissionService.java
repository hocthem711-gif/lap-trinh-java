package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.MissionProgressResponse;
import com.smartfarm.backend.dto.MissionRequestDTO;
import com.smartfarm.backend.dto.UavTelemetryPayload;
import com.smartfarm.backend.dto.WaypointDTO;
import com.smartfarm.backend.entity.Mission;
import com.smartfarm.backend.entity.Uav;
import com.smartfarm.backend.entity.Waypoint;
import com.smartfarm.backend.repository.MissionRepository;
import com.smartfarm.backend.repository.UavRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MissionService {

    private final MissionRepository missionRepository;
    private final UavRepository uavRepository;

    @Transactional
    public Mission createMission(MissionRequestDTO request) {
        Mission mission = new Mission();
        mission.setName(request.getName());
        mission.setStatus("CREATED");
        mission.setCurrentWaypointOrder(1);
        mission.setCompletedWaypoints(0);
        mission.setProgressPercent(0.0);

        if (request.getUavId() != null) {
            uavRepository.findById(request.getUavId()).ifPresent(mission::setUav);
        }

        if (request.getWaypoints() != null && !request.getWaypoints().isEmpty()) {
            List<Waypoint> waypoints = new ArrayList<>();
            int order = 1;
            for (WaypointDTO wpDto : request.getWaypoints()) {
                Waypoint wp = new Waypoint();
                wp.setOrderIndex(wpDto.getOrderIndex() != null ? wpDto.getOrderIndex() : order++);
                wp.setLatitude(wpDto.getLatitude());
                wp.setLongitude(wpDto.getLongitude());
                wp.setAltitude(wpDto.getAltitude() != null ? wpDto.getAltitude() : 30.0);
                wp.setSpeed(wpDto.getSpeed() != null ? wpDto.getSpeed() : 8.0);
                wp.setActionType(wpDto.getActionType() != null ? wpDto.getActionType() : "NORMAL");
                wp.setVisitState("PENDING");
                wp.setMission(mission);
                waypoints.add(wp);
            }
            mission.setWaypoints(waypoints);
            mission.setTotalWaypoints(waypoints.size());
        } else {
            mission.setTotalWaypoints(0);
        }

        return missionRepository.save(mission);
    }

    public List<Mission> getAllMissions() {
        return missionRepository.findAll();
    }

    public Mission getMissionById(Long id) {
        return missionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Mission với ID: " + id));
    }

    @Transactional
    public Mission updateMissionStatus(Long id, String newStatus) {
        Mission mission = getMissionById(id);
        mission.setStatus(newStatus != null ? newStatus.toUpperCase() : "CREATED");
        return missionRepository.save(mission);
    }

    @Transactional(readOnly = true)
    public MissionProgressResponse getMissionProgress(Long id) {
        Mission mission = getMissionById(id);
        return buildProgressResponse(mission, null);
    }

    @Transactional
    public MissionProgressResponse updateMissionProgressFromTelemetry(UavTelemetryPayload payload) {
        if (payload == null) {
            return null;
        }

        // Tìm Mission theo tên hoặc mission gần nhất đang hoạt động
        Mission mission = null;
        if (payload.getMissionName() != null && !payload.getMissionName().isBlank()) {
            mission = missionRepository.findByName(payload.getMissionName()).orElse(null);
        }

        if (mission == null) {
            List<Mission> all = missionRepository.findAll();
            if (!all.isEmpty()) {
                mission = all.get(all.size() - 1);
            }
        }

        if (mission == null) {
            log.warn("[MISSION-PROGRESS] Không tìm thấy Mission phù hợp cho telemetry: {}", payload.getMissionName());
            return null;
        }

        int wpIdx = payload.getWaypointIndex() != null ? payload.getWaypointIndex() : 1;
        int totalWp = payload.getTotalWaypoints() != null ? payload.getTotalWaypoints() :
                (mission.getTotalWaypoints() != null && mission.getTotalWaypoints() > 0 ? mission.getTotalWaypoints() : 4);

        mission.setCurrentWaypointOrder(wpIdx);
        mission.setCompletedWaypoints(Math.min(wpIdx, totalWp));
        mission.setTotalWaypoints(totalWp);

        double percent = totalWp > 0 ? ((double) mission.getCompletedWaypoints() * 100.0) / totalWp : 0.0;
        mission.setProgressPercent(Math.min(100.0, Math.round(percent * 10.0) / 10.0));
        mission.setLastTelemetryAt(LocalDateTime.now());

        // Cập nhật trạng thái từng Waypoint
        if (mission.getWaypoints() != null) {
            for (Waypoint wp : mission.getWaypoints()) {
                int order = wp.getOrderIndex() != null ? wp.getOrderIndex() : 0;
                if (order < wpIdx) {
                    wp.setVisitState("COMPLETED");
                } else if (order == wpIdx) {
                    wp.setVisitState("ACTIVE");
                } else {
                    wp.setVisitState("PENDING");
                }
            }
        }

        // Kiểm tra an toàn pin & trạng thái bay
        if (payload.getBattery() != null && payload.getBattery() <= 20.0) {
            mission.setStatus("RETURNING");
            log.warn("[MISSION-PROGRESS] Pin UAV thấp ({}%), chuyển trạng thái RETURNING", payload.getBattery());
        } else if (wpIdx >= totalWp) {
            mission.setStatus("COMPLETED");
            log.info("[MISSION-PROGRESS] Hoàn thành toàn bộ lộ trình {} điểm! Status -> COMPLETED", totalWp);
        } else if (!"COMPLETED".equalsIgnoreCase(mission.getStatus())) {
            mission.setStatus("FLYING");
        }

        Mission saved = missionRepository.save(mission);
        return buildProgressResponse(saved, payload);
    }

    private MissionProgressResponse buildProgressResponse(Mission mission, UavTelemetryPayload payload) {
        MissionProgressResponse resp = new MissionProgressResponse();
        resp.setMissionId(mission.getId());
        resp.setMissionName(mission.getName());
        resp.setUavCode(mission.getUav() != null ? mission.getUav().getCode() :
                (payload != null ? payload.getUavId() : "UAV-ALPHA-01"));
        resp.setStatus(mission.getStatus());
        resp.setCurrentWaypointOrder(mission.getCurrentWaypointOrder());
        resp.setCompletedWaypoints(mission.getCompletedWaypoints());
        resp.setTotalWaypoints(mission.getTotalWaypoints());
        resp.setProgressPercent(mission.getProgressPercent());
        resp.setLastTelemetryAt(mission.getLastTelemetryAt() != null ? mission.getLastTelemetryAt() : LocalDateTime.now());

        if (payload != null) {
            resp.setCurrentLatitude(payload.getLatitude());
            resp.setCurrentLongitude(payload.getLongitude());
            resp.setCurrentAltitude(payload.getAltitude());
            resp.setCurrentSpeed(payload.getSpeed());
            resp.setCurrentBattery(payload.getBattery());
        } else if (mission.getUav() != null) {
            resp.setCurrentLatitude(mission.getUav().getLatitude());
            resp.setCurrentLongitude(mission.getUav().getLongitude());
            resp.setCurrentAltitude(mission.getUav().getAltitude());
            resp.setCurrentSpeed(mission.getUav().getSpeed());
            resp.setCurrentBattery(mission.getUav().getBatteryLevel());
        }
        return resp;
    }
}
