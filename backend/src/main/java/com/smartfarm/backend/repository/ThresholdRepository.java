package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.entity.Threshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ThresholdRepository extends JpaRepository<Threshold, Long> {
    List<Threshold> findByZoneId(Long zoneId);
    Optional<Threshold> findByZoneIdAndSensorType(Long zoneId, SensorType sensorType);
}
