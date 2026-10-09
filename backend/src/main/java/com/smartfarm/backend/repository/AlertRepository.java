package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByZoneIdOrderByCreatedAtDesc(Long zoneId);
    List<Alert> findByIsReadFalse();
}
