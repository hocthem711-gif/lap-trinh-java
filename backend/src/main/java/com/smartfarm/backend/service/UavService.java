package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.HandshakeRequestDTO;
import com.smartfarm.backend.dto.HandshakeResponseDTO;
import com.smartfarm.backend.dto.MissionProgressResponse;
import com.smartfarm.backend.dto.UavTelemetryPayload;
import com.smartfarm.backend.entity.SyncLog;
import com.smartfarm.backend.entity.Uav;
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
                .orElseThrow(() -> new RuntimeException("Không tìm thấy UAV với mã: " + code));
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
        uavRepository.findByCode(code).ifPresent(uavRepository::delete);
    }

    @Transactional
    public HandshakeResponseDTO processHandshake(HandshakeRequestDTO request) {
        if (request == null || request.getCode() == null) {
            return new HandshakeResponseDTO(false, "Mã UAV không hợp lệ", null);
        }

        Optional<Uav> uavOpt = uavRepository.findByCode(request.getCode());

        SyncLog syncLog = new SyncLog();
        syncLog.setUavCode(request.getCode());
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

                syncLog.setStatus("SUCCESS");
                syncLog.setMessage("Bắt tay thành công. UAV đã sẵn sàng đồng bộ và nhận nhiệm vụ.");
                syncLogRepository.save(syncLog);

                String sessionId = UUID.randomUUID().toString();
                log.info("[HANDSHAKE] UAV {} bắt tay thành công. Session: {}", request.getCode(), sessionId);
                return new HandshakeResponseDTO(true, "Handshake successful", sessionId);
            }
        }

        // Tạo mới UAV nếu chưa có trong DB để đảm bảo tính sẵn sàng
        if (uavOpt.isEmpty()) {
            Uav newUav = new Uav();
            newUav.setCode(request.getCode());
            newUav.setName("Drone " + request.getCode());
            newUav.setModel("Quadcopter-Agri");
            newUav.setStatus("ACTIVE");
            newUav.setToken(request.getToken() != null ? request.getToken() : "TOKEN-DEFAULT");
            newUav.setIsConnected(true);
            newUav.setLastSeenAt(LocalDateTime.now());
            uavRepository.save(newUav);

            syncLog.setStatus("SUCCESS");
            syncLog.setMessage("Tự động đăng ký và bắt tay thành công cho UAV mới.");
            syncLogRepository.save(syncLog);

            String sessionId = UUID.randomUUID().toString();
            return new HandshakeResponseDTO(true, "Handshake successful (Auto registered)", sessionId);
        }

        syncLog.setStatus("FAILED");
        syncLog.setMessage("Xác thực thất bại: Sai mã UAV hoặc Token không khớp.");
        syncLogRepository.save(syncLog);
        return new HandshakeResponseDTO(false, "Authentication failed", null);
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

        uav.setLatitude(payload.getLatitude());
        uav.setLongitude(payload.getLongitude());
        uav.setAltitude(payload.getAltitude());
        uav.setSpeed(payload.getSpeed());
        uav.setBatteryLevel(payload.getBattery());
        uav.setIsConnected(true);
        uav.setLastSeenAt(LocalDateTime.now());

        if (payload.getFlightStatus() != null) {
            uav.setStatus(payload.getFlightStatus());
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
}
