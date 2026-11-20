package com.smartfarm.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WaypointDTO {
    private Integer orderIndex;
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double speed;
    private String actionType;
}
