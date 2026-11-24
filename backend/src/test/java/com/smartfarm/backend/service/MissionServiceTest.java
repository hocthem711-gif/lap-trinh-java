package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.MissionRequestDTO;
import com.smartfarm.backend.dto.request.WaypointDTO;
import com.smartfarm.backend.dto.response.MissionProgressResponse;
import com.smartfarm.backend.entity.Mission;
import com.smartfarm.backend.entity.Uav;
import com.smartfarm.backend.repository.MissionRepository;
import com.smartfarm.backend.repository.UavRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - MissionService Waypoint Ordering & Lifecycle (LTJ-17)")
class MissionServiceTest {

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private UavRepository uavRepository;

    @Mock
    private com.smartfarm.backend.repository.MissionNoteRepository missionNoteRepository;

    @InjectMocks
    private MissionService missionService;

    private Uav sampleUav;

    @BeforeEach
    void setUp() {
        sampleUav = new Uav();
        sampleUav.setId(5L);
        sampleUav.setCode("UAV-BETA-02");
        sampleUav.setLatitude(11.9404);
        sampleUav.setLongitude(108.4583);
        sampleUav.setAltitude(40.0);
        sampleUav.setSpeed(9.5);
        sampleUav.setBatteryLevel(95.0);
    }

    @Test
    @DisplayName("LTJ-17: Sort unordered waypoints sequentially and populate default flight parameters")
    void testCreateMission_SortsWaypointsAndAppliesDefaults() {
        MissionRequestDTO request = new MissionRequestDTO();
        request.setMissionName("Survey Zone B");
        request.setUavId("5");
        request.setZoneId(2L);

        WaypointDTO wp3 = new WaypointDTO(3, 3, 11.9450, 108.4620, null, null, "LANDING", "LANDING", "End");
        WaypointDTO wp1 = new WaypointDTO(1, 1, 11.9400, 108.4580, 35.0, 7.0, "TAKEOFF", "TAKEOFF", "Start");
        WaypointDTO wp2 = new WaypointDTO(2, 2, 11.9425, 108.4600, null, null, "HOVER", "HOVER", "Mid");
        request.setWaypoints(List.of(wp3, wp1, wp2));

        when(uavRepository.findByCode("5")).thenReturn(Optional.empty());
        when(uavRepository.findById(5L)).thenReturn(Optional.of(sampleUav));
        when(missionRepository.save(any(Mission.class))).thenAnswer(inv -> inv.getArgument(0));

        Mission saved = missionService.createMission(request);

        assertEquals(3, saved.getTotalWaypoints());
        assertEquals(1, saved.getWaypoints().get(0).getOrderIndex());
        assertEquals(2, saved.getWaypoints().get(1).getOrderIndex());
        assertEquals(3, saved.getWaypoints().get(2).getOrderIndex());
        assertEquals(30.0, saved.getWaypoints().get(1).getAltitude());
        assertEquals(8.0, saved.getWaypoints().get(1).getSpeed());
        assertEquals("UAV-BETA-02", saved.getUav().getCode());
    }

    @Test
    @DisplayName("LTJ-17: Normalize valid mission status transition and reject unsupported state")
    void testUpdateMissionStatus_Validation() {
        Mission existing = new Mission();
        existing.setId(20L);
        existing.setName("Patrol Route 1");
        existing.setStatus("CREATED");

        when(missionRepository.findById(20L)).thenReturn(Optional.of(existing));
        when(missionRepository.save(any(Mission.class))).thenAnswer(inv -> inv.getArgument(0));

        Mission flying = missionService.updateMissionStatus(20L, " flying ");
        assertEquals("FLYING", flying.getStatus());

        assertThrows(IllegalArgumentException.class,
                () -> missionService.updateMissionStatus(20L, "UNKNOWN_STATE"));
    }

    @Test
    @DisplayName("LTJ-17: Build mission progress snapshot from assigned UAV state when live telemetry is absent")
    void testGetMissionProgress_UsesAssignedUavState() {
        Mission existing = new Mission();
        existing.setId(25L);
        existing.setName("Morning Inspection");
        existing.setStatus("READY");
        existing.setUav(sampleUav);
        existing.setCurrentWaypointOrder(1);
        existing.setCompletedWaypoints(0);
        existing.setTotalWaypoints(3);
        existing.setProgressPercent(0.0);

        when(missionRepository.findById(25L)).thenReturn(Optional.of(existing));

        MissionProgressResponse progress = missionService.getMissionProgress(25L);

        assertEquals("UAV-BETA-02", progress.getUavCode());
        assertEquals(95.0, progress.getBatteryPercent());
        assertEquals(40.0, progress.getAltitudeM());
        assertEquals("READY", progress.getStatus());
    }

    @Test
    @DisplayName("LTJ-34: Create and retrieve manual mission notes")
    void testMissionNotes_CreateAndQuery() {
        com.smartfarm.backend.entity.MissionNote note = com.smartfarm.backend.entity.MissionNote.builder()
                .missionId(10L)
                .title("Bất thường luống dâu")
                .content("Phát hiện sâu bệnh tại WP2")
                .category("PEST_DISEASE")
                .priority("HIGH")
                .author("Dev 4")
                .build();

        when(missionNoteRepository.save(any(com.smartfarm.backend.entity.MissionNote.class))).thenReturn(note);
        when(missionNoteRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(note));

        com.smartfarm.backend.entity.MissionNote saved = missionService.createMissionNote(10L, note);
        assertNotNull(saved);
        assertEquals("Bất thường luống dâu", saved.getTitle());

        List<com.smartfarm.backend.entity.MissionNote> all = missionService.getAllMissionNotes();
        assertEquals(1, all.size());
    }

    @Test
    @DisplayName("LTJ-39: Submit mission quality review with rubric scores")
    void testSubmitMissionReview() {
        com.smartfarm.backend.dto.request.SubmitMissionReviewPayload payload = com.smartfarm.backend.dto.request.SubmitMissionReviewPayload.builder()
                .missionId("MSN-2026-071")
                .reviewDecision("APPROVED")
                .reviewerName("Nguyễn Trường An")
                .reviewerRole("QA Specialist")
                .reviewSummaryNote("Nhiệm vụ hoàn thành xuất sắc")
                .build();

        java.util.Map<String, Object> result = missionService.submitMissionReview("MSN-2026-071", payload);
        assertNotNull(result);
        assertEquals("APPROVED", result.get("reviewDecision"));
        assertEquals("SUCCESS", result.get("status"));
    }
}
