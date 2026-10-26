import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  LayoutDashboard, Users, Clock, CalendarCheck, ClipboardList,
  FileChartColumn, Wallet, Plus, Search, Pencil, UserX
} from "lucide-react";

type Employee = {
  id: number;
  name: string;
  department: string;
  shift: string;
  salary: number;
  active: boolean;
};
type AttendanceRecord = {
  id: number;
  employeeId: number;
  date: string;
  status: string;
  inTime: string;
  outTime: string;
  overtime: number;
};
const shifts = [
  { name: "Shift 1", time: "8:00 AM â€“ 8:00 PM", hours: "12 hours" },
  { name: "Shift 2", time: "11:00 AM â€“ 7:00 PM", hours: "8 hours" },
  { name: "Shift 3", time: "11:00 AM â€“ 9:00 PM", hours: "10 hours" },
  { name: "Night Shift", time: "8:00 PM â€“ 8:00 AM next day", hours: "12 hours" }
];

const menu = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Employees", icon: Users },
  { name: "Daily Attendance", icon: CalendarCheck },
  { name: "Attendance Sheet", icon: ClipboardList },
  { name: "Monthly Reports", icon: FileChartColumn },
  { name: "Salary Sheet", icon: Wallet },
  { name: "Shift Management", icon: Clock }
];

export default function App() {
  const [page, setPage] = useState("Dashboard");
  const [employees, setEmployees] = useState<Employee[]>(() => {
  try {
    const saved = localStorage.getItem("officetrack_employees");
    return saved ? JSON.parse(saved) as Employee[] : [];
  } catch {
    return [];
  }
});

useEffect(() => {
  localStorage.setItem("officetrack_employees", JSON.stringify(employees));
}, [employees]);
  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
  try {
    const saved = localStorage.getItem("officetrack_attendance");
    return saved ? JSON.parse(saved) as AttendanceRecord[] : [];
  } catch {
    return [];
  }
});

useEffect(() => {
  localStorage.setItem("officetrack_attendance", JSON.stringify(attendance));
}, [attendance]);

const [attendanceForm, setAttendanceForm] = useState({
  employeeId: "",
  date: new Date().toISOString().slice(0, 10),
  status: "Present",
  inTime: "08:00",
  outTime: "17:00"
});
  type AttendanceRecord = {
  id: number;
  employeeId: number;
  date: string;
  status: string;
  inTime: string;
  outTime: string;
  overtime: number;
};
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", department: "", shift: "Shift 1", salary: ""
  });

 const active = employees.filter((e: Employee) => e.active);
  const visible = active.filter(e =>
    `${e.name} ${e.department} ${e.id}`.toLowerCase()
      .includes(search.toLowerCase())
  );

  function openForm(employee?: Employee) {
    setEditing(employee ?? null);
    setForm(employee ? {
      name: employee.name,
      department: employee.department,
      shift: employee.shift,
      salary: String(employee.salary)
    } : { name: "", department: "", shift: "Shift 1", salary: "" });
    setShowForm(true);
  }

  function saveEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing) {
      setEmployees(old => old.map(e => e.id === editing.id
        ? { ...e, ...form, salary: Number(form.salary) || 0 } : e));
    } else {
      setEmployees(old => [...old, {
        id: old.reduce((max, e) => Math.max(max, e.id), 1000) + 1,
        ...form, salary: Number(form.salary) || 0, active: true
      }]);
    }
    setShowForm(false);
  }

  function deactivate(employee: Employee) {
    if (window.confirm(`Deactivate ${employee.name}?`)) {
      setEmployees(old => old.map(e =>
        e.id === employee.id ? { ...e, active: false } : e
      ));
    }
  }

function calculateOvertime(
  shift: string,
  outTime: string,
  status: string
): number {
  if (status !== "Present" || !outTime) {
    return 0;
  }

  const shiftEndTimes: Record<string, string> = {
    "Shift 1": "20:00",
    "Shift 2": "19:00",
    "Shift 3": "21:00",
    "Night Shift": "08:00"
  };

  const endTime = shiftEndTimes[shift];

  if (!endTime) return 0;

  const [endHour, endMinute] = endTime.split(":").map(Number);
  const [outHour, outMinute] = outTime.split(":").map(Number);

  const endMinutes = endHour * 60 + endMinute;
  const outMinutes = outHour * 60 + outMinute;

  return Math.round(
    (Math.max(0, outMinutes - endMinutes) / 60) * 100
  ) / 100;
}

function exportMonthlyAttendance() {
  const month = prompt("Month enter karein (YYYY-MM), misal: 2026-10");

  if (!month) return;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    alert("Month is tarah likhein: 2026-10");
    return;
  }

  const monthRecords = attendance.filter(record =>
    record.date.startsWith(month)
  );

  const rows = employees.map(employee => {
    const records = monthRecords.filter(
      record => record.employeeId === employee.id
    );

    return {
      "Employee ID": `EMP-${employee.id}`,
      "Employee Name": employee.name,
      "Department": employee.department,
      "Shift": employee.shift,
      "Present Days": records.filter(r => r.status === "Present").length,
      "Absent Days": records.filter(r => r.status === "Absent").length,
      "Leave Days": records.filter(r => r.status === "Leave").length,
      "Holiday Days": records.filter(r => r.status === "Holiday").length,
      "Overtime Hours": Number(
        records.reduce((total, r) => total + (r.overtime || 0), 0).toFixed(2)
      )
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Attendance");

  XLSX.writeFile(workbook, `OfficeTrack_Attendance_${month}.xlsx`);

  alert("Excel report download ho gayi.");
}

  
function calculateMonthlySalary(
  employee: Employee,
  month: string
) {
  const [year, monthNumber] = month.split("-").map(Number);

  const daysInMonth = new Date(
    year,
    monthNumber,
    0
  ).getDate();

  const records = attendance.filter(
    (record) =>
      record.employeeId === employee.id &&
      record.date.startsWith(month)
  );

  const attendanceByDate = new Map(
    records.map((record) => [record.date, record.status])
  );

  let payableDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let overtimeHours = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const status = attendanceByDate.get(date);
    const weekday = new Date(year, monthNumber - 1, day).getDay();

    if (status === "Present") {
      presentDays++;
      payableDays++;
    } else if (status === "Leave") {
      leaveDays++;
      payableDays++;
    } else if (status === "Absent") {
      absentDays++;
    } else if (status === "Holiday") {
      holidayDays++;
      payableDays++;
    }

    // Sunday paid hai, magar Saturday ya Monday ki
    // chhutti ke saath Sunday bhi chhutti ho to deduction hogi.
    if (weekday === 0) {
      const saturday = new Date(year, monthNumber - 1, day - 1);
      const monday = new Date(year, monthNumber - 1, day + 1);

      const saturdayDate = `${year}-${String(saturday.getMonth() + 1).padStart(2, "0")}-${String(saturday.getDate()).padStart(2, "0")}`;
      const mondayDate = `${year}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;

      const saturdayStatus = attendanceByDate.get(saturdayDate);
      const mondayStatus = attendanceByDate.get(mondayDate);

      const sundayStatus = status;

      const isOff = (s: string | undefined) =>
        s === "Absent" || s === "Leave";

      if (
        sundayStatus !== "Present" &&
        (isOff(saturdayStatus) || isOff(mondayStatus))
      ) {
        payableDays = Math.max(0, payableDays - 1);
      }
    }
  }

  overtimeHours = records.reduce(
    (total, record) => total + (record.overtime || 0),
    0
  );

  const dailySalary = daysInMonth > 0
    ? employee.salary / daysInMonth
    : 0;

  return {
    daysInMonth,
    presentDays,
    absentDays,
    leaveDays,
    holidayDays,
    payableDays,
    dailySalary: Number(dailySalary.toFixed(2)),
    earnedSalary: Number((dailySalary * payableDays).toFixed(2)),
    overtimeHours: Number(overtimeHours.toFixed(2))
  };
}


function exportMonthlySalary() {
  const month = prompt(
    "Salary ka month enter karein (YYYY-MM), misal: 2026-10"
  );

  if (!month) return;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    alert("Month is tarah likhein: 2026-10");
    return;
  }

  const activeEmployees = employees.filter(e => e.active);

  const rows = activeEmployees.map(employee => {
    const result = calculateMonthlySalary(employee, month);

    const overtimeRate = 0;
    const overtimePayment = result.overtimeHours * overtimeRate;
    const totalSalary = result.earnedSalary + overtimePayment;

    return {
      "Employee ID": `EMP-${employee.id}`,
      "Employee Name": employee.name,
      "Department": employee.department,
      "Shift": employee.shift,
      "Monthly Basic Salary": employee.salary,
      "Month": month,
      "Working Days": result.daysInMonth,
      "Present Days": result.presentDays,
      "Absent Days": result.absentDays,
      "Leave Days": result.leaveDays,
      "Holiday Days": result.holidayDays,
      "Payable Days": result.payableDays,
      "Basic Earned Salary": result.earnedSalary,
      "Overtime Hours": result.overtimeHours,
      "Overtime Rate": overtimeRate,
      "Overtime Payment": overtimePayment,
      "Total Salary": Number(totalSalary.toFixed(2))
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Salary Report"
  );

  XLSX.writeFile(
    workbook,
    `OfficeTrack_Salary_${month}.xlsx`
  );

  alert("Monthly Salary Excel report download ho gayi.");
}

function saveAttendance(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!attendanceForm.employeeId) {
    alert("Please select an employee.");
    return;
  }

  const employeeId = Number(attendanceForm.employeeId);

  const existing = attendance.find(
    record =>
      record.employeeId === employeeId &&
      record.date === attendanceForm.date
  );

  const record: AttendanceRecord = {
    id: existing?.id ?? Date.now(),
    employeeId,
    date: attendanceForm.date,
    status: attendanceForm.status,
    inTime: attendanceForm.inTime,
    outTime: attendanceForm.outTime,
    overtime: calculateOvertime(
  employees.find((e: Employee) => e.id === employeeId)?.shift ?? "",
  attendanceForm.outTime,
  attendanceForm.status
)
  };

  setAttendance(old =>
    existing
      ? old.map(item => item.id === existing.id ? record : item)
      : [...old, record]
  );

  alert("Attendance saved successfully.");
}
  return <div className="app">
    <aside className="sidebar">
      <h2>â—ˆ OfficeTrack</h2>
      <p className="muted">ATTENDANCE MANAGEMENT</p>
      {menu.map(item => {
        const Icon = item.icon;
        return <button key={item.name}
          className={page === item.name ? "nav active" : "nav"}
          onClick={() => setPage(item.name)}>
          <Icon size={18}/> {item.name}
        </button>;
      })}
      <p className="admin">Administrator Â· Demo</p>
    </aside>

    <main>
      <header><span>Workspace / {page}</span><span>â— Demo Mode</span></header>
      <section className="content">
        <p className="eyebrow">OFFICE MANAGEMENT</p>
        <h1>{page}</h1>
        <p className="muted">Manage your office attendance workspace.</p>

        {page === "Dashboard" && <>
          <div className="stats">
            <article><p>Active Employees</p><h2>{active.length}</h2></article>
            <article><p>Present Today</p><h2>â€”</h2><small>Attendance setup pending</small></article>
            <article><p>Late Arrivals</p><h2>â€”</h2></article>
            <article><p>Payroll</p><h2>Setup</h2></article>
          </div>
          <article className="panel">
            <h2>Office Shifts</h2>
            <div className="shifts">{shifts.map(s =>
              <div className="shift" key={s.name}>
                <strong>{s.name}</strong><p>{s.time}</p><span>{s.hours}</span>
              </div>
            )}</div>
          </article>
          <article className="panel">
            <h2>Getting Started</h2>
            <button className="primary" onClick={() => {
              setPage("Employees"); openForm();
            }}><Plus size={17}/> Add First Employee</button>
          </article>
        </>}

        {page === "Employees" && <>
          <div className="toolbar">
            <label className="search"><Search size={17}/>
              <input placeholder="Search employees..." value={search}
                onChange={e => setSearch(e.target.value)}/>
            </label>
            <button className="primary" onClick={() => openForm()}>
              <Plus size={17}/> Add Employee
            </button>
          </div>
          <article className="panel table-panel">
            <div className="table-scroll"><table>
              <thead><tr><th>ID / NAME</th><th>DEPARTMENT</th><th>SHIFT</th><th>MONTHLY SALARY</th><th>ACTIONS</th></tr></thead>
              <tbody>{visible.map(e => <tr key={e.id}>
                <td>EMP-{e.id}<br/><strong>{e.name}</strong></td>
                <td>{e.department}</td><td>{e.shift}</td>
                <td>{e.salary.toLocaleString()}</td>
                <td className="actions">
                  <button title="Edit" onClick={() => openForm(e)}><Pencil size={16}/></button>
                  <button title="Deactivate" onClick={() => deactivate(e)}><UserX size={16}/></button>
                </td>
              </tr>)}
              {visible.length === 0 && <tr><td colSpan={5}>No employees yet. Click Add Employee to begin.</td></tr>}
              </tbody>
            </table></div>
          </article>
        </>}

        {page === "Shift Management" && <article className="panel">
          <h2>Your Four Shifts</h2>
          <div className="shifts">{shifts.map(s => <div className="shift" key={s.name}>
            <strong>{s.name}</strong><p>{s.time}</p><span>{s.hours}</span>
          </div>)}</div>
        </article>}

        {(page === "Daily Attendance" || page === "Attendance Sheet") && <>
        <article className="panel">
  <h2>Monthly Attendance Report</h2>
  <p>Selected month ki attendance Excel file mein download karein.</p>
  <button
    className="primary"
    type="button"
    onClick={exportMonthlyAttendance}
  >
    Download Excel Report
  </button>
</article>
  <article className="panel">
    <h2>Mark Daily Attendance</h2>

    <form onSubmit={saveAttendance} className="attendance-form">
      <label>
        Employee
        <select
          required
          value={attendanceForm.employeeId}
          onChange={e => setAttendanceForm({
            ...attendanceForm,
            employeeId: e.target.value
          })}
        >
          <option value="">Select Employee</option>
          {active.map(e => (
            <option key={e.id} value={e.id}>
              EMP-{e.id} - {e.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Attendance Date
        <input
          type="date"
          required
          value={attendanceForm.date}
          onChange={e => setAttendanceForm({
            ...attendanceForm,
            date: e.target.value
          })}
        />
      </label>

      <label>
        Status
        <select
          value={attendanceForm.status}
          onChange={e => setAttendanceForm({
            ...attendanceForm,
            status: e.target.value
          })}
        >
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
          <option value="Leave">Leave</option>
          <option value="Holiday">Holiday</option>
        </select>
      </label>

      <label>
        In Time
        <input
          type="time"
          value={attendanceForm.inTime}
          onChange={e => setAttendanceForm({
            ...attendanceForm,
            inTime: e.target.value
          })}
        />
      </label>

      <label>
        Out Time
        <input
          type="time"
          value={attendanceForm.outTime}
          onChange={e => setAttendanceForm({
            ...attendanceForm,
            outTime: e.target.value
          })}
        />
      </label>

      <button className="primary" type="submit">
        
        Save Attendance
      </button>
    </form>
  </article>

  <article className="panel">
    <h2>Saved Attendance Records</h2>

    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Employee</th>
            <th>Status</th>
            <th>In Time</th>
            <th>Out Time</th>
            <th>Overtime (Hours)</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map(record => {
            const employee = employees.find(
              e => e.id === record.employeeId
            );

            return (
              <tr key={record.id}>
                <td>{record.date}</td>
                <td>{employee?.name ?? `EMP-${record.employeeId}`}</td>
                <td>{record.status}</td>
                <td>{record.inTime || "—"}</td>
                <td>{record.outTime || "—"}</td>
                <td>{record.overtime.toFixed(2)}</td>
              </tr>
            );
          })}

          {attendance.length === 0 && (
            <tr>
              <td colSpan={6}>No attendance records yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </article>
</>}



        {page === "Salary Sheet" && (
          <article className="panel">
            <h2>Monthly Salary Calculation</h2>

            <button
              className="primary"
              type="button"
              onClick={exportMonthlySalary}
            >
              Download Salary Excel Report
            </button>

            <label>
              Salary Month
              <input
                type="month"
                id="salary-month"
                defaultValue={new Date().toISOString().slice(0, 7)}
              />
            </label>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Monthly Salary</th>
                    <th>Working Days</th>
                    <th>Payable Days</th>
                    <th>Calculated Salary</th>
                    <th>Overtime Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.filter(e => e.active).map(employee => {
                    const monthInput = document.getElementById(
                      "salary-month"
                    ) as HTMLInputElement | null;

                    const month = monthInput?.value ||
                      new Date().toISOString().slice(0, 7);

                    const result = calculateMonthlySalary(employee, month);

                    return (
                      <tr key={employee.id}>
                        <td>{employee.name}</td>
                        <td>{employee.department}</td>
                        <td>Rs. {employee.salary.toLocaleString()}</td>
                        <td>{result.daysInMonth}</td>
                        <td>{result.payableDays}</td>
                        <td>Rs. {result.earnedSalary.toLocaleString()}</td>
                        <td>{result.overtimeHours.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p>
              Note: Salary attendance records ke mutabiq calculate hoti hai.
              Overtime ki payment abhi add nahi hui.
            </p>
          </article>
        )}

        {page === "Monthly Reports" && (
          <article className="panel">
            <h2>Monthly Attendance Report</h2>
            <p>
              Employees ki monthly attendance Excel file mein download karein.
            </p>
            <button
              className="primary"
              type="button"
              onClick={exportMonthlyAttendance}
            >
              Download Attendance Excel Report
            </button>
          </article>
        )}


      </section>
    </main>

    {showForm && <div className="overlay"><form className="modal" onSubmit={saveEmployee}>
      <h2>{editing ? "Edit Employee" : "Add Employee"}</h2>
      <label>Full Name<input required value={form.name}
        onChange={e => setForm({...form, name:e.target.value})}/></label>
      <label>Department / Designation<input required value={form.department}
        onChange={e => setForm({...form, department:e.target.value})}/></label>
      <label>Assigned Shift<select value={form.shift}
        onChange={e => setForm({...form, shift:e.target.value})}>
        {shifts.map(s => <option key={s.name}>{s.name}</option>)}
      </select></label>
      <label>Monthly Salary<input required type="number" min="0"
        value={form.salary} onChange={e => setForm({...form, salary:e.target.value})}/></label>
      <div className="form-actions">
        <button type="button" onClick={() => setShowForm(false)}>Cancel</button>
        <button className="primary" type="submit">Save Employee</button>
      </div>
    </form></div>}
  </div>;
}
