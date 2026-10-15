package com.smartfarm.backend.service;

import com.smartfarm.backend.entity.Gateway;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.repository.GatewayRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GatewayService {

    private final GatewayRepository gatewayRepository;
    private final SensorRepository sensorRepository;
    private final ZoneRepository zoneRepository;

    public List<Gateway> getAllGateways() {
        return gatewayRepository.findAll();
    }

    public Gateway getGatewayByCode(String code) {
        return gatewayRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Gateway với mã: " + code));
    }

    public Gateway createGateway(Gateway gateway) {
        if (gateway == null || gateway.getCode() == null || gateway.getCode().isBlank()) {
            throw new IllegalArgumentException("Mã định danh Gateway không được để trống");
        }
        String normalizedCode = gateway.getCode().trim().toUpperCase();
        if (gatewayRepository.existsByCode(normalizedCode)) {
            throw new IllegalArgumentException("Gateway với mã " + normalizedCode + " đã tồn tại");
        }
        gateway.setCode(normalizedCode);
        if (gateway.getStatus() == null || gateway.getStatus().isBlank()) {
            gateway.setStatus("ACTIVE");
        } else {
            gateway.setStatus(gateway.getStatus().trim().toUpperCase());
        }
        return gatewayRepository.save(gateway);
    }

    @Transactional
    public Gateway updateGatewayStatus(String code, String status) {
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("Trạng thái Gateway không được để trống");
        }
        Gateway gateway = getGatewayByCode(code);
        gateway.setStatus(status.trim().toUpperCase());
        return gatewayRepository.save(gateway);
    }

    @Transactional
    public void deleteGatewayByCode(String code) {
        Gateway gateway = gatewayRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Gateway với mã: " + code));
        gatewayRepository.delete(gateway);
    }

    @Transactional
    public Sensor assignSensorToZone(Long sensorId, Long zoneId) {
        Sensor sensor = sensorRepository.findById(sensorId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Sensor với ID: " + sensorId));
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Zone với ID: " + zoneId));

        sensor.setZone(zone);
        return sensorRepository.save(sensor);
    }
}
