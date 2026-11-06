package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.HandshakeRequestDTO;
import com.smartfarm.backend.dto.response.HandshakeResponseDTO;
import com.smartfarm.backend.entity.SyncLog;
import com.smartfarm.backend.entity.Uav;
import com.smartfarm.backend.repository.SyncLogRepository;
import com.smartfarm.backend.repository.UavRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - UAV Handshake Auto-Registration & Sync Session Filtering (LTJ-22)")
class UavHandshakeSyncTest {

    @Mock
    private UavRepository uavRepository;

    @Mock
    private SyncLogRepository syncLogRepository;

    @Mock
    private MissionService missionService;

    @Mock
    private TelemetryRealtimeService telemetryRealtimeService;

    private UavService uavService;

    @BeforeEach
    void setUp() {
        uavService = new UavService(uavRepository, syncLogRepository, missionService, telemetryRealtimeService);
    }

    @Test
    @DisplayName("LTJ-22: Reject blank or null UAV code during handshake without touching repository")
    void testHandshake_BlankCodeRejected() {
        HandshakeResponseDTO blankResp = uavService.processHandshake(new HandshakeRequestDTO("   ", "TOKEN-1"));
        assertFalse(blankResp.isSuccess());
        assertNull(blankResp.getSessionId());
        verifyNoInteractions(uavRepository, syncLogRepository);
    }

    @Test
    @DisplayName("LTJ-22: Auto-register unregistered UAV on initial handshake and record SUCCESS SyncLog")
    void testHandshake_AutoRegistersUnknownUav() {
        HandshakeRequestDTO request = new HandshakeRequestDTO(" UAV-GAMMA-03 ", "INIT-TOKEN-99");
        when(uavRepository.findByCode("UAV-GAMMA-03")).thenReturn(Optional.empty());
        when(uavRepository.save(any(Uav.class))).thenAnswer(inv -> inv.getArgument(0));
        when(syncLogRepository.save(any(SyncLog.class))).thenAnswer(inv -> inv.getArgument(0));

        HandshakeResponseDTO response = uavService.processHandshake(request);

        assertTrue(response.isSuccess());
        assertNotNull(response.getSessionId());
        verify(uavRepository, times(1)).save(argThat(u ->
                "UAV-GAMMA-03".equals(u.getCode()) && "INIT-TOKEN-99".equals(u.getToken()) && Boolean.TRUE.equals(u.getIsConnected())
        ));
        verify(syncLogRepository, times(1)).save(argThat(log ->
                "UAV-GAMMA-03".equals(log.getUavCode()) && "SUCCESS".equals(log.getStatus())
        ));
    }

    @Test
    @DisplayName("LTJ-22: Filter SyncLog sessions by UAV code or fall back to full timeline when blank")
    void testGetSyncSessionsByUavCode() {
        SyncLog gammaLog = new SyncLog("UAV-GAMMA-03", LocalDateTime.now(), "SUCCESS", "Synced", "S-100");
        when(syncLogRepository.findByUavCodeOrderBySyncTimeDesc("UAV-GAMMA-03")).thenReturn(List.of(gammaLog));
        when(syncLogRepository.findAllByOrderBySyncTimeDesc()).thenReturn(List.of(gammaLog));

        List<SyncLog> filtered = uavService.getSyncSessionsByUavCode(" UAV-GAMMA-03 ");
        assertEquals(1, filtered.size());
        assertEquals("S-100", filtered.get(0).getSessionId());
        verify(syncLogRepository, times(1)).findByUavCodeOrderBySyncTimeDesc("UAV-GAMMA-03");

        List<SyncLog> all = uavService.getSyncSessionsByUavCode("  ");
        assertEquals(1, all.size());
        verify(syncLogRepository, times(1)).findAllByOrderBySyncTimeDesc();
    }
}
