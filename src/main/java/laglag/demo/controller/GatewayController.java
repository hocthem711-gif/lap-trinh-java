package laglag.demo.controller;

import laglag.demo.entity.Gateway;
import laglag.demo.repository.GatewayRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gateways")
public class GatewayController {

    @Autowired
    private GatewayRepository gatewayRepository;

    @GetMapping
    public ResponseEntity<List<Gateway>> getAllGateways() {
        return ResponseEntity.ok(gatewayRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Gateway> createGateway(@RequestBody Gateway gateway) {
        Gateway savedGateway = gatewayRepository.save(gateway);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedGateway);
    }
}