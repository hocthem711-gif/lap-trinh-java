package com.iot.simulator;

import java.sql.*;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lưu tạm dữ liệu cảm biến vào SQLite khi UAV mất mạng (Sprint 5 - LTJ-25).
 *
 * Các hàm có synchronized vì nhiều luồng cảm biến cùng ghi vào 1 kết nối SQLite.
 *
 * Bảng offline_telemetry chỉ có 3 cột:
 *   - id        : khóa tự tăng
 *   - payload   : gói JSON của SensorData (giống hệt khi gửi online)
 *   - is_synced : 0 = chưa gửi, 1 = đã gửi lên MQTT thành công
 */
public class OfflineStorageManager implements AutoCloseable {

    private final Connection conn;

    public OfflineStorageManager(String dbPath) throws SQLException {
        conn = DriverManager.getConnection("jdbc:sqlite:" + dbPath);
        try (Statement st = conn.createStatement()) {
            st.execute("CREATE TABLE IF NOT EXISTS offline_telemetry ("
                    + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    + "payload TEXT NOT NULL, "
                    + "is_synced INTEGER DEFAULT 0)");
        }
    }

    /** Lưu 1 bản tin cảm biến (trạng thái chưa đồng bộ). */
    public synchronized void save(SensorData data) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "INSERT INTO offline_telemetry(payload) VALUES (?)")) {
            ps.setString(1, data.toCompactJson());
            ps.executeUpdate();
        }
    }

    /** Lấy tối đa {@code limit} bản ghi chưa đồng bộ, cũ nhất trước. Trả về Map: id -> JSON. */
    public synchronized Map<Long, String> getPending(int limit) throws SQLException {
        Map<Long, String> result = new LinkedHashMap<>();
        try (PreparedStatement ps = conn.prepareStatement(
                "SELECT id, payload FROM offline_telemetry WHERE is_synced = 0 ORDER BY id LIMIT ?")) {
            ps.setInt(1, limit);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    result.put(rs.getLong("id"), rs.getString("payload"));
                }
            }
        }
        return result;
    }

    /** Đánh dấu các bản ghi đã gửi thành công. */
    public synchronized void markSynced(Collection<Long> ids) throws SQLException {
        try (PreparedStatement ps = conn.prepareStatement(
                "UPDATE offline_telemetry SET is_synced = 1 WHERE id = ?")) {
            for (Long id : ids) {
                ps.setLong(1, id);
                ps.executeUpdate();
            }
        }
    }

    public int countPending() throws SQLException {
        return count("SELECT COUNT(*) FROM offline_telemetry WHERE is_synced = 0");
    }

    public int countSynced() throws SQLException {
        return count("SELECT COUNT(*) FROM offline_telemetry WHERE is_synced = 1");
    }

    /** Xóa toàn bộ dữ liệu (dùng khi test). */
    public void clear() throws SQLException {
        try (Statement st = conn.createStatement()) {
            st.execute("DELETE FROM offline_telemetry");
        }
    }

    private synchronized int count(String sql) throws SQLException {
        try (Statement st = conn.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            return rs.next() ? rs.getInt(1) : 0;
        }
    }

    @Override
    public void close() throws SQLException {
        conn.close();
    }
}
