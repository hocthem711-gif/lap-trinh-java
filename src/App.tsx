import RedAlertToastWidget from './components/RedAlertToastWidget';
import HistoryChart from './components/HistoryChart'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from './store'
import {
  initFlightMonitorData,
  restoreFlightMonitorDefaults,
  toggleTelemetryStream,
} from './store/slices/flightMonitorSlice'
import {
  initializeMissionReviewExportData,
  setSelectedMissionId,
} from './store/slices/missionReviewExportSlice'
import { toggleStreaming } from './store/slices/sensorRealtimeSlice'
import { fetchUAVs } from './store/slices/deviceSlice'
import Login from './components/Login'
import { logout } from './services/authService'
import SensorOverviewMap from './components/SensorOverviewMap'
import FlightPathPlanner from './components/FlightPathPlanner'
import ZoneComparisonSync from './components/ZoneComparisonSync'
import ThresholdAlertManagement from './components/ThresholdAlertManagement'
import FlightMonitoringNote from './components/FlightMonitoringNote'
import ExcelExportMissionReview from './components/ExcelExportMissionReview'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  LayoutDashboard,
  Plane,
  Radio,
  Map,
  ClipboardList,
  Users,
  Settings,
  Bell,
  Search,
  Menu,
  Activity,
  Battery,
  Signal,
  Cpu,
  MapPin,
  Route,
  ChartColumn,
  ShieldAlert,
  FileSpreadsheet,
  LogOut,
} from 'lucide-react'
import DeviceManagement from './components/DeviceManagement'
import SensorAssignment from './components/SensorAssignment'
import SensorRealtimeTable from './components/SensorRealtimeTable'
import SensorMapPopup from './components/SensorMapPopup'
import './App.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

const menuItems = [
  { label: 'Tổng quan', icon: LayoutDashboard },
  { label: 'Quản lý UAV', icon: Plane },
  { label: 'UAV & Gateway', icon: Plane },
  { label: 'Cảm biến & Zone', icon: Cpu },
  { label: 'Cảm biến Realtime', icon: Activity },
  { label: 'Bản đồ & Popup', icon: MapPin },
  { label: 'Lộ trình bay', icon: Route },
  { label: 'So sánh & Đồng bộ UAV', icon: ChartColumn },
  { label: 'Ngưỡng & Cảnh báo', icon: ShieldAlert },
  { label: 'Giám sát & Note Mission', icon: ClipboardList },
  { label: 'Xuất Excel & Review Mission', icon: FileSpreadsheet },
  { label: 'Bản đồ & vị trí', icon: Map },
  { label: 'Quản lý người dùng', icon: Users },
  { label: 'Cài đặt', icon: Settings },
]

const defaultUavList = [
  {
    id: 'UAV-001',
    name: 'UAV Trinh sát 01',
    model: 'DJI Matrice 300',
    battery: 92,
    signal: 98,
    online: true,
    status: 'Đang hoạt động',
    location: 'Khu vực A',
  },
  {
    id: 'UAV-002',
    name: 'UAV Giám sát 02',
    model: 'DJI Matrice 30',
    battery: 67,
    signal: 85,
    online: true,
    status: 'Chờ nhiệm vụ',
    location: 'Khu vực B',
  },
  {
    id: 'UAV-003',
    name: 'UAV Tuần tra 03',
    model: 'Autel EVO II',
    battery: 24,
    signal: 42,
    online: false,
    status: 'Pin thấp',
    location: 'Khu vực C',
  },
]

type UserItem = {
  id: number
  name: string
  email: string
  role: string
  status: string
}

const USERS_STORAGE_KEY = 'smartfarm_system_users_v1'

const initialUsers: UserItem[] = [
  {
    id: 1,
    name: 'Long Hồ',
    email: 'nguyenho26062006@gmail.com',
    role: 'Quản trị viên',
    status: 'Hoạt động',
  },
  {
    id: 2,
    name: 'Đình Hiệu',
    email: 'hieuclet@gmail.com',
    role: 'Người vận hành',
    status: 'Hoạt động',
  },
  {
    id: 3,
    name: 'Thiện Hiếu',
    email: 'thienhieu@gmail.com',
    role: 'Người vận hành',
    status: 'Hoạt động',
  },
  {
    id: 4,
    name: 'Trần Nguyễn Bảo Hoàng',
    email: 'hocthem711@gmail.com',
    role: 'Quản trị viên',
    status: 'Hoạt động',
  },
  {
    id: 5,
    name: 'Nguyễn Trường An',
    email: 'nguyentruonganth2019@gmail.com',
    role: 'Người vận hành',
    status: 'Hoạt động',
  },
]


const activityChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
}

function App() {
  const dispatch = useDispatch<AppDispatch>()
  const monitorSessions = useSelector((state: RootState) => state.flightMonitor.sessions)
  const isUavStreaming = useSelector((state: RootState) => state.flightMonitor.isStreaming)
  const isSensorStreaming = useSelector((state: RootState) => state.sensorRealtime.isStreaming)
  const openAlertsCount = useSelector(
    (state: RootState) => state.alert.alerts.filter((a) => a.status === 'OPEN').length,
  )
  const deviceUavs = useSelector((state: RootState) => state.device.uavs)

  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('accessToken')))
  const [username, setUsername] = useState(() => localStorage.getItem('savedUsername') || '')

  const [activePage, setActivePage] = useState(() => {
    const saved = sessionStorage.getItem('smartfarm_active_page')
    return saved && menuItems.some((m) => m.label === saved) ? saved : 'Tổng quan'
  })

  useEffect(() => {
    sessionStorage.setItem('smartfarm_active_page', activePage)
  }, [activePage])
  const [globalSearch, setGlobalSearch] = useState('')
  const [uavSearch, setUavSearch] = useState('')
  const [users, setUsers] = useState<UserItem[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as UserItem[]
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Fallback to initialUsers
    }
    return initialUsers
  })
  const [userSearch, setUserSearch] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    } catch {
      // Ignore storage errors
    }
  }, [users])

  useEffect(() => {
    if (!isLoggedIn) return
    dispatch(initFlightMonitorData())
    dispatch(fetchUAVs())
  }, [dispatch, isLoggedIn])

  const uavList = useMemo(() => {
    const fromSessions =
      monitorSessions.length > 0
        ? monitorSessions.map((s) => {
            const battery = Math.round(s.batteryPercent)
            const status =
              battery <= 25
                ? 'Pin thấp'
                : s.status === 'FLYING' || s.status === 'RETURNING'
                  ? 'Đang hoạt động'
                  : 'Chờ nhiệm vụ'
            return {
              id: s.uavId,
              name: s.uavName,
              model: s.uavModel,
              battery,
              signal: s.signalStrength,
              online: s.status !== 'COLLECTION_ERROR',
              status,
              location: s.zoneName.split(' - ')[0] || s.zoneName,
            }
          })
        : defaultUavList

    const seen = new Set(fromSessions.map((u) => u.id))
    const extras = deviceUavs
      .filter((u) => !seen.has(u.id))
      .map((u) => ({
        id: u.id,
        name: u.name,
        model: u.model,
        battery: Math.round(u.battery),
        signal: Math.round(u.signal),
        online: u.status !== 'OFFLINE',
        status:
          u.battery <= 25
            ? 'Pin thấp'
            : u.status === 'ACTIVE'
              ? 'Đang hoạt động'
              : 'Chờ nhiệm vụ',
        location: u.location,
      }))

    return [...fromSessions, ...extras]
  }, [monitorSessions, deviceUavs])

  const totalUavs = uavList.length
  const activeUavs = uavList.filter((uav) => uav.status === 'Đang hoạt động').length
  const onlineUavs = uavList.filter((uav) => uav.online).length
  const lowBatteryUavs = uavList.filter((uav) => uav.battery <= 25).length
  const averageBattery =
    totalUavs > 0
      ? Math.round(uavList.reduce((sum, uav) => sum + uav.battery, 0) / totalUavs)
      : 0
  const onlinePercent =
    totalUavs > 0 ? Math.round((onlineUavs / totalUavs) * 100) : 0

  const stats = [
    {
      label: 'Tổng số UAV',
      value: String(totalUavs),
      note: 'Thiết bị trong hệ thống',
      icon: Plane,
    },
    {
      label: 'Đang hoạt động',
      value: String(activeUavs),
      note: 'UAV đang thực hiện nhiệm vụ',
      icon: Activity,
    },
    {
      label: 'Mức pin trung bình',
      value: `${averageBattery}%`,
      note: 'Pin trung bình của các UAV',
      icon: Battery,
    },
    {
      label: 'Kết nối trực tuyến',
      value: String(onlineUavs),
      note: `${onlinePercent}% tổng số UAV`,
      icon: Signal,
    },
  ]

  const activityChartData = {
    labels: ['Online', 'Offline'],
    datasets: [
      {
        label: 'Số UAV',
        data: [onlineUavs, totalUavs - onlineUavs],
        backgroundColor: ['#22c55e', '#ef4444'],
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  }

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.role}`
      .toLowerCase()
      .includes(userSearch.trim().toLowerCase()),
)

  const filteredUavs = uavList.filter((uav) =>
    `${uav.id} ${uav.name}`
      .toLowerCase()
      .includes(uavSearch.trim().toLowerCase()),
  )
  const [showAddUserForm, setShowAddUserForm] = useState(false)

  const [newUser, setNewUser] = useState({
         name: '',
         email: '',
         role: 'Operator',
})

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(name) => {
          setUsername(name)
          setIsLoggedIn(true)
        }}
      />
    )
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Plane size={23} />
          </div>
          <div>
            <h2>UAV Control</h2>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <p className="menu-heading">MENU CHÍNH</p>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                type="button"
                key={item.label}
                className={
                  activePage === item.label
                    ? 'nav-item active'
                    : 'nav-item'
                }
                onClick={() => setActivePage(item.label)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-dot" />
          <div>
            <strong>Hệ thống trực tuyến</strong>
            <span>Tất cả dịch vụ sẵn sàng</span>
          </div>
        </div>
      </aside>

      {/* Nội dung chính */}
      <main className="main-area">
        {/* Header */}
        <header className="topbar">
          <div className="page-heading">
            <button
              type="button"
              className="mobile-menu"
              aria-label="Mở menu"
              onClick={() => setActivePage('Tổng quan')}
            >
              <Menu size={21} />
            </button>

            <div>
              <h1>
                {activePage === 'Tổng quan'
                  ? 'Tổng quan hệ thống'
                  : activePage}
              </h1>
              <p>
                {activePage === 'Tổng quan'
                  ? 'Xin chào! Đây là tình trạng hệ thống UAV hôm nay.'
                  : `Quản lý và theo dõi ${activePage.toLowerCase()}.`}
              </p>
            </div>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => {
                  const val = e.target.value
                  setGlobalSearch(val)
                  if (activePage === 'Quản lý UAV') setUavSearch(val)
                  if (activePage === 'Quản lý người dùng') setUserSearch(val)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    const q = globalSearch.trim().toLowerCase()
                    const matchedMenu = menuItems.find((m) =>
                      m.label.toLowerCase().includes(q),
                    )
                    if (matchedMenu) {
                      setActivePage(matchedMenu.label)
                    } else if (uavList.some((u) => `${u.id} ${u.name}`.toLowerCase().includes(q))) {
                      setActivePage('Quản lý UAV')
                      setUavSearch(globalSearch.trim())
                    }
                  }
                }}
                placeholder="Tìm trang hoặc mã UAV (Enter)..."
              />
            </label>

            <button
              type="button"
              className="icon-button"
              aria-label="Thông báo"
              onClick={() => setActivePage('Ngưỡng & Cảnh báo')}
              title="Mở trang Ngưỡng & Cảnh báo"
            >
              <Bell size={18} />
              {openAlertsCount > 0 && (
                <span className="notification-badge">
                  {openAlertsCount > 9 ? '9+' : openAlertsCount}
                </span>
              )}
            </button>

            <div className="user-profile">
              <div className="avatar">
                {(username || 'AD').slice(0, 2).toUpperCase()}
              </div>
              <div className="user-info">
                <strong>
                  {username.toLowerCase() === 'admin' || !username
                    ? 'Administrator'
                    : username}
                </strong>
                <span>
                  {username.toLowerCase().includes('farmer')
                    ? 'Chủ trang trại'
                    : 'Quản trị viên'}
                </span>
              </div>

              <button
                type="button"
                className="logout-button"
                onClick={() => {
                  logout()
                  setIsLoggedIn(false)
                  setUsername('')
                  setActivePage('Tổng quan')
                  setUavSearch('')
                }}
              >
                <LogOut size={15} />
                <span>Đăng xuất</span>
              </button>
            </div>
          </div>
        </header>

        {/* Nội dung các trang */}
        <section className="dashboard-content">
          {activePage === 'Tổng quan' ? (
            <>
              {/* Banner */}
              <div className="welcome-banner">
                <div>
                  <span className="eyebrow">
                    UAV MONITORING PLATFORM
                  </span>
                  <h2>Trung tâm giám sát UAV</h2>
                  <p>
                    Theo dõi thiết bị, kết nối và tình trạng nhiệm vụ
                    tại một nơi.
                  </p>
                </div>
                <div className="banner-icon">
                  <Radio size={58} strokeWidth={1.3} />
                </div>
              </div>

              {/* Thống kê */}
              <div className="section-title">
                <div>
                  <h2>Tổng quan hoạt động</h2>
                  <p>Thống kê thiết bị và kết nối hệ thống</p>
                </div>
                <span className="date-label">Dữ liệu minh họa</span>
              </div>
              <RedAlertToastWidget
                onNavigateAlertsPage={() => setActivePage('Ngưỡng & Cảnh báo')}
              />
              <div className="stats-grid">
                {stats.map((stat) => {
                  const Icon = stat.icon

                  return (
                    <article className="stat-card" key={stat.label}>
                      <div className="stat-card-top">
                        <span>{stat.label}</span>
                        <div className="stat-icon">
                          <Icon size={21} />
                        </div>
                      </div>
                      <strong className="stat-value">
                        {stat.value}
                      </strong>
                      <p>{stat.note}</p>
                    </article>
                  )
                })}
              </div>

              {/* Biểu đồ và trạng thái kết nối */}
              <div className="content-grid">
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Hoạt động hệ thống</h2>
                      <p>Tình trạng vận hành hiện tại</p>
                    </div>
                    <span className="status-pill">
                      <span />
                      Đang giám sát
                    </span>
                  </div>

                  <div className="activity-placeholder">
                    <div className="chart-summary">
                      <div>
                        <span>UAV trực tuyến</span>
                        <strong>{onlineUavs} thiết bị</strong>
                      </div>
                      <span className="chart-live-label">
                        Dữ liệu minh họa
                      </span>
                    </div>

                    <div className="activity-chart">
                      <Bar
                        data={activityChartData}
                        options={activityChartOptions}
                      />
                    </div>
                  </div>
                </section>

                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Trạng thái kết nối</h2>
                      <p>Tổng quan thiết bị</p>
                    </div>
                  </div>

                  <div className="connection-row">
                    <div className="connection-symbol">
                      <Radio size={19} />
                    </div>
                    <div className="connection-text">
                      <strong>Thiết bị trực tuyến</strong>
                      <span>Kết nối bình thường</span>
                    </div>
                    <strong className="connection-number">{onlineUavs}</strong>
                  </div>

                  <div className="connection-row">
                    <div className="connection-symbol purple">
                      <Plane size={19} />
                    </div>
                    <div className="connection-text">
                      <strong>UAV đang hoạt động</strong>
                      <span>Đang thực hiện nhiệm vụ</span>
                    </div>
                    <strong className="connection-number">{activeUavs}</strong>
                  </div>

                  <div className="connection-row">
                    <div className="connection-symbol orange">
                      <Battery size={19} />
                    </div>
                    <div className="connection-text">
                      <strong>Cần kiểm tra pin</strong>
                      <span>Thiết bị pin thấp</span>
                    </div>
                    <strong className="connection-number">{lowBatteryUavs}</strong>
                  </div>
                </section>
              </div>
               <HistoryChart />
            </>
                      ) : activePage === 'Quản lý UAV' ? (
            /* Trang quản lý UAV */
            <div className="uav-page">
              <div className="section-title">
                <div>
                  <h2>Danh sách UAV</h2>
                  <p>
                    Quản lý và theo dõi trạng thái các thiết bị
                  </p>
                </div>
                <span className="date-label">
                  {uavList.length} thiết bị
                </span>
              </div>

              <div className="panel uav-table-panel">
                <div className="uav-toolbar">
                  <h3>Thiết bị UAV</h3>
                  <input
                    type="search"
                    value={uavSearch}
                    onChange={(event) =>
                      setUavSearch(event.target.value)
                    }
                    placeholder="Tìm theo tên hoặc mã UAV..."
                    aria-label="Tìm theo tên hoặc mã UAV"
                  />
                </div>

                <div className="uav-table-scroll">
                  <table className="uav-table">
                    <thead>
                      <tr>
                        <th>Mã UAV</th>
                        <th>Tên thiết bị</th>
                        <th>Pin</th>
                        <th>Tín hiệu</th>
                        <th>Trạng thái</th>
                        <th>Vị trí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUavs.map((uav) => (
                        <tr key={uav.id}>
                          <td>
                            <strong>{uav.id}</strong>
                          </td>
                          <td>
                            <div className="uav-name">{uav.name}</div>
                            <span className="uav-model">
                              {uav.model}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                uav.battery <= 25
                                  ? 'battery-low'
                                  : 'battery-value'
                              }
                            >
                              <Battery size={16} />
                              {uav.battery}%
                            </span>
                          </td>
                          <td>
                            <span className="signal-value">
                              <Signal size={16} />
                              {uav.signal}%
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                uav.status === 'Đang hoạt động'
                                  ? 'uav-status status-active'
                                  : uav.status === 'Pin thấp'
                                    ? 'uav-status status-warning'
                                    : 'uav-status status-idle'
                              }
                            >
                              {uav.status}
                            </span>
                          </td>
                          <td>{uav.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                               {filteredUavs.length === 0 && (
                    <p className="uav-empty">
                      Không tìm thấy UAV phù hợp.
                    </p>
                  )}
                </div>
              </div>
            </div>
                   ) : activePage === 'UAV & Gateway' ? (
            <DeviceManagement />
          ) : activePage === 'Cảm biến & Zone' ? (
            <SensorAssignment />
          ) : activePage === 'Cảm biến Realtime' ? (
            <SensorRealtimeTable onViewOnMap={() => setActivePage('Bản đồ & Popup')} />
          ) : activePage === 'Bản đồ & Popup' ? (
            <SensorMapPopup />
          ) : activePage === 'Lộ trình bay' ? (
            <FlightPathPlanner />
          ) : activePage === 'So sánh & Đồng bộ UAV' ? (
            <ZoneComparisonSync />
          ) : activePage === 'Ngưỡng & Cảnh báo' ? (
            <ThresholdAlertManagement />
          ) : activePage === 'Giám sát & Note Mission' ? (
            <FlightMonitoringNote
              onNavigateExportReview={async (targetUavId) => {
                const res = await dispatch(initializeMissionReviewExportData()).unwrap()
                const found = res.reviews.find((r) => r.uavId === targetUavId)
                if (found) {
                  dispatch(setSelectedMissionId(found.missionId))
                }
                setActivePage('Xuất Excel & Review Mission')
              }}
            />
          ) : activePage === 'Xuất Excel & Review Mission' ? (
            <ExcelExportMissionReview />
          ) : activePage === 'Bản đồ & vị trí' ? (
            <SensorOverviewMap />
          ) : activePage === 'Quản lý người dùng' ? (
  <div className="uav-page">
    <div className="section-title">
      <div>
        <h2>Danh sách người dùng</h2>
        <p>Quản lý tài khoản và quyền truy cập hệ thống</p>
      </div>
      <span className="date-label">
        {users.length} người dùng
      </span>
    </div>
    <button
      type="button"
      className="back-button"
      onClick={() => {
        setNewUser({ name: '', email: '', role: 'Người vận hành' })
        setShowAddUserForm(true)
      }}
    >
      + Thêm người dùng
    </button>

{showAddUserForm && (
  <div className="panel add-user-panel">
    <div className="add-user-heading">
      <div>
        <h3>Thêm người dùng mới</h3>
        <p>Nhập thông tin tài khoản cần thêm vào hệ thống.</p>
      </div>

      <button
        type="button"
        className="back-button"
        onClick={() => setShowAddUserForm(false)}
      >
        Đóng
      </button>
    </div>

    <form
      className="add-user-form"
      onSubmit={(event) => {
        event.preventDefault()

        const name = newUser.name.trim()
        const email = newUser.email.trim()

        if (!name || !email) {
          window.alert('Vui lòng nhập đầy đủ họ tên và email.')
          return
        }

        const emailExists = users.some(
          (user) => user.email.toLowerCase() === email.toLowerCase(),
        )

        if (emailExists) {
          window.alert('Email này đã tồn tại.')
          return
        }

        setUsers((current) => [
          ...current,
          {
            id: Date.now(),
            name,
            email,
            role: newUser.role,
            status: 'Hoạt động',
          },
        ])

        setUserSearch('')
        setNewUser({
          name: '',
          email: '',
          role: 'Người vận hành',
        })
        setShowAddUserForm(false)
      }}
    >
      <div className="form-field">
        <label htmlFor="new-user-name">Họ và tên</label>
        <input
          id="new-user-name"
          type="text"
          value={newUser.name}
          onChange={(event) =>
            setNewUser((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          placeholder="Nhập họ và tên"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          type="email"
          value={newUser.email}
          onChange={(event) =>
            setNewUser((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          placeholder="example@email.com"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="new-user-role">Vai trò</label>
        <select
          id="new-user-role"
          value={newUser.role}
          onChange={(event) =>
            setNewUser((current) => ({
              ...current,
              role: event.target.value,
            }))
          }
        >
          <option value="Quản trị viên">Quản trị viên</option>
          <option value="Người vận hành">Người vận hành</option>
        </select>
      </div>

      <div className="add-user-actions">
        <button
          type="button"
          className="back-button"
          onClick={() => setShowAddUserForm(false)}
        >
          Hủy
        </button>

        <button type="submit" className="save-user-button">
          Lưu người dùng
        </button>
      </div>
    </form>
  </div>
)}
    <div className="panel uav-table-panel">
      <div className="uav-toolbar">
        <h3>Tài khoản hệ thống</h3>
        <input
          type="search"
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
          placeholder="Tìm theo tên, email hoặc vai trò..."
          aria-label="Tìm kiếm người dùng"
        />
      </div>

      <div className="uav-table-scroll">
        <table className="uav-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span
                    className={
                      user.status === 'Hoạt động'
                        ? 'uav-status status-active'
                        : 'uav-status status-warning'
                    }
                  >
                    {user.status}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="logout-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Bạn có chắc muốn xóa ${user.name}?`,
                        )
                      ) {
                        setUsers((current) =>
                          current.filter((item) => item.id !== user.id),
                        )
                      }
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p className="uav-empty">
            Không tìm thấy người dùng phù hợp.
          </p>
        )}
      </div>
    </div>
  </div>
) : (
  <div className="uav-page">
    <div className="section-title">
      <div>
        <h2>Cấu hình &amp; Thông tin Hệ thống</h2>
        <p>Trạng thái kết nối dịch vụ Backend, MQTT Broker và điều khiển luồng dữ liệu thời gian thực</p>
      </div>
      <span className="date-label">Phiên bản v2.0</span>
    </div>

    <div className="panel uav-table-panel" style={{ marginBottom: 20 }}>
      <div className="uav-toolbar">
        <h3>Thông số Kết nối Hệ thống</h3>
      </div>
      <div className="uav-table-scroll">
        <table className="uav-table">
          <thead>
            <tr>
              <th>Phân hệ</th>
              <th>Địa chỉ / Cấu hình</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Backend REST API</strong></td>
              <td><code>http://localhost:8080/api/v1</code></td>
              <td><span className="uav-status status-active">Trực tuyến</span></td>
            </tr>
            <tr>
              <td><strong>MQTT Cloud Broker</strong></td>
              <td><code>tcp://broker.hivemq.com:1883</code> (QoS 1)</td>
              <td><span className="uav-status status-active">Sẵn sàng</span></td>
            </tr>
            <tr>
              <td><strong>Luồng Telemetry Đội bay UAV</strong></td>
              <td>Nội suy 3D LERP (Chu kỳ 2 giây/nhịp)</td>
              <td>
                <span className={`uav-status ${isUavStreaming ? 'status-active' : 'status-idle'}`}>
                  {isUavStreaming ? 'Đang phát' : 'Tạm dừng'}
                </span>
              </td>
            </tr>
            <tr>
              <td><strong>Luồng Cảm biến Mặt đất</strong></td>
              <td>Trang trại Công nghệ cao Đà Lạt (11.94°N, 108.45°E)</td>
              <td>
                <span className={`uav-status ${isSensorStreaming ? 'status-active' : 'status-idle'}`}>
                  {isSensorStreaming ? 'Đang phát' : 'Tạm dừng'}
                </span>
              </td>
            </tr>
            <tr>
              <td><strong>Tài khoản phiên hiện tại</strong></td>
              <td>{username || 'admin'}</td>
              <td><span className="uav-status status-active">Đã xác thực JWT</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        <button
          type="button"
          className="back-button"
          onClick={() => dispatch(toggleTelemetryStream())}
        >
          {isUavStreaming ? 'Tạm dừng luồng UAV' : 'Bật luồng UAV'}
        </button>
        <button
          type="button"
          className="back-button"
          onClick={() => dispatch(toggleStreaming())}
        >
          {isSensorStreaming ? 'Tạm dừng luồng Cảm biến' : 'Bật luồng Cảm biến'}
        </button>
        <button
          type="button"
          className="back-button"
          onClick={() => dispatch(restoreFlightMonitorDefaults())}
        >
          Khôi phục dữ liệu đội bay mặc định
        </button>
        <button
          type="button"
          className="back-button"
          onClick={() => setActivePage('Tổng quan')}
        >
          Quay lại Tổng quan
        </button>
      </div>
    </div>
  </div>
)}

        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          UAV Control System <span>•</span> Admin &amp; Operator Dashboard
        </footer>
      </main>
    </div>
  )
}

export default App
