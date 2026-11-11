package laglag.demo.dto;

import lombok.Data;
import java.util.List;

@Data
public class MissionRequestDTO {
    private String name;
    private List<WaypointDTO> waypoints;
}