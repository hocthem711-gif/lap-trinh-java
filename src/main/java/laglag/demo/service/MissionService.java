package laglag.demo.service;

import laglag.demo.entity.Mission;
import laglag.demo.entity.Waypoint;
import laglag.demo.repository.MissionRepository;
import laglag.demo.dto.MissionRequestDTO;
import laglag.demo.dto.WaypointDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class MissionService {

    @Autowired
    private MissionRepository missionRepository;

    @Transactional
    public Mission createMission(MissionRequestDTO request) {
        Mission mission = new Mission();
        mission.setName(request.getName());
        mission.setStatus("CREATED"); // Trạng thái mặc định

        if (request.getWaypoints() != null) {
            List<Waypoint> waypoints = new ArrayList<>();
            for (WaypointDTO wpDto : request.getWaypoints()) {
                Waypoint wp = new Waypoint();
                wp.setLatitude(wpDto.getLatitude());
                wp.setLongitude(wpDto.getLongitude());
                wp.setMission(mission); // Gắn mission vào waypoint để lưu khóa ngoại
                waypoints.add(wp);
            }
            mission.setWaypoints(waypoints);
        }

        return missionRepository.save(mission);
    }

    public Mission updateMissionStatus(Long id, String newStatus) {
        Mission mission = missionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy Mission với id: " + id));
        mission.setStatus(newStatus);
        return missionRepository.save(mission);
    }
}