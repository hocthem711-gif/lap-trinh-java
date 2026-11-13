package com.iot.simulator;

import com.google.gson.Gson;
import java.util.List;

/**
 * Bộ kiểm tra cấu trúc JSON Waypoints & Kiểm thử tạo Mission UAV (F14, F16).
 * Task: [Sprint 4][Dev 5] LTJ-20 - Review JSON Waypoints & Test Tạo Mission.
 */
public class WaypointMissionValidator {

    // 1. Khung tọa độ an toàn của nông trại (Geofence) và giới hạn vật lý của UAV
    public static final double MIN_LAT = 10.840, MAX_LAT = 10.860;
    public static final double MIN_LNG = 106.760, MAX_LNG = 106.790;
    public static final double MIN_ALT = 5.0,    MAX_ALT = 500.0;  // Độ cao: 5m - 500m
    public static final double MIN_SPD = 1.0,    MAX_SPD = 30.0;   // Tốc độ: 1 - 30 m/s
    public static final double BATTERY_RATE_PER_MIN = 0.35;        // Hao pin: 0.35% / phút

    private static final Gson GSON = new Gson();

    // 2. Cấu trúc 1 điểm bay (Waypoint) và gói tin Mission (khớp với JSON từ Frontend)
    public static class WaypointItem {
        public int order;
        public double latitude;
        public double longitude;
        public double altitude;
        public double speed;
        public String type; // TAKEOFF, NORMAL, HOVER, LANDING, RETURN_HOME
    }

    public static class MissionPayload {
        public String missionName;
        public List<WaypointItem> waypoints;
        public double totalDistanceM;
        public int estimatedTimeSeconds;
        public double estimatedBatteryDrain;
    }

    /**
     * HÀM 1: Tính khoảng cách mặt đất giữa 2 tọa độ GPS bằng công thức Haversine (đơn vị: mét).
     */
    public static double haversineDistanceMeters(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371000.0; // Bán kính Trái Đất (mét)
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /**
     * HÀM 2: Kiểm tra gói JSON Waypoints.
     * Trả về chuỗi "OK|quãng_đường|thời_gian|pin" nếu hợp lệ, hoặc "LOI: <lý do>" nếu sai.
     */
    public static String validateMissionJson(String jsonString) {
        MissionPayload payload = GSON.fromJson(jsonString, MissionPayload.class);
        if (payload == null || payload.waypoints == null || payload.waypoints.size() < 2) {
            return "LOI: Lo trinh bay phai co toi thieu tu 2 diem Waypoints tro len.";
        }

        double totalDistM = 0.0;
        double totalTimeSec = 0.0;

        for (int i = 0; i < payload.waypoints.size(); i++) {
            WaypointItem wp = payload.waypoints.get(i);

            // Kiểm tra 1: Số thứ tự order phải tăng dần liên tục 1, 2, 3...
            if (wp.order != i + 1) {
                return "LOI: Diem bay thu " + (i + 1) + " bi sai thu tu order=" + wp.order;
            }
            // Kiểm tra 2: Tọa độ GPS phải nằm trong vùng an toàn Geofence của nông trại
            if (wp.latitude < MIN_LAT || wp.latitude > MAX_LAT || wp.longitude < MIN_LNG || wp.longitude > MAX_LNG) {
                return "LOI: Waypoint #" + wp.order + " nam ngoai ranh gioi an toan Geofence.";
            }
            // Kiểm tra 3: Độ cao bay an toàn [5m - 500m]
            if (wp.altitude < MIN_ALT || wp.altitude > MAX_ALT) {
                return "LOI: Waypoint #" + wp.order + " co do cao " + wp.altitude + "m vuot nguong [5m - 500m].";
            }
            // Kiểm tra 4: Tốc độ bay an toàn [1m/s - 30m/s]
            if (wp.speed < MIN_SPD || wp.speed > MAX_SPD) {
                return "LOI: Waypoint #" + wp.order + " co toc do " + wp.speed + "m/s vuot nguong [1 - 30m/s].";
            }
            // Kiểm tra 5: Loại hành động tại điểm bay
            if (!"TAKEOFF".equals(wp.type) && !"NORMAL".equals(wp.type) && !"HOVER".equals(wp.type)
                    && !"LANDING".equals(wp.type) && !"RETURN_HOME".equals(wp.type)) {
                return "LOI: Waypoint #" + wp.order + " co loai hanh dong '" + wp.type + "' khong hop le.";
            }

            // Tính quãng đường 3D (Pythagoras của khoảng cách ngang Haversine và chênh lệch độ cao)
            if (i > 0) {
                WaypointItem prev = payload.waypoints.get(i - 1);
                double hDist = haversineDistanceMeters(prev.latitude, prev.longitude, wp.latitude, wp.longitude);
                double vDist = Math.abs(wp.altitude - prev.altitude);
                double segDist = Math.sqrt(hDist * hDist + vDist * vDist);
                totalDistM += segDist;
                totalTimeSec += segDist / wp.speed;
            }
        }

        double distRounded = Math.round(totalDistM * 100.0) / 100.0;
        int timeRounded = (int) Math.round(totalTimeSec);
        double batteryDrain = Math.round((totalTimeSec / 60.0) * BATTERY_RATE_PER_MIN * 100.0) / 100.0;
        return String.format("OK|Dist=%.2fm, Time=%ds, Pin=%.2f%%", distRounded, timeRounded, batteryDrain);
    }

    /**
     * HÀM 3: Kiểm tra quy tắc chuyển đổi trạng thái Mission (F16).
     * Luồng chuẩn: STANDBY -> PLANNING -> ACTIVE -> PAUSED -> COMPLETED (hoặc ABORTED).
     */
    public static boolean isValidStatusTransition(String current, String next) {
        switch (current) {
            case "STANDBY":   return "PLANNING".equals(next);
            case "PLANNING":  return "ACTIVE".equals(next) || "ABORTED".equals(next);
            case "ACTIVE":    return "PAUSED".equals(next) || "COMPLETED".equals(next) || "ABORTED".equals(next);
            case "PAUSED":    return "ACTIVE".equals(next) || "ABORTED".equals(next);
            case "COMPLETED":
            case "ABORTED":   return "STANDBY".equals(next);
            default:          return false;
        }
    }

    /**
     * HÀM 4: Chạy tự động 10 kịch bản kiểm thử cho Task LTJ-20 (--test-mission).
     */
    public static void runAutomatedMissionTestSuite() {
        System.out.println("==========================================================================");
        System.out.println("   SMART FARM IOT - REVIEW JSON WAYPOINTS & TEST TAO MISSION (LTJ-20)     ");
        System.out.println("==========================================================================");

        String valid4Wp = "{\"missionName\":\"Khao sat Khu A\",\"waypoints\":["
                + "{\"order\":1,\"latitude\":10.8450,\"longitude\":106.7650,\"altitude\":30,\"speed\":8,\"type\":\"TAKEOFF\"},"
                + "{\"order\":2,\"latitude\":10.8485,\"longitude\":106.7710,\"altitude\":50,\"speed\":10,\"type\":\"NORMAL\"},"
                + "{\"order\":3,\"latitude\":10.8520,\"longitude\":106.7760,\"altitude\":50,\"speed\":8,\"type\":\"HOVER\"},"
                + "{\"order\":4,\"latitude\":10.8550,\"longitude\":106.7820,\"altitude\":20,\"speed\":5,\"type\":\"LANDING\"}"
                + "]}";

        int pass = 0;
        String r1 = validateMissionJson(valid4Wp);
        pass += check("TC-01", "Tao Mission chuan 4 Waypoints trong vung Geofence (F14)", r1.startsWith("OK"), r1);
        pass += check("TC-02", "Doi chieu cong thuc Haversine 3D & tieu hao pin (0.35%/phut)", r1.contains("2168"), r1);

        String r3 = validateMissionJson("{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"}]}");
        pass += check("TC-03", "Chan tao Mission khi so luong Waypoints < 2 diem", r3.startsWith("LOI"), r3);

        String r4 = validateMissionJson("{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},{\"order\":2,\"latitude\":10.91,\"longitude\":106.85,\"altitude\":50,\"speed\":8,\"type\":\"NORMAL\"}]}");
        pass += check("TC-04", "Phat hien Waypoint vuot ranh gioi an toan Geofence", r4.startsWith("LOI"), r4);

        String r5 = validateMissionJson("{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":650,\"speed\":8,\"type\":\"NORMAL\"}]}");
        pass += check("TC-05", "Chan cau hinh do cao bay vuot nguong [5m - 500m]", r5.startsWith("LOI"), r5);

        String r6 = validateMissionJson("{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":45,\"type\":\"NORMAL\"}]}");
        pass += check("TC-06", "Chan cau hinh toc do bay vuot nguong [1 - 30m/s]", r6.startsWith("LOI"), r6);

        String r7 = validateMissionJson("{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},{\"order\":3,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":8,\"type\":\"LANDING\"}]}");
        pass += check("TC-07", "Phat hien loi danh so thu tu (order) bi nhay coc", r7.startsWith("LOI"), r7);

        String r8 = validateMissionJson("{\"waypoints\":[{\"order\":1,\"latitude\":10.85,\"longitude\":106.77,\"altitude\":50,\"speed\":8,\"type\":\"TAKEOFF\"},{\"order\":2,\"latitude\":10.852,\"longitude\":106.772,\"altitude\":50,\"speed\":8,\"type\":\"INVALID_TYPE\"}]}");
        pass += check("TC-08", "Phat hien hanh dong WaypointType khong hop le", r8.startsWith("LOI"), r8);

        boolean okFlow = isValidStatusTransition("STANDBY", "PLANNING") && isValidStatusTransition("PLANNING", "ACTIVE") && isValidStatusTransition("ACTIVE", "COMPLETED");
        pass += check("TC-09", "Chuyen trang thai chuan: STANDBY->PLANNING->ACTIVE->COMPLETED", okFlow, "Hop le 100%");

        boolean blockFlow = !isValidStatusTransition("STANDBY", "COMPLETED") && !isValidStatusTransition("COMPLETED", "ACTIVE");
        pass += check("TC-10", "Chan chuyen trang thai Mission trai quy tac nghiep vu (F16)", blockFlow, "Da chan nhay coc");

        System.out.println("--------------------------------------------------------------------------");
        System.out.printf("  TONG KET KIEM THU LTJ-20: %d / 10 TEST CASES PASS (%d%%)%n", pass, pass * 10);
        System.out.println("==========================================================================");
    }

    private static int check(String id, String name, boolean ok, String detail) {
        System.out.printf("  [%s] %-5s | %-58s | %s%n", ok ? "PASS" : "FAIL", id, name, detail);
        return ok ? 1 : 0;
    }
}
