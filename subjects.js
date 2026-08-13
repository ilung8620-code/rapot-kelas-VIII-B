export const SUBJECTS = [
  {
    code: "PAI",
    name: "Pendidikan Agama Islam dan Budi Pekerti",
    topic: "akidah, ibadah, akhlak, sejarah Islam, serta penerapan nilai-nilai Islam dalam kehidupan sehari-hari"
  },
  {
    code: "PANCASILA",
    name: "Pendidikan Pancasila",
    topic: "nilai Pancasila, norma, hak dan kewajiban, musyawarah, keberagaman, serta sikap berkebinekaan"
  },
  {
    code: "MATEMATIKA",
    name: "Matematika",
    topic: "bilangan, aljabar, pengukuran, geometri, analisis data, serta penyelesaian masalah matematika"
  },
  {
    code: "BINDO",
    name: "Bahasa Indonesia",
    topic: "menyimak, membaca, menulis, berbicara, memirsa, serta memahami berbagai teks sesuai kaidah bahasa Indonesia"
  },
  {
    code: "IPA",
    name: "Ilmu Pengetahuan Alam",
    topic: "konsep makhluk hidup, ekosistem, zat, energi, bumi dan tata surya, pengamatan ilmiah, serta keterampilan berpikir sains"
  },
  {
    code: "IPS",
    name: "Ilmu Pengetahuan Sosial",
    topic: "kehidupan sosial, sejarah, geografi, ekonomi, interaksi antarmanusia, serta hubungan manusia dengan lingkungan"
  },
  {
    code: "BING",
    name: "Bahasa Inggris",
    topic: "kosakata, struktur kalimat, membaca, menulis, menyimak, berbicara, serta penggunaan bahasa Inggris sederhana"
  },
  {
    code: "PJOK",
    name: "Pendidikan Jasmani, Olahraga, dan Kesehatan",
    topic: "kebugaran jasmani, gerak dasar, permainan olahraga, aktivitas fisik, serta perilaku hidup sehat"
  },
  {
    code: "INFORMATIKA",
    name: "Informatika",
    topic: "berpikir komputasional, pengolahan data, algoritma, literasi digital, serta penggunaan teknologi secara bertanggung jawab"
  },
  {
    code: "SENI",
    name: "Seni dan Budaya (Seni Rupa)",
    topic: "apresiasi, ekspresi, kreativitas, dan keterampilan berkarya dalam seni musik, seni rupa, seni teater, atau seni tari"
  },
  {
    code: "MADURA",
    name: "Muatan Lokal: Bahasa Madura",
    topic: "kosakata, unggah-ungguh, membaca, menulis, berbicara, serta komunikasi sederhana dalam Bahasa Madura"
  },
  {
    code: "ASWAJA",
    name: "Aswaja",
    topic: "sejarah, amaliyah, tradisi, akhlak, serta nilai-nilai Ahlussunnah wal Jamaah"
  }
];

export function competencyFromScore(score, subject) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "";
  const topic = subject?.topic || "materi pembelajaran";
  if (n >= 90) return `menunjukkan pemahaman yang sangat baik dalam ${topic}.`;
  if (n >= 80) return `menunjukkan pemahaman yang baik dalam ${topic}.`;
  if (n >= 70) return `mulai menunjukkan pemahaman dalam ${topic}.`;
  if (n >= 60) return `perlu meningkatkan pemahaman dalam ${topic}.`;
  return `memerlukan bimbingan lebih lanjut untuk meningkatkan pemahaman dalam ${topic}.`;
}
