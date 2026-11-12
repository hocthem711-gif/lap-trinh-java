import { apiRequest } from './api'

export type HistoryRange = 'hour' | 'day' | 'week'

export interface HistoryPoint {
  timeBucket: string
  avgValue: number | null
  minValue: number | null
  maxValue: number | null
  sampleCount: number
}

interface TimeSeriesResponse {
  sensorId: number
  sensorCode: string
  sensorType: string
  unit: string
  interval: string
  dataPoints: HistoryPoint[]
}

// Spring Boot nhận LocalDateTime: yyyy-MM-ddTHH:mm:ss, không kèm ký hiệu Z.
function formatLocalDateTime(date: Date): string {
  const two = (value: number) => String(value).padStart(2, '0')
  return [
    `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`,
    `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`,
  ].join('T')
}

export function getTimeWindow(range: HistoryRange, now = new Date()) {
  const start = new Date(now)
  const interval = range === 'week' ? 'DAILY' : 'HOURLY'

  switch (range) {
    case 'hour':
      start.setHours(start.getHours() - 1)
      break
    case 'day':
      start.setHours(start.getHours() - 24)
      break
    case 'week':
      start.setDate(start.getDate() - 7)
      break
  }

  return {
    interval,
    start: formatLocalDateTime(start),
    end: formatLocalDateTime(now),
  }
}

export async function fetchSensorHistory(
  sensorId: number,
  range: HistoryRange,
  signal?: AbortSignal,
): Promise<HistoryPoint[]> {
  const { interval, start, end } = getTimeWindow(range)
  const params = new URLSearchParams({
    sensorId: String(sensorId),
    interval,
    start,
    end,
  })

  const response = await apiRequest<TimeSeriesResponse>(
    `/sensor-data/time-series?${params.toString()}`,
    { signal },
  )

  // Spring Boot trả ApiResponse<TimeSeriesResponse>, dữ liệu nằm tại data.dataPoints.
  const points = response.data?.dataPoints

  if (!Array.isArray(points)) {
    throw new Error('API không trả về dataPoints hợp lệ. Hãy kiểm tra Backend.')
  }

  return [...points].sort((a, b) => a.timeBucket.localeCompare(b.timeBucket))
}
