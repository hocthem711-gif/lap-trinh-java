/**
 * Unit Test — Kiểm định Ngưỡng 4 mốc & Đánh giá Cảnh báo (LTJ-29)
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 */
import { describe, expect, it } from 'vitest';
import { evaluateReadingAgainstRule, validateThresholdRule } from '../alertService';
import type { ThresholdRule } from '../../types/alert';

const TEMP_RULE: ThresholdRule = {
  id: 1,
  zoneId: 1,
  zoneName: 'Khu A',
  farmId: 1,
  farmName: 'Trang trại Đà Lạt',
  sensorType: 'TEMPERATURE',
  criticalMin: 12,
  minValue: 18,
  maxValue: 35,
  criticalMax: 42,
  enabled: true,
  updatedAt: '2026-11-12T00:00:00.000Z',
};

describe('validateThresholdRule — criticalMin < min < max < criticalMax', () => {
  it('chấp nhận cấu hình mặc định hợp lệ', () => {
    expect(validateThresholdRule(TEMP_RULE)).toEqual({ valid: true });
  });

  it('từ chối khi criticalMin >= minValue', () => {
    const r = validateThresholdRule({ ...TEMP_RULE, criticalMin: 18 });
    expect(r.valid).toBe(false);
    expect(r.errorMessage).toContain('Ngưỡng nguy hiểm dưới');
  });

  it('từ chối khi minValue >= maxValue', () => {
    const r = validateThresholdRule({ ...TEMP_RULE, minValue: 35 });
    expect(r.valid).toBe(false);
    expect(r.errorMessage).toContain('Ngưỡng tối thiểu');
  });

  it('từ chối khi maxValue >= criticalMax', () => {
    const r = validateThresholdRule({ ...TEMP_RULE, maxValue: 42 });
    expect(r.valid).toBe(false);
    expect(r.errorMessage).toContain('Ngưỡng tối đa');
  });

  it('từ chối khi vượt giới hạn vật lý của cảm biến', () => {
    const r = validateThresholdRule({ ...TEMP_RULE, criticalMin: -5 });
    expect(r.valid).toBe(false);
    expect(r.errorMessage).toContain('Giới hạn vật lý');
  });

  it('từ chối khi có giá trị trống (NaN)', () => {
    const r = validateThresholdRule({ ...TEMP_RULE, minValue: Number.NaN });
    expect(r.valid).toBe(false);
    expect(r.errorMessage).toContain('không được để trống');
  });
});

describe('evaluateReadingAgainstRule — phân loại mức cảnh báo', () => {
  it.each([
    [25, 'NORMAL'],
    [17, 'WARNING'],
    [36, 'WARNING'],
    [12, 'CRITICAL'],
    [42, 'CRITICAL'],
    [60, 'CRITICAL'],
  ])('giá trị %d°C → %s', (value, expected) => {
    expect(evaluateReadingAgainstRule(value, TEMP_RULE)).toBe(expected);
  });

  it('ngưỡng đang tắt (enabled = false) luôn trả NORMAL', () => {
    expect(evaluateReadingAgainstRule(60, { ...TEMP_RULE, enabled: false })).toBe('NORMAL');
  });
});
