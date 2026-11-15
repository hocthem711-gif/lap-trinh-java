package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Alert;
import com.smartfarm.backend.entity.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByZoneIdOrderByCreatedAtDesc(Long zoneId);

    List<Alert> findByIsReadFalse();

    long countByIsReadFalse();

    long countByZoneIdAndIsReadFalse(Long zoneId);

    // --- THÊM 2 HÀM NÀY CHO TASK LTJ-27 ---
    // Tìm cảnh báo đang OPEN của một cảm biến (để tránh tạo trùng lặp alert liên tục)
    Optional<Alert> findFirstBySensorIdAndStatus(Long sensorId, AlertStatus status);

    List<Alert> findByStatus(AlertStatus status);
}