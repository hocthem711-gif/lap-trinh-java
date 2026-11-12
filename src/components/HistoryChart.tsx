import { useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { sensorApi } from '../services/api'
import {
  fetchSensorHistory,
  type HistoryPoint,
  type HistoryRange,
} from '../services/historyService'
import type { SensorNode } from '../types'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

const filters: { value: HistoryRange; label: string }[] = [
  { value: 'hour', label: 'Giờ' },
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
]

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { position: 'bottom' },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { title: { display: true, text: 'Thời gian' } },
    y: { title: { display: true, text: 'Giá trị cảm biến' } },
  },
}

function formatTimeBucket(value: string, range: HistoryRange): string {
  // Có thể nhận "yyyy-MM-dd HH:mm:ss" hoặc "yyyy-MM-ddTHH:mm:ss".
  const parsed = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return value

  if (range === 'week') {
    return parsed.toLocaleDateString('vi-VN')
  }

  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function HistoryChart() {
  const [sensors, setSensors] = useState<SensorNode[]>([])
  const [sensorId, setSensorId] = useState<number | null>(null)
  const [range, setRange] = useState<HistoryRange>('day')
  const [points, setPoints] = useState<HistoryPoint[]>([])
  const [loadingSensors, setLoadingSensors] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [sensorError, setSensorError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Tải danh sách cảm biến để chọn sensorId.
  useEffect(() => {
    let isActive = true

    sensorApi.getAll()
      .then((list) => {
        if (!isActive) return
        setSensors(list)
        setSensorId((current) => current ?? list[0]?.id ?? null)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setSensorError(
          error instanceof Error ? error.message : 'Không thể lấy danh sách cảm biến.',
        )
      })
      .finally(() => {
        if (isActive) setLoadingSensors(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  // Tải lại dữ liệu mỗi khi cảm biến, khoảng thời gian hoặc nút làm mới thay đổi.
  useEffect(() => {
    if (sensorId === null) return

    const controller = new AbortController()
    setLoadingHistory(true)
    setHistoryError('')
    setPoints([])

    fetchSensorHistory(sensorId, range, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPoints(result)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setHistoryError(
            error instanceof Error ? error.message : 'Không thể tải lịch sử cảm biến.',
          )
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingHistory(false)
      })

    return () => {
      controller.abort()
    }
  }, [sensorId, range, refreshKey])

  const chartData = {
    labels: points.map((point) => formatTimeBucket(point.timeBucket, range)),
    datasets: [
      {
        label: 'Trung bình',
        data: points.map((point) => point.avgValue),
        borderColor: '#2563eb',
        backgroundColor: '#2563eb',
        tension: 0.3,
      },
      {
        label: 'Thấp nhất',
        data: points.map((point) => point.minValue),
        borderColor: '#f59e0b',
        backgroundColor: '#f59e0b',
        tension: 0.3,
      },
      {
        label: 'Cao nhất',
        data: points.map((point) => point.maxValue),
        borderColor: '#16a34a',
        backgroundColor: '#16a34a',
        tension: 0.3,
      },
    ],
  }

  return (
    <section className="panel" style={{ marginTop: 24, padding: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Lịch sử dữ liệu cảm biến (F06)</h2>
          <p style={{ margin: '4px 0 0', opacity: 0.7 }}>
            Dữ liệu Backend · Trung bình / Thấp nhất / Cao nhất
          </p>
        </div>
        <button
          type="button"
          disabled={loadingHistory || sensorId === null}
          onClick={() => setRefreshKey((previous) => previous + 1)}
        >
          Làm mới
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <label htmlFor="history-sensor">Cảm biến:</label>
        <select
          id="history-sensor"
          value={sensorId ?? ''}
          disabled={loadingSensors || sensors.length === 0}
          onChange={(event) => setSensorId(Number(event.target.value))}
          style={{ padding: '8px 10px', borderRadius: 8 }}
        >
          {sensors.length === 0 && <option value="">Chưa có cảm biến</option>}
          {sensors.map((sensor) => (
            <option key={sensor.id} value={sensor.id}>
              {sensor.sensorCode} (#{sensor.id})
            </option>
          ))}
        </select>

        <div
          role="group"
          aria-label="Lọc lịch sử theo thời gian"
          style={{ display: 'flex', gap: 8 }}
        >
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={range === filter.value}
              onClick={() => setRange(filter.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                cursor: 'pointer',
                border: '1px solid #94a3b8',
                color: range === filter.value ? '#fff' : 'inherit',
                background: range === filter.value ? '#2563eb' : 'transparent',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {loadingSensors && <p>Đang tải danh sách cảm biến...</p>}
      {!loadingSensors && sensors.length === 0 && (
        <p>Chưa có cảm biến để xem lịch sử.</p>
      )}
      {sensorError && <p role="alert" style={{ color: '#dc2626' }}>Lỗi: {sensorError}</p>}
      {loadingHistory && <p>Đang tải lịch sử...</p>}
      {historyError && <p role="alert" style={{ color: '#dc2626' }}>Lỗi: {historyError}</p>}
      {!loadingHistory && !historyError && sensorId !== null && points.length === 0 && (
        <p>Không có dữ liệu lịch sử trong khoảng thời gian đã chọn.</p>
      )}
      {!loadingHistory && !historyError && points.length > 0 && (
        <div style={{ height: 330, width: '100%' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      )}

      <p style={{ opacity: 0.7, fontSize: 12, marginTop: 12 }}>
        Nguồn: API /sensor-data/time-series. Không dùng dữ liệu giả khi API lỗi.
      </p>
    </section>
  )
}
