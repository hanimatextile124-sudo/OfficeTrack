import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabase";
import "./App.css";
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
  { name: "Shift 1", time: "8:00 AM -“ 8:00 PM", hours: "12 hours" },
  { name: "Shift 2", time: "11:00 AM -“ 7:00 PM", hours: "8 hours" },
  { name: "Shift 3", time: "11:00 AM -“ 9:00 PM", hours: "10 hours" },
  { name: "Night Shift", time: "8:00 PM -“ 8:00 AM next day", hours: "12 hours" }
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const adminUid = import.meta.env.VITE_ADMIN_UID as string | undefined;
  console.log("Admin UID check:", {
  configured: Boolean(adminUid?.trim()),
  length: adminUid?.trim().length ?? 0,
});

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setLoginError(error.message);
      setAdminUserId(data.session?.user.id ?? null);
      setAuthChecked(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setAdminUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleAdminLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    if (!adminUid) {
      setLoginError("VITE_ADMIN_UID .env file mein set nahi hai.");
      return;
    }
    setLoginBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword
    });
    if (error) {
      setLoginError("Login nahi hua. Email/password check karein.");
    } else if (data.user.id !== adminUid) {
      await supabase.auth.signOut();
      setLoginError("Yeh account authorized Admin nahi hai.");
    } else {
      setAdminUserId(data.user.id);
      setLoginPassword("");
    }
    setLoginBusy(false);
  }

  async function handleAdminLogout() {
    await supabase.auth.signOut();
    setAdminUserId(null);
  }
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

const [employeesLoadedFromSupabase, setEmployeesLoadedFromSupabase] =
  useState(false);

useEffect(() => {
  if (!authChecked || !adminUid || adminUserId !== adminUid) {
    return;
  }

  let cancelled = false;

  async function loadEmployeesFromSupabase() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, department, shift_id, monthly_salary, active")
      .order("id");

    if (cancelled) return;

    if (error) {
      console.error("Employees load failed:", error.message);
      alert("Employees load nahi huay: " + error.message);
      return;
    }

    const loadedEmployees: Employee[] = (data ?? []).map(row => ({
      id: Number(row.id),
      name: row.name ?? "",
      department: row.department ?? "",
     shift: shifts[Number(row.shift_id) - 1]?.name ?? "",
      salary: Number(row.monthly_salary ?? 0),
      active: Boolean(row.active)
    }));

    setEmployees(loadedEmployees);
    setEmployeesLoadedFromSupabase(true);
  }

  void loadEmployeesFromSupabase();

  return () => {
    cancelled = true;
  };
}, [authChecked, adminUid, adminUserId]);

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

useEffect(() => {
  if (!authChecked || !adminUid || adminUserId !== adminUid) {
    return;
  }

  let cancelled = false;

  async function testSupabaseEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, employee_code, name, department, shift_id, monthly_salary, active")
      .limit(5);

    if (cancelled) return;

    if (error) {
      console.error("Supabase employees read test failed:", error.message);
    } else {
      console.log(
        "Supabase employees read test successful. Rows:",
        data?.length ?? 0
      );
    }
  }

  void testSupabaseEmployees();

  return () => {
    cancelled = true;
  };
}, [authChecked, adminUid, adminUserId]);

useEffect(() => {
  if (!authChecked || !adminUid || adminUserId !== adminUid) {
    return;
  }

  let cancelled = false;

  async function loadAttendanceFromSupabase() {
    const { data, error } = await supabase
      .from("attendance_records")
      .select(
        "id, employee_id, attendance_date, status, in_time, out_time, overtime_minutes"
      )
      .order("attendance_date", { ascending: false });

    if (cancelled) return;

    if (error) {
      console.error("Attendance load failed:", error.message);
      alert("Attendance load nahi hui: " + error.message);
      return;
    }

    const loadedAttendance: AttendanceRecord[] = (data ?? []).map(row => ({
      id: Number(row.id),
      employeeId: Number(row.employee_id),
      date: row.attendance_date,
      status: row.status ?? "",
      inTime: row.in_time ?? "",
      outTime: row.out_time ?? "",
      overtime: Number(row.overtime_minutes ?? 0) / 60
    }));

    setAttendance(loadedAttendance);
    console.log(
      "Attendance Supabase se load ho gayi. Rows:",
      loadedAttendance.length
    );
  }

  void loadAttendanceFromSupabase();

  return () => {
    cancelled = true;
  };
}, [authChecked, adminUid, adminUserId]);



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

  
async function saveEmployee(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const employeeData = {
    name: form.name.trim(),
    department: form.department,
    shift_id: shifts.findIndex(s => s.name === form.shift) + 1,
    monthly_salary: Number(form.salary) || 0,
    active: true
  };

  if (!employeeData.name) {
    alert("Employee ka naam enter karein.");
    return;
  }

  if (editing) {
    const { error } = await supabase
      .from("employees")
      .update({
        name: employeeData.name,
        department: employeeData.department,
        shift_id: employeeData.shift_id,
        monthly_salary: employeeData.monthly_salary
      })
      .eq("id", editing.id);

    if (error) {
      alert("Employee update nahi hua: " + error.message);
      return;
    }

    setEmployees(old =>
      old.map(e =>
        e.id === editing.id
          ? { ...e, ...form, salary: employeeData.monthly_salary }
          : e
      )
    );
  } else {
    const { data, error } = await supabase
      .from("employees")
      .insert({
        employee_code: `EMP${Date.now()}`,
        ...employeeData
      })
      .select("id")
      .single();

    if (error || !data) {
      alert("Employee save nahi hua: " + (error?.message ?? "Unknown error"));
      return;
    }

    setEmployees(old => [
      ...old,
      {
        id: Number(data.id),
        ...form,
        salary: employeeData.monthly_salary,
        active: true
      }
    ]);
  }

  setShowForm(false);
}


  

async function deactivate(employee: Employee) {
  const confirmed = window.confirm(
    `PERMANENT DELETE: ${employee.name} aur uski tamam attendance delete ho jayegi. Kya aap sure hain?`
  );

  if (!confirmed) return;

  // Pehle linked attendance delete karein
  const { error: attendanceError } = await supabase
    .from("attendance_records")
    .delete()
    .eq("employee_id", employee.id);

  if (attendanceError) {
    console.error("Attendance delete failed:", attendanceError.message);
    alert("Attendance delete nahi hui: " + attendanceError.message);
    return;
  }

  // Phir employee delete karein
  const { error: employeeError } = await supabase
    .from("employees")
    .delete()
    .eq("id", employee.id);

  if (employeeError) {
    console.error("Employee delete failed:", employeeError.message);
    alert("Employee delete nahi hua: " + employeeError.message);
    return;
  }

  setAttendance(old =>
    old.filter(record => record.employeeId !== employee.id)
  );

  setEmployees(old =>
    old.filter(e => e.id !== employee.id)
  );

  alert("Employee aur uski attendance permanently delete ho gayi.");
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


function downloadCompleteBackup() {
  const backup = {
    app: "OfficeTrack",
    backupDate: new Date().toISOString(),
    employees: JSON.parse(
      localStorage.getItem("officetrack_employees") || "[]"
    ),
    attendance: JSON.parse(
      localStorage.getItem("officetrack_attendance") || "[]"
    )
  };

  const file = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "OfficeTrack_Complete_Backup.json";
  link.click();
  URL.revokeObjectURL(url);

  alert("OfficeTrack backup download ho gaya.");
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


async function saveAttendance(event: React.FormEvent<HTMLFormElement>) {
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

  const overtime = calculateOvertime(
    employees.find((e: Employee) => e.id === employeeId)?.shift ?? "",
    attendanceForm.outTime,
    attendanceForm.status
  );

  const { data: savedRow, error } = await supabase
    .from("attendance_records")
    .upsert(
      {
        ...(existing ? { id: existing.id } : {}),
        employee_id: employeeId,
        attendance_date: attendanceForm.date,
        status: attendanceForm.status,
        in_time: attendanceForm.inTime || null,
        out_time: attendanceForm.outTime || null,
        overtime_minutes: Math.round(overtime * 60)
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();

  if (error || !savedRow) {
    console.error("Attendance save failed:", error?.message);
    alert(
      "Attendance database mein save nahi hui: " +
      (error?.message ?? "Unknown error")
    );
    return;
  }

  const record: AttendanceRecord = {
    id: savedRow.id,
    employeeId,
    date: attendanceForm.date,
    status: attendanceForm.status,
    inTime: attendanceForm.inTime,
    outTime: attendanceForm.outTime,
    overtime
  };

  setAttendance(old =>
    existing
      ? old.map(item =>
          item.id === existing.id ? record : item
        )
      : [...old, record]
  );

  alert("Attendance successfully saved to Supabase.");
}

  if (!authChecked) {
    return <div className="content"><p>OfficeTrack login check ho raha hai...</p></div>;
  }

  
if (!adminUid || adminUserId !== adminUid) {
  return (
    <div className="admin-login-page">
      <div className="admin-login-layout">
        <section className="admin-login-intro">
          <p>OFFICE TRACK · ADMIN PORTAL</p>
          <h1>Smart Attendance Management</h1>
          <p>
            Apne office ki attendance, employees, shifts aur salary
            records ko ek hi jagah manage karein.
          </p>

          <div className="admin-login-features">
            <div className="admin-login-feature">
              <strong>01 · Employee Management</strong>
              <p>Employee records ko asani se manage karein.</p>
            </div>
            <div className="admin-login-feature">
              <strong>02 · Daily Attendance</strong>
              <p>Daily attendance aur working hours ka record rakhein.</p>
            </div>
            <div className="admin-login-feature">
              <strong>03 · Salary Reports</strong>
              <p>Monthly salary aur attendance reports dekhein.</p>
            </div>
          </div>
        </section>

        <section className="admin-login-card">
          <h2>Welcome Back!</h2>
          <p className="admin-login-subtitle">
            Apne authorized Admin account se login karein.
          </p>

          <form onSubmit={handleAdminLogin}>
            <label>
              Admin Email
              <input
                type="email"
                required
                autoComplete="username"
                placeholder="Enter admin email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </label>

            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
            </label>

            {loginError && (
              <p className="admin-login-error" role="alert">
                {loginError}
              </p>
            )}

            <button type="submit" disabled={loginBusy}>
              {loginBusy ? "Logging in..." : "Secure Admin Login"}
            </button>
          </form>

          <p className="admin-login-footer">
            OfficeTrack · Authorized access only
          </p>
        </section>
      </div>
    </div>
  );
}

  return <div className="app">
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <button
  type="button"
  className="sidebar-toggle"
  onClick={() => setSidebarOpen(!sidebarOpen)}
  aria-label="Toggle sidebar menu"
>
  ⋮
</button>
      <h2 className="brand-title">OFFICE TRACK</h2>
<p className="brand-subtitle">ATTENDANCE MANAGEMENT SYSTEM</p>
      <p className="muted">ATTENDANCE MANAGEMENT</p>
      {menu.map(item => {
        const Icon = item.icon;
        return <button key={item.name}
          className={page === item.name ? "nav active" : "nav"}
          onClick={() => setPage(item.name)}>
          <Icon size={18}/> {item.name}
        </button>;
      })}
     

<p className="admin">Administrator</p>
<button className="nav" onClick={handleAdminLogout}>Logout</button>
</aside>

    <main>
      <header><span>Workspace / {page}</span><span>Admin Mode</span></header>
      <section className="content">
        <p className="eyebrow">OFFICE MANAGEMENT</p>
        <h1>{page}</h1>
        <button
  className="primary"
  type="button"
  onClick={downloadCompleteBackup}
>
  Download Complete Backup
</button>
        <p className="muted">Manage your office attendance workspace.</p>

        {page === "Dashboard" && (() => {
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
          const todayRecords = attendance.filter(record => record.date === todayKey);
          const presentToday = todayRecords.filter(record => record.status === "Present").length;
          const leaveToday = todayRecords.filter(record => record.status === "Leave").length;
          const absentToday = todayRecords.filter(record => record.status === "Absent").length;
          const recentRecords = [...attendance]
            .sort((a, b) => `${b.date} ${b.inTime}`.localeCompare(`${a.date} ${a.inTime}`))
            .slice(0, 6);
          const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
            const day = new Date();
            day.setDate(day.getDate() - (6 - index));
            const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
            return {
              key,
              label: day.toLocaleDateString("en", { weekday: "short" }),
              count: attendance.filter(record => record.date === key && record.status === "Present").length
            };
          });
          const maxDaily = Math.max(1, ...lastSevenDays.map(day => day.count));
          const shiftCounts = shifts.map(shift => ({
            ...shift,
            count: active.filter(employee => employee.shift === shift.name).length
          }));
          return <>
            <div className="dashboard-welcome">
              <div><h2>Welcome to OfficeTrack</h2><p>Your office attendance at a glance.</p></div>
              <button className="primary" onClick={() => setPage("Daily Attendance")}><CalendarCheck size={17}/> Mark Attendance</button>
            </div>
            <div className="dashboard-stats">
              <article className="dashboard-stat"><span className="dashboard-stat-icon blue"><Users size={21}/></span><div><p>Total Employees</p><h2>{active.length}</h2><small>Active employees</small></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat-icon green"><CalendarCheck size={21}/></span><div><p>Present Today</p><h2>{presentToday}</h2><small>Attendance marked today</small></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat-icon amber"><Clock size={21}/></span><div><p>On Leave</p><h2>{leaveToday}</h2><small>Leave records today</small></div></article>
              <article className="dashboard-stat"><span className="dashboard-stat-icon red"><UserX size={21}/></span><div><p>Absent Today</p><h2>{absentToday}</h2><small>Absent records today</small></div></article>
            </div>
            <div className="dashboard-grid">
              <article className="panel dashboard-chart-panel">
                <div className="dashboard-panel-heading"><div><h2>Attendance Overview</h2><p>Present employees · Last 7 days</p></div><span className="dashboard-legend"><i/> Present</span></div>
                <div className="attendance-chart">
                  {lastSevenDays.map(day => <div className="attendance-chart-column" key={day.key}>
                    <strong>{day.count}</strong><div className="attendance-chart-track"><span style={{ height: `${Math.max(day.count ? 12 : 4, day.count / maxDaily * 100)}%` }}/></div><small>{day.label}</small>
                  </div>)}
                </div>
              </article>
              <article className="panel dashboard-shifts-panel">
                <div className="dashboard-panel-heading"><div><h2>Shift Distribution</h2><p>Active employees by shift</p></div></div>
                <div className="shift-distribution">
                  {shiftCounts.map((shift, index) => <div className="shift-distribution-row" key={shift.name}>
                    <div className="shift-distribution-label"><span className={`shift-dot shift-dot-${index}`}/><span>{shift.name}</span><strong>{shift.count}</strong></div>
                    <div className="shift-distribution-track"><span className={`shift-bar shift-bar-${index}`} style={{ width: `${active.length ? shift.count / active.length * 100 : 0}%` }}/></div>
                  </div>)}
                </div>
                <p className="dashboard-shift-total">{active.length} active employees across {shifts.length} shifts</p>
              </article>
            </div>
            <article className="panel dashboard-recent-panel">
              <div className="dashboard-panel-heading"><div><h2>Recent Attendance</h2><p>Latest saved attendance records</p></div><button className="dashboard-text-button" onClick={() => setPage("Attendance Sheet")}>View all <span>→</span></button></div>
              <div className="table-scroll"><table>
                <thead><tr><th>EMPLOYEE</th><th>DATE</th><th>IN TIME</th><th>OUT TIME</th><th>STATUS</th><th>OVERTIME</th></tr></thead>
                <tbody>
                  {recentRecords.map(record => {
                    const employee = employees.find(e => e.id === record.employeeId);
                    if (!employee) return null;
                    return <tr key={record.id}>
                      <td><strong>{employee?.name ?? `EMP-${record.employeeId}`}</strong><small className="dashboard-employee-id">EMP-{record.employeeId}</small></td>
                      <td>{record.date}</td><td>{record.inTime || "—"}</td><td>{record.outTime || "—"}</td>
                      <td><span className={`attendance-status status-${record.status.toLowerCase()}`}>{record.status}</span></td>
                      <td>{Number(record.overtime || 0).toFixed(2)} h</td>
                    </tr>;
                  })}
                  {recentRecords.length === 0 && <tr><td colSpan={6} className="dashboard-empty">Abhi attendance records nahi hain. Daily Attendance mein ja kar pehli entry save karein.</td></tr>}
                </tbody>
              </table></div>
            </article>
            <article className="panel dashboard-office-shifts">
              <div className="dashboard-panel-heading"><div><h2>Office Shifts</h2><p>Configured shift timings</p></div><button className="dashboard-text-button" onClick={() => setPage("Shift Management")}>Manage shifts →</button></div>
              <div className="shifts">{shifts.map(s => <div className="shift" key={s.name}><strong>{s.name}</strong><p>{s.time}</p><span>{s.hours}</span></div>)}</div>
            </article>
          </>;
        })()}
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
                  <button title="Permanently Delete" onClick={() => deactivate(e)}><UserX size={16}/></button>
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
