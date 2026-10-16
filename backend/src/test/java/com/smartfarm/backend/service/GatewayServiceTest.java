package com.smartfarm.backend.service;

import com.smartfarm.backend.entity.Gateway;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.repository.GatewayRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
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
@DisplayName("Unit Tests - GatewayService (LTJ-7)")
class GatewayServiceTest {

    @Mock
    private GatewayRepository gatewayRepository;

    @Mock
    private SensorRepository sensorRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @InjectMocks
    private GatewayService gatewayService;

    private Gateway sampleGateway;
    private Zone sampleZone;
    private Sensor sampleSensor;

    @BeforeEach
    void setUp() {
        sampleZone = new Zone();
        sampleZone.setId(1L);
        sampleZone.setName("Zone A - Hydroponics");

        sampleGateway = new Gateway("GW-ZONE-A", "192.168.1.10", "ACTIVE", sampleZone);
        sampleGateway.setId(1L);

        sampleSensor = new Sensor("SN-TEMP-01", SensorType.TEMPERATURE, sampleZone);
        sampleSensor.setId(100L);
    }

    @Test
    @DisplayName("LTJ-7: Retrieve all registered IoT gateways")
    void testGetAllGateways() {
        when(gatewayRepository.findAll()).thenReturn(List.of(sampleGateway));

        List<Gateway> gateways = gatewayService.getAllGateways();

        assertEquals(1, gateways.size());
        assertEquals("GW-ZONE-A", gateways.get(0).getCode());
        verify(gatewayRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("LTJ-7: Normalize gateway code and default status to ACTIVE on creation")
    void testCreateGateway_NormalizesCodeAndDefaultsStatus() {
        Gateway input = new Gateway(" gw-zone-b ", "192.168.1.11", null, sampleZone);
        when(gatewayRepository.existsByCode("GW-ZONE-B")).thenReturn(false);
        when(gatewayRepository.save(any(Gateway.class))).thenAnswer(inv -> inv.getArgument(0));

        Gateway saved = gatewayService.createGateway(input);

        assertEquals("GW-ZONE-B", saved.getCode());
        assertEquals("ACTIVE", saved.getStatus());
        verify(gatewayRepository, times(1)).save(input);
    }

    @Test
    @DisplayName("LTJ-7: Reject duplicate gateway code on creation")
    void testCreateGateway_DuplicateCodeThrowsException() {
        Gateway duplicate = new Gateway("GW-ZONE-A", "192.168.1.15", "ACTIVE", sampleZone);
        when(gatewayRepository.existsByCode("GW-ZONE-A")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> gatewayService.createGateway(duplicate));
        verify(gatewayRepository, never()).save(any(Gateway.class));
    }

    @Test
    @DisplayName("LTJ-7: Update operational status of an existing gateway")
    void testUpdateGatewayStatus_Success() {
        when(gatewayRepository.findByCode("GW-ZONE-A")).thenReturn(Optional.of(sampleGateway));
        when(gatewayRepository.save(any(Gateway.class))).thenAnswer(inv -> inv.getArgument(0));

        Gateway updated = gatewayService.updateGatewayStatus("GW-ZONE-A", "offline");

        assertEquals("OFFLINE", updated.getStatus());
        verify(gatewayRepository, times(1)).save(sampleGateway);
    }

    @Test
    @DisplayName("LTJ-7: Delete gateway by code removes entity from repository")
    void testDeleteGatewayByCode_Success() {
        when(gatewayRepository.findByCode("GW-ZONE-A")).thenReturn(Optional.of(sampleGateway));

        gatewayService.deleteGatewayByCode("GW-ZONE-A");

        verify(gatewayRepository, times(1)).delete(sampleGateway);
    }

    @Test
    @DisplayName("LTJ-7: Assign sensor node to target farm zone")
    void testAssignSensorToZone_Success() {
        Zone targetZone = new Zone();
        targetZone.setId(2L);
        targetZone.setName("Zone B - Greenhouse");

        when(sensorRepository.findById(100L)).thenReturn(Optional.of(sampleSensor));
        when(zoneRepository.findById(2L)).thenReturn(Optional.of(targetZone));
        when(sensorRepository.save(any(Sensor.class))).thenAnswer(inv -> inv.getArgument(0));

        Sensor updated = gatewayService.assignSensorToZone(100L, 2L);

        assertNotNull(updated.getZone());
        assertEquals(2L, updated.getZone().getId());
        assertEquals("Zone B - Greenhouse", updated.getZone().getName());
    }
}
