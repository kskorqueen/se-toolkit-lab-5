import { useState, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
)

const STORAGE_KEY = 'api_key'

interface Lab {
  id: string
  name: string
}

interface ScoreBucket {
  bucket: string
  count: number
}

interface ScoresResponse {
  lab_id: string
  buckets: ScoreBucket[]
}

interface TimelineEntry {
  date: string
  submissions: number
}

interface TimelineResponse {
  lab_id: string
  timeline: TimelineEntry[]
}

interface TaskPassRate {
  task_name: string
  pass_rate: number
  total_submissions: number
  passed_submissions: number
}

interface PassRatesResponse {
  lab_id: string
  tasks: TaskPassRate[]
}

type DashboardData =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      scores: ScoresResponse
      timeline: TimelineResponse
      passRates: PassRatesResponse
    }
  | { status: 'error'; message: string }

interface LabOption {
  value: string
  label: string
}

const AVAILABLE_LABS: LabOption[] = [
  { value: 'lab-1', label: 'Lab 1' },
  { value: 'lab-2', label: 'Lab 2' },
  { value: 'lab-3', label: 'Lab 3' },
  { value: 'lab-4', label: 'Lab 4' },
  { value: 'lab-5', label: 'Lab 5' },
]

function Dashboard(): JSX.Element {
  const [token] = useState<string>(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [selectedLab, setSelectedLab] = useState<string>('lab-1')
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    status: 'idle',
  })

  useEffect(() => {
    if (!token || !selectedLab) {
      setDashboardData({ status: 'idle' })
      return
    }

    const fetchDashboardData = async (): Promise<void> => {
      setDashboardData({ status: 'loading' })

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        }

        const [scoresRes, timelineRes, passRatesRes] = await Promise.all([
          fetch(`/analytics/scores?lab=${selectedLab}`, { headers }),
          fetch(`/analytics/timeline?lab=${selectedLab}`, { headers }),
          fetch(`/analytics/pass-rates?lab=${selectedLab}`, { headers }),
        ])

        if (!scoresRes.ok) {
          throw new Error(`Scores: HTTP ${scoresRes.status}`)
        }
        if (!timelineRes.ok) {
          throw new Error(`Timeline: HTTP ${timelineRes.status}`)
        }
        if (!passRatesRes.ok) {
          throw new Error(`Pass rates: HTTP ${passRatesRes.status}`)
        }

        const scores: ScoresResponse = await scoresRes.json()
        const timeline: TimelineResponse = await timelineRes.json()
        const passRates: PassRatesResponse = await passRatesRes.json()

        setDashboardData({
          status: 'success',
          scores,
          timeline,
          passRates,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setDashboardData({ status: 'error', message })
      }
    }

    void fetchDashboardData()
  }, [token, selectedLab])

  const barChartData =
    dashboardData.status === 'success'
      ? {
          labels: dashboardData.scores.buckets.map((b) => b.bucket),
          datasets: [
            {
              label: 'Submissions per Score Bucket',
              data: dashboardData.scores.buckets.map((b) => b.count),
              backgroundColor: 'rgba(54, 162, 235, 0.6)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
            },
          ],
        }
      : { labels: [], datasets: [] }

  const lineChartData =
    dashboardData.status === 'success'
      ? {
          labels: dashboardData.timeline.timeline.map((t) => t.date),
          datasets: [
            {
              label: 'Submissions per Day',
              data: dashboardData.timeline.timeline.map((t) => t.submissions),
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.3,
              fill: true,
            },
          ],
        }
      : { labels: [], datasets: [] }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  }

  if (!token) {
    return (
      <div className="dashboard-container">
        <p>Please enter your API key in the main page to view the dashboard.</p>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Analytics Dashboard</h1>
        <div className="lab-selector">
          <label htmlFor="lab-select">Select Lab: </label>
          <select
            id="lab-select"
            value={selectedLab}
            onChange={(e) => setSelectedLab(e.target.value)}
          >
            {AVAILABLE_LABS.map((lab) => (
              <option key={lab.value} value={lab.value}>
                {lab.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {dashboardData.status === 'loading' && (
        <div className="loading-state">
          <p>Loading dashboard data...</p>
        </div>
      )}

      {dashboardData.status === 'error' && (
        <div className="error-state">
          <p>Error: {dashboardData.message}</p>
        </div>
      )}

      {dashboardData.status === 'success' && (
        <div className="dashboard-content">
          <section className="chart-section">
            <h2>Score Distribution</h2>
            <div className="chart-container">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </section>

          <section className="chart-section">
            <h2>Submissions Timeline</h2>
            <div className="chart-container">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </section>

          <section className="table-section">
            <h2>Pass Rates per Task</h2>
            <table className="pass-rates-table">
              <thead>
                <tr>
                  <th>Task Name</th>
                  <th>Total Submissions</th>
                  <th>Passed</th>
                  <th>Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.passRates.tasks.map((task, index) => (
                  <tr key={`${task.task_name}-${index}`}>
                    <td>{task.task_name}</td>
                    <td>{task.total_submissions}</td>
                    <td>{task.passed_submissions}</td>
                    <td>{(task.pass_rate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  )
}

export default Dashboard
