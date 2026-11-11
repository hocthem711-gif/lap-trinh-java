package laglag.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class HandshakeResponseDTO {
    private Boolean authenticated;
    private String message;
    private String sessionId;
}