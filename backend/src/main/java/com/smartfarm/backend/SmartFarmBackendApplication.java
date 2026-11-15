package com.smartfarm.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling; // <-- Thêm import

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling // <-- Thêm annotation này
public class SmartFarmBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartFarmBackendApplication.class, args);
    }
}