package laglag.demo.service;

import laglag.demo.dto.HandshakeRequestDTO;
import laglag.demo.dto.HandshakeResponseDTO;
import laglag.demo.entity.SyncLog;
import laglag.demo.entity.Uav;
import laglag.demo.repository.SyncLogRepository;
import laglag.demo.repository.UavRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class UavService {

    @Autowired
    private UavRepository uavRepository;

    @Autowired
    private SyncLogRepository syncLogRepository;

    public HandshakeResponseDTO processHandshake(HandshakeRequestDTO request) {
        // Tìm UAV theo mã code truyền lên
        Optional<Uav> uavOpt = uavRepository.findByCode(request.getCode());

        SyncLog syncLog = new SyncLog();
        syncLog.setUavCode(request.getCode());
        syncLog.setSyncTime(LocalDateTime.now());

        if (uavOpt.isPresent() && request.getToken().equals(uavOpt.get().getToken())) {
            Uav uav = uavOpt.get();
            uav.setIsConnected(true);
            uavRepository.save(uav);

            syncLog.setStatus("SUCCESS");
            syncLog.setMessage("Bắt tay thành công. UAV đã sẵn sàng đồng bộ.");
            syncLogRepository.save(syncLog);

            String sessionId = UUID.randomUUID().toString();
            return new HandshakeResponseDTO(true, "Handshake successful", sessionId);
        } else {

            syncLog.setStatus("FAILED");
            syncLog.setMessage("Xác thực thất bại: Sai mã UAV hoặc Token không hợp lệ.");
            syncLogRepository.save(syncLog);

            return new HandshakeResponseDTO(false, "Authentication failed", null);
        }
    }
}