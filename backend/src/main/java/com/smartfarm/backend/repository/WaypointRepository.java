package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Waypoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WaypointRepository extends JpaRepository<Waypoint, Long> {
    List<Waypoint> findByMissionIdOrderByOrderIndexAsc(Long missionId);
}
