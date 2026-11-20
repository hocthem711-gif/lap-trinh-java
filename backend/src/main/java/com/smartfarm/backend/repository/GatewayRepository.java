package com.smartfarm.backend.repository;

import com.smartfarm.backend.entity.Gateway;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GatewayRepository extends JpaRepository<Gateway, Long> {
    Optional<Gateway> findByCode(String code);
}
