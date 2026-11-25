package com.iot.simulator;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Automated JUnit 5 test suite for WaypointMissionValidator (LTJ-20).
 */
class WaypointMissionValidatorTest {

    @Test
    @DisplayName("LTJ-20: Validate standard 4-waypoint mission within Geofence and compute 3D Haversine metrics")
    void testValidFourWaypointMission() {
        String validJson = "{\"missionName\":\"Survey Zone A\",\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.8450,\"longitude\":106.7650,\"altitude\":30,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.8485,\"longitude\":106.7710,\"altitude\":50,\"speed\":10,\"type\":\"NORMAL\"},"
                + "{\"order\":3,\"latitude\":10.8520,\"longitude\":106.7760,\"altitude\":50,\"speed\":8,\"type\":\"HOVER\"},"
                + "{\"order\":4,\"latitude\":10.8550,\"longitude\":106.7820,\"altitude\":20,\"speed\":5,\"type\":\"LANDING\"}"
                + "]}";

        String result = WaypointMissionValidator.validateMissionJson(validJson);
        assertTrue(result.startsWith("OK|"), "Valid mission payload must return OK status");
        assertTrue(result.contains("2168"), "3D Haversine total distance should match expected ~2168m");
    }

    @Test
    @DisplayName("LTJ-20: Reject mission payload with fewer than 2 waypoints")
    void testRejectInsufficientWaypoints() {
        String singleWpJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"}"
                + "]}";

        String result = WaypointMissionValidator.validateMissionJson(singleWpJson);
        assertTrue(result.startsWith("LOI:"), "Mission with fewer than 2 waypoints must be rejected");
    }

    @Test
    @DisplayName("LTJ-20: Reject waypoint coordinates outside farm Geofence boundary")
    void testRejectOutOfGeofenceBounds() {
        String outOfBoundsJson = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.91,\"longitude\":106.85,\"altitude\":50,\"speed\":8,\"type\":\"LANDING\"}"
                + "]}";

        String result = WaypointMissionValidator.validateMissionJson(outOfBoundsJson);
        assertTrue(result.startsWith("LOI:") && result.contains("Geofence"));
    }

    @Test
    @DisplayName("LTJ-20: Reject invalid altitude, speed, non-sequential order, and unsupported action type")
    void testRejectInvalidPhysicalParametersAndOrder() {
        String invalidAlt = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":650,\"speed\":8,\"type\":\"LANDING\"}"
                + "]}";
        assertTrue(WaypointMissionValidator.validateMissionJson(invalidAlt).startsWith("LOI:"));

        String invalidSpeed = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":45,\"type\":\"LANDING\"}"
                + "]}";
        assertTrue(WaypointMissionValidator.validateMissionJson(invalidSpeed).startsWith("LOI:"));

        String invalidOrder = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":3,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":8,\"type\":\"LANDING\"}"
                + "]}";
        assertTrue(WaypointMissionValidator.validateMissionJson(invalidOrder).startsWith("LOI:"));

        String invalidType = "{\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":8,\"type\":\"ACROBATIC\"}"
                + "]}";
        assertTrue(WaypointMissionValidator.validateMissionJson(invalidType).startsWith("LOI:"));
    }

    @Test
    @DisplayName("LTJ-20: Verify Mission FSM valid and invalid state transitions")
    void testMissionStatusTransitions() {
        assertTrue(WaypointMissionValidator.isValidStatusTransition("STANDBY", "PLANNING"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("PLANNING", "ACTIVE"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("ACTIVE", "PAUSED"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("PAUSED", "ACTIVE"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("ACTIVE", "COMPLETED"));
        assertTrue(WaypointMissionValidator.isValidStatusTransition("COMPLETED", "STANDBY"));

        assertFalse(WaypointMissionValidator.isValidStatusTransition("STANDBY", "COMPLETED"));
        assertFalse(WaypointMissionValidator.isValidStatusTransition("COMPLETED", "ACTIVE"));
        assertFalse(WaypointMissionValidator.isValidStatusTransition("UNKNOWN", "ACTIVE"));
    }
}
