package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.SensorData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SensorDataRepository extends JpaRepository<SensorData, Long> {
    List<SensorData> findBySensorIdOrderByRecordedAtDesc(Long sensorId);
    List<SensorData> findBySensorIdAndRecordedAtBetween(Long sensorId, LocalDateTime start, LocalDateTime end);
}
