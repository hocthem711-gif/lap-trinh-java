/**
 * Unit Test — Thuật toán Định vị & Nội suy đường bay UAV (LTJ-19 / LTJ-34 / LTJ-35)
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 */
import { describe, expect, it } from 'vitest';
import {
  calculateBearingDeg,
  calculateHaversineMeters,
  formatFlightTime,
  interpolateCoordinate,
} from '../flightMonitorService';

describe('calculateHaversineMeters — khoảng cách mặt cầu (mét)', () => {
  it('trả về 0 khi 2 điểm trùng nhau', () => {
    expect(calculateHaversineMeters(11.9396, 108.4662, 11.9396, 108.4662)).toBe(0);
  });

  it('1 độ vĩ tuyến xấp xỉ 111,195 m', () => {
    expect(calculateHaversineMeters(0, 0, 1, 0)).toBe(111195);
  });

  it('có tính đối xứng A→B = B→A', () => {
    const ab = calculateHaversineMeters(11.9389, 108.4654, 11.9402, 108.4658);
    const ba = calculateHaversineMeters(11.9402, 108.4658, 11.9389, 108.4654);
    expect(ab).toBe(ba);
    expect(ab).toBeGreaterThan(0);
  });

  it('không trả về NaN với 2 điểm đối xứng tâm Trái Đất', () => {
    expect(Number.isNaN(calculateHaversineMeters(0, 0, 0, 180))).toBe(false);
  });
});

describe('calculateBearingDeg — góc phương vị mũi bay', () => {
  it.each([
    [1, 0, 0],
    [0, 1, 90],
    [-1, 0, 180],
    [0, -1, 270],
  ])('từ (0,0) tới (%d,%d) có hướng %d°', (lat, lng, expected) => {
    expect(calculateBearingDeg(0, 0, lat, lng)).toBe(expected);
  });
});

describe('interpolateCoordinate — nội suy tuyến tính LERP', () => {
  it('alpha = 0.5 trả về trung điểm', () => {
    expect(interpolateCoordinate(10, 100, 20, 110, 0.5)).toEqual({ latitude: 15, longitude: 105 });
  });

  it('kẹp alpha ngoài khoảng [0, 1] về điểm đầu / điểm cuối', () => {
    expect(interpolateCoordinate(10, 100, 20, 110, -1)).toEqual({ latitude: 10, longitude: 100 });
    expect(interpolateCoordinate(10, 100, 20, 110, 2)).toEqual({ latitude: 20, longitude: 110 });
  });
});

describe('formatFlightTime — định dạng mm:ss', () => {
  it('định dạng đúng số giây', () => {
    expect(formatFlightTime(125)).toBe('02:05');
    expect(formatFlightTime(59.6)).toBe('01:00');
  });

  it('giá trị âm được đưa về 00:00', () => {
    expect(formatFlightTime(-5)).toBe('00:00');
  });
});
