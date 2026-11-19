package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.HandshakeRequestDTO;
import com.smartfarm.backend.dto.request.UavTelemetryPayload;
import com.smartfarm.backend.dto.response.HandshakeResponseDTO;
import com.smartfarm.backend.dto.response.MissionProgressResponse;
import com.smartfarm.backend.dto.response.UavSyncSessionDTO;
import com.smartfarm.backend.entity.SyncLog;
import com.smartfarm.backend.entity.Uav;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.SyncLogRepository;
import com.smartfarm.backend.repository.UavRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UavService {

    private final UavRepository uavRepository;
    private final SyncLogRepository syncLogRepository;
    private final MissionService missionService;
    private final TelemetryRealtimeService telemetryRealtimeService;

    public List<Uav> getAllUavs() {
        return uavRepository.findAll();
    }

    public Uav getUavByCode(String code) {
        return uavRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Uav", "code", code));
    }

    public Uav createUav(Uav uav) {
        if (uav.getStatus() == null) {
            uav.setStatus("ACTIVE");
        }
        if (uav.getIsConnected() == null) {
            uav.setIsConnected(false);
        }
        return uavRepository.save(uav);
    }

    @Transactional
    public void deleteUavByCode(String code) {
        Uav uav = uavRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Uav", "code", code));
        uavRepository.delete(uav);
    }

    @Transactional
    public HandshakeResponseDTO processHandshake(HandshakeRequestDTO request) {
        if (request == null || request.getEffectiveCode() == null || request.getEffectiveCode().isBlank()) {
            return new HandshakeResponseDTO(false, "Mã UAV không hợp lệ", null);
        }

        String normalizedCode = request.getEffectiveCode();
        Optional<Uav> uavOpt = uavRepository.findByCode(normalizedCode);

        SyncLog syncLog = new SyncLog();
        syncLog.setUavCode(normalizedCode);
        syncLog.setSyncTime(LocalDateTime.now());

        if (uavOpt.isPresent()) {
            Uav uav = uavOpt.get();
            // Nếu UAV chưa có token hoặc token gửi lên khớp
            boolean tokenValid = (uav.getToken() == null || uav.getToken().isBlank())
                    || (request.getToken() != null && request.getToken().equals(uav.getToken()));

            if (tokenValid) {
                uav.setIsConnected(true);
                uav.setStatus("ACTIVE");
                uav.setLastSeenAt(LocalDateTime.now());
                if (request.getToken() != null && !request.getToken().isBlank()) {
                    uav.setToken(request.getToken());
                }
                uavRepository.save(uav);

                String sessionId = UUID.randomUUID().toString();
                syncLog.setStatus("SUCCESS");
                syncLog.setSessionId(sessionId);
                syncLog.setMessage("Bắt tay thành công. UAV đã sẵn sàng đồng bộ và nhận nhiệm vụ.");
                syncLogRepository.save(syncLog);

                log.info("[HANDSHAKE] UAV {} bắt tay thành công. Session: {}", request.getCode(), sessionId);
                return new HandshakeResponseDTO(true, "Handshake successful", sessionId);
            }
        }

        // Tạo mới UAV nếu chưa có trong DB để đảm bảo tính sẵn sàng
        if (uavOpt.isEmpty()) {
            Uav newUav = new Uav();
            newUav.setCode(normalizedCode);
            newUav.setName("Drone " + normalizedCode);
            newUav.setModel("Quadcopter-Agri");
            newUav.setStatus("ACTIVE");
            newUav.setToken(request.getToken() != null && !request.getToken().isBlank() ? request.getToken().trim() : "TOKEN-DEFAULT");
            newUav.setIsConnected(true);
            newUav.setLastSeenAt(LocalDateTime.now());
            uavRepository.save(newUav);

            String sessionId = UUID.randomUUID().toString();
            syncLog.setStatus("SUCCESS");
            syncLog.setSessionId(sessionId);
            syncLog.setMessage("Tự động đăng ký và bắt tay thành công cho UAV mới.");
            syncLogRepository.save(syncLog);

            return new HandshakeResponseDTO(true, "Handshake successful (Auto registered)", sessionId);
        }

        syncLog.setStatus("FAILED");
        syncLog.setMessage("Xác thực thất bại: Sai mã UAV hoặc Token không khớp.");
        syncLogRepository.save(syncLog);
        return new HandshakeResponseDTO(false, "Authentication failed", null);
    }

    public List<SyncLog> getSyncSessions() {
        return syncLogRepository.findAllByOrderBySyncTimeDesc();
    }

    public List<SyncLog> getSyncSessionsByUavCode(String uavCode) {
        if (uavCode == null || uavCode.isBlank()) {
            return getSyncSessions();
        }
        return syncLogRepository.findByUavCodeOrderBySyncTimeDesc(uavCode.trim());
    }

    public List<UavSyncSessionDTO> getEnrichedSyncSessions(String uavCode) {
        List<SyncLog> logs = getSyncSessionsByUavCode(uavCode);
        List<UavSyncSessionDTO> dtos = new java.util.ArrayList<>();

        for (SyncLog log : logs) {
            boolean isSuccess = "SUCCESS".equalsIgnoreCase(log.getStatus()) || "COMPLETED".equalsIgnoreCase(log.getStatus());
            LocalDateTime syncTime = log.getSyncTime() != null ? log.getSyncTime() : LocalDateTime.now();
            LocalDateTime flightStart = syncTime.minusMinutes(20);
            LocalDateTime flightEnd = syncTime.minusMinutes(2);

            int totalRec = 25;
            int syncedRec = isSuccess ? totalRec : 10;
            int batchSize = 10;
            int batchCount = (int) Math.ceil((double) totalRec / batchSize);

            List<UavSyncSessionDTO.SyncRecordItemDTO> sampleRecords = new java.util.ArrayList<>();
            long startEpoch = flightStart.toEpochSecond(java.time.ZoneOffset.UTC);
            for (int i = 0; i < totalRec; i++) {
                sampleRecords.add(UavSyncSessionDTO.SyncRecordItemDTO.builder()
                        .deviceId("DEV-Z1-" + String.format("%03d", (i % 4) + 1))
                        .farmId(1L)
                        .zoneId(1L)
                        .temperature(25.0 + (i % 5))
                        .humidity(65.0 + (i % 10))
                        .soilMoisture(50.0 + (i % 8))
                        .light(500.0 + (i * 20))
                        .status((i % 7 == 0) ? "WARNING" : "NORMAL")
                        .timestamp(startEpoch + (i * 45))
                        .build());
            }

            dtos.add(UavSyncSessionDTO.builder()
                    .id(log.getId())
                    .syncSessionId(log.getSyncSessionId())
                    .uavId(log.getUavCode())
                    .uavName("UAV " + log.getUavCode())
                    .zoneId(1L)
                    .zoneName("Khu A - Nhà kính Dâu tây")
                    .flightStartTime(flightStart.toString())
                    .flightEndTime(flightEnd.toString())
                    .flightDurationSeconds(1080)
                    .totalRecords(totalRec)
                    .syncedRecords(syncedRec)
                    .batchSize(batchSize)
                    .batchCount(batchCount)
                    .status(isSuccess ? "COMPLETED" : "FAILED")
                    .handshakeAt(syncTime.toString())
                    .lastBatchAt(syncTime.plusSeconds(12).toString())
                    .completedAt(isSuccess ? syncTime.plusSeconds(15).toString() : null)
                    .failedStep(isSuccess ? null : "HANDSHAKE")
                    .errorMessage(isSuccess ? null : log.getMessage())
                    .records(sampleRecords)
                    .build());
        }

        return dtos;
    }

    @Transactional
    public MissionProgressResponse ingestRealtimeTelemetry(UavTelemetryPayload payload) {
        if (payload == null) {
            return null;
        }

        String uavCode = payload.getUavId() != null ? payload.getUavId() : "UAV-ALPHA-01";
        Uav uav = uavRepository.findByCode(uavCode).orElseGet(() -> {
            Uav newU = new Uav();
            newU.setCode(uavCode);
            newU.setName("Drone " + uavCode);
            newU.setStatus("FLYING");
            newU.setIsConnected(true);
            return newU;
        });

        if (payload.getLatitude() != null) {
            uav.setLatitude(payload.getLatitude());
        }
        if (payload.getLongitude() != null) {
            uav.setLongitude(payload.getLongitude());
        }
        uav.setAltitude(payload.getEffectiveAltitude());
        uav.setSpeed(payload.getEffectiveSpeed());
        uav.setBatteryLevel(payload.getEffectiveBattery());
        uav.setIsConnected(true);
        uav.setLastSeenAt(LocalDateTime.now());

        if (payload.getFlightStatus() != null && !payload.getFlightStatus().isBlank()) {
            uav.setStatus(normalizeTelemetryFlightStatus(payload.getFlightStatus()));
        }
        uavRepository.save(uav);

        // Cập nhật tiến độ nhiệm vụ bay
        MissionProgressResponse progress = missionService.updateMissionProgressFromTelemetry(payload);

        // Bắn WebSocket/SSE realtime xuống Frontend (Dev 3 - Leaflet & Dev 4 - Sidebar)
        try {
            telemetryRealtimeService.broadcastCustomTelemetry(progress != null ? progress : payload);
        } catch (Exception e) {
            log.debug("Không thể broadcast telemetry qua WebSocket/SSE: {}", e.getMessage());
        }

        return progress;
    }

    private String normalizeTelemetryFlightStatus(String flightStatus) {
        String normalized = flightStatus.trim().toUpperCase();
        return switch (normalized) {
            case "TAKEOFF", "IN_FLIGHT", "LANDING", "FLYING" -> "FLYING";
            case "RETURNING" -> "RETURNING";
            case "LANDED", "COMPLETED", "IDLE", "ACTIVE" -> "ACTIVE";
            case "OFFLINE", "INACTIVE" -> normalized;
            default -> normalized;
        };
    }
}
