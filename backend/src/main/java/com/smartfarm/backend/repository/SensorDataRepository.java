package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.SensorData;
import com.smartfarm.backend.entity.SensorType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    List<SensorData> findBySensorIdAndRecordedAtBetweenOrderByRecordedAtAsc(Long sensorId, LocalDateTime start, LocalDateTime end);

    boolean existsBySensorIdAndRecordedAt(Long sensorId, LocalDateTime recordedAt);

    // 1. Tối ưu đếm số lượng tin viễn trắc hôm nay
    long countByRecordedAtGreaterThanEqual(LocalDateTime since);

    long countBySensorZoneIdAndRecordedAtGreaterThanEqual(Long zoneId, LocalDateTime since);

    // 2. Tối ưu tính trung bình (Avg) trực tiếp tại Database (Nhiệt độ, Độ ẩm, Pin)
    @Query("SELECT AVG(sd.value) FROM SensorData sd WHERE sd.sensor.sensorType = :sensorType AND sd.recordedAt >= :since")
    Double getAverageBySensorTypeSince(@Param("sensorType") SensorType sensorType, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(sd.value) FROM SensorData sd WHERE sd.sensor.zone.id = :zoneId AND sd.sensor.sensorType = :sensorType AND sd.recordedAt >= :since")
    Double getAverageByZoneAndSensorTypeSince(@Param("zoneId") Long zoneId, @Param("sensorType") SensorType sensorType, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(sd.batteryLevel) FROM SensorData sd WHERE sd.recordedAt >= :since")
    Double getAverageBatteryLevelSince(@Param("since") LocalDateTime since);

    @Query("SELECT AVG(sd.batteryLevel) FROM SensorData sd WHERE sd.sensor.zone.id = :zoneId AND sd.recordedAt >= :since")
    Double getAverageBatteryLevelByZoneSince(@Param("zoneId") Long zoneId, @Param("since") LocalDateTime since);

    // 3. Phân trang dữ liệu lịch sử (F06)
    Page<SensorData> findBySensorIdAndRecordedAtBetween(Long sensorId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<SensorData> findBySensorZoneIdAndRecordedAtBetween(Long zoneId, LocalDateTime start, LocalDateTime end, Pageable pageable);

    Page<SensorData> findByRecordedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
