export const SUBJECTS = [
  {
    code: "PAI",
    name: "Pendidikan Agama Islam dan Budi Pekerti",
    topic: "iman kepada qada dan qadar, sikap hormat dan patuh kepada orang tua dan guru, toleransi dalam kehidupan bermasyarakat, serta sejarah perkembangan Islam di Indonesia"
  },
  {
    code: "PANCASILA",
    name: "Pendidikan Pancasila",
    topic: "Pancasila sebagai ideologi negara, norma dan peraturan perundang-undangan, Bhinneka Tunggal Ika, serta peran warga negara dalam menjaga persatuan bangsa"
  },
  {
    code: "MATEMATIKA",
    name: "Matematika",
    topic: "kesebangunan dan kekongruenan, bangun ruang sisi lengkung (tabung, kerucut, dan bola), serta peluang dan statistika"
  },
  {
    code: "BINDO",
    name: "Bahasa Indonesia",
    topic: "menganalisis teks diskusi, menyusun teks ulasan atau eksposisi, serta menelaah unsur pembangun dan makna puisi"
  },
  {
    code: "IPA",
    name: "Ilmu Pengetahuan Alam",
    topic: "kemagnetan dan pemanfaatannya, bioteknologi, serta perubahan iklim dan pemanasan global"
  },
  {
    code: "IPS",
    name: "Ilmu Pengetahuan Sosial",
    topic: "kegiatan ekonomi dan perdagangan antarnegara, kerja sama internasional, serta dinamika kependudukan Indonesia"
  },
  {
    code: "BING",
    name: "Bahasa Inggris",
    topic: "narrative text berupa fabel dan legenda, news item, serta ungkapan menyampaikan pendapat"
  },
  {
    code: "PJOK",
    name: "Pendidikan Jasmani, Olahraga, dan Kesehatan",
    topic: "variasi dan kombinasi gerak permainan bola, senam lantai, aktivitas ritmik, serta pola hidup sehat dan kebugaran jasmani"
  },
  {
    code: "INFORMATIKA",
    name: "Informatika",
    topic: "algoritma dan pemrograman, dampak sosial informatika, serta praktik lintas bidang informatika"
  },
  {
    code: "SENI",
    name: "Seni dan Budaya",
    topic: "perencanaan dan penyelenggaraan pameran karya seni rupa, seni kriya, serta refleksi dan apresiasi karya"
  },
  {
    code: "MADURA",
    name: "Muatan Lokal: Bahasa Madura",
    topic: "membaca dan menulis aksara Carakan Madura, memahami tembhâng, serta menyusun teks narasi berbahasa Madura"
  },
  {
    code: "ASWAJA",
    name: "Aswaja",
    topic: "amaliah dan tradisi NU, prinsip tawasut, tasamuh, tawazun, dan i'tidal, serta keteladanan ulama Aswaja Nusantara"
  }
];

export function competencyFromScore(score, subject) {
  const n = Number(score);
  if (!Number.isFinite(n)) return "";

  const topic = subject?.topic || "capaian pembelajaran yang diujikan";

  if (n >= 90) return `Menunjukkan penguasaan yang sangat baik dalam ${topic}.`;
  if (n >= 80) return `Menunjukkan penguasaan yang baik dalam ${topic}.`;
  if (n >= 70) return `Menunjukkan penguasaan yang cukup dan terus berkembang dalam ${topic}.`;
  if (n >= 60) return `Perlu pendampingan dan peningkatan lebih lanjut dalam ${topic}.`;

  return `Memerlukan bimbingan dan pendampingan intensif untuk menguasai ${topic}.`;
}
