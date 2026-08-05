/* Mock clinical data. Every thread belongs to a facility; visibility is
   filtered through ME.credentials so no view can leak another hospital. */

export const ME = {
  name: "Dr. M. Hussain",
  initials: "MH",
  role: "Virtual Provider", // "Onsite Provider" locks the switcher to homeFacility
  homeFacility: "saint",
  credentials: [
    { facility: "saint", privileges: "Critical Care · Admitting", expires: "2027-02-14" },
    { facility: "edgerton", privileges: "Tele-Cardiology", expires: "2026-09-02" },
    { facility: "mercy", privileges: "Tele-ICU Consultative", expires: "2026-08-19" },
  ],
};

export const INITIAL_THREADS = [
  { id: 1, name: "Team Consultation", team: true, members: "Dr. M. Hussain, Dr. E. Vasquez +2", context: "Tele-ICU · Critical Care", facility: "saint", patient: "Jon Smith", room: "404", mrn: "MRN-176471", dob: "1965-10-11", time: "Just now", ageSec: 40, acuity: "critical", newCount: 3, reason: "Patient in Rm 404 with chest pain, escalating pressor requirement.", confidence: 92,
    msgs: [
      { me: false, who: "Amy Smith, RN", kind: "consult", text: "New consult request: patient in Room 404 is experiencing chest pain with escalating O2 requirement.", t: "9:28 AM" },
      { me: false, who: "Dr. E. Vasquez", text: "MAP holding at 62 on norepi 12 mcg. Lactate 4.1, up from 3.2.", t: "9:31 AM" },
      { me: false, who: "Dr. E. Vasquez", kind: "attachment", text: "Echocardiogram report — 2-D & M-Mode, color flow Doppler", t: "9:36 AM" },
      { me: true, who: "You", text: "Joining the cart in Rm 404 in 2 minutes. Pull up the last ABG for me.", t: "9:40 AM" },
    ] },
  { id: 2, name: "Dr. Elena Vasquez", context: "Tele-Cardiology", facility: "edgerton", patient: "Maria Chen", room: "212", mrn: "MRN-208114", dob: "1958-03-22", time: "12m", ageSec: 720, acuity: "critical", newCount: 2, reason: "Troponin rise with anterior ST changes.", confidence: 88,
    msgs: [
      { me: false, who: "Dr. E. Vasquez", text: "Troponin trending up on repeat draw. ECG attached — ST changes in V3–V4.", t: "9:30 AM" },
      { me: true, who: "You", text: "Reviewing the ECG now. Get cath lab on standby and repeat troponin at 11.", t: "9:33 AM" },
    ] },
  { id: 3, name: "Amy Smith, RN", context: "Tele-Infectious Disease", facility: "saint", patient: "Robert Diaz", room: "318", mrn: "MRN-355902", dob: "1971-07-02", time: "38m", ageSec: 2280, acuity: "urgent", newCount: 1, reason: "Positive blood cultures, needs antimicrobial guidance.", confidence: 85,
    msgs: [
      { me: false, who: "Amy Smith, RN", text: "Blood cultures resulted — gram-positive cocci in clusters, 2 of 2 bottles.", t: "9:04 AM" },
      { me: true, who: "You", text: "Start vancomycin per protocol, trough before 4th dose. I'll see him on rounds at 1.", t: "9:12 AM" },
    ] },
  { id: 4, name: "Dr. Raj Patel", context: "Tele-Pulmonology", facility: "mercy", patient: "Linda Okafor", room: "126", mrn: "MRN-441238", dob: "1949-12-30", time: "1h", ageSec: 3600, acuity: "urgent", newCount: 1, reason: "COPD exacerbation, improving.", confidence: 90,
    msgs: [{ me: false, who: "Dr. R. Patel", text: "O2 requirement down to 3L. Okay to space nebs to q6h overnight?", t: "8:42 AM" }] },
  { id: 5, name: "James Torres, RN", context: "Tele-Cardiology", facility: "edgerton", patient: "Maria Chen", room: "212", mrn: "MRN-208114", dob: "1958-03-22", time: "3h", ageSec: 10800, acuity: "routine", newCount: 1, reason: "Discharge co-sign.", confidence: 96,
    msgs: [{ me: false, who: "James Torres, RN", text: "Discharge summary drafted for your co-sign when you have a moment.", t: "6:20 AM" }] },
  { id: 6, name: "Dr. Lisa Wong", context: "Scheduling", facility: "mercy", patient: "—", room: "—", time: "1d", ageSec: 86400, acuity: "routine", newCount: 1, reason: "", confidence: 0,
    msgs: [{ me: false, who: "Dr. L. Wong", text: "Can we move Thursday's tumor board to 2:30? Radiology has a conflict.", t: "1d ago" }] },
];

export const STAFF = [
  { id: "s1", name: "Dr. M. Mark, DO", role: "Physician", dept: "Emergency Medicine", facility: "saint", initials: "MM", online: true },
  { id: "s2", name: "Saamer Siddiqi, MD", role: "Physician", dept: "Internal Medicine", facility: "saint", initials: "SS", online: true },
  { id: "s3", name: "Dr. Elena Vasquez", role: "Physician", dept: "Cardiology", facility: "edgerton", initials: "EV", online: true, threadId: 2 },
  { id: "s4", name: "Amy Smith, RN", role: "Virtual Nurse", dept: "Surgery", facility: "saint", initials: "AS", online: true, threadId: 3 },
  { id: "s5", name: "James Torres, RN", role: "Virtual Nurse", dept: "Cardiology", facility: "edgerton", initials: "JT", online: false, threadId: 5 },
  { id: "s6", name: "Dr. Lisa Wong", role: "Physician", dept: "Oncology", facility: "mercy", initials: "LW", online: false, threadId: 6 },
];

export const SPECIALTIES = [
  "Anesthesiology", "Cardiology", "Cardiovascular Disease", "Case Manager", "Diagnostic Radiology",
  "Emergency Medicine", "Family Medicine", "Family Medicine w/ OB", "Family Nurse Practitioner",
  "General Surgery", "Geriatrics", "Infectious Diseases", "Internal Medicine", "Interventional Radiology",
  "Maternal-Fetal Medicine", "Midwifery", "Nephrology", "Neurology", "Obstetrics & Gynecology",
  "Oncology", "Ophthalmology", "Orthopaedic Surgery", "Pulmonology", "Tele-ICU / Critical Care",
];

export const SHIFTS = {
  4: [{ label: "Tele-ICU Coverage", facility: "saint", time: "7:00 AM – 7:00 PM", acuity: "critical" }],
  5: [{ label: "Cardiology Reads", facility: "edgerton", time: "8:00 AM – 12:00 PM", acuity: "urgent" }],
  6: [],
  7: [{ label: "Tele-ID Rounds", facility: "saint", time: "1:00 PM – 4:00 PM", acuity: "routine" },
      { label: "Tumor Board", facility: "mercy", time: "2:30 PM – 3:30 PM", acuity: "routine" }],
  8: [{ label: "Tele-ICU Coverage", facility: "saint", time: "7:00 PM – 7:00 AM", acuity: "critical" }],
};

/* Facilities this user is allowed to see at all. */
export function credentialedFacilities(me = ME) {
  return me.role === "Onsite Provider"
    ? [me.homeFacility]
    : me.credentials.map((c) => c.facility);
}
