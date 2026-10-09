package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Sensor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SensorRepository extends JpaRepository<Sensor, Long> {
    Optional<Sensor> findBySensorCode(String sensorCode);
    List<Sensor> findByZoneId(Long zoneId);
}
