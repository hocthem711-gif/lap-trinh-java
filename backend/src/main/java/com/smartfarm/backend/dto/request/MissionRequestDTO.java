package com.smartfarm.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MissionRequestDTO {
    private String name;
    private String missionName;
    private String uavId;
    private Long zoneId;
    private List<WaypointDTO> waypoints;

    public String getEffectiveName() {
        if (missionName != null && !missionName.isBlank()) {
            return missionName;
        }
        if (name != null && !name.isBlank()) {
            return name;
        }
        return "Mission-" + System.currentTimeMillis();
    }
}
