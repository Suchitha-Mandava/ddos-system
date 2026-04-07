import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "react-chartjs-2";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./App.css";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

function App() {
  const [prediction, setPrediction] = useState("Normal");
  const [logs, setLogs] = useState([]);
  const [normalCount, setNormalCount] = useState(0);
  const [attackCount, setAttackCount] = useState(0);
  const [trafficData, setTrafficData] = useState([]);
  const [packetRate, setPacketRate] = useState(0);

  const dashboardRef = useRef();

  useEffect(() => {
    const interval = setInterval(async () => {
      try {

        // Get overall stats
        const statsRes = await axios.get("http://localhost:8000/stats");
        setNormalCount(statsRes.data.total_normal);
        setAttackCount(statsRes.data.total_attacks);

        // Get latest logs
        const logsRes = await axios.get("http://localhost:8000/logs");

        if (logsRes.data.length > 0) {
          const latest = logsRes.data[0];

          setPrediction(latest.prediction);
          setPacketRate(latest.packet_rate);

          setLogs(logsRes.data.map(log => ({
            packetRate: log.packet_rate,
            result: log.prediction,
            time: new Date(log.timestamp).toLocaleTimeString(),
            ip: log.ip_address
          })));

          setTrafficData(prev => [
            ...prev.slice(-19),
            latest.packet_rate
          ]);
        }

      } catch (err) {
        console.error("Error fetching data:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: trafficData.map((_, i) => i + 1),
    datasets: [{
      label: "Requests Per IP (Live)",
      data: trafficData,
      borderColor: "#00eaff",
      backgroundColor: "#00eaff",
      tension: 0.4
    }]
  };

  const exportCSV = () => {
    const csvContent =
      "Time,IP,Packet Rate,Status\n" +
      logs.map(log =>
        `${log.time},${log.ip},${log.packetRate},${log.result}`
      ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "ddos_logs.csv");
  };

  const exportPDF = async () => {
    const canvas = await html2canvas(dashboardRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("landscape");
    pdf.addImage(imgData, "PNG", 10, 10, 270, 150);
    pdf.save("ddos_report.pdf");
  };

  return (
    <div className="dashboard" ref={dashboardRef}>
      
      {/* NAVBAR */}
      <nav className="navbar">
        <h2>DDoS Server Monitor</h2>
        <div className="nav-buttons">
          <button onClick={exportCSV}>Export CSV</button>
          <button onClick={exportPDF}>Export PDF</button>
        </div>
      </nav>

      {/* LIVE STATUS */}
      <div className="status-bar">
        <span className={`status-dot ${prediction === "Attack" ? "attack-dot" : "normal-dot"}`}></span>
        <span>
          {prediction === "Attack" ? "Under Attack" : "Server Secure"}
        </span>
      </div>

      {/* ALERT */}
      <div className={`alert ${prediction === "Attack" ? "attack" : "normal"}`}>
        {prediction === "Attack"
          ? "🚨 DDoS Attack Detected!"
          : "✅ Normal Server Traffic"}
      </div>

      {/* SUMMARY CARDS */}
      <div className="card-grid">
        <div className="card">
          <h3>Current Packet Rate</h3>
          <p>{packetRate}</p>
        </div>
        <div className="card normal-card">
          <h3>Total Normal</h3>
          <p>{normalCount}</p>
        </div>
        <div className="card attack-card">
          <h3>Total Attacks</h3>
          <p>{attackCount}</p>
        </div>
      </div>

      {/* GRAPH */}
      <div className="graph-card">
        <h3>Live Traffic Graph</h3>
        <Line data={chartData} />
      </div>

      {/* LOG TABLE */}
      <div className="log-card">
        <h3>Recent Traffic Logs</h3>
        <div className="log-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>IP Address</th>
                <th>Request Count</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 20).map((log, index) => (
                <tr key={index}>
                  <td>{log.time}</td>
                  <td>{log.ip}</td>
                  <td>{log.packetRate}</td>
                  <td className={log.result === "Attack" ? "attack-text" : "normal-text"}>
                    {log.result}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default App;