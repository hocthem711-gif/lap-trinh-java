package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, Long> {
    List<SensorData> findBySensorIdOrderByRecordedAtDesc(Long sensorId);
    Optional<SensorData> findFirstBySensorIdOrderByRecordedAtDesc(Long sensorId);
    List<SensorData> findBySensorZoneIdOrderByRecordedAtDesc(Long zoneId);
    List<SensorData> findBySensorIdAndRecordedAtBetween(Long sensorId, LocalDateTime start, LocalDateTime end);
    boolean existsBySensorIdAndRecordedAt(Long sensorId, LocalDateTime recordedAt);
}
