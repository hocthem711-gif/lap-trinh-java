package com.smartfarm.backend.config;

import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.repository.FarmRepository;
import com.smartfarm.backend.repository.RoleRepository;
import com.smartfarm.backend.repository.UserRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final FarmRepository farmRepository;
    private final ZoneRepository zoneRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(RoleRepository roleRepository,
                           UserRepository userRepository,
                           FarmRepository farmRepository,
                           ZoneRepository zoneRepository,
                           PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.farmRepository = farmRepository;
        this.zoneRepository = zoneRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        log.info("Khởi tạo dữ liệu mẫu cho hệ thống Smart Farm...");

        // 1. Khởi tạo Roles
        Arrays.stream(RoleName.values()).forEach(roleName -> {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(new Role(roleName));
                log.info("Đã tạo Role mặc định: {}", roleName);
            }
        });

        Role adminRole = roleRepository.findByName(RoleName.ROLE_ADMIN).orElse(null);
        Role farmerRole = roleRepository.findByName(RoleName.ROLE_FARMER).orElse(null);

        // 2. Khởi tạo tài khoản Admin mặc định (admin / admin123)
        User adminUser = null;
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User(
                    "admin",
                    "admin@smartfarm.com",
                    passwordEncoder.encode("admin123"),
                    "Quản Trị Viên Hệ Thống"
            );
            Set<Role> roles = new HashSet<>();
            if (adminRole != null) roles.add(adminRole);
            admin.setRoles(roles);
            adminUser = userRepository.save(admin);
            log.info("Đã tạo tài khoản Admin: username=admin, password=admin123");
        } else {
            adminUser = userRepository.findByUsername("admin").orElse(null);
        }

        // 3. Khởi tạo tài khoản Farmer mặc định (farmer / farmer123)
        User farmerUser = null;
        if (!userRepository.existsByUsername("farmer")) {
            User farmer = new User(
                    "farmer",
                    "farmer@smartfarm.com",
                    passwordEncoder.encode("farmer123"),
                    "Chủ Trang Trại Nguyễn Văn A"
            );
            Set<Role> roles = new HashSet<>();
            if (farmerRole != null) roles.add(farmerRole);
            farmer.setRoles(roles);
            farmerUser = userRepository.save(farmer);
            log.info("Đã tạo tài khoản Farmer: username=farmer, password=farmer123");
        } else {
            farmerUser = userRepository.findByUsername("farmer").orElse(null);
        }

        // 4. Khởi tạo Trang trại & Khu vực mẫu
        if (farmRepository.count() == 0 && (farmerUser != null || adminUser != null)) {
            User owner = farmerUser != null ? farmerUser : adminUser;

            Farm farm = new Farm(
                    "Trang Trại Công Nghệ Cao Đà Lạt",
                    "Phường 7, TP. Đà Lạt, Lâm Đồng",
                    50000.0,
                    owner
            );
            Farm savedFarm = farmRepository.save(farm);
            log.info("Đã tạo Trang trại mẫu: {}", savedFarm.getName());

            Zone zone1 = new Zone("Khu Vực A - Dâu Tây Thủy Canh", "Dâu Tây Nhật Bản", savedFarm);
            Zone zone2 = new Zone("Khu Vực B - Rau Xà Lách Thủy Canh", "Xà Lách Romaine", savedFarm);
            Zone zone3 = new Zone("Khu Vực C - Cà Chua Bi", "Cà Chua Cherry", savedFarm);

            zoneRepository.saveAll(Arrays.asList(zone1, zone2, zone3));
            log.info("Đã tạo 3 Vùng canh tác mẫu (Zone A, B, C) cho trang trại");
        }
    }
}
