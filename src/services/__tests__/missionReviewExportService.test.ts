/**
 * Unit Test — Chấm điểm Nghiệm thu Mission (F17) & Bảo mật Xuất Excel (F11, CWE-1236)
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 */
import { describe, expect, it } from 'vitest';
import {
  calculateHaversineDistanceMeters,
  calculateOverallMissionScore,
  determineQualityGrade,
  escapeXml,
  sanitizeSpreadsheetCell,
} from '../missionReviewExportService';
import type { MissionReviewRubricScores } from '../../types/missionReviewExport';

const rubric = (score: number): MissionReviewRubricScores => ({
  flightPathAccuracy: score,
  sensorDataCompleteness: score,
  batteryEfficiencyRating: score,
  commLinkStability: score,
  safetyCompliance: score,
});

describe('calculateHaversineDistanceMeters — sai số GPS Drift', () => {
  it('trả về 0 khi trùng điểm và ~111,194.93 m cho 1 độ vĩ', () => {
    expect(calculateHaversineDistanceMeters(11.94, 108.46, 11.94, 108.46)).toBe(0);
    expect(calculateHaversineDistanceMeters(0, 0, 1, 0)).toBeCloseTo(111194.93, 1);
  });
});

describe('calculateOverallMissionScore — tổng trọng số 5 tiêu chí = 100%', () => {
  it('đạt 100 điểm khi mọi tiêu chí 100 và không có Waypoint lỗi', () => {
    expect(calculateOverallMissionScore(rubric(100), 0)).toBe(100);
  });

  it('trừ 4 điểm cho mỗi Waypoint lỗi', () => {
    expect(calculateOverallMissionScore(rubric(100), 2)).toBe(92);
  });

  it('kẹp kết quả trong khoảng [0, 100]', () => {
    expect(calculateOverallMissionScore(rubric(0), 5)).toBe(0);
    expect(calculateOverallMissionScore(rubric(150), 0)).toBe(100);
  });
});

describe('determineQualityGrade — xếp hạng S / A / B / C / D', () => {
  it.each([
    [90, 'S'],
    [89, 'A'],
    [80, 'A'],
    [79, 'B'],
    [70, 'B'],
    [69, 'C'],
    [55, 'C'],
    [54, 'D'],
  ])('%d điểm → hạng %s', (score, grade) => {
    expect(determineQualityGrade(score)).toBe(grade);
  });
});

describe('sanitizeSpreadsheetCell — chống CSV/Excel Formula Injection (CWE-1236)', () => {
  it.each(['=SUM(A1:A9)', '+1+1', '-2+3', '@cmd', '\tTAB', '\rCR'])(
    'thêm dấu nháy đơn trước ô nguy hiểm: %j',
    (payload) => {
      expect(sanitizeSpreadsheetCell(payload)).toBe(`'${payload}`);
    }
  );

  it('giữ nguyên dữ liệu an toàn và xử lý null/undefined', () => {
    expect(sanitizeSpreadsheetCell('Khu A - Nhiệt độ 25°C')).toBe('Khu A - Nhiệt độ 25°C');
    expect(sanitizeSpreadsheetCell(42)).toBe('42');
    expect(sanitizeSpreadsheetCell(null)).toBe('');
    expect(sanitizeSpreadsheetCell(undefined)).toBe('');
  });
});

describe('escapeXml — mã hóa ký tự đặc biệt cho SpreadsheetML', () => {
  it('mã hóa đủ 5 ký tự & < > " \'', () => {
    expect(escapeXml(`<a href="x">&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;'
    );
  });
});
