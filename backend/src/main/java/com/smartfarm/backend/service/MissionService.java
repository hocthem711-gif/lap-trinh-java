package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.MissionRequestDTO;
import com.smartfarm.backend.dto.request.UavTelemetryPayload;
import com.smartfarm.backend.dto.request.WaypointDTO;
import com.smartfarm.backend.dto.response.MissionProgressResponse;
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
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class MissionService {

    private static final Set<String> ALLOWED_MISSION_STATUSES = Set.of(
            "CREATED", "PENDING", "READY", "ACTIVE", "IN_PROGRESS",
            "FLYING", "PAUSED", "RETURNING", "COMPLETED", "ABORTED", "CANCELLED", "FAILED"
    );

    private final MissionRepository missionRepository;
    private final UavRepository uavRepository;

    @Transactional
    public Mission createMission(MissionRequestDTO request) {
        Mission mission = new Mission();
        mission.setName(request.getEffectiveName());
        mission.setStatus("CREATED");
        mission.setCurrentWaypointOrder(1);
        mission.setCompletedWaypoints(0);
        mission.setProgressPercent(0.0);
        mission.setZoneId(request.getZoneId());
        mission.setUavId(request.getUavId());

        if (request.getUavId() != null && !request.getUavId().isBlank()) {
            uavRepository.findByCode(request.getUavId()).ifPresent(mission::setUav);
            if (mission.getUav() == null) {
                try {
                    Long id = Long.parseLong(request.getUavId());
                    uavRepository.findById(id).ifPresent(mission::setUav);
                } catch (NumberFormatException ignored) {
                }
            }
        }

        if (request.getWaypoints() != null && !request.getWaypoints().isEmpty()) {
            List<Waypoint> waypoints = new ArrayList<>();
            int order = 1;
            for (WaypointDTO wpDto : request.getWaypoints()) {
                Waypoint wp = new Waypoint();
                wp.setOrderIndex(wpDto.getEffectiveOrder() != null ? wpDto.getEffectiveOrder() : order++);
                wp.setLatitude(wpDto.getLatitude());
                wp.setLongitude(wpDto.getLongitude());
                wp.setAltitude(wpDto.getAltitude() != null ? wpDto.getAltitude() : 30.0);
                wp.setSpeed(wpDto.getSpeed() != null ? wpDto.getSpeed() : 8.0);
                wp.setActionType(wpDto.getEffectiveType());
                wp.setLabel(wpDto.getLabel());
                wp.setVisitState("PENDING");
                wp.setMission(mission);
                waypoints.add(wp);
            }
            waypoints.sort(Comparator.comparingInt(wp -> wp.getOrderIndex() != null ? wp.getOrderIndex() : Integer.MAX_VALUE));
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
        String normalized = (newStatus == null || newStatus.isBlank())
                ? "CREATED"
                : newStatus.trim().toUpperCase();
        if (!ALLOWED_MISSION_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Trạng thái nhiệm vụ không hợp lệ: " + newStatus);
        }
        mission.setStatus(normalized);
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
        Double battery = payload.getEffectiveBattery();
        if (battery != null && battery <= 20.0) {
            mission.setStatus("RETURNING");
            log.warn("[MISSION-PROGRESS] Pin UAV thấp ({}%), chuyển trạng thái RETURNING", battery);
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
        String uavId = mission.getUav() != null ? mission.getUav().getCode() :
                (mission.getUavId() != null ? mission.getUavId() :
                        (payload != null && payload.getUavId() != null ? payload.getUavId() : "UAV-ALPHA-01"));
        resp.setUavId(uavId);
        resp.setUavCode(uavId);
        resp.setStatus(mission.getStatus());
        resp.setCurrentWaypointOrder(mission.getCurrentWaypointOrder());
        resp.setCompletedWaypoints(mission.getCompletedWaypoints());
        resp.setTotalWaypoints(mission.getTotalWaypoints());
        resp.setProgressPercent(mission.getProgressPercent());
        resp.setLastTelemetryAt(mission.getLastTelemetryAt() != null ? mission.getLastTelemetryAt() : LocalDateTime.now());

        double lat = 0.0, lng = 0.0, alt = 30.0, spd = 8.0, bat = 100.0, heading = 0.0;
        if (payload != null) {
            lat = payload.getLatitude() != null ? payload.getLatitude() : 0.0;
            lng = payload.getLongitude() != null ? payload.getLongitude() : 0.0;
            alt = payload.getEffectiveAltitude();
            spd = payload.getEffectiveSpeed();
            bat = payload.getEffectiveBattery();
            heading = payload.getHeadingDeg() != null ? payload.getHeadingDeg() : 0.0;
        } else if (mission.getUav() != null) {
            lat = mission.getUav().getLatitude() != null ? mission.getUav().getLatitude() : 0.0;
            lng = mission.getUav().getLongitude() != null ? mission.getUav().getLongitude() : 0.0;
            alt = mission.getUav().getAltitude() != null ? mission.getUav().getAltitude() : 30.0;
            spd = mission.getUav().getSpeed() != null ? mission.getUav().getSpeed() : 8.0;
            bat = mission.getUav().getBatteryLevel() != null ? mission.getUav().getBatteryLevel() : 100.0;
        }

        resp.setLatitude(lat);
        resp.setLongitude(lng);
        resp.setAltitudeM(alt);
        resp.setSpeedMs(spd);
        resp.setBatteryPercent(bat);
        resp.setHeadingDeg(heading);

        resp.setCurrentLatitude(lat);
        resp.setCurrentLongitude(lng);
        resp.setCurrentAltitude(alt);
        resp.setCurrentSpeed(spd);
        resp.setCurrentBattery(bat);

        return resp;
    }
}
