package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.HandshakeRequestDTO;
import com.smartfarm.backend.dto.request.MissionRequestDTO;
import com.smartfarm.backend.dto.request.UavTelemetryPayload;
import com.smartfarm.backend.dto.request.WaypointDTO;
import com.smartfarm.backend.dto.response.HandshakeResponseDTO;
import com.smartfarm.backend.dto.response.MissionProgressResponse;
import com.smartfarm.backend.entity.Mission;
import com.smartfarm.backend.entity.SyncLog;
import com.smartfarm.backend.entity.Uav;
import com.smartfarm.backend.entity.Waypoint;
import com.smartfarm.backend.repository.MissionRepository;
import com.smartfarm.backend.repository.SyncLogRepository;
import com.smartfarm.backend.repository.UavRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - UavService & MissionService (LTJ-22, LTJ-32)")
class UavMissionServiceTest {

    @Mock
    private UavRepository uavRepository;

    @Mock
    private SyncLogRepository syncLogRepository;

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private TelemetryRealtimeService telemetryRealtimeService;

    @InjectMocks
    private UavService uavService;

    private MissionService missionService;

    private Uav mockUav;
    private Mission mockMission;

    @BeforeEach
    void setUp() {
        missionService = new MissionService(missionRepository, uavRepository);
        // Inject missionService into uavService
        uavService = new UavService(uavRepository, syncLogRepository, missionService, telemetryRealtimeService);

        mockUav = new Uav();
        mockUav.setId(1L);
        mockUav.setCode("UAV-ALPHA-01");
        mockUav.setName("Drone Giám Sát Alpha 01");
        mockUav.setToken("SECRET-TOKEN-123");
        mockUav.setIsConnected(true);
        mockUav.setStatus("ACTIVE");

        mockMission = new Mission();
        mockMission.setId(10L);
        mockMission.setName("Mission-KhuA-Demo");
        mockMission.setStatus("CREATED");
        mockMission.setUav(mockUav);
        mockMission.setCurrentWaypointOrder(1);
        mockMission.setCompletedWaypoints(0);
        mockMission.setTotalWaypoints(4);
        mockMission.setProgressPercent(0.0);

        List<Waypoint> waypoints = new ArrayList<>();
        waypoints.add(new Waypoint(1, 10.8450, 106.7650, 30.0, 8.0, "TAKEOFF", "PENDING", mockMission));
        waypoints.add(new Waypoint(2, 10.8485, 106.7710, 50.0, 10.0, "NORMAL", "PENDING", mockMission));
        waypoints.add(new Waypoint(3, 10.8520, 106.7760, 50.0, 8.0, "HOVER", "PENDING", mockMission));
        waypoints.add(new Waypoint(4, 10.8550, 106.7820, 20.0, 5.0, "LANDING", "PENDING", mockMission));
        mockMission.setWaypoints(waypoints);
    }

    @Test
    @DisplayName("LTJ-22: Bắt tay UAV thành công khi đúng mã và token")
    void testHandshake_Success() {
        HandshakeRequestDTO request = new HandshakeRequestDTO("UAV-ALPHA-01", "SECRET-TOKEN-123");
        when(uavRepository.findByCode("UAV-ALPHA-01")).thenReturn(Optional.of(mockUav));
        when(uavRepository.save(any(Uav.class))).thenReturn(mockUav);
        when(syncLogRepository.save(any(SyncLog.class))).thenAnswer(i -> i.getArgument(0));

        HandshakeResponseDTO response = uavService.processHandshake(request);

        assertNotNull(response);
        assertTrue(response.isSuccess());
        assertNotNull(response.getSessionId());
        verify(syncLogRepository, times(1)).save(any(SyncLog.class));
    }

    @Test
    @DisplayName("LTJ-22: Bắt tay thất bại khi sai Token")
    void testHandshake_InvalidToken() {
        HandshakeRequestDTO request = new HandshakeRequestDTO("UAV-ALPHA-01", "WRONG-TOKEN");
        when(uavRepository.findByCode("UAV-ALPHA-01")).thenReturn(Optional.of(mockUav));

        HandshakeResponseDTO response = uavService.processHandshake(request);

        assertNotNull(response);
        assertFalse(response.isSuccess());
        assertNull(response.getSessionId());
        verify(syncLogRepository, times(1)).save(any(SyncLog.class));
    }

    @Test
    @DisplayName("LTJ-17: Tạo nhiệm vụ bay kèm danh sách Waypoints")
    void testCreateMission_Success() {
        MissionRequestDTO request = new MissionRequestDTO();
        request.setMissionName("Tuần tra buổi chiều Khu A");
        request.setUavId("UAV-ALPHA-01");
        request.setZoneId(1L);

        List<WaypointDTO> wpList = List.of(
                new WaypointDTO(1, 1, 10.8450, 106.7650, 30.0, 8.0, "TAKEOFF", "TAKEOFF", "WP1"),
                new WaypointDTO(2, 2, 10.8550, 106.7820, 20.0, 5.0, "LANDING", "LANDING", "WP2")
        );
        request.setWaypoints(wpList);

        when(uavRepository.findByCode("UAV-ALPHA-01")).thenReturn(Optional.of(mockUav));
        when(missionRepository.save(any(Mission.class))).thenAnswer(i -> i.getArgument(0));

        Mission saved = missionService.createMission(request);

        assertNotNull(saved);
        assertEquals("Tuần tra buổi chiều Khu A", saved.getName());
        assertEquals(2, saved.getTotalWaypoints());
        assertEquals("CREATED", saved.getStatus());
        assertEquals(2, saved.getWaypoints().size());
        verify(missionRepository, times(1)).save(any(Mission.class));
    }

    @Test
    @DisplayName("LTJ-32: Tiếp nhận Telemetry tính toán chính xác tiến độ Mission")
    void testIngestTelemetry_CalculatesProgress() {
        UavTelemetryPayload payload = new UavTelemetryPayload();
        payload.setUavId("UAV-ALPHA-01");
        payload.setMissionName("Mission-KhuA-Demo");
        payload.setWaypointIndex(2);
        payload.setTotalWaypoints(4);
        payload.setLatitude(10.8485);
        payload.setLongitude(106.7710);
        payload.setAltitude(50.0);
        payload.setSpeed(10.0);
        payload.setBattery(85.0);

        when(uavRepository.findByCode("UAV-ALPHA-01")).thenReturn(Optional.of(mockUav));
        when(uavRepository.save(any(Uav.class))).thenReturn(mockUav);
        when(missionRepository.findFirstByNameOrderByIdDesc("Mission-KhuA-Demo")).thenReturn(Optional.of(mockMission));
        when(missionRepository.save(any(Mission.class))).thenAnswer(i -> i.getArgument(0));

        MissionProgressResponse progress = uavService.ingestRealtimeTelemetry(payload);

        assertNotNull(progress);
        assertEquals(2, progress.getCurrentWaypointOrder());
        assertEquals(2, progress.getCompletedWaypoints());
        assertEquals(4, progress.getTotalWaypoints());
        assertEquals(50.0, progress.getProgressPercent());
        assertEquals("FLYING", progress.getStatus());
        assertEquals(10.8485, progress.getLatitude());
        assertEquals(106.7710, progress.getLongitude());
        assertEquals(85.0, progress.getBatteryPercent());

        // Kiểm tra visitState của Waypoints
        assertEquals("COMPLETED", mockMission.getWaypoints().get(0).getVisitState());
        assertEquals("ACTIVE", mockMission.getWaypoints().get(1).getVisitState());
        assertEquals("PENDING", mockMission.getWaypoints().get(2).getVisitState());
    }

    @Test
    @DisplayName("LTJ-32: Tự động chuyển RETURNING khi pin <= 20%")
    void testIngestTelemetry_LowBattery_AutoReturning() {
        UavTelemetryPayload payload = new UavTelemetryPayload();
        payload.setUavId("UAV-ALPHA-01");
        payload.setMissionName("Mission-KhuA-Demo");
        payload.setWaypointIndex(2);
        payload.setTotalWaypoints(4);
        payload.setLatitude(10.8485);
        payload.setLongitude(106.7710);
        payload.setBattery(18.0); // Pin yếu <= 20%

        when(uavRepository.findByCode("UAV-ALPHA-01")).thenReturn(Optional.of(mockUav));
        when(uavRepository.save(any(Uav.class))).thenReturn(mockUav);
        when(missionRepository.findFirstByNameOrderByIdDesc("Mission-KhuA-Demo")).thenReturn(Optional.of(mockMission));
        when(missionRepository.save(any(Mission.class))).thenAnswer(i -> i.getArgument(0));

        MissionProgressResponse progress = uavService.ingestRealtimeTelemetry(payload);

        assertNotNull(progress);
        assertEquals("RETURNING", progress.getStatus());
        assertEquals("RETURNING", mockMission.getStatus());
    }

    @Test
    @DisplayName("LTJ-32: Tự động hoàn thành (COMPLETED) khi đã bay hết 4 điểm")
    void testIngestTelemetry_AllWaypointsDone_AutoCompleted() {
        UavTelemetryPayload payload = new UavTelemetryPayload();
        payload.setUavId("UAV-ALPHA-01");
        payload.setMissionName("Mission-KhuA-Demo");
        payload.setWaypointIndex(4);
        payload.setTotalWaypoints(4);
        payload.setLatitude(10.8550);
        payload.setLongitude(106.7820);
        payload.setBattery(75.0);

        when(uavRepository.findByCode("UAV-ALPHA-01")).thenReturn(Optional.of(mockUav));
        when(uavRepository.save(any(Uav.class))).thenReturn(mockUav);
        when(missionRepository.findFirstByNameOrderByIdDesc("Mission-KhuA-Demo")).thenReturn(Optional.of(mockMission));
        when(missionRepository.save(any(Mission.class))).thenAnswer(i -> i.getArgument(0));

        MissionProgressResponse progress = uavService.ingestRealtimeTelemetry(payload);

        assertNotNull(progress);
        assertEquals("COMPLETED", progress.getStatus());
        assertEquals(100.0, progress.getProgressPercent());
        assertEquals(4, progress.getCompletedWaypoints());
    }

    @Test
    @DisplayName("LTJ-22: Lấy danh sách lịch sử phiên đồng bộ SyncLog sắp xếp giảm dần")
    void testGetSyncSessions_DescendingOrder() {
        SyncLog log1 = new SyncLog("UAV-01", LocalDateTime.now().minusHours(1), "SUCCESS", "Log 1", "SESSION-1");
        SyncLog log2 = new SyncLog("UAV-01", LocalDateTime.now(), "SUCCESS", "Log 2", "SESSION-2");

        when(syncLogRepository.findAllByOrderBySyncTimeDesc()).thenReturn(List.of(log2, log1));

        List<SyncLog> result = uavService.getSyncSessions();

        assertEquals(2, result.size());
        assertEquals("SESSION-2", result.get(0).getSessionId());
        verify(syncLogRepository, times(1)).findAllByOrderBySyncTimeDesc();
    }
}
