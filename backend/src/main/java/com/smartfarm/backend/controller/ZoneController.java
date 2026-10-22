package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.ZoneRequest;
import com.smartfarm.backend.dto.response.ZoneResponse;
import com.smartfarm.backend.service.ZoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/zones")
@Tag(name = "4. Zone Management", description = "APIs Quản lý Vùng Canh Tác (Zone CRUD) (F03)")
public class ZoneController {

    private final ZoneService zoneService;

    public ZoneController(ZoneService zoneService) {
        this.zoneService = zoneService;
    }

    @PostMapping
    @Operation(summary = "Tạo mới vùng canh tác (F03)", description = "Thêm mới một Zone thuộc về một Trang trại cụ thể (farmId)")
    public ResponseEntity<ApiResponse<ZoneResponse>> createZone(@Valid @RequestBody ZoneRequest request) {
        ZoneResponse response = zoneService.createZone(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo vùng canh tác thành công!", response));
    }

    @GetMapping
    @Operation(summary = "Lấy toàn bộ danh sách vùng canh tác", description = "Lấy tất cả các Zones trong hệ thống")
    public ResponseEntity<ApiResponse<List<ZoneResponse>>> getAllZones() {
        List<ZoneResponse> list = zoneService.getAllZones();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vùng canh tác thành công!", list));
    }

    @GetMapping("/farm/{farmId}")
    @Operation(summary = "Lấy danh sách vùng canh tác theo Trang trại (farmId)", description = "Lấy các Zone trực thuộc trang trại chỉ định để Frontend vẽ cây thư mục")
    public ResponseEntity<ApiResponse<List<ZoneResponse>>> getZonesByFarmId(@PathVariable Long farmId) {
        List<ZoneResponse> list = zoneService.getZonesByFarmId(farmId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách vùng theo trang trại thành công!", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết vùng canh tác theo ID", description = "Lấy thông tin chi tiết một Zone")
    public ResponseEntity<ApiResponse<ZoneResponse>> getZoneById(@PathVariable Long id) {
        ZoneResponse response = zoneService.getZoneById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin vùng canh tác", description = "Chỉnh sửa tên vùng, loại cây trồng hoặc chuyển sang Farm khác")
    public ResponseEntity<ApiResponse<ZoneResponse>> updateZone(@PathVariable Long id, @Valid @RequestBody ZoneRequest request) {
        ZoneResponse response = zoneService.updateZone(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật vùng canh tác thành công!", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa vùng canh tác", description = "Xóa một Zone khỏi hệ thống")
    public ResponseEntity<ApiResponse<String>> deleteZone(@PathVariable Long id) {
        zoneService.deleteZone(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa vùng canh tác thành công!", "Zone ID " + id + " đã bị xóa."));
    }
}
