package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.FarmRequest;
import com.smartfarm.backend.dto.response.FarmResponse;
import com.smartfarm.backend.service.FarmService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/farms")
@Tag(name = "3. Farm Management", description = "APIs Quản lý Trang trại (Farm CRUD) (F03)")
public class FarmController {

    private final FarmService farmService;

    public FarmController(FarmService farmService) {
        this.farmService = farmService;
    }

    @PostMapping
    @Operation(summary = "Tạo mới trang trại (F03)", description = "Thêm mới một trang trại và tự động liên kết với người dùng hiện tại")
    public ResponseEntity<ApiResponse<FarmResponse>> createFarm(@Valid @RequestBody FarmRequest request) {
        FarmResponse response = farmService.createFarm(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Tạo trang trại thành công!", response));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách trang trại của tôi", description = "Lấy danh sách các trang trại thuộc quyền sở hữu của người dùng đang đăng nhập")
    public ResponseEntity<ApiResponse<List<FarmResponse>>> getMyFarms() {
        List<FarmResponse> list = farmService.getMyFarms();
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách trang trại thành công!", list));
    }

    @GetMapping("/all")
    @Operation(summary = "Lấy toàn bộ trang trại trong hệ thống", description = "Lấy danh sách tất cả trang trại phục vụ quản trị viên")
    public ResponseEntity<ApiResponse<List<FarmResponse>>> getAllFarms() {
        List<FarmResponse> list = farmService.getAllFarms();
        return ResponseEntity.ok(ApiResponse.success("Lấy toàn bộ trang trại thành công!", list));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết trang trại theo ID", description = "Lấy thông tin chi tiết một trang trại")
    public ResponseEntity<ApiResponse<FarmResponse>> getFarmById(@PathVariable Long id) {
        FarmResponse response = farmService.getFarmById(id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật thông tin trang trại", description = "Chỉnh sửa tên, địa chỉ, diện tích của trang trại")
    public ResponseEntity<ApiResponse<FarmResponse>> updateFarm(@PathVariable Long id, @Valid @RequestBody FarmRequest request) {
        FarmResponse response = farmService.updateFarm(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trang trại thành công!", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Xóa trang trại", description = "Xóa một trang trại cùng các vùng canh tác trực thuộc")
    public ResponseEntity<ApiResponse<String>> deleteFarm(@PathVariable Long id) {
        farmService.deleteFarm(id);
        return ResponseEntity.ok(ApiResponse.success("Xóa trang trại thành công!", "Farm ID " + id + " đã bị xóa."));
    }
}
