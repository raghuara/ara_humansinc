
const baseApiurl = `https://schoolcommunicationwebapimsmsuat-dredbbfmhzergfhw.canadacentral-01.azurewebsites.net/api/`;

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
export const postleavepolicy = `${leavePolicy}postleavepolicy`;
export const GetLeavePolicy = `${leavePolicy}GetLeavePolicy`;
export const postleavetypes = `${leavePolicy}postleavetypes`;
export const GetleaveTypes = `${leavePolicy}GetleaveTypes`;
export const postworkingcalendar = `${leavePolicy}postworkingcalendar`;
export const GetWorkingcalendar = `${leavePolicy}GetWorkingcalendar`;
export const UpdateleaveTypeByID = `${leavePolicy}UpdateleaveTypeByID`;
export const DeleteleaveTypeByID = `${leavePolicy}DeleteleaveTypeByID`;
export const GetEmployeeLeaveBalance = `${leavePolicy}GetEmployeeLeaveBalance`;

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
