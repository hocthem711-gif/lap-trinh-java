package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Uav;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UavRepository extends JpaRepository<Uav, Long> {
    Optional<Uav> findByCode(String code);
    boolean existsByCode(String code);
    void deleteByCode(String code);
}
