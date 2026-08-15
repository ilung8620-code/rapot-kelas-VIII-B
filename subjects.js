export const SUBJECTS = [
  {
    code: "PAI",
    name: "Pendidikan Agama Islam dan Budi Pekerti",
    topic: "iman kepada kitab-kitab Allah, perilaku amanah dan jujur, tata cara salat sunah (gerhana, istiska, jenazah), serta sejarah ilmu pengetahuan masa Bani Umayyah"
  },
  {
    code: "PANCASILA",
    name: "Pendidikan Pancasila",
    topic: "kedudukan dan fungsi Pancasila, tata urutan peraturan perundang-undangan di Indonesia, serta kesadaran hukum dalam kehidupan berbangsa"
  },
  {
    code: "MATEMATIKA",
    name: "Matematika",
    topic: "penyederhanaan bentuk aljabar, konsep relasi dan fungsi, serta penyelesaian sistem persamaan linear dua variabel (SPLDV)"
  },
  {
    code: "BINDO",
    name: "Bahasa Indonesia",
    topic: "menganalisis teks laporan hasil observasi, merancang iklan, slogan, dan poster, serta menyusun artikel ilmiah populer"
  },
  {
    code: "IPA",
    name: "Ilmu Pengetahuan Alam",
    topic: "pengenalan sel, sistem pencernaan manusia, zat aditif dan adiktif, serta usaha, energi, dan pesawat sederhana"
  },
  {
    code: "IPS",
    name: "Ilmu Pengetahuan Sosial",
    topic: "kondisi geografis dan pelestarian sumber daya alam Indonesia, kemajemukan masyarakat, serta dinamika mobilitas sosial"
  },
  {
    code: "BING",
    name: "Bahasa Inggris",
    topic: "ungkapan meminta perhatian dan pendapat, menyatakan kemampuan dan kemauan (ability & willingness), serta teks instruksi atau larangan sederhana"
  },
  {
    code: "PJOK",
    name: "Pendidikan Jasmani, Olahraga, dan Kesehatan",
    topic: "variasi gerak spesifik permainan bola besar dan kecil, dasar seni beladiri (pencak silat), serta penyusunan program kebugaran jasmani"
  },
  {
    code: "INFORMATIKA",
    name: "Informatika",
    topic: "berpikir komputasional (fungsi dan himpunan), jaringan komputer lokal dan internet, serta penggunaan aplikasi perkantoran terintegrasi"
  },
  {
    code: "SENI",
    name: "Seni dan Budaya",
    topic: "konsep dan prosedur menggambar model berbagai bahan, pembuatan gambar ilustrasi, serta apresiasi karya seni rupa dua dimensi"
  },
  {
    code: "MADURA",
    name: "Muatan Lokal: Bahasa Madura",
    topic: "pemahaman cerita pendek (carèta pandha'), tembang macapat Madura, serta teknik wawancara dengan memperhatikan unggah-ungguh basa"
  },
  {
    code: "ASWAJA",
    name: "Aswaja",
    topic: "pengertian mazhab, konsep bermadzhab (taklid, ittiba', dan tarjih), serta pengenalan struktur keorganisasian IPNU dan IPPNU"
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
