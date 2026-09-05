export const SUBJECTS = [
  {
    code: "PAI",
    name: "Pendidikan Agama Islam dan Budi Pekerti",
    topic: "adab bermedia sosial, rukhsah dalam ibadah, menjauhi minuman keras dan judi, serta ilmu pengetahuan masa Bani Abbasiyah"
  },
  {
    code: "PANCASILA",
    name: "Pendidikan Pancasila",
    topic: "keberagaman suku, agama, dan ras, kerja sama antarwarga, serta semangat menjaga keutuhan NKRI"
  },
  {
    code: "MATEMATIKA",
    name: "Matematika",
    topic: "teorema Pythagoras, bangun ruang sisi datar, serta penyajian data dan peluang"
  },
  {
    code: "BINDO",
    name: "Bahasa Indonesia",
    topic: "teks eksplanasi, teks ulasan, teks persuasi, serta menelaah dan memerankan teks drama"
  },
  {
    code: "IPA",
    name: "Ilmu Pengetahuan Alam",
    topic: "tekanan zat, sistem pernapasan dan ekskresi, getaran dan bunyi, serta cahaya dan alat optik"
  },
  {
    code: "IPS",
    name: "Ilmu Pengetahuan Sosial",
    topic: "mobilitas sosial, konflik dan integrasi sosial, serta perlawanan kolonialisme dan pergerakan kebangsaan"
  },
  {
    code: "BING",
    name: "Bahasa Inggris",
    topic: "descriptive text, recount text dengan simple past tense, serta ungkapan memberi dan meminta informasi"
  },
  {
    code: "PJOK",
    name: "Pendidikan Jasmani, Olahraga, dan Kesehatan",
    topic: "senam lantai, gerak berirama, aktivitas air, serta pola hidup sehat dan pencegahan pergaulan bebas"
  },
  {
    code: "INFORMATIKA",
    name: "Informatika",
    topic: "analisis data dengan lembar kerja, algoritma dan pemrograman visual, serta dampak sosial informatika"
  },
  {
    code: "SENI",
    name: "Seni dan Budaya",
    topic: "menggambar poster dan komik, seni grafis cetak sederhana, serta penyajian pameran karya seni rupa"
  },
  {
    code: "MADURA",
    name: "Muatan Lokal: Bahasa Madura",
    topic: "carèta ra'yat Madura, parèbhasan dan tembhang macapat, serta pacaturan sesuai onggu-onggu bhâsa"
  },
  {
    code: "ASWAJA",
    name: "Aswaja",
    topic: "amaliyah NU seperti tahlil dan ziarah kubur, tradisi maulid dan haul, serta sejarah dan lembaga NU"
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
