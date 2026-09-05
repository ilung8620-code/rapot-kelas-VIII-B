export const SUBJECTS = [
  {
    code: "PAI",
    name: "Pendidikan Agama Islam dan Budi Pekerti",
    topic: "adab menggunakan media sosial, rukhsah sebagai keringanan dalam beribadah, menghindari minuman keras, judi, dan pertengkaran, serta kemajuan ilmu pengetahuan pada masa Bani Abbasiyah"
  },
  {
    code: "PANCASILA",
    name: "Pendidikan Pancasila",
    topic: "keberagaman suku, agama, ras, dan antargolongan, kerja sama dalam berbagai bidang kehidupan, serta semangat menjaga keutuhan Negara Kesatuan Republik Indonesia"
  },
  {
    code: "MATEMATIKA",
    name: "Matematika",
    topic: "penerapan teorema Pythagoras, unsur dan luas permukaan serta volume bangun ruang sisi datar, dan penyajian data serta konsep peluang"
  },
  {
    code: "BINDO",
    name: "Bahasa Indonesia",
    topic: "menganalisis teks eksplanasi, menyusun teks ulasan dan teks persuasi, serta menelaah dan memerankan teks drama"
  },
  {
    code: "IPA",
    name: "Ilmu Pengetahuan Alam",
    topic: "tekanan zat dan penerapannya pada makhluk hidup, sistem pernapasan dan sistem ekskresi manusia, getaran, gelombang, dan bunyi, serta cahaya dan alat optik"
  },
  {
    code: "IPS",
    name: "Ilmu Pengetahuan Sosial",
    topic: "mobilitas sosial dan perubahan masyarakat, konflik serta integrasi sosial, perlawanan terhadap kolonialisme dan tumbuhnya pergerakan kebangsaan, serta pemberdayaan masyarakat"
  },
  {
    code: "BING",
    name: "Bahasa Inggris",
    topic: "descriptive text tentang tempat dan bangunan bersejarah, recount text pengalaman masa lampau (simple past tense), serta ungkapan memberi dan meminta informasi terkait suatu kejadian"
  },
  {
    code: "PJOK",
    name: "Pendidikan Jasmani, Olahraga, dan Kesehatan",
    topic: "variasi gerak dasar senam lantai, aktivitas gerak berirama, keterampilan dasar aktivitas air, serta pola hidup sehat dan pencegahan bahaya pergaulan bebas"
  },
  {
    code: "INFORMATIKA",
    name: "Informatika",
    topic: "analisis data menggunakan aplikasi lembar kerja, algoritma dan pemrograman visual berbasis blok, serta dampak sosial informatika dan praktik lintas bidang"
  },
  {
    code: "SENI",
    name: "Seni dan Budaya",
    topic: "konsep dan prosedur menggambar poster dan komik, pembuatan karya seni grafis dengan teknik cetak sederhana, serta apresiasi dan penyajian pameran karya seni rupa"
  },
  {
    code: "MADURA",
    name: "Muatan Lokal: Bahasa Madura",
    topic: "pemahaman cerita rakyat Madura (carèta ra'yat), penulisan dan pemaknaan parèbhasan serta tembhang macapat, serta praktik pacaturan sesuai onggu-onggu bhâsa"
  },
  {
    code: "ASWAJA",
    name: "Aswaja",
    topic: "amaliyah warga Nahdlatul Ulama (tahlil, istighotsah, dan ziarah kubur), tradisi keagamaan seperti maulid dan haul, serta sejarah berdirinya NU beserta lembaga dan badan otonomnya"
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
