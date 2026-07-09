// ─── API endpoint registry ────────────────────────────────────────────────────
// Central place for every REST endpoint the payroll / leave screens call.
// Set REACT_APP_API_BASE in a .env file to point at your backend; until then
// calls resolve against the same origin and simply return no data (screens
// render their empty states instead of crashing).
const BASE = process.env.REACT_APP_API_BASE || '/api';

// Employees & salary structures
export const getEmployees = `${BASE}/employees`;
export const getStaffInformation = `${BASE}/staff/information`;
export const GetStaffInformation = getStaffInformation;
export const salaryStructureDashboard = `${BASE}/salary-structures/dashboard`;
export const postSalaryStructure = `${BASE}/salary-structures`;
export const updateSalaryStructureByRollnumber = `${BASE}/salary-structures/rollnumber`;
export const deleteSalaryStructureByRollnumber = `${BASE}/salary-structures/rollnumber`;

// Compliance & deductions
export const employeeComplianceDashboard = `${BASE}/compliance/dashboard`;
export const getDeductionsAndCompliance = `${BASE}/compliance/deductions`;
export const postPFConfiguration = `${BASE}/compliance/pf`;
export const postESIConfiguration = `${BASE}/compliance/esi`;
export const postProfessionalTaxConfiguration = `${BASE}/compliance/pt`;
export const postTDSConfiguration = `${BASE}/compliance/tds`;
export const updateEmployeeComplianceByRollnumber = `${BASE}/compliance/rollnumber`;

// Bank details
export const employeeBankDetailsDashboard = `${BASE}/bank-details/dashboard`;
export const updateEmployeeBankDetailsByRollnumber = `${BASE}/bank-details/rollnumber`;

// Salary register
export const salaryRegisterDashboard = `${BASE}/salary-register/dashboard`;

// Payroll run & approval
export const approvePayrollPayslipsDashboard = `${BASE}/payroll/approve/dashboard`;
export const getPayrollPayslipByRollNumber = `${BASE}/payroll/payslip/rollnumber`;

// Leave policy / types / working calendar
export const leavePolicyDashboard = `${BASE}/leave-policy/dashboard`;
export const GetLeavePolicy = `${BASE}/leave-policy`;
export const postleavepolicy = `${BASE}/leave-policy`;
export const GetleaveTypes = `${BASE}/leave-types`;
export const postLeaveType = `${BASE}/leave-types`;
export const postleavetypes = `${BASE}/leave-types`;
export const updateLeaveTypeById = `${BASE}/leave-types/id`;
export const UpdateleaveTypeByID = `${BASE}/leave-types/id`;
export const DeleteleaveTypeByID = `${BASE}/leave-types/id`;
export const GetWorkingcalendar = `${BASE}/working-calendar`;
export const postworkingcalendar = `${BASE}/working-calendar`;

// Leave requests, balances & approvals
export const postLeaveRequest = `${BASE}/leave/request`;
export const GetEmployeeLeaveBalance = `${BASE}/leave/balance`;
export const getLeaveApprovalDashboard = `${BASE}/leave/approval/dashboard`;
export const leaveApprovalStatusCheck = `${BASE}/leave/approval/status`;
export const updateLeaveApprovalAction = `${BASE}/leave/approval/action`;
export const reportsLeaveManagement = `${BASE}/leave/reports`;
export const reportsLeaveManagementFullReport = `${BASE}/leave/reports/full`;

// Attendance
export const getStaffAttendanceOverview = `${BASE}/attendance/overview`;
export const GetAttendanceTeacherBefore = `${BASE}/attendance/before`;
export const GetTeachersAttendance = `${BASE}/attendance/teachers`;
export const PostTeachersManualAttendance = `${BASE}/attendance/manual`;

// Biometric mapping & sync
export const GetBiometricMappings = `${BASE}/biometric/mappings`;
export const PostBiometricMappings = `${BASE}/biometric/mappings`;
export const UpdateBiometricMappings = `${BASE}/biometric/mappings`;
export const SyncStatus = `${BASE}/biometric/sync/status`;
export const TriggerManualSync = `${BASE}/biometric/sync/trigger`;
