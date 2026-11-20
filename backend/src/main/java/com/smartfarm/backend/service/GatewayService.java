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
        if (gateway.getStatus() == null) {
            gateway.setStatus("ACTIVE");
        }
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
