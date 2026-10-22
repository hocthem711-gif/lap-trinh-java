package laglag.demo.service;

import laglag.demo.entity.SensorNode;
import laglag.demo.repository.SensorNodeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SensorNodeService {

    @Autowired
    private SensorNodeRepository sensorNodeRepository;

    public List<SensorNode> getAllSensorNodes() {
        return sensorNodeRepository.findAll();
    }

    public SensorNode registerSensorNode(SensorNode sensorNode) {
        return sensorNodeRepository.save(sensorNode);
    }

    public SensorNode updateZone(Long id, Long zoneId) {
        SensorNode node = sensorNodeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sensor Node not found with id: " + id));
        node.setZoneId(zoneId);
        return sensorNodeRepository.save(node);
    }
}