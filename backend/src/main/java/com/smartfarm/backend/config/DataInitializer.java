package com.smartfarm.backend.config;

import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final FarmRepository farmRepository;
    private final ZoneRepository zoneRepository;
    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final PasswordEncoder passwordEncoder;
    private final UavRepository uavRepository;
    private final GatewayRepository gatewayRepository;
    private final MissionRepository missionRepository;

    public DataInitializer(RoleRepository roleRepository,
                           UserRepository userRepository,
                           FarmRepository farmRepository,
                           ZoneRepository zoneRepository,
                           SensorRepository sensorRepository,
                           SensorDataRepository sensorDataRepository,
                           PasswordEncoder passwordEncoder,
                           UavRepository uavRepository,
                           GatewayRepository gatewayRepository,
                           MissionRepository missionRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.farmRepository = farmRepository;
        this.zoneRepository = zoneRepository;
        this.sensorRepository = sensorRepository;
        this.sensorDataRepository = sensorDataRepository;
        this.passwordEncoder = passwordEncoder;
        this.uavRepository = uavRepository;
        this.gatewayRepository = gatewayRepository;
        this.missionRepository = missionRepository;
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
        List<Zone> zones = zoneRepository.findAll();
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

            zones = zoneRepository.saveAll(Arrays.asList(zone1, zone2, zone3));
            log.info("Đã tạo 3 Vùng canh tác mẫu (Zone A, B, C) cho trang trại");
        }

        // 5. Khởi tạo Sensors và Telemetry mẫu (Sprint 3 - Task LTJ-11)
        if (sensorRepository.count() == 0 && !zones.isEmpty()) {
            Zone z1 = zones.get(0);
            Zone z2 = zones.size() > 1 ? zones.get(1) : z1;
            Zone z3 = zones.size() > 2 ? zones.get(2) : z1;

            LocalDateTime now = LocalDateTime.now();

            // Zone 1 Sensors (Thung lũng nông trại Đông Nam Đà Lạt - Khu A)
            Sensor s1 = new Sensor("DEV-Z1-001-TEMP", "Cảm biến Nhiệt độ Zone A", SensorType.TEMPERATURE, z1, 11.940100, 108.465900);
            Sensor s2 = new Sensor("DEV-Z1-001-HUM", "Cảm biến Độ ẩm KK Zone A", SensorType.HUMIDITY, z1, 11.939900, 108.467400);
            Sensor s3 = new Sensor("DEV-Z1-001-SOIL", "Cảm biến Độ ẩm đất Zone A", SensorType.SOIL_MOISTURE, z1, 11.939100, 108.465800);
            Sensor s4 = new Sensor("DEV-Z1-001-LIGHT", "Cảm biến Ánh sáng Zone A", SensorType.LIGHT, z1, 11.939200, 108.467300);

            // Zone 2 Sensors (Thung lũng nông trại Đông Nam Đà Lạt - Khu B)
            Sensor s5 = new Sensor("DEV-Z2-001-TEMP", "Cảm biến Nhiệt độ Zone B", SensorType.TEMPERATURE, z2, 11.938200, 108.465800);
            Sensor s6 = new Sensor("DEV-Z2-001-HUM", "Cảm biến Độ ẩm KK Zone B", SensorType.HUMIDITY, z2, 11.938100, 108.467400);
            Sensor s7 = new Sensor("DEV-Z2-001-SOIL", "Cảm biến Độ ẩm đất Zone B", SensorType.SOIL_MOISTURE, z2, 11.937400, 108.465700);
            Sensor s8 = new Sensor("DEV-Z2-001-LIGHT", "Cảm biến Ánh sáng Zone B", SensorType.LIGHT, z2, 11.937300, 108.467300);

            // Zone 3 Sensors (Thung lũng nông trại Đông Nam Đà Lạt - Khu C)
            Sensor s9 = new Sensor("DEV-Z3-001-TEMP", "Cảm biến Nhiệt độ Zone C", SensorType.TEMPERATURE, z3, 11.936300, 108.465800);
            Sensor s10 = new Sensor("DEV-Z3-001-HUM", "Cảm biến Độ ẩm KK Zone C", SensorType.HUMIDITY, z3, 11.936200, 108.467600);
            Sensor s11 = new Sensor("DEV-Z3-001-SOIL", "Cảm biến Độ ẩm đất Zone C", SensorType.SOIL_MOISTURE, z3, 11.935300, 108.465700);
            Sensor s12 = new Sensor("DEV-Z3-001-LIGHT", "Cảm biến Ánh sáng Zone C", SensorType.LIGHT, z3, 11.935400, 108.467400);

            List<Sensor> savedSensors = sensorRepository.saveAll(Arrays.asList(s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12));
            log.info("Đã tạo {} cảm biến mẫu kèm tọa độ GPS Đà Lạt", savedSensors.size());

            // Seed dữ liệu telemetry mẫu ban đầu
            List<SensorData> sampleData = Arrays.asList(
                    new SensorData(24.5, "°C", 95.0, "NORMAL", now.minusMinutes(5), s1),
                    new SensorData(65.0, "%", 95.0, "NORMAL", now.minusMinutes(5), s2),
                    new SensorData(72.0, "%", 95.0, "NORMAL", now.minusMinutes(5), s3),
                    new SensorData(850.0, "lux", 95.0, "NORMAL", now.minusMinutes(5), s4),

                    new SensorData(22.8, "°C", 90.0, "NORMAL", now.minusMinutes(4), s5),
                    new SensorData(70.0, "%", 90.0, "NORMAL", now.minusMinutes(4), s6),
                    new SensorData(68.5, "%", 90.0, "NORMAL", now.minusMinutes(4), s7),
                    new SensorData(920.0, "lux", 90.0, "NORMAL", now.minusMinutes(4), s8),

                    new SensorData(26.2, "°C", 88.0, "NORMAL", now.minusMinutes(3), s9),
                    new SensorData(60.5, "%", 88.0, "NORMAL", now.minusMinutes(3), s10),
                    new SensorData(64.0, "%", 88.0, "NORMAL", now.minusMinutes(3), s11),
                    new SensorData(1100.0, "lux", 88.0, "NORMAL", now.minusMinutes(3), s12)
            );
            sensorDataRepository.saveAll(sampleData);
            log.info("Đã khởi tạo telemetry mẫu cho các cảm biến phục vụ Leaflet Map và Realtime Dashboard");
        }

        // Khởi tạo UAV, Gateway và Mission lộ trình bay 4 điểm Khu A
        if (uavRepository.count() == 0) {
            Uav uav = new Uav();
            uav.setCode("UAV-ALPHA-01");
            uav.setName("Drone Giám Sát Alpha 01");
            uav.setModel("Quadcopter-Agri");
            uav.setStatus("ACTIVE");
            uav.setToken("UAV-TOKEN-ALPHA-01");
            uav.setIsConnected(true);
            uav.setLatitude(11.9396);
            uav.setLongitude(108.4662);
            uav.setAltitude(30.0);
            uav.setSpeed(8.0);
            uav.setBatteryLevel(100.0);
            uav.setLastSeenAt(LocalDateTime.now());
            uavRepository.save(uav);

            Gateway gw = new Gateway();
            gw.setCode("GW-01");
            gw.setIpAddress("192.168.1.100");
            gw.setStatus("ACTIVE");
            gatewayRepository.save(gw);

            Mission mission = new Mission();
            mission.setName("Mission-KhuA-Demo");
            mission.setStatus("CREATED");
            mission.setUav(uav);
            mission.setUavId("UAV-ALPHA-01");
            mission.setZoneId(zones.isEmpty() ? 1L : zones.get(0).getId());
            mission.setCurrentWaypointOrder(1);
            mission.setCompletedWaypoints(0);
            mission.setTotalWaypoints(4);
            mission.setProgressPercent(0.0);
            mission.setLastTelemetryAt(LocalDateTime.now());

            Waypoint w1 = new Waypoint(1, 11.9389, 108.4654, 30.0, 8.0, "TAKEOFF", "PENDING", mission);
            Waypoint w2 = new Waypoint(2, 11.9402, 108.4658, 50.0, 10.0, "NORMAL", "PENDING", mission);
            Waypoint w3 = new Waypoint(3, 11.9401, 108.4676, 50.0, 8.0, "HOVER", "PENDING", mission);
            Waypoint w4 = new Waypoint(4, 11.9390, 108.4672, 20.0, 5.0, "LANDING", "PENDING", mission);

            mission.setWaypoints(new java.util.ArrayList<>(Arrays.asList(w1, w2, w3, w4)));
            missionRepository.save(mission);
            log.info("[DATA-INIT] Đã khởi tạo dữ liệu mẫu UAV (UAV-ALPHA-01), Gateway (GW-01) và Mission 4 điểm Khu A (Đà Lạt)");
        }
    }
}
