package com.smartfarm.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WaypointDTO {
    private Integer order;
    private Integer orderIndex;
    private Double latitude;
    private Double longitude;
    private Double altitude;
    private Double speed;
    private String type;
    private String actionType;
    private String label;

    public Integer getEffectiveOrder() {
        if (order != null) return order;
        if (orderIndex != null) return orderIndex;
        return null;
    }

    public String getEffectiveType() {
        if (type != null && !type.isBlank()) return type;
        if (actionType != null && !actionType.isBlank()) return actionType;
        return "NORMAL";
    }
}
