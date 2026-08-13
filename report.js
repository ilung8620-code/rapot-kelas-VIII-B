import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";
import { SUBJECTS, competencyFromScore } from "./subjects.js";

const $=s=>document.querySelector(s);
const params=new URLSearchParams(location.search);
const studentId=params.get("student"), year=params.get("year"), semester=params.get("semester");
const defaultLogo="assets/logo-smp-al-miftah.png";

function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function safeId(value){return String(value||"").trim().replace(/[\/#?\[\]]/g,"-").replace(/\s+/g,"-").toLowerCase()}
function reportId(){return `${studentId}__${safeId(year)}__s${semester}`}
function semesterText(v){return String(v)==="1"?"1 (Satu)":"2 (Dua)"}
function fmtDateID(dateStr){if(!dateStr)return"-";const d=new Date(`${dateStr}T00:00:00`);if(Number.isNaN(d.getTime()))return dateStr;return new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"long",year:"numeric"}).format(d)}
function dash(v){return String(v??"").trim()||"-"}
function score(v){return v===""||v==null?"-":v}

function coverPage(school,student){return `
<section class="a4 cover cover-page">
  <h1 class="cover-title">LAPORAN HASIL BELAJAR PESERTA DIDIK SEKOLAH<br>MENENGAH PERTAMA (SMP)</h1>
  <img class="cover-logo" src="${esc(school.logoUrl||defaultLogo)}" alt="Logo sekolah">
  <div class="cover-student-box">Nama Peserta Didik<br><span class="name">${esc(student.name)}</span><br>NIS: ${esc(dash(student.nis))} &nbsp;&nbsp; NISN: ${esc(dash(student.nisn))}</div>
  <div class="cover-bottom">
    <div class="school">${esc(school.schoolName)}</div>
    <div>${esc(school.schoolAddress)}</div>
    <div class="ministry">${esc(school.ministryName)}<br>TAHUN PELAJARAN ${esc(year)}</div>
  </div>
</section>`}

function identityPage(school,student,report){return `
<section class="a4 identity-page">
  <h1 class="page-title">KETERANGAN TENTANG DIRI PESERTA DIDIK</h1>
  <table class="identity-list">
    ${row(1,"Nama Peserta Didik (Lengkap)",student.name)}
    ${row(2,"Nomor Induk/NISN",`${dash(student.nis)} / ${dash(student.nisn)}`)}
    ${row(3,"Tempat, Tanggal Lahir",`${dash(student.birthPlace)}, ${fmtDateID(student.birthDate)}`)}
    ${row(4,"Jenis Kelamin",student.gender)}
    ${row(5,"Agama",student.religion)}
    ${row(6,"Status dalam Keluarga",student.familyStatus)}
    ${row(7,"Anak ke",student.childNo)}
    ${row(8,"Alamat Peserta Didik",student.address)}
    ${row(9,"Nomor Telepon Rumah",student.phone)}
    ${row(10,"Sekolah Asal",student.previousSchool)}
    <tr><td class="num">11.</td><td class="label">Diterima di sekolah ini</td><td class="colon">:</td><td>-</td></tr>
    <tr><td></td><td class="label sub">Di kelas</td><td class="colon">:</td><td>${esc(dash(student.className||report.className))}</td></tr>
    <tr><td></td><td class="label sub">Pada tanggal</td><td class="colon">:</td><td>${esc(fmtDateID(student.acceptedDate))}</td></tr>
    <tr><td class="num">12.</td><td class="label">Nama Orang Tua</td><td class="colon">:</td><td>-</td></tr>
    <tr><td></td><td class="label sub">a. Ayah</td><td class="colon">:</td><td>${esc(dash(student.fatherName))}</td></tr>
    <tr><td></td><td class="label sub">b. Ibu</td><td class="colon">:</td><td>${esc(dash(student.motherName))}</td></tr>
    ${row(13,"Alamat Orang Tua",student.parentAddress||student.address)}
    ${row(14,"Nomor Telepon Rumah",student.parentPhone)}
    <tr><td class="num">15.</td><td class="label">Pekerjaan Orang Tua</td><td class="colon">:</td><td>-</td></tr>
    <tr><td></td><td class="label sub">a. Ayah</td><td class="colon">:</td><td>${esc(dash(student.fatherJob))}</td></tr>
    <tr><td></td><td class="label sub">b. Ibu</td><td class="colon">:</td><td>${esc(dash(student.motherJob))}</td></tr>
    ${row(16,"Nama Wali Siswa",student.guardianName)}
    ${row(17,"Alamat Wali Siswa",student.guardianAddress)}
    ${row(18,"Nomor Telepon Rumah",student.guardianPhone)}
    ${row(19,"Pekerjaan Wali Siswa",student.guardianJob)}
  </table>
  <div class="signature-one">${esc(school.schoolCity)} ${esc(fmtDateID(school.reportDate))}<br>Kepala Sekolah,<div class="space"></div><div class="sign-name">${esc(dash(school.principalName))}</div>NIP. ${esc(dash(school.principalNip))}</div>
</section>`}

function row(n,label,value){return `<tr><td class="num">${n}.</td><td class="label">${esc(label)}</td><td class="colon">:</td><td>${esc(dash(value))}</td></tr>`}

function meta(school,student,report){return `<div class="student-meta"><div>
  ${metaLine("Nama Peserta Didik",student.name)}${metaLine("NISN",student.nisn)}${metaLine("Sekolah",school.schoolName)}${metaLine("Alamat",student.address)}
</div><div>
  ${metaLine("Kelas",student.className||report.className)}${metaLine("Fase",student.phase||report.phase||school.defaultPhase)}${metaLine("Semester",semesterText(semester))}${metaLine("Tahun Pelajaran",year)}
</div></div>`}
function metaLine(label,value){return `<div class="meta-line"><span>${esc(label)}</span><span>:</span><b>${esc(dash(value))}</b></div>`}
function gradeHeader(){return `<thead><tr><th class="c-no">No</th><th class="c-subject">Muatan Pelajaran</th><th class="c-score">Nilai<br>Akhir</th><th>Capaian Kompetensi</th></tr></thead>`}
function gradeRow(index,sub,report){
  const v=report.grades?.[sub.code];
  const custom=String(report.competencies?.[sub.code]??"").trim();
  const competency=v===""||v==null?"-":(custom||competencyFromScore(v,sub));
  return `<tr><td class="c-no">${index+1}</td><td>${esc(sub.name)}</td><td class="c-score">${esc(score(v))}</td><td class="competency">${esc(competency)}</td></tr>`;
}

function gradesPage1(school,student,report){return `<section class="a4 grades-page grades-page-1">
  <h1 class="report-heading">LAPORAN HASIL BELAJAR<br>(RAPOR)</h1>${meta(school,student,report)}
  <table class="report-table grades-11">${gradeHeader()}<tbody>${SUBJECTS.slice(0,11).map((s,i)=>gradeRow(i,s,report)).join("")}</tbody></table>
</section>`}

function gradesPage2(school,student,report){const sub=SUBJECTS[11];return `<section class="a4 grades-page grades-page-2">
  <div class="p2-grade"><table class="report-table">${gradeHeader()}<tbody>${gradeRow(11,sub,report)}</tbody></table></div>
  <div class="p2-attitude">
    <div class="section-label">Sikap</div>
    <table class="simple-table attitude-table"><tbody><tr><td>Sikap Spiritual</td><td>${esc(dash(report.spiritual))}</td></tr><tr><td>Sikap Sosial</td><td>${esc(dash(report.social))}</td></tr></tbody></table>
  </div>
  <div class="p2-extra">
    <div class="section-label">Ekstrakurikuler</div>
    <table class="simple-table extra-table"><thead><tr><th>No</th><th>Ekstrakurikuler</th><th>Keterangan</th></tr></thead><tbody><tr><td class="center">1</td><td>Pramuka</td><td>${esc(dash(report.scout))}</td></tr><tr><td class="center">2</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
  </div>
  <div class="p2-attendance">
    <div class="section-label">Ketidakhadiran</div>
    <table class="simple-table attendance-table"><tbody><tr><td>Sakit</td><td>${Number(report.attendance?.sick||0)}</td><td>hari</td></tr><tr><td>Izin</td><td>${Number(report.attendance?.permit||0)}</td><td>hari</td></tr><tr><td>Tanpa Keterangan</td><td>${Number(report.attendance?.absent||0)}</td><td>hari</td></tr></tbody></table>
  </div>
  <div class="p2-note"><div class="section-label">Catatan Wali Kelas</div><div class="note-box">${esc(dash(report.teacherNote))}</div></div>
  <div class="signatures">
    <div class="sig-date">${esc(school.schoolCity)} ${esc(fmtDateID(school.reportDate))}</div>
    <div class="sig-top"><div class="sig">Orang Tua/Wali<div class="sig-space"></div><div>....................................</div></div><div class="sig">Wali Kelas<div class="sig-space"></div><div class="sig-name">${esc(dash(school.homeroomName))}</div><div>NIP. ${esc(dash(school.homeroomNip))}</div></div></div>
    <div class="sig sig-bottom">Mengetahui,<br>Kepala Sekolah<div class="sig-space"></div><div class="sig-name">${esc(dash(school.principalName))}</div><div>NIP. ${esc(dash(school.principalNip))}</div></div>
  </div>
</section>`}

async function load(){
  if(!studentId||!year||!semester)throw new Error("Parameter rapor tidak lengkap.");
  const [schoolSnap,studentSnap,reportSnap]=await Promise.all([getDoc(doc(db,"settings","school")),getDoc(doc(db,"students",studentId)),getDoc(doc(db,"reports",reportId()))]);
  if(!studentSnap.exists())throw new Error("Data siswa tidak ditemukan.");
  if(!reportSnap.exists())throw new Error("Data nilai untuk periode ini belum tersimpan.");
  const school=schoolSnap.exists()?schoolSnap.data():{}; const student=studentSnap.data(); const report=reportSnap.data();
  $("#pages").innerHTML=coverPage(school,student)+identityPage(school,student,report)+gradesPage1(school,student,report)+gradesPage2(school,student,report);
  $("#loading").classList.add("hidden"); $("#pages").classList.remove("hidden");
}

$("#printBtn").addEventListener("click",()=>window.print());
onAuthStateChanged(auth,user=>{if(user){load().catch(showError)}else{showError(new Error("Anda belum login. Buka aplikasi utama dan login terlebih dahulu."))}});
function showError(err){$("#loading").classList.add("hidden");$("#errorBox").textContent=err.message||"Rapor gagal dimuat.";$("#errorBox").classList.remove("hidden")}
