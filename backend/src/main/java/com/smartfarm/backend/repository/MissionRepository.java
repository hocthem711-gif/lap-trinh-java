package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Mission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MissionRepository extends JpaRepository<Mission, Long> {
    Optional<Mission> findByName(String name);
    Optional<Mission> findFirstByNameOrderByIdDesc(String name);
}
