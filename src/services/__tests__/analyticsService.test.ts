/**
 * Unit Test — So sánh 2 Zone (F07) & Lịch sử Sync UAV (LTJ-24) + Cấu hình API
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 */
import { describe, expect, it } from 'vitest';
import {
  bucketizeRows,
  buildBucketPlan,
  buildSyncSessionId,
  computeSeriesStats,
  createSeededRandom,
  formatDuration,
  roundTo,
} from '../analyticsService';
import { DEFAULT_API_BASE_URL, normalizeApiBaseUrl } from '../../config/apiConfig';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

describe('createSeededRandom — Mulberry32', () => {
  it('cùng seed sinh cùng dãy số và giá trị nằm trong [0, 1)', () => {
    const a = createSeededRandom(2026);
    const b = createSeededRandom(2026);
    for (let i = 0; i < 50; i++) {
      const va = a();
      expect(va).toBe(b());
      expect(va).toBeGreaterThanOrEqual(0);
      expect(va).toBeLessThan(1);
    }
  });
});

describe('roundTo', () => {
  it('làm tròn theo số chữ số thập phân', () => {
    expect(roundTo(3.14159, 2)).toBe(3.14);
    expect(roundTo(2.5, 0)).toBe(3);
  });
});

describe('buildBucketPlan — chia khung thời gian', () => {
  const now = new Date(2026, 10, 28, 10, 30, 0);

  it('24H → 24 khung 1 giờ, khung cuối là giờ hiện tại', () => {
    const plan = buildBucketPlan('24H', now);
    expect(plan.count).toBe(24);
    expect(plan.hourly).toBe(true);
    expect(plan.bucketMs).toBe(HOUR_MS);
    expect(plan.start.getTime()).toBe(new Date(2026, 10, 28, 10, 0, 0).getTime() - 23 * HOUR_MS);
  });

  it('7D và 30D → khung theo ngày', () => {
    expect(buildBucketPlan('7D', now)).toMatchObject({ count: 7, bucketMs: DAY_MS, hourly: false });
    expect(buildBucketPlan('30D', now)).toMatchObject({ count: 30, bucketMs: DAY_MS, hourly: false });
  });
});

describe('computeSeriesStats — bỏ qua điểm null', () => {
  it('tính đúng avg / min / max / latest / count', () => {
    const points = [10, null, 20, 30].map((value, i) => ({
      timestamp: String(i),
      label: String(i),
      value,
    }));
    expect(computeSeriesStats(points, 1)).toEqual({ avg: 20, min: 10, max: 30, latest: 30, count: 3 });
  });

  it('trả về toàn 0 khi không có dữ liệu', () => {
    expect(computeSeriesStats([], 1)).toEqual({ avg: 0, min: 0, max: 0, latest: 0, count: 0 });
  });
});

describe('bucketizeRows — gom bản ghi Backend theo khung', () => {
  it('lấy trung bình trong khung và bỏ qua bản ghi ngoài phạm vi', () => {
    const plan = buildBucketPlan('24H', new Date(2026, 10, 28, 10, 30, 0));
    const inFirst = new Date(plan.start.getTime() + 30 * 60_000).toISOString();
    const outside = new Date(plan.start.getTime() - HOUR_MS).toISOString();
    const rows = [
      { sensorType: 'TEMPERATURE', zoneId: 1, value: 10, recordedAt: inFirst },
      { sensorType: 'TEMPERATURE', zoneId: 1, value: 20, recordedAt: inFirst },
      { sensorType: 'TEMPERATURE', zoneId: 1, value: 99, recordedAt: outside },
    ];
    const points = bucketizeRows(rows, plan, 1);
    expect(points).toHaveLength(24);
    expect(points[0].value).toBe(15);
    expect(points.slice(1).every((p) => p.value === null)).toBe(true);
  });
});

describe('Định dạng hiển thị Sync UAV', () => {
  it('formatDuration → "phút giây"', () => {
    expect(formatDuration(1508)).toBe('25 phút 08 giây');
  });

  it('buildSyncSessionId theo quy tắc SYNC-{uavId}-{epochSeconds}', () => {
    expect(buildSyncSessionId('UAV-001', new Date(1_700_000_000_000))).toBe('SYNC-UAV-001-1700000000');
  });
});

describe('normalizeApiBaseUrl — cấu hình VITE_API_BASE_URL', () => {
  it('dùng mặc định khi không khai báo hoặc rỗng', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe(DEFAULT_API_BASE_URL);
    expect(normalizeApiBaseUrl('   ')).toBe(DEFAULT_API_BASE_URL);
  });

  it('bỏ khoảng trắng và dấu "/" thừa ở cuối', () => {
    expect(normalizeApiBaseUrl(' http://10.0.0.5:8080/api/v1/ ')).toBe('http://10.0.0.5:8080/api/v1');
  });
});
