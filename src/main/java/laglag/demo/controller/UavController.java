package laglag.demo.controller;

import laglag.demo.dto.HandshakeRequestDTO;
import laglag.demo.dto.HandshakeResponseDTO;
import laglag.demo.entity.Uav;
import laglag.demo.repository.UavRepository;
import laglag.demo.service.UavService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/uavs")
public class UavController {

    @Autowired
    private UavRepository uavRepository;

    // Bổ sung thêm UavService để xử lý logic Handshake
    @Autowired
    private UavService uavService;

    // Các API cũ của bạn giữ nguyên
    @GetMapping
    public ResponseEntity<List<Uav>> getAllUavs() {
        return ResponseEntity.ok(uavRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Uav> createUav(@RequestBody Uav uav) {
        Uav savedUav = uavRepository.save(uav);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUav);
    }

    // Bổ sung API Handshake mới
    @PostMapping("/handshake")
    public ResponseEntity<HandshakeResponseDTO> handshake(@RequestBody HandshakeRequestDTO request) {
        HandshakeResponseDTO response = uavService.processHandshake(request);
        return ResponseEntity.ok(response);
    }
}