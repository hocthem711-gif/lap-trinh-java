package com.smartfarm.backend.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HandshakeRequestDTO {
    private String code;
    private String uavId;
    private String token;
    private String action;
    private Integer pendingRecords;
    private Long requestTime;

    public HandshakeRequestDTO(String code, String token) {
        this.code = code;
        this.token = token;
    }

    public String getEffectiveCode() {
        if (code != null && !code.isBlank()) {
            return code.trim();
        }
        if (uavId != null && !uavId.isBlank()) {
            return uavId.trim();
        }
        return null;
    }
}
