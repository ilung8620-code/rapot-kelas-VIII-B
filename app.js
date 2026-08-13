import { auth, db, firebaseReady } from "./firebase-config.js";
import { SUBJECTS, competencyFromScore } from "./subjects.js";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const defaultSettings = {
  schoolName: "SMP AL-MIFTAH",
  schoolAddress: "PANGEREMAN KETAPANG SAMPANG",
  schoolCity: "Sampang",
  reportDate: "2026-06-20",
  academicYear: "2025/2026",
  semester: "2",
  defaultPhase: "D",
  defaultClass: "VII A",
  homeroomName: "Hoirul Anam, S.Sos",
  homeroomNip: "-",
  principalName: "Amirudin, S.Pd.I",
  principalNip: "-",
  ministryName: "KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH REPUBLIK INDONESIA",
  logoUrl: "assets/logo-smp-al-miftah.png"
};

const state = {
  settings: {...defaultSettings},
  students: [],
  reports: [],
  importData: null
};

const defaultReportExtras = {
  spiritual: "Menunjukkan sikap beriman dan bertakwa melalui kebiasaan berdoa, bersyukur, dan menghormati kegiatan keagamaan.",
  social: "Menunjukkan kepedulian, percaya diri, dan tanggung jawab dalam mengikuti kegiatan pembelajaran.",
  scout: "Peserta didik mengikuti kegiatan ekstrakurikuler Pramuka dengan baik. Menunjukkan sikap disiplin dan tanggung jawab dalam kegiatan, serta mampu bekerja sama dengan teman. Keaktifan sudah baik dan terus menunjukkan perkembangan dalam memahami nilai-nilai kepramukaan.",
  teacherNote: "Terus tingkatkan ketekunan belajar, kerapian tugas, dan keaktifan selama pembelajaran."
};

function toast(message, type="") {
  const el = $("#toast");
  el.textContent = message;
  el.className = `toast show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.className = "toast", 3400);
}

function fmtDateID(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("id-ID", {day:"2-digit", month:"long", year:"numeric"}).format(d);
}

function safeId(value) {
  return String(value || "").trim().replace(/[\/#?\[\]]/g, "-").replace(/\s+/g, "-").toLowerCase();
}


// ============================================================
// KOMPATIBILITAS DATA RAPOR LAMA + FORMAT V2
// Mendukung dokumen lama seperti:
//   111341000__2025-2026__sGANJIL
// dengan nilai langsung di root dokumen (PAI, IPA, BING, dst.),
// sekaligus format V2 yang memakai grades.{KODE_MAPEL}.
// ============================================================
const SUBJECT_FIELD_ALIASES = {
  PAI: ["PAI", "PABP", "AGAMA", "PENDIDIKAN_AGAMA_ISLAM"],
  PANCASILA: ["PANCASILA", "PPKN", "PKN", "PENDIDIKAN_PANCASILA"],
  MATEMATIKA: ["MATEMATIKA", "MTK", "MATH"],
  BINDO: ["BINDO", "BIND", "BIN", "BAHASA_INDONESIA", "INDONESIA"],
  IPA: ["IPA", "SAINS"],
  IPS: ["IPS"],
  BING: ["BING", "BINGGRIS", "BAHASA_INGGRIS", "INGGRIS", "ENGLISH"],
  PJOK: ["PJOK", "PENJAS", "OLAHRAGA"],
  INFORMATIKA: ["INFORMATIKA", "TIK"],
  SENI: ["SENI", "SENI_BUDAYA", "SENIBUDAYA"],
  MADURA: ["MADURA", "BAHASA_MADURA", "MULOK_MADURA"],
  ASWAJA: ["ASWAJA", "ASWAJA_AN_NAHDLIYAH"]
};

function normalizedFieldName(value) {
  return String(value ?? "").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function objectValueByAliases(obj, aliases=[]) {
  if (!obj || typeof obj !== "object") return undefined;
  const keyMap = new Map(Object.keys(obj).map(k => [normalizedFieldName(k), k]));
  for (const alias of aliases) {
    const realKey = keyMap.get(normalizedFieldName(alias));
    if (realKey !== undefined) return obj[realKey];
  }
  return undefined;
}

function firstMeaningful(...values) {
  for (const value of values) {
    if (value === 0 || value === false) return value;
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function normalizeAcademicYear(value) {
  const raw = String(value ?? "").trim();
  const years = raw.match(/(?:19|20)\d{2}/g);
  if (years && years.length >= 2) return `${years[0]}/${years[1]}`;
  return raw;
}

function academicYearKey(value) {
  const normalized = normalizeAcademicYear(value);
  const years = normalized.match(/(?:19|20)\d{2}/g);
  if (years && years.length >= 2) return `${years[0]}${years[1]}`;
  return normalized.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function normalizeSemester(value) {
  const raw = String(value ?? "").trim().toUpperCase().replace(/[._-]+/g, " ");
  if (!raw) return "";
  if (["1", "01", "GANJIL", "GASAL", "SATU", "SEMESTER 1", "SEMESTER I", "S1", "I"].includes(raw)) return "1";
  if (["2", "02", "GENAP", "DUA", "SEMESTER 2", "SEMESTER II", "S2", "II"].includes(raw)) return "2";
  if (/\b(GANJIL|GASAL)\b/.test(raw)) return "1";
  if (/\bGENAP\b/.test(raw)) return "2";
  if (/\b(?:SEMESTER\s*)?1\b/.test(raw)) return "1";
  if (/\b(?:SEMESTER\s*)?2\b/.test(raw)) return "2";
  return String(value ?? "").trim();
}

function sameAcademicYear(a, b) {
  const ka = academicYearKey(a), kb = academicYearKey(b);
  return Boolean(ka && kb && ka === kb);
}

function sameSemester(a, b) {
  const sa = normalizeSemester(a), sb = normalizeSemester(b);
  return Boolean(sa && sb && sa === sb);
}

function parseLegacyReportId(id) {
  const text = String(id || "");
  const match = text.match(/^(.*?)__(.*?)__s(.+)$/i);
  if (!match) return {studentToken:"", academicYear:"", semester:""};
  return {
    studentToken: match[1],
    academicYear: normalizeAcademicYear(match[2]),
    semester: normalizeSemester(match[3])
  };
}

function identityKey(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function resolveStudentId(raw, reportId) {
  const parsed = parseLegacyReportId(reportId);
  const candidates = [
    raw?.studentId, raw?.studentID, raw?.student_id,
    raw?.nisn, raw?.NISN, raw?.nis, raw?.NIS,
    parsed.studentToken
  ].filter(v => String(v ?? "").trim());

  for (const candidate of candidates) {
    const key = identityKey(candidate);
    const safe = safeId(candidate);
    const student = state.students.find(s =>
      identityKey(s.id) === key || safeId(s.id) === safe ||
      identityKey(s.nisn) === key || identityKey(s.nis) === key
    );
    if (student) return student.id;
  }
  return candidates.length ? safeId(candidates[0]) : "";
}

function normalizedScoreValue(value) {
  if (value === undefined || value === null || String(value).trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function readReportScore(raw, code) {
  const aliases = SUBJECT_FIELD_ALIASES[code] || [code];
  const nested = objectValueByAliases(raw?.grades, aliases);
  if (nested !== undefined) return normalizedScoreValue(nested);
  const direct = objectValueByAliases(raw, aliases);
  return normalizedScoreValue(direct);
}

function readReportCompetency(raw, code) {
  const aliases = SUBJECT_FIELD_ALIASES[code] || [code];
  const nested = objectValueByAliases(raw?.competencies, aliases);
  if (nested !== undefined && nested !== null && String(nested).trim()) return String(nested).trim();

  const directAliases = [];
  aliases.forEach(a => {
    directAliases.push(`CK_${a}`, `CAPAIAN_${a}`, `KOMPETENSI_${a}`);
  });
  const direct = objectValueByAliases(raw, directAliases);
  return direct === undefined || direct === null ? "" : String(direct).trim();
}

function toNonNegativeNumber(value, fallback=0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function normalizeReportDoc(id, raw={}) {
  const parsed = parseLegacyReportId(id);
  const grades = {};
  const competencies = {};
  SUBJECTS.forEach(sub => {
    grades[sub.code] = readReportScore(raw, sub.code);
    competencies[sub.code] = readReportCompetency(raw, sub.code);
  });

  const attendanceRaw = raw.attendance && typeof raw.attendance === "object" ? raw.attendance : {};
  const studentId = resolveStudentId(raw, id);
  const academicYear = normalizeAcademicYear(firstMeaningful(
    raw.academicYear, raw.tahunPelajaran, raw.TAHUN_PELAJARAN,
    raw.schoolYear, raw.YEAR, parsed.academicYear
  ));
  const semester = normalizeSemester(firstMeaningful(
    raw.semester, raw.SEMESTER, raw.term, raw.TERM, parsed.semester
  ));

  return {
    ...raw,
    id,
    studentId,
    academicYear,
    semester,
    grades,
    competencies,
    spiritual: String(firstMeaningful(raw.spiritual, raw.SPIRITUAL, defaultReportExtras.spiritual)),
    social: String(firstMeaningful(raw.social, raw.SOSIAL, defaultReportExtras.social)),
    scout: String(firstMeaningful(raw.scout, raw.PRAMUKA, raw.ekstrakurikuler, defaultReportExtras.scout)),
    teacherNote: String(firstMeaningful(raw.teacherNote, raw.CATATAN_WALI, raw.catatanWali, defaultReportExtras.teacherNote)),
    attendance: {
      sick: toNonNegativeNumber(firstMeaningful(attendanceRaw.sick, attendanceRaw.sakit, raw.SAKIT, raw.sakit, 0)),
      permit: toNonNegativeNumber(firstMeaningful(attendanceRaw.permit, attendanceRaw.izin, raw.IZIN, raw.izin, 0)),
      absent: toNonNegativeNumber(firstMeaningful(attendanceRaw.absent, attendanceRaw.alfa, raw.ALFA, raw.alfa, raw.TANPA_KETERANGAN, 0))
    },
    _sourceId: id,
    _legacyFormat: !(raw.grades && typeof raw.grades === "object")
  };
}

function dataUrlByteSize(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.ceil(base64.length * 0.75);
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Logo tidak dapat dibaca."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File logo bukan gambar yang valid."));
      img.onload = () => resolve(img);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function compressLogoToDataUrl(file) {
  if (!file) return "";
  if (!/^image\/(png|jpeg|webp)$/i.test(file.type || "")) {
    throw new Error("Logo harus berupa PNG, JPG/JPEG, atau WEBP.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran file logo maksimal 5 MB sebelum dikompres.");
  }

  const img = await fileToImage(file);
  const maxSide = 640;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
  const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak dapat memproses gambar logo.");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.9;
  let dataUrl = canvas.toDataURL("image/webp", quality);
  while (dataUrlByteSize(dataUrl) > 320 * 1024 && quality > 0.48) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/webp", quality);
  }
  if (!dataUrl.startsWith("data:image/webp")) {
    quality = 0.86;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  if (dataUrlByteSize(dataUrl) > 380 * 1024) {
    throw new Error("Logo masih terlalu besar setelah dikompres. Gunakan gambar yang lebih sederhana/kecil.");
  }
  return dataUrl;
}

function autoCompetencyFor(sub, score) {
  if (score === "" || score == null) return "";
  return competencyFromScore(score, sub);
}

function periodKey(studentId, year=state.settings.academicYear, semester=state.settings.semester) {
  return `${studentId}__${safeId(normalizeAcademicYear(year))}__s${normalizeSemester(semester)}`;
}

function reportMatchesCurrentPeriod(report) {
  return sameAcademicYear(report?.academicYear, state.settings.academicYear) && sameSemester(report?.semester, state.settings.semester);
}

function currentReport(studentId) {
  const matches = state.reports.filter(r => r.studentId === studentId && reportMatchesCurrentPeriod(r));
  // Jika ada format V2 dan format lama untuk siswa/periode yang sama, prioritaskan format V2.
  return matches.find(r => !r._legacyFormat) || matches[0];
}

function reportHasAnyScore(report) {
  return Boolean(report && SUBJECTS.some(s => report.grades?.[s.code] !== "" && report.grades?.[s.code] != null));
}

function reportAverage(report) {
  const scores = SUBJECTS.map(s => Number(report?.grades?.[s.code])).filter(n => Number.isFinite(n) && n >= 0 && n <= 100);
  return scores.length ? scores.reduce((a,b)=>a+b,0)/scores.length : null;
}

function canonicalReportData(report, student) {
  return {
    studentId: student.id,
    studentName: student.name || report.studentName || "",
    className: student.className || report.className || state.settings.defaultClass,
    phase: student.phase || report.phase || state.settings.defaultPhase,
    academicYear: normalizeAcademicYear(state.settings.academicYear),
    semester: normalizeSemester(state.settings.semester),
    grades: {...(report.grades || {})},
    competencies: {...(report.competencies || {})},
    spiritual: report.spiritual || defaultReportExtras.spiritual,
    social: report.social || defaultReportExtras.social,
    scout: report.scout || defaultReportExtras.scout,
    attendance: {
      sick: toNonNegativeNumber(report.attendance?.sick, 0),
      permit: toNonNegativeNumber(report.attendance?.permit, 0),
      absent: toNonNegativeNumber(report.attendance?.absent, 0)
    },
    teacherNote: report.teacherNote || defaultReportExtras.teacherNote,
    migratedFrom: report._legacyFormat ? report._sourceId : (report.migratedFrom || ""),
    updatedAt: serverTimestamp()
  };
}

async function ensureCanonicalReport(studentId) {
  const report = currentReport(studentId);
  if (!report || !reportHasAnyScore(report)) throw new Error("Nilai siswa untuk periode ini belum ditemukan.");
  const student = state.students.find(s => s.id === studentId);
  if (!student) throw new Error("Data siswa tidak ditemukan.");

  const canonicalId = periodKey(studentId);
  const canonicalInState = state.reports.find(r => r.id === canonicalId && !r._legacyFormat);
  if (canonicalInState) return canonicalId;

  // Membuat salinan format V2 hanya saat diperlukan (misalnya sebelum cetak).
  // Dokumen lama TIDAK dihapus, sehingga data asal tetap aman.
  const data = canonicalReportData(report, student);
  await setDoc(doc(db, "reports", canonicalId), data, {merge:true});
  const normalized = normalizeReportDoc(canonicalId, {...data, updatedAt:null});
  const idx = state.reports.findIndex(r => r.id === canonicalId);
  if (idx >= 0) state.reports[idx] = normalized; else state.reports.push(normalized);
  return canonicalId;
}

function setView(name) {
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  const meta = {
    dashboard: ["Dashboard", "Kelola data siswa, nilai, dan cetak rapor."],
    students: ["Data Siswa", "Tambah, edit, cari, dan hapus data peserta didik."],
    grades: ["Nilai & Rapor", "Input nilai dan cetak rapor sesuai format referensi."],
    import: ["Import Excel", "Import data siswa dan nilai secara massal."],
    settings: ["Pengaturan Sekolah", "Atur identitas sekolah, periode, logo, dan tanda tangan."]
  }[name];
  $("#pageTitle").textContent = meta[0];
  $("#pageSubtitle").textContent = meta[1];
  $("#sidebar").classList.remove("open");
}

function updateHeader() {
  const s = state.settings;
  $("#brandName").textContent = s.schoolName || "Rapor Digital";
  $("#brandLogo").src = s.logoUrl || defaultSettings.logoUrl;
  $("#heroYear").textContent = `${s.academicYear} · Semester ${s.semester}`;
  $("#periodPill").textContent = `${s.academicYear} · Semester ${s.semester}`;
  $("#settingsLogoPreview").src = s.logoUrl || defaultSettings.logoUrl;
}

async function loadSettings() {
  const refDoc = doc(db, "settings", "school");
  const snap = await getDoc(refDoc);
  if (!snap.exists()) {
    await setDoc(refDoc, {...defaultSettings, createdAt: serverTimestamp()});
    state.settings = {...defaultSettings};
  } else {
    state.settings = {...defaultSettings, ...snap.data()};
  }
  // Samakan format periode lama (mis. 2025-2026 / GANJIL) dengan format aplikasi (2025/2026 / 1).
  state.settings.academicYear = normalizeAcademicYear(state.settings.academicYear) || defaultSettings.academicYear;
  state.settings.semester = normalizeSemester(state.settings.semester) || defaultSettings.semester;
  populateSettingsForm();
  updateHeader();
}

async function loadData() {
  const [studentSnap, reportSnap] = await Promise.all([
    getDocs(collection(db, "students")),
    getDocs(collection(db, "reports"))
  ]);
  state.students = studentSnap.docs.map(d => ({id:d.id, ...d.data()})).sort((a,b)=>(a.name||"").localeCompare(b.name||"", "id"));
  // Normalisasi semua dokumen report agar format lama dan V2 dibaca dengan cara yang sama.
  state.reports = reportSnap.docs.map(d => normalizeReportDoc(d.id, d.data()));
  renderAll();
}

function renderAll() {
  renderStudents();
  renderGrades();
  renderStats();
  renderClassFilter();
}

function renderStats() {
  $("#statStudents").textContent = state.students.length;
  // Hitung per siswa agar dokumen lama + V2 untuk periode yang sama tidak terhitung dua kali.
  $("#statReports").textContent = state.students.filter(s => reportHasAnyScore(currentReport(s.id))).length;
  $("#statClasses").textContent = new Set(state.students.map(s=>s.className).filter(Boolean)).size;
}

function filteredStudents(searchInput) {
  const q = String(searchInput || "").toLowerCase().trim();
  if (!q) return state.students;
  return state.students.filter(s => [s.name,s.nis,s.nisn,s.className,s.address].some(v => String(v||"").toLowerCase().includes(q)));
}

function renderStudents() {
  const rows = filteredStudents($("#studentSearch")?.value);
  const body = $("#studentsBody");
  body.innerHTML = rows.map((s,i)=>`
    <tr>
      <td>${i+1}</td><td><b>${escapeHtml(s.name)}</b></td><td>${escapeHtml(s.nis||"-")}</td><td>${escapeHtml(s.nisn||"-")}</td>
      <td>${escapeHtml(s.className||"-")}</td><td>${escapeHtml(s.address||"-")}</td>
      <td><div class="row-actions">
        <button class="mini" data-edit-student="${s.id}">Edit</button>
        <button class="mini primary" data-grade-student="${s.id}">Nilai</button>
        <button class="mini danger" data-delete-student="${s.id}">Hapus</button>
      </div></td>
    </tr>`).join("");
  $("#studentEmpty").style.display = rows.length ? "none" : "block";
}

function renderGrades() {
  const q = $("#gradeSearch")?.value || "";
  const className = $("#classFilter")?.value || "";
  let rows = filteredStudents(q);
  if (className) rows = rows.filter(s => s.className === className);
  $("#gradesBody").innerHTML = rows.map((s,i)=>{
    const r = currentReport(s.id);
    const avg = reportAverage(r);
    const filled = r && SUBJECTS.some(sub => r.grades?.[sub.code] !== "" && r.grades?.[sub.code] != null);
    return `<tr>
      <td>${i+1}</td><td><b>${escapeHtml(s.name)}</b><br><small>${escapeHtml(s.nisn||s.nis||"")}</small></td>
      <td>${escapeHtml(s.className||"-")}</td><td>${avg==null?"-":avg.toFixed(1)}</td>
      <td><span class="badge ${filled?"ok":"warn"}">${filled?"Sudah diisi":"Belum lengkap"}</span></td>
      <td><div class="row-actions"><button class="mini primary" data-grade-student="${s.id}">Input/Edit</button><button class="mini" data-print-student="${s.id}" ${filled?"":"disabled"}>Pratinjau/Cetak</button></div></td>
    </tr>`;
  }).join("");
  $("#gradeEmpty").style.display = rows.length ? "none" : "block";
}

function renderClassFilter() {
  const sel = $("#classFilter");
  const current = sel.value;
  const classes = [...new Set(state.students.map(s=>s.className).filter(Boolean))].sort();
  sel.innerHTML = `<option value="">Semua kelas</option>` + classes.map(c=>`<option>${escapeHtml(c)}</option>`).join("");
  if (classes.includes(current)) sel.value = current;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
}

function openModal(id) { $("#"+id).classList.remove("hidden"); document.body.style.overflow="hidden"; }
function closeModal(id) { $("#"+id).classList.add("hidden"); document.body.style.overflow=""; }

function populateSettingsForm() {
  const s = state.settings;
  const map = {
    schoolName:"schoolName", schoolAddress:"schoolAddress", schoolCity:"schoolCity", reportDate:"reportDate",
    academicYear:"academicYear", semester:"semester", defaultPhase:"defaultPhase", defaultClass:"defaultClass",
    homeroomName:"homeroomName", homeroomNip:"homeroomNip", principalName:"principalName", principalNip:"principalNip", ministryName:"ministryName"
  };
  Object.entries(map).forEach(([key,id]) => $("#"+id).value = s[key] ?? "");
}

function studentFormData() {
  return {
    name: $("#sName").value.trim(), nis: $("#sNis").value.trim(), nisn: $("#sNisn").value.trim(),
    className: $("#sClass").value.trim() || state.settings.defaultClass, phase: $("#sPhase").value.trim() || state.settings.defaultPhase,
    birthPlace: $("#sBirthPlace").value.trim(), birthDate: $("#sBirthDate").value, gender: $("#sGender").value,
    religion: $("#sReligion").value.trim(), familyStatus: $("#sFamilyStatus").value.trim(), childNo: $("#sChildNo").value,
    phone: $("#sPhone").value.trim(), address: $("#sAddress").value.trim(), previousSchool: $("#sPreviousSchool").value.trim(), acceptedDate: $("#sAcceptedDate").value,
    fatherName: $("#sFather").value.trim(), motherName: $("#sMother").value.trim(), fatherJob: $("#sFatherJob").value.trim(), motherJob: $("#sMotherJob").value.trim(),
    parentAddress: $("#sParentAddress").value.trim(), parentPhone: $("#sParentPhone").value.trim(), guardianName: $("#sGuardian").value.trim(),
    guardianPhone: $("#sGuardianPhone").value.trim(), guardianJob: $("#sGuardianJob").value.trim(), guardianAddress: $("#sGuardianAddress").value.trim()
  };
}

function resetStudentForm() {
  $("#studentForm").reset();
  $("#studentId").value = "";
  $("#sClass").value = state.settings.defaultClass || "VII A";
  $("#sPhase").value = state.settings.defaultPhase || "D";
  $("#sReligion").value = "Islam";
  $("#sFamilyStatus").value = "Anak";
  $("#studentModalTitle").textContent = "Tambah Siswa";
}

function editStudent(id) {
  const s = state.students.find(x=>x.id===id); if (!s) return;
  const vals = {
    studentId:id,sName:s.name,sNis:s.nis,sNisn:s.nisn,sClass:s.className,sPhase:s.phase,sBirthPlace:s.birthPlace,sBirthDate:s.birthDate,sGender:s.gender,
    sReligion:s.religion,sFamilyStatus:s.familyStatus,sChildNo:s.childNo,sPhone:s.phone,sAddress:s.address,sPreviousSchool:s.previousSchool,sAcceptedDate:s.acceptedDate,
    sFather:s.fatherName,sMother:s.motherName,sFatherJob:s.fatherJob,sMotherJob:s.motherJob,sParentAddress:s.parentAddress,sParentPhone:s.parentPhone,
    sGuardian:s.guardianName,sGuardianPhone:s.guardianPhone,sGuardianJob:s.guardianJob,sGuardianAddress:s.guardianAddress
  };
  Object.entries(vals).forEach(([id,v])=>{ const el=$("#"+id); if(el) el.value=v??""; });
  $("#studentModalTitle").textContent = "Edit Data Siswa";
  openModal("studentModal");
}

function buildSubjectInputs() {
  $("#subjectInputs").innerHTML = SUBJECTS.map((sub,i)=>`
    <div class="subject-row">
      <div class="subject-name">
        <b>${i+1}. ${escapeHtml(sub.name)}</b>
        <small>Kode: ${sub.code}</small>
      </div>
      <label class="score-box">Nilai
        <input id="score_${sub.code}" data-score-code="${sub.code}" type="number" min="0" max="100" step="1" placeholder="0-100">
      </label>
      <label class="competency-box">Capaian Kompetensi
        <textarea id="comp_${sub.code}" data-comp-code="${sub.code}" rows="3" placeholder="Otomatis mengikuti nilai, tetapi dapat diedit."></textarea>
        <button type="button" class="mini reset-competency" data-reset-comp="${sub.code}">Gunakan teks otomatis</button>
      </label>
    </div>
  `).join("");

  SUBJECTS.forEach(sub => {
    const scoreEl = $("#score_"+sub.code);
    const compEl = $("#comp_"+sub.code);
    scoreEl.addEventListener("input", () => {
      const auto = autoCompetencyFor(sub, scoreEl.value);
      if (compEl.dataset.manual !== "1" || !compEl.value.trim()) {
        compEl.value = auto;
        compEl.dataset.lastAuto = auto;
        compEl.dataset.manual = "0";
      }
    });
    compEl.addEventListener("input", () => {
      const auto = autoCompetencyFor(sub, scoreEl.value);
      compEl.dataset.manual = compEl.value.trim() && compEl.value.trim() !== auto.trim() ? "1" : "0";
      compEl.dataset.lastAuto = auto;
    });
  });

  $("#subjectInputs").addEventListener("click", e => {
    const btn = e.target.closest("[data-reset-comp]");
    if (!btn) return;
    const code = btn.dataset.resetComp;
    const sub = SUBJECTS.find(x => x.code === code);
    if (!sub) return;
    const scoreEl = $("#score_"+code);
    const compEl = $("#comp_"+code);
    const auto = autoCompetencyFor(sub, scoreEl.value);
    compEl.value = auto;
    compEl.dataset.lastAuto = auto;
    compEl.dataset.manual = "0";
  });
}

function openGrade(id) {
  const s = state.students.find(x=>x.id===id); if (!s) return;
  const r = currentReport(id) || {};
  $("#gradeStudentId").value = id;
  $("#gradeModalTitle").textContent = "Input / Edit Nilai & Capaian Kompetensi";
  $("#gradeStudentInfo").textContent = `${s.name} · ${s.className || "-"} · ${state.settings.academicYear} Semester ${state.settings.semester}`;
  SUBJECTS.forEach(sub => {
    const scoreValue = r.grades?.[sub.code] ?? "";
    const scoreEl = $("#score_"+sub.code);
    const compEl = $("#comp_"+sub.code);
    scoreEl.value = scoreValue;
    const auto = autoCompetencyFor(sub, scoreValue);
    const saved = r.competencies?.[sub.code];
    compEl.value = saved != null && String(saved).trim() ? saved : auto;
    compEl.dataset.lastAuto = auto;
    compEl.dataset.manual = saved != null && String(saved).trim() && String(saved).trim() !== auto.trim() ? "1" : "0";
  });
  $("#gSpiritual").value = r.spiritual || defaultReportExtras.spiritual;
  $("#gSocial").value = r.social || defaultReportExtras.social;
  $("#gScout").value = r.scout || defaultReportExtras.scout;
  $("#gSick").value = r.attendance?.sick ?? 0;
  $("#gPermit").value = r.attendance?.permit ?? 0;
  $("#gAbsent").value = r.attendance?.absent ?? 0;
  $("#gNote").value = r.teacherNote || defaultReportExtras.teacherNote;
  openModal("gradeModal");
}

function validateScores() {
  for (const sub of SUBJECTS) {
    const val = $("#score_"+sub.code).value;
    if (val === "") continue;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`Nilai ${sub.name} harus 0–100.`);
  }
}

async function saveGrade() {
  validateScores();
  const studentId = $("#gradeStudentId").value;
  const student = state.students.find(s=>s.id===studentId);
  if (!student) throw new Error("Data siswa tidak ditemukan.");
  const grades = {};
  const competencies = {};
  SUBJECTS.forEach(sub => {
    const v = $("#score_"+sub.code).value;
    grades[sub.code] = v === "" ? "" : Number(v);
    const custom = $("#comp_"+sub.code).value.trim();
    competencies[sub.code] = custom || autoCompetencyFor(sub, v);
  });
  const data = {
    studentId, studentName: student.name, className: student.className || state.settings.defaultClass, phase: student.phase || state.settings.defaultPhase,
    academicYear: state.settings.academicYear, semester: String(state.settings.semester), grades, competencies,
    spiritual: $("#gSpiritual").value.trim(), social: $("#gSocial").value.trim(), scout: $("#gScout").value.trim(),
    attendance: {sick:Number($("#gSick").value||0), permit:Number($("#gPermit").value||0), absent:Number($("#gAbsent").value||0)},
    teacherNote: $("#gNote").value.trim(), updatedAt: serverTimestamp()
  };
  const id = periodKey(studentId);
  await setDoc(doc(db,"reports",id), data, {merge:true});
  const oldIndex = state.reports.findIndex(r=>r.id===id);
  const localData = normalizeReportDoc(id, {...data, updatedAt:null});
  if (oldIndex>=0) state.reports[oldIndex] = localData; else state.reports.push(localData);
  renderGrades(); renderStats();
  return id;
}

async function openPrint(studentId) {
  // Buka tab segera supaya tidak diblokir popup browser saat kita menunggu Firebase.
  const win = window.open("about:blank", "_blank");
  try {
    await ensureCanonicalReport(studentId);
    const url = `report.html?student=${encodeURIComponent(studentId)}&year=${encodeURIComponent(normalizeAcademicYear(state.settings.academicYear))}&semester=${encodeURIComponent(normalizeSemester(state.settings.semester))}`;
    if (win) win.location.href = url; else window.location.href = url;
  } catch (err) {
    if (win) win.close();
    throw err;
  }
}

function normalizeKeys(row) {
  const out={};
  Object.entries(row||{}).forEach(([k,v]) => out[String(k).trim().toUpperCase().replace(/\s+/g,"_")] = v);
  return out;
}

function normalizeDate(v) {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0,10);
  if (typeof v === "number" && window.XLSX?.SSF) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const s = String(v).trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) { const [y,m,d]=s.split("-"); return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}$/.test(s)) { const [d,m,y]=s.split(/[\/-]/); return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`; }
  return s;
}

function scoreOrBlank(v, label, errors, rowNo) {
  if (v === "" || v == null) return "";
  const n=Number(v);
  if (!Number.isFinite(n) || n<0 || n>100) { errors.push(`Baris Nilai ${rowNo}: ${label} bukan nilai 0–100.`); return ""; }
  return n;
}

function parseExcelFile(file) {
  return new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb = XLSX.read(e.target.result, {type:"array", cellDates:true});
        const siswaSheet = wb.Sheets["Siswa"];
        const nilaiSheet = wb.Sheets["Nilai"];
        if (!siswaSheet || !nilaiSheet) throw new Error("File wajib memiliki sheet bernama Siswa dan Nilai.");
        const siswa = XLSX.utils.sheet_to_json(siswaSheet, {defval:""}).map(normalizeKeys);
        const nilai = XLSX.utils.sheet_to_json(nilaiSheet, {defval:""}).map(normalizeKeys);
        resolve({fileName:file.name, siswa, nilai});
      } catch(err) { reject(err); }
    };
    reader.onerror = ()=>reject(new Error("File tidak dapat dibaca."));
    reader.readAsArrayBuffer(file);
  });
}

async function importToFirebase(data) {
  const errors=[];
  const studentOps=[];
  const reportOps=[];
  const index = new Map();
  state.students.forEach(s=>{ if(s.nis) index.set(`NIS:${String(s.nis).trim()}`,s.id); if(s.nisn) index.set(`NISN:${String(s.nisn).trim()}`,s.id); });

  data.siswa.forEach((r,idx)=>{
    const row=idx+2, nis=String(r.NIS||"").trim(), nisn=String(r.NISN||"").trim(), name=String(r.NAMA||"").trim();
    if (!name) { errors.push(`Baris Siswa ${row}: NAMA kosong.`); return; }
    if (!nis && !nisn) { errors.push(`Baris Siswa ${row}: NIS atau NISN wajib diisi.`); return; }
    let id = (nisn && index.get(`NISN:${nisn}`)) || (nis && index.get(`NIS:${nis}`)) || safeId(nisn || nis);
    if (!id) { errors.push(`Baris Siswa ${row}: identitas tidak valid.`); return; }
    const student={
      name, nis, nisn, birthPlace:String(r.TEMPAT_LAHIR||"").trim(), birthDate:normalizeDate(r.TANGGAL_LAHIR), gender:String(r.JENIS_KELAMIN||"Laki-laki").trim(),
      religion:String(r.AGAMA||"Islam").trim(), familyStatus:String(r.STATUS_KELUARGA||"Anak").trim(), childNo:String(r.ANAK_KE||"").trim(), address:String(r.ALAMAT||"").trim(),
      phone:String(r.TELEPON||"").trim(), previousSchool:String(r.SEKOLAH_ASAL||"").trim(), className:String(r.KELAS||state.settings.defaultClass).trim(), phase:String(r.FASE||state.settings.defaultPhase).trim(),
      acceptedDate:normalizeDate(r.TANGGAL_DITERIMA), fatherName:String(r.NAMA_AYAH||"").trim(), motherName:String(r.NAMA_IBU||"").trim(), parentAddress:String(r.ALAMAT_ORANG_TUA||"").trim(),
      parentPhone:String(r.TELEPON_ORANG_TUA||"").trim(), fatherJob:String(r.PEKERJAAN_AYAH||"").trim(), motherJob:String(r.PEKERJAAN_IBU||"").trim(), guardianName:String(r.NAMA_WALI||"").trim(),
      guardianAddress:String(r.ALAMAT_WALI||"").trim(), guardianPhone:String(r.TELEPON_WALI||"").trim(), guardianJob:String(r.PEKERJAAN_WALI||"").trim(), updatedAt:serverTimestamp()
    };
    if(nis) index.set(`NIS:${nis}`,id); if(nisn) index.set(`NISN:${nisn}`,id);
    studentOps.push({id,data:student});
  });

  data.nilai.forEach((r,idx)=>{
    const row=idx+2, nis=String(r.NIS||"").trim(), nisn=String(r.NISN||"").trim();
    const studentId=(nisn&&index.get(`NISN:${nisn}`))||(nis&&index.get(`NIS:${nis}`));
    if(!studentId){errors.push(`Baris Nilai ${row}: siswa dengan NIS/NISN tersebut tidak ditemukan.`);return;}
    const studentNew=studentOps.find(x=>x.id===studentId)?.data;
    const studentOld=state.students.find(x=>x.id===studentId);
    const student=studentNew||studentOld||{};
    const academicYear=normalizeAcademicYear(String(r.TAHUN_PELAJARAN||state.settings.academicYear).trim());
    const semester=normalizeSemester(String(r.SEMESTER||state.settings.semester).trim());
    const grades={};
    const competencies={};
    SUBJECTS.forEach(sub=>{
      grades[sub.code]=scoreOrBlank(r[sub.code],sub.code,errors,row);
      const custom=String(r[`CK_${sub.code}`]||"").trim();
      competencies[sub.code]=custom || autoCompetencyFor(sub, grades[sub.code]);
    });
    const report={studentId,studentName:student.name||"",className:student.className||state.settings.defaultClass,phase:student.phase||state.settings.defaultPhase,academicYear,semester,grades,competencies,
      spiritual:String(r.SPIRITUAL||defaultReportExtras.spiritual).trim(), social:String(r.SOSIAL||defaultReportExtras.social).trim(), scout:String(r.PRAMUKA||defaultReportExtras.scout).trim(),
      attendance:{sick:Number(r.SAKIT||0),permit:Number(r.IZIN||0),absent:Number(r.ALFA||0)}, teacherNote:String(r.CATATAN_WALI||defaultReportExtras.teacherNote).trim(), updatedAt:serverTimestamp()};
    reportOps.push({id:periodKey(studentId,academicYear,semester),data:report});
  });

  if(errors.length) throw new Error(errors.slice(0,12).join("\n") + (errors.length>12?`\n...dan ${errors.length-12} kesalahan lain.`:""));
  const ops=[...studentOps.map(x=>({path:"students",...x})),...reportOps.map(x=>({path:"reports",...x}))];
  for(let i=0;i<ops.length;i+=400){
    const batch=writeBatch(db); ops.slice(i,i+400).forEach(op=>batch.set(doc(db,op.path,op.id),op.data,{merge:true})); await batch.commit();
  }
  await loadData();
  return {students:studentOps.length,reports:reportOps.length};
}

function downloadTemplate() {
  const siswaHeaders=["NIS","NISN","NAMA","TEMPAT_LAHIR","TANGGAL_LAHIR","JENIS_KELAMIN","AGAMA","STATUS_KELUARGA","ANAK_KE","ALAMAT","TELEPON","SEKOLAH_ASAL","KELAS","FASE","TANGGAL_DITERIMA","NAMA_AYAH","NAMA_IBU","ALAMAT_ORANG_TUA","TELEPON_ORANG_TUA","PEKERJAAN_AYAH","PEKERJAAN_IBU","NAMA_WALI","ALAMAT_WALI","TELEPON_WALI","PEKERJAAN_WALI"];
  const nilaiHeaders=["NIS","NISN","SEMESTER","TAHUN_PELAJARAN",...SUBJECTS.map(s=>s.code),...SUBJECTS.map(s=>`CK_${s.code}`),"SPIRITUAL","SOSIAL","PRAMUKA","SAKIT","IZIN","ALFA","CATATAN_WALI"];
  const wb=XLSX.utils.book_new();
  const ws1=XLSX.utils.aoa_to_sheet([siswaHeaders]);
  const ws2=XLSX.utils.aoa_to_sheet([nilaiHeaders]);
  const petunjuk=[
    ["PETUNJUK IMPORT RAPOR DIGITAL"],
    ["1","Jangan ganti nama sheet Siswa dan Nilai."],
    ["2","NIS atau NISN wajib diisi. Gunakan identitas yang sama pada kedua sheet."],
    ["3","Tanggal disarankan format YYYY-MM-DD, contoh 2013-12-16."],
    ["4","Nilai 0 sampai 100. Boleh dikosongkan jika belum ada."],
    ["5","Kode mapel: "+SUBJECTS.map(s=>`${s.code}=${s.name}`).join("; ")],
    ["6","Kolom CK_KODE_MAPEL bersifat opsional. Kosongkan agar capaian kompetensi dibuat otomatis dari nilai, atau isi teks sendiri bila kelas/semester membutuhkan capaian berbeda."],
    ["7","Jika NIS/NISN sudah ada di Firebase, data akan diperbarui, bukan digandakan."]
  ];
  const ws3=XLSX.utils.aoa_to_sheet(petunjuk);
  ws1["!cols"]=siswaHeaders.map(h=>({wch:Math.max(12,Math.min(24,h.length+3))}));
  ws2["!cols"]=nilaiHeaders.map(h=>({wch:Math.max(10,Math.min(22,h.length+3))}));
  ws3["!cols"]=[{wch:8},{wch:100}];
  XLSX.utils.book_append_sheet(wb,ws1,"Siswa"); XLSX.utils.book_append_sheet(wb,ws2,"Nilai"); XLSX.utils.book_append_sheet(wb,ws3,"Petunjuk");
  XLSX.writeFile(wb,"Template-Import-Rapor.xlsx");
}

async function initApp() {
  buildSubjectInputs();
  if(!firebaseReady){ $("#firebaseWarning").classList.remove("hidden"); $("#statFirebase").textContent="Belum dikonfigurasi"; }

  $$(".nav-btn").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
  $$('[data-go]').forEach(b=>b.addEventListener("click",()=>setView(b.dataset.go)));
  $("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#quickAddBtn").addEventListener("click",()=>{resetStudentForm();openModal("studentModal")});
  $("#addStudentBtn").addEventListener("click",()=>{resetStudentForm();openModal("studentModal")});
  $$(".modal-close").forEach(b=>b.addEventListener("click",()=>closeModal(b.dataset.close)));
  $$(".modal").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));
  $("#studentSearch").addEventListener("input",renderStudents);
  $("#gradeSearch").addEventListener("input",renderGrades);
  $("#classFilter").addEventListener("change",renderGrades);

  $("#loginForm").addEventListener("submit",async e=>{
    e.preventDefault(); if(!firebaseReady){toast("Isi firebase-config.js terlebih dahulu.","error");return;}
    try{ await signInWithEmailAndPassword(auth,$("#loginEmail").value.trim(),$("#loginPassword").value); }
    catch(err){ console.error(err); toast("Login gagal. Periksa email, password, dan pengaturan Firebase Authentication.","error"); }
  });
  $("#logoutBtn").addEventListener("click",()=>signOut(auth));

  $("#studentForm").addEventListener("submit",async e=>{
    e.preventDefault();
    try{
      const data=studentFormData(); if(!data.nis&&!data.nisn) throw new Error("NIS atau NISN wajib diisi.");
      const editing=$("#studentId").value;
      const dup=state.students.find(s=>s.id!==editing&&((data.nisn&&s.nisn===data.nisn)||(data.nis&&s.nis===data.nis)));
      if(dup) throw new Error(`NIS/NISN sudah dipakai oleh ${dup.name}.`);
      const id=editing||safeId(data.nisn||data.nis);
      await setDoc(doc(db,"students",id),{...data,updatedAt:serverTimestamp()},{merge:true});
      closeModal("studentModal"); await loadData(); toast(editing?"Data siswa diperbarui.":"Siswa berhasil ditambahkan.");
    }catch(err){toast(err.message||"Gagal menyimpan siswa.","error")}
  });

  $("#studentsBody").addEventListener("click",async e=>{
    const edit=e.target.closest("[data-edit-student]"); const grade=e.target.closest("[data-grade-student]"); const del=e.target.closest("[data-delete-student]");
    if(edit) editStudent(edit.dataset.editStudent);
    if(grade) openGrade(grade.dataset.gradeStudent);
    if(del){
      const id=del.dataset.deleteStudent, s=state.students.find(x=>x.id===id); if(!s)return;
      if(confirm(`Hapus ${s.name} beserta data rapornya?`)){
        try{const batch=writeBatch(db);batch.delete(doc(db,"students",id));state.reports.filter(r=>r.studentId===id).forEach(r=>batch.delete(doc(db,"reports",r.id)));await batch.commit();await loadData();toast("Data siswa dihapus.");}catch(err){toast("Gagal menghapus data.","error")}
      }
    }
  });
  $("#gradesBody").addEventListener("click",async e=>{
    const grade=e.target.closest("[data-grade-student]"); const print=e.target.closest("[data-print-student]");
    if(grade) openGrade(grade.dataset.gradeStudent);
    if(print&&!print.disabled){
      try { await openPrint(print.dataset.printStudent); }
      catch(err){ console.error(err); toast(err.message||"Gagal membuka pratinjau rapor.","error"); }
    }
  });

  $("#gradeForm").addEventListener("submit",async e=>{e.preventDefault();try{await saveGrade();closeModal("gradeModal");toast("Nilai berhasil disimpan. Capaian kompetensi akan menyesuaikan otomatis.");}catch(err){toast(err.message||"Gagal menyimpan nilai.","error")}});
  $("#saveAndPrintBtn").addEventListener("click",async()=>{
    const studentId=$("#gradeStudentId").value; const win=window.open("about:blank","_blank");
    try{await saveGrade();closeModal("gradeModal");const url=`report.html?student=${encodeURIComponent(studentId)}&year=${encodeURIComponent(state.settings.academicYear)}&semester=${encodeURIComponent(state.settings.semester)}`;if(win)win.location=url;else window.location.href=url;toast("Nilai disimpan. Membuka pratinjau rapor.");}catch(err){if(win)win.close();toast(err.message||"Gagal menyimpan nilai.","error")}
  });

  $("#schoolLogoFile").addEventListener("change", async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const preview = await compressLogoToDataUrl(file);
      $("#settingsLogoPreview").src = preview;
    } catch (err) {
      e.target.value = "";
      $("#settingsLogoPreview").src = state.settings.logoUrl || defaultSettings.logoUrl;
      toast(err.message || "Logo tidak dapat diproses.", "error");
    }
  });

  $("#settingsForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const saveBtn = $("#saveSettingsBtn") || e.submitter;
    const oldText = saveBtn?.textContent || "Simpan Pengaturan";
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = "Menyimpan..."; }
    try{
      const logoFile=$("#schoolLogoFile").files[0];
      let logoUrl=state.settings.logoUrl||defaultSettings.logoUrl;
      if(logoFile){
        logoUrl = await compressLogoToDataUrl(logoFile);
      }
      const data={
        schoolName:$("#schoolName").value.trim(),
        schoolAddress:$("#schoolAddress").value.trim(),
        schoolCity:$("#schoolCity").value.trim(),
        reportDate:$("#reportDate").value,
        academicYear:normalizeAcademicYear($("#academicYear").value.trim()),
        semester:normalizeSemester($("#semester").value),
        defaultPhase:$("#defaultPhase").value.trim(),
        defaultClass:$("#defaultClass").value.trim(),
        homeroomName:$("#homeroomName").value.trim(),
        homeroomNip:$("#homeroomNip").value.trim(),
        principalName:$("#principalName").value.trim(),
        principalNip:$("#principalNip").value.trim(),
        ministryName:$("#ministryName").value.trim(),
        logoUrl,
        updatedAt:serverTimestamp()
      };
      if(!data.schoolName) throw new Error("Nama sekolah wajib diisi.");
      if(!data.academicYear) throw new Error("Tahun pelajaran wajib diisi.");
      await setDoc(doc(db,"settings","school"),data,{merge:true});
      state.settings={...state.settings,...data};
      $("#schoolLogoFile").value="";
      populateSettingsForm();
      updateHeader();
      renderAll();
      toast("Pengaturan sekolah berhasil disimpan.");
    }catch(err){
      console.error(err);
      toast(err.message||"Gagal menyimpan pengaturan.","error");
    }finally{
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = oldText; }
    }
  });

  $("#chooseExcelBtn").addEventListener("click",()=>$("#excelFile").click());
  $("#excelFile").addEventListener("change",async e=>{if(e.target.files[0])await handleExcel(e.target.files[0])});
  const dz=$("#dropZone");
  ["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("drag")}));
  ["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("drag")}));
  dz.addEventListener("drop",async e=>{const f=e.dataTransfer.files[0];if(f)await handleExcel(f)});
  $("#downloadTemplateBtn").addEventListener("click",downloadTemplate);
  $("#runImportBtn").addEventListener("click",async()=>{
    if(!state.importData)return;
    try{$("#runImportBtn").disabled=true;$("#runImportBtn").textContent="Mengimport...";const res=await importToFirebase(state.importData);toast(`Import selesai: ${res.students} data siswa dan ${res.reports} data nilai.`);state.importData=null;$("#importPreview").classList.add("hidden");$("#runImportBtn").classList.add("hidden");}
    catch(err){alert(err.message||"Import gagal.");toast("Import gagal. Periksa data Excel.","error")}
    finally{$("#runImportBtn").disabled=false;$("#runImportBtn").textContent="Import ke Firebase";}
  });
}

async function handleExcel(file){
  try{const data=await parseExcelFile(file);state.importData=data;$("#importPreview").innerHTML=`<b>${escapeHtml(data.fileName)}</b><br>${data.siswa.length} baris siswa · ${data.nilai.length} baris nilai.<br><small>Data baru disimpan setelah tombol “Import ke Firebase” ditekan.</small>`;$("#importPreview").classList.remove("hidden");$("#runImportBtn").classList.remove("hidden");toast("File Excel berhasil dibaca.");}
  catch(err){state.importData=null;$("#runImportBtn").classList.add("hidden");toast(err.message||"File Excel tidak valid.","error")}
}

await initApp();

if(firebaseReady){
  onAuthStateChanged(auth, async user=>{
    if(user){
      $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#userEmail").textContent=user.email||"Admin";
      try{await loadSettings();await loadData();$("#statFirebase").textContent="Online";}catch(err){console.error(err);$("#statFirebase").textContent="Error";toast("Gagal membaca Firebase. Periksa Firestore Rules dan koneksi.","error")}
    }else{$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden");}
  });
}
