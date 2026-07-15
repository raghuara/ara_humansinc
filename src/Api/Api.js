
const baseApiurl = `https://ara-payroll-cyezfwb6d9g0h8ew.centralus-01.azurewebsites.net/api/`;


// Login
const Auth = `${baseApiurl}Auth/`;
export const PostLogin = `${Auth}PostLogin`;

// ── Roles & access (user types) ───────────────────────────────────────────────
const UserType = `${baseApiurl}UserType/`;
export const GetUserTypes = `${UserType}GetUserTypes`;   
export const PostUserType = `${UserType}PostUserType`; 
export const UpdateUserType = `${UserType}UpdateUserType`;
export const DeleteUserType = `${UserType}DeleteUserType`;


const FinancialYear = `${baseApiurl}FinancialYear/`;
export const GetFinancialYearConfig = `${FinancialYear}GetFinancialYearConfig`;
export const PostFinancialYearConfig = `${FinancialYear}PostFinancialYearConfig`;

const Access = `${baseApiurl}Access/`;
export const GetModules = `${Access}GetModules`;
export const GetRoleAccess = `${Access}GetRoleAccess`;
export const UpdateRoleAccess = `${Access}UpdateRoleAccess`;


// Employee
const Employee = `${baseApiurl}Employee/`;
export const PostEmployee = `${Employee}PostEmployee`;
export const UpdateEmployee = `${Employee}UpdateEmployee`;

//Leave Policy
const LeavePolicy = `${baseApiurl}LeavePolicy/`;
export const PostLeavePolicy = `${LeavePolicy}PostLeavePolicy`;


// ?financialYear=2026-2027 — mirrors the PostLeavePolicy body exactly.
// (Distinct from the legacy lowercase `GetLeavePolicy` further down, which is
// academic-year keyed and returns the old shape.)
export const GetLeavePolicyByFinancialYear = `${LeavePolicy}GetLeavePolicy`;
export const PostLeaveType = `${LeavePolicy}PostLeaveType`;
export const GetLeaveTypes = `${LeavePolicy}GetLeaveTypes`;         // ?financialYear=
export const GetLeaveTypeByID = `${LeavePolicy}GetLeaveTypeByID`;   // ?id=
export const UpdateLeaveTypeByID = `${LeavePolicy}UpdateLeaveTypeByID`;
export const DeleteLeaveTypeByID = `${LeavePolicy}DeleteLeaveTypeByID`;
// The financial year is NOT sent — the server derives it from year + month and
// returns it on the GET.
export const PostWorkingCalendar = `${LeavePolicy}PostWorkingCalendar`;
export const GetWorkingCalendar = `${LeavePolicy}GetWorkingCalendar`;   // ?year=&month=
export const GetEmployeeLeaveBalance = `${LeavePolicy}GetEmployeeLeaveBalance`;


// Employee attendance
const EmployeeAttendance = `${baseApiurl}EmployeeAttendance/`;
// ?fromDate=DD-MM-YYYY&toDate=DD-MM-YYYY — returns every employee for the range,
// including those with no punches (status 'absent'), so it doubles as the roster.
export const GetEmployeeAttendance = `${EmployeeAttendance}GetEmployeeAttendance`;
export const PostEmployeeManualAttendance = `${EmployeeAttendance}PostEmployeeManualAttendance`;
// ?employeeCode=EMP-1&date=DD-MM-YYYY — the edit trail for one person, one day:
// every punch/break insert or update, with old → new, who did it and why.
export const GetEmployeeAttendanceAudit = `${EmployeeAttendance}GetEmployeeAttendanceAudit`;
// ?financialYear=&fromDate=DD-MM-YYYY&toDate=DD-MM-YYYY — the day-by-day grid.
export const GetEmployeeAttendanceOverview = `${EmployeeAttendance}GetEmployeeAttendanceOverview`;
// ?financialYear= — the roster to mark attendance against, before any is marked.
export const GetAttendanceEmployeeBefore = `${EmployeeAttendance}GetAttendanceEmployeeBefore`;

//Shift Assignment
const ShiftAssignment = `${baseApiurl}ShiftAssignment/`;
export const GetUnassignedEmployees = `${ShiftAssignment}GetUnassignedEmployees`;
export const GetShiftAssignedEmployees = `${ShiftAssignment}GetShiftAssignedEmployees`;
// POST { financialYear, shiftId, employeeCodes: ["EMP-1", ...] } — first-time
// assignment, in bulk.
export const AssignEmployeeToShift = `${ShiftAssignment}AssignEmployeeToShift`;
// PUT { financialYear, employeeCode, newShiftId } — moves ONE already-assigned
// employee to a different shift.
export const UpdateAssignedEmployee = `${ShiftAssignment}UpdateAssignedEmployee`;
// DELETE ?financialYear=&employeeCode= — drops the assignment, sending the
// employee back to the Unassigned bucket.
export const UnassignEmployee = `${ShiftAssignment}UnassignEmployee`;



export const GetEmployees = `${Employee}GetEmployees`;
export const GetEmployeeById = `${Employee}GetEmployeeById`;
export const SetEmployeeLoginPassword = `${Employee}SetEmployeeLoginPassword`;
// Login ID format: the server owns the prefix AND generates the running number,
// so `nextLoginId` is the only trustworthy source for the next employee's code.
export const GetLoginIdFormat = `${Employee}GetLoginIdFormat`;
export const UpdateLoginIdFormat = `${Employee}UpdateLoginIdFormat`;


// ── Sub-bases (mirror the source Api.js) ──────────────────────────────────────
const payRoll = `${baseApiurl}payRoll/`;
const leavePolicy = `${baseApiurl}leavePolicy/`;
const leave = `${baseApiurl}leave/`;
const biometrics = `${baseApiurl}biometrics/`;
const staffManagement = `${baseApiurl}staffManagement/`;

// ── Payroll: salary structures ────────────────────────────────────────────────
export const postSalaryStructure = `${payRoll}postSalaryStructure`;
export const getEmployees = `${payRoll}getEmployees`;
export const updateSalaryStructureByRollnumber = `${payRoll}updateSalaryStructureByRollnumber`;
export const deleteSalaryStructureByRollnumber = `${payRoll}deleteSalaryStructureByRollnumber`;
export const salaryStructureDashboard = `${payRoll}salaryStructureDashboard`;

// ── Payroll: compliance & deductions ──────────────────────────────────────────
export const postPFConfiguration = `${payRoll}postPFConfiguration`;
export const postESIConfiguration = `${payRoll}postESIConfiguration`;
export const postProfessionalTaxConfiguration = `${payRoll}postProfessionalTaxConfiguration`;
export const postTDSConfiguration = `${payRoll}postTDSConfiguration`;
export const getDeductionsAndCompliance = `${payRoll}getDeductionsAndCompliance`;
export const employeeComplianceDashboard = `${payRoll}employeeComplianceDashboard`;
export const updateEmployeeComplianceByRollnumber = `${payRoll}updateEmployeeComplianceByRollnumber`;

// ── Payroll: bank details ─────────────────────────────────────────────────────
export const employeeBankDetailsDashboard = `${payRoll}employeeBankDetailsDashboard`;
export const updateEmployeeBankDetailsByRollnumber = `${payRoll}updateEmployeeBankDetailsByRollnumber`;

// ── Payroll: salary register ──────────────────────────────────────────────────
export const salaryRegisterDashboard = `${payRoll}salaryRegisterDashboard`;

// ── Payroll: run & approve ────────────────────────────────────────────────────
export const approvePayrollPayslipsDashboard = `${payRoll}approvePayrollPayslipsDashboard`;
export const getPayrollPayslipByRollNumber = `${payRoll}getPayrollPayslipByRollNumber`;

// ── Payroll: leave types (payRoll-scoped) & dashboard ─────────────────────────
export const leavePolicyDashboard = `${payRoll}leavePolicyDashboard`;
export const postLeaveType = `${payRoll}postLeaveType`;
export const updateLeaveTypeById = `${payRoll}updateLeaveTypeById`;

// ── Leave policy master (leavePolicy-scoped) ──────────────────────────────────
// NOTE: `PostLeavePolicy` (LeavePolicy/, declared above) is the financial-year-
// keyed replacement for the lowercase `postleavepolicy` below — flatter body,
// enum-cased amount types. The old one is still what GetLeavePolicy mirrors.
export const postleavepolicy = `${leavePolicy}postleavepolicy`;
export const GetLeavePolicy = `${leavePolicy}GetLeavePolicy`;
export const postleavetypes = `${leavePolicy}postleavetypes`;
export const GetleaveTypes = `${leavePolicy}GetleaveTypes`;
export const postworkingcalendar = `${leavePolicy}postworkingcalendar`;
export const GetWorkingcalendar = `${leavePolicy}GetWorkingcalendar`;
export const UpdateleaveTypeByID = `${leavePolicy}UpdateleaveTypeByID`;
export const DeleteleaveTypeByID = `${leavePolicy}DeleteleaveTypeByID`;

// ── Leave requests & approvals ────────────────────────────────────────────────
export const postLeaveRequest = `${leave}postLeaveRequest`;
export const getLeaveApprovalDashboard = `${leave}getLeaveApprovalDashboard`;
export const leaveApprovalStatusCheck = `${baseApiurl}leaveApprovalStatusCheck`;
export const updateLeaveApprovalAction = `${baseApiurl}updateLeaveApprovalAction`;

// ── Leave / attendance reports ────────────────────────────────────────────────
export const reportsLeaveManagement = `${baseApiurl}reports/reportsLeaveManagement`;
export const reportsLeaveManagementFullReport = `${baseApiurl}reports/reportsLeaveManagementFullReport`;

// ── Attendance (teachers) ─────────────────────────────────────────────────────
export const getStaffAttendanceOverview = `${baseApiurl}teachersattendance/getStaffAttendanceOverview`;
export const GetAttendanceTeacherBefore = `${baseApiurl}teachersattendance/GetAttendanceTeacherBefore`;
export const GetTeachersAttendance = `${baseApiurl}teachersattendance/GetTeachersAttendance`;
export const PostTeachersManualAttendance = `${baseApiurl}teachersattendance/PostTeachersManualAttendance`;

// ── Biometric mapping & sync ──────────────────────────────────────────────────
export const SyncStatus = `${biometrics}SyncStatus/`;
export const TriggerManualSync = `${biometrics}TriggerManualSync/`;
export const GetBiometricMappings = `${biometrics}GetBiometricMappings/`;
export const PostBiometricMappings = `${biometrics}PostBiometricMappings/`;
export const UpdateBiometricMappings = `${biometrics}UpdateBiometricMappings/`;

// ── Staff information ─────────────────────────────────────────────────────────
export const GetStaffInformation = `${staffManagement}GetStaffInformation`;
