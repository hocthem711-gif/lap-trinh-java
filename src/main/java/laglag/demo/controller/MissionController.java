package laglag.demo.controller;

import laglag.demo.entity.Mission;
import laglag.demo.service.MissionService;
import laglag.demo.dto.MissionRequestDTO;
import laglag.demo.dto.StatusUpdateRequestDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/missions")
public class MissionController {

    @Autowired
    private MissionService missionService;

    // API tạo Mission và danh sách Waypoints
    @PostMapping
    public ResponseEntity<Mission> createMission(@RequestBody MissionRequestDTO request) {
        Mission createdMission = missionService.createMission(request);
        return ResponseEntity.ok(createdMission);
    }

    // API thay đổi trạng thái Mission
    @PatchMapping("/{id}/status")
    public ResponseEntity<Mission> updateStatus(
            @PathVariable Long id,
            @RequestBody StatusUpdateRequestDTO request) {
        Mission updatedMission = missionService.updateMissionStatus(id, request.getStatus());
        return ResponseEntity.ok(updatedMission);
    }
}