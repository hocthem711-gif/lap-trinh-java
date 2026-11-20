package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.SyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {
    List<SyncLog> findByUavCodeOrderBySyncTimeDesc(String uavCode);
    List<SyncLog> findAllByOrderBySyncTimeDesc();
}
