package com.smartfarm.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MissionRequestDTO {
    private String name;
    private Long uavId;
    private List<WaypointDTO> waypoints;
}
