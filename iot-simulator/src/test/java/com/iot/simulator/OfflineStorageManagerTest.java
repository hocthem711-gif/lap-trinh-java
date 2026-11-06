package com.iot.simulator;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Kiểm thử lưu trữ SQLite cho UAV Offline Sync (LTJ-25). */
class OfflineStorageManagerTest {

    @TempDir
    Path tempDir;
    private OfflineStorageManager storage;

    @BeforeEach
    void setUp() throws Exception {
        storage = new OfflineStorageManager(tempDir.resolve("test.db").toString());
        for (int i = 1; i <= 25; i++) {
            storage.save(SensorData.generateRandom(1L, 1L, "DEV-Z1-" + i));
        }
    }

    @AfterEach
    void tearDown() throws Exception {
        storage.close();
    }

    @Test
    void luuDuLieuKhiMatMang() throws Exception {
        assertEquals(25, storage.countPending());
        assertEquals(0, storage.countSynced());
    }

    @Test
    void layTheoLoVaDanhDauDaGui() throws Exception {
        Map<Long, String> batch = storage.getPending(10);
        assertEquals(10, batch.size());

        storage.markSynced(batch.keySet());
        assertEquals(15, storage.countPending());
        assertEquals(10, storage.countSynced());
    }

    @Test
    void guiHetThiKhongConTonDong() throws Exception {
        Map<Long, String> batch;
        while (!(batch = storage.getPending(10)).isEmpty()) {
            storage.markSynced(batch.keySet());
        }
        assertEquals(0, storage.countPending());
        assertEquals(25, storage.countSynced());
    }
}
