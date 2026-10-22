package laglag.demo.controller;

import laglag.demo.entity.Uav;
import laglag.demo.repository.UavRepository;
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

    @GetMapping
    public ResponseEntity<List<Uav>> getAllUavs() {
        return ResponseEntity.ok(uavRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Uav> createUav(@RequestBody Uav uav) {
        Uav savedUav = uavRepository.save(uav);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedUav);
    }
}