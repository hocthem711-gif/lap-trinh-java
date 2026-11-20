package com.smartfarm.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HandshakeResponseDTO {
    private boolean success;
    private String message;
    private String sessionId;
}
