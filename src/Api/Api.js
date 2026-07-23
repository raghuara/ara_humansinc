
const baseApiurl = `https://ara-payroll-cyezfwb6d9g0h8ew.centralus-01.azurewebsites.net/api/`;


// Login
const Auth = `${baseApiurl}Auth/`;
export const PostLogin = `${Auth}PostLogin`;

// ── Entity setup ──────────────────────────────────────────────────────────────
// GET → { entityId, entityName, financialYear, ready, completedSteps, totalSteps,
// pendingRequired, steps:[{ key, title, description, done, required, detail }] }.
// The per-entity "is this company configured enough to run" checklist. Entity
// scoped via X-Entity-Id (required for a MasterAdmin; an admin's token decides).
const Setup = `${baseApiurl}Setup/`;
export const GetEntitySetupStatus = `${Setup}GetEntitySetupStatus`;

// ── Dashboard ─────────────────────────────────────────────────────────────────
// GET → { me, stats, interviewsToday, lateComers, payroll, payrollTrend,
// needsAttention, leaveRequests, newJoiners, resignations, birthdays,
// anniversaries }. Entity-scoped through the X-Entity-Id header.
const Dashboard = `${baseApiurl}Dashboard/`;
export const GetDashboard = `${Dashboard}GetDashboard`;
// GET → { totalPending, allClear, cards[], totalGaps, gaps[], workingCalendar }
// Each card/gap is { key, title, subtitle, count, clear }.
export const GetActionRequired = `${Dashboard}GetActionRequired`;
// GET → the signed-in employee's own view: { profile, me, attendanceThisMonth,
// leaveBalances[], myLeaveRequests[], latestPayslip, pendingDocuments[],
// upcomingHolidays[] }.
export const GetMyDashboard = `${Dashboard}GetMyDashboard`;

// ── Roles & access (user types) ───────────────────────────────────────────────
const UserType = `${baseApiurl}UserType/`;
export const GetUserTypes = `${UserType}GetUserTypes`;   
export const PostUserType = `${UserType}PostUserType`; 
export const UpdateUserType = `${UserType}UpdateUserType`;
export const DeleteUserType = `${UserType}DeleteUserType`;
// GET ?id= → { roleId, roleName, users:[{ id, name, loginId, phone, isActive,
// lastLoginOn }] } — the users currently holding a role.
export const GetUsersByUserType = `${UserType}GetUsersByUserType`;


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
// PUT { EmployeeCode, UserTypeId } — the ONLY place an employee is assigned a
// role. A login from SetEmployeeLoginPassword has no user type and can't sign in
// (409 "no valid role assigned") until this is called. Handles first assignment
// and every later change alike.
export const UpdateEmployeeUserType = `${Employee}UpdateEmployeeUserType`;
// GET → login id + decrypted password per account. SENSITIVE (roles-access).
export const GetEmployeeCredentials = `${Employee}GetEmployeeCredentials`;
// Login ID format: the server owns the prefix AND generates the running number,
// so `nextLoginId` is the only trustworthy source for the next employee's code.
const LoginIdFormat = `${baseApiurl}LoginIdFormat/`;
export const GetLoginIdFormat = `${LoginIdFormat}GetLoginIdFormat`;
export const UpdateLoginIdFormat = `${LoginIdFormat}UpdateLoginIdFormat`;


// ── Sub-bases (mirror the source Api.js) ──────────────────────────────────────
const payRoll = `${baseApiurl}payRoll/`;
const leavePolicy = `${baseApiurl}leavePolicy/`;
const leave = `${baseApiurl}leave/`;
const biometrics = `${baseApiurl}biometrics/`;
const staffManagement = `${baseApiurl}staffManagement/`;
const payrollCycle = `${baseApiurl}PayrollCycle/`;
const SalaryAdvance = `${baseApiurl}SalaryAdvance/`;

// ── Payroll cycle (the monthly run pipeline) ──────────────────────────────────
export const getPayrollCycle = `${payrollCycle}GetCycle`;                      // ?payoutMonth=YYYY-MM
export const getPayrollRegister = `${payrollCycle}GetRegister`;                // ?payoutMonth=YYYY-MM (after PostCalculate)
export const getPayrollPayslip = `${payrollCycle}GetPayslip`;                  // ?payoutMonth=YYYY-MM&employeeCode=
export const postLockAttendancePayrollCycle = `${payrollCycle}PostLockAttendance`; // { payoutMonth }
export const postCalculatePayrollCycle = `${payrollCycle}PostCalculate`;       // { payoutMonth }
export const postApprovePayrollCycle = `${payrollCycle}PostApprove`;           // { payoutMonth }
export const postMarkCreditedPayrollCycle = `${payrollCycle}PostMarkCredited`; // { payoutMonth }
export const postRollbackPayrollCycle = `${payrollCycle}PostRollback`;         // { payoutMonth } — reverts one stage

// ── Payroll: salary structures ────────────────────────────────────────────────
export const postSalaryStructure = `${payRoll}PostSalaryStructure`;
export const getEmployees = `${payRoll}GetEmployees`;
export const updateSalaryStructureByEmployeeCode = `${payRoll}UpdateSalaryStructureByEmployeeCode`;
export const updateSalaryStructureByRollnumber = `${payRoll}updateSalaryStructureByRollnumber`; // legacy
export const deleteSalaryStructureByEmployeeCode = `${payRoll}DeleteSalaryStructureByEmployeeCode`; // ?employeeCode=
export const deleteSalaryStructureByRollnumber = `${payRoll}deleteSalaryStructureByRollnumber`;    // legacy
export const salaryStructureDashboard = `${payRoll}GetSalaryStructureDashboard`;
// Payroll Register now comes from the cycle endpoint (getPayrollRegister below).

// ── Payroll: compliance & deductions ──────────────────────────────────────────
export const postPFConfiguration = `${payRoll}PostPFConfiguration`;
export const postESIConfiguration = `${payRoll}PostESIConfiguration`;
export const postProfessionalTaxConfiguration = `${payRoll}PostProfessionalTaxConfiguration`;
export const postTDSConfiguration = `${payRoll}PostTDSConfiguration`;
export const getDeductionsAndCompliance = `${payRoll}GetDeductionsAndCompliance`;
export const employeeComplianceDashboard = `${payRoll}GetEmployeeComplianceDashboard`;
export const updateEmployeeComplianceByEmployeeCode = `${payRoll}UpdateEmployeeComplianceByEmployeeCode`;
export const updateEmployeeComplianceByRollnumber = `${payRoll}updateEmployeeComplianceByRollnumber`; // legacy


export const GetSalaryAdvancesDashboard = `${SalaryAdvance}GetSalaryAdvancesDashboard`;
// PUT { RequestId, Action: 'approve'|'reject', Reason } — `Reason` is sent on a
// reject only. The recovery plan is NOT settable here: it comes from whatever
// the employee requested, so the approver reviews it rather than editing it.
export const UpdateAdvanceRequestAction = `${SalaryAdvance}UpdateAdvanceRequestAction`;

// ── Salary advances: self-service (no module gate) ────────────────────────────
// GET → powers the request form: the plan list, month quick-picks, min/max
// months and the selectable start-month recovery window (+ hint).
export const GetAdvanceFormOptions = `${SalaryAdvance}GetAdvanceFormOptions`;
// POST { amount, recoveryPlan: 'monthly'|'onetime', months, startMonth: 'yyyy-MM',
// notes } — deductPerMonth is derived (amount / months), never sent.
export const RequestAdvance = `${SalaryAdvance}RequestAdvance`;
// GET → the caller's own advances: status (Pending|Active|Rejected|Completed),
// rejectReason, and recovery progress (recoveredAmount, outstanding).
export const GetMyAdvanceRequests = `${SalaryAdvance}GetMyAdvanceRequests`;

// ── Overtime (OT) ─────────────────────────────────────────────────────────────
// The dashboard returns the KPIs, the rate slabs and the OT entries in one call;
// entries arrive display-ready (date "05 Jul 2026", times "5:30 PM") with the
// slab match and payout already resolved server-side.
const Overtime = `${baseApiurl}Overtime/`;
export const GetOvertimeDashboard = `${Overtime}GetOvertimeDashboard`;
// { Name, FromHours, ToHours, AndAbove, PayType: 'perhour'|'flat', Rate }
export const AddOvertimeRateSlab = `${Overtime}AddOvertimeRateSlab`;
// Same body plus { Id }.
export const UpdateOvertimeRateSlab = `${Overtime}UpdateOvertimeRateSlab`;
export const DeleteOvertimeRateSlab = `${Overtime}DeleteOvertimeRateSlab`;   // ?id=
// PUT { CountsAfterMinutes } — the grace window before extra time counts as OT.
export const UpdateOvertimeCountsAfter = `${Overtime}UpdateOvertimeCountsAfter`;
// PUT { EntryId, Action: 'approve'|'reject', Reason } — `Reason` on a reject only.
export const UpdateOvertimeEntryAction = `${Overtime}UpdateOvertimeEntryAction`;

// ── Overtime: self-service (no module gate) ───────────────────────────────────
// POST { Date: 'dd-MM-yyyy', ShiftEnd: 'HH:mm', SignOff: 'HH:mm' } — the employee
// claims OT for a day; the server computes the hours/slab/pay and files it Pending.
export const RequestOvertime = `${Overtime}RequestOvertime`;
// GET → the caller's own OT entries with computed hours, slab, pay and status.
export const GetMyOvertimeRequests = `${Overtime}GetMyOvertimeRequests`;

// ── Payroll: bank details ─────────────────────────────────────────────────────
export const employeeBankDetailsDashboard = `${payRoll}GetEmployeeBankDetailsDashboard`;
export const updateEmployeeBankDetailsByEmployeeCode = `${payRoll}UpdateEmployeeBankDetailsByEmployeeCode`;
export const updateEmployeeBankDetailsByRollnumber = `${payRoll}updateEmployeeBankDetailsByRollnumber`; // legacy


// ── Payroll: run & approve ────────────────────────────────────────────────────
export const approvePayrollPayslipsDashboard = `${payRoll}GetApprovePayrollPayslipsDashboard`;
export const getPayrollPayslipByRollNumber = `${payRoll}getPayrollPayslipByRollNumber`;

// ── Payroll: payslip requests ─────────────────────────────────────────────────
// Self-service (any signed-in user, no module gate):
// POST { FromMonth, ToMonth, Note } — months MM-yyyy; one request row per month.
export const RequestPayslip = `${payRoll}RequestPayslip`;
// GET → the caller's own request history (month, status, rejectReason, payslipReady).
export const GetMyPayslipRequests = `${payRoll}GetMyPayslipRequests`;
// GET ?fromMonth=&toMonth= — the caller's own payslip (403 until approved).
export const GetMyPayslip = `${payRoll}GetMyPayslip`;
// Approver side (payslips module):
// GET ?status=&search= → the request queue + counts.
export const GetPayslipRequests = `${payRoll}GetPayslipRequests`;
// PUT { RequestId, Action: 'approve'|'reject', Reason } — action one requested month.
export const UpdatePayslipRequestAction = `${payRoll}UpdatePayslipRequestAction`;
// POST { RequestIds:[] } — empty approves every pending request.
export const ApproveAllPayslipRequests = `${payRoll}ApproveAllPayslipRequests`;

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
export const postLeaveRequest = `${leave}PostLeaveRequest`;
export const getLeaveApprovalDashboard = `${leave}GetLeaveApprovalDashboard`;   // ?financialYear=
export const GetLeaveApprovalStatusCheck = `${leave}GetLeaveApprovalStatusCheck`; // ?financialYear= — pending ("Requested") leaves
export const leaveApprovalStatusCheck = `${baseApiurl}leaveApprovalStatusCheck`;
export const updateLeaveApprovalAction = `${leave}UpdateLeaveApprovalAction`;   // ?leaveApplicationId=&financialYear=&action=accept|decline&reason=

// ── Leave / attendance reports ────────────────────────────────────────────────
export const reportsLeaveManagement = `${baseApiurl}Reports/GetReportsLeaveManagement`;                   // ?fromDate=DD-MM-YYYY&toDate=DD-MM-YYYY
export const reportsLeaveManagementFullReport = `${baseApiurl}Reports/GetReportsLeaveManagementFullReport`; // ?employeeCode=&fromDate=&toDate=

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

// ── Employee documents (per-employee onboarding files) ────────────────────────
// Distinct from the DocumentManagement/* employee-docs above — this is the
// EmployeeDocument controller keyed by the numeric employee id.
const EmployeeDocument = `${baseApiurl}EmployeeDocument/`;
// POST multipart: employeeId, documentType (one of the slugs), file.
export const UploadEmployeeDoc = `${EmployeeDocument}PostEmployeeDocument`;
export const GetEmployeeDocs = `${EmployeeDocument}GetEmployeeDocuments`;       // ?employeeId=
export const DownloadEmployeeDoc = `${EmployeeDocument}DownloadEmployeeDocument`; // ?id=
export const DeleteEmployeeDoc = `${EmployeeDocument}DeleteEmployeeDocument`;   // ?id=

// ── Departments ───────────────────────────────────────────────────────────────
const Department = `${baseApiurl}Department/`;
// GET → { count, departments: [{ id, name, code, description, isActive,
// designations, createdOn, entityId, entityName }] }
export const GetDepartments = `${Department}GetDepartments`;
// POST { entityId: "1"|"all", name, code, description, isActive }
export const CreateDepartment = `${Department}CreateDepartment`;
// PUT { id, name, code, description, isActive }
export const UpdateDepartment = `${Department}UpdateDepartment`;
export const DeleteDepartment = `${Department}DeleteDepartment`;   // ?id=

// ── Designations ──────────────────────────────────────────────────────────────
const Designation = `${baseApiurl}Designation/`;
// GET → { count, designations: [{ id, name, code, departmentId, departmentName,
// isEntityWide, grade, description, isActive, createdOn, entityId, entityName }] }
export const GetDesignations = `${Designation}GetDesignations`;
// POST { entityId: "1"|"all", name, code, departmentId, grade, description, isActive }
export const CreateDesignation = `${Designation}CreateDesignation`;
// PUT { id, name, code, departmentId, grade, description, isActive }
export const UpdateDesignation = `${Designation}UpdateDesignation`;
export const DeleteDesignation = `${Designation}DeleteDesignation`;   // ?id=

// ── Recruitment ───────────────────────────────────────────────────────────────
const Recruitment = `${baseApiurl}Recruitment/`;
// GET → { cards: {...}, count, vacancies: [{ id, roleTitle, department, ...,
// experienceRange, minSalary, maxSalary, applicants, postedOn, ... }] }
export const GetVacancies = `${Recruitment}GetVacancies`;
// POST { roleTitle, openings, department, designation, experienceRange,
// employmentType, priority, minSalary, maxSalary, location, hiringManager, description }
export const CreateVacancy = `${Recruitment}CreateVacancy`;
export const UpdateVacancy = `${Recruitment}UpdateVacancy`;          // PUT, same body plus { id }
export const SetVacancyStatus = `${Recruitment}SetVacancyStatus`;    // PUT { id, status }
export const DeleteVacancy = `${Recruitment}DeleteVacancy`;          // ?id=
// GET → { cards, count, candidates: [{ id, vacancyId, vacancyTitle, fullName,
// experienceYears, expectedSalary, stage, appliedOn, roundsDecided, ... }] }
export const GetCandidates = `${Recruitment}GetCandidates`;
// POST { vacancyId, fullName, email, phone, currentCompany, experience,
// expectedSalary, noticePeriod, source }
export const AddCandidate = `${Recruitment}AddCandidate`;
export const UpdateCandidate = `${Recruitment}UpdateCandidate`;      // PUT, same body plus { id }
// PUT { id, stage: 'Applied'|'Interviewing'|'On Hold'|'Selected'|'Joined'|'Rejected', reason }
export const SetCandidateStage = `${Recruitment}SetCandidateStage`;
export const DeleteCandidate = `${Recruitment}DeleteCandidate`;      // ?id=

// ── Interviews ────────────────────────────────────────────────────────────────
// GET → { cards, today[], awaitingReview[], upcoming[], completed[] } — each row
// has { id, candidateName, role, round, date "18 Jul 2026", time "10:00 AM",
// durationMinutes, durationLabel, mode, meetingDetail, panel, status, outcome,
// rating, feedback, reviewedBy, reviewedOn }.
export const GetInterviews = `${Recruitment}GetInterviews`;
// GET → { vacancies:[{ id, label, candidates:[{ id, label }] }], rounds, modes, durations }
export const GetInterviewFormOptions = `${Recruitment}GetInterviewFormOptions`;
// POST { vacancyId, candidateId, round, date, time, durationMinutes, mode, meetingDetail, panel }
export const ScheduleInterview = `${Recruitment}ScheduleInterview`;
export const UpdateInterview = `${Recruitment}UpdateInterview`;                    // PUT (edit details)
// PUT { id, date, time, durationMinutes, mode, meetingDetail }
export const RescheduleInterview = `${Recruitment}RescheduleInterview`;
export const MarkInterviewConducted = `${Recruitment}MarkInterviewConducted`;      // PUT { id }
export const MarkInterviewNoShow = `${Recruitment}MarkInterviewNoShow`;            // PUT { id }
// PUT { id, outcome: 'Selected'|'Rejected'|'On Hold', rating, feedback, rejectReason }
export const ReviewInterview = `${Recruitment}ReviewInterview`;
export const CancelInterview = `${Recruitment}CancelInterview`;                    // PUT { id }

// ── Inbox ─────────────────────────────────────────────────────────────────────
const Inbox = `${baseApiurl}Inbox/`;
// GET ?filter=all|unread|… → the message feed for the signed-in user.
export const GetInbox = `${Inbox}GetInbox`;
// PUT { Id, IsRead } — flip one message's read state.
export const UpdateMessageReadStatus = `${Inbox}UpdateMessageReadStatus`;
export const MarkAllRead = `${Inbox}MarkAllRead`;             // PUT, no body
export const DeleteMessage = `${Inbox}DeleteMessage`;        // ?id=
export const ClearAll = `${Inbox}ClearAll`;                  // DELETE, no body

// ── Business entities ─────────────────────────────────────────────────────────
const BusinessEntity = `${baseApiurl}BusinessEntity/`;
export const GetBusinessEntitiesDashboard = `${BusinessEntity}GetBusinessEntitiesDashboard`;
export const GetBusinessEntityById = `${BusinessEntity}GetBusinessEntityById`;   // ?id=
export const PostBusinessEntity = `${BusinessEntity}PostBusinessEntity`;
export const UpdateBusinessEntityById = `${BusinessEntity}UpdateBusinessEntityById`;   // ?id=
export const DeleteBusinessEntityById = `${BusinessEntity}DeleteBusinessEntityById`;   // ?id=

// ── Document management ───────────────────────────────────────────────────────
// GET → { count, items: [{ id, documentName, category, isMandatory, status,
// requestedByName, requestedOn (DD-MM-YYYY), dueDate, entityId, entityName,
// totalRecipients, approved, pending, toReview, rejected, recipients:[...] }] }
const DocumentManagement = `${baseApiurl}DocumentManagement/`;
export const GetDocumentRequests = `${DocumentManagement}GetDocumentRequests`;
// POST { documentName, category, dueDate (DD-MM-YYYY), isMandatory, note,
// employeeCodes: [...], entityId, entityName }
export const PostDocumentRequest = `${DocumentManagement}PostDocumentRequest`;
// POST { requestId, employeeCodes: [...] } — add more recipients to a request.
export const PostAddRecipients = `${DocumentManagement}PostAddRecipients`;
export const DeleteDocumentRequest = `${DocumentManagement}DeleteDocumentRequest`;   // ?id=
// GET → { count, items: [{ recipientId, requestId, employeeCode, employeeName,
// department, documentName, category, requestedByName, requestedOn, dueDate,
// fileName, sizeBytes, submittedOn, employeeNote }] }
export const GetPendingApprovals = `${DocumentManagement}GetPendingApprovals`;
// PUT { recipientId, action: 'approve'|'reject', reason } — reason on reject only.
export const UpdateApprovalAction = `${DocumentManagement}UpdateApprovalAction`;
// POST { recipientIds: [...] } — approve every listed submission at once.
export const PostApproveAll = `${DocumentManagement}PostApproveAll`;
// GET ?recipientId= → the raw submitted file (binary; use responseType 'blob').
export const DownloadSubmission = `${DocumentManagement}DownloadSubmission`;
// GET → { count, items: [...] } — approved documents filed against employees.
export const GetEmployeeDocuments = `${DocumentManagement}GetEmployeeDocuments`;
// GET ?recipientId= → the approved file (binary).
export const DownloadEmployeeDocument = `${DocumentManagement}DownloadEmployeeDocument`;
export const DeleteEmployeeDocument = `${DocumentManagement}DeleteEmployeeDocument`;   // ?recipientId=

// ── Document requests: self-service (the employee's own) ──────────────────────
// GET → { count, items:[{ recipientId, requestId, documentName, category,
// isMandatory, note, dueDate, status, rejectReason, requestedByName, fileName,
// submittedOn, entityId, entityName }] } — what's been requested FROM the caller.
export const GetMyDocumentRequests = `${DocumentManagement}GetMyDocumentRequests`;
// POST (multipart) { RequestId, Note, File } — upload against a requested slot.
// requestId + the token employee code pick out exactly the caller's slot.
export const PostMyDocumentUpload = `${DocumentManagement}PostMyDocumentUpload`;

// ── Organisation documents (shared company files) ─────────────────────────────
const OrganisationDocuments = `${baseApiurl}OrganisationDocuments/`;
// GET → { count, items: [{ id, documentName, category, description, fileName,
// sizeBytes, url, entityId, entityName, visibleTo:[{userTypeId,name}],
// uploadedByName, createdOn }] }
export const GetOrganisationDocuments = `${OrganisationDocuments}GetOrganisationDocuments`;
// Same shape, but only the documents the signed-in user uploaded.
export const GetMyOrganisationDocuments = `${OrganisationDocuments}GetMyOrganisationDocuments`;
// POST multipart: file + documentName, category, description,
// visibleToUserTypeIds[], entityName.
export const PostOrganisationDocument = `${OrganisationDocuments}PostOrganisationDocument`;
// PUT { id, documentName, category, description, visibleToUserTypeIds } — metadata only.
export const UpdateOrganisationDocument = `${OrganisationDocuments}UpdateOrganisationDocument`;
export const DeleteOrganisationDocument = `${OrganisationDocuments}DeleteOrganisationDocument`;   // ?id=
export const DownloadOrganisationDocument = `${OrganisationDocuments}DownloadOrganisationDocument`; // ?id=
