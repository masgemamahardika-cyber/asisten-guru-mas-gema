// ═══════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — RPP Super Lengkap
// ═══════════════════════════════

const UK = 'ag_users_v1';
const SK = 'ag_session_v1';
const API_URL = '/api/chat';
let currentUser = null;
let docxReady = false;

(function loadDocx() {
  const s = document.createElement('script');
  s.src = 'https://unpkg.com/docx@7.8.2/build/index.js';
  s.onload = () => { docxReady = true; };
  s.onerror = () => {
    const s2 = document.createElement('script');
    s2.src = 'https://cdn.jsdelivr.net/npm/docx@7.8.2/build/index.js';
    s2.onload = () => { docxReady = true; };
    document.head.appendChild(s2);
  };
  document.head.appendChild(s);
})();

const getUsers = () => { try { return JSON.parse(localStorage.getItem(UK) || '[]'); } catch { return []; } };
const saveUsers = u => localStorage.setItem(UK, JSON.stringify(u));
const getSession = () => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch { return null; } };
const saveSession = s => localStorage.setItem(SK, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(SK);

function authTab(t) {
  document.getElementById('form-login').style.display = t === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = t === 'register' ? 'block' : 'none';
  document.querySelectorAll('.atab').forEach((el, i) =>
    el.classList.toggle('active', (i === 0 && t === 'login') || (i === 1 && t === 'register'))
  );
}

function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  const err = document.getElementById('l-err');
  if (!email || !pass) { err.textContent = 'Email dan password wajib diisi.'; return; }
  const user = getUsers().find(u => u.email === email && u.password === pass);
  if (!user) { err.textContent = 'Email atau password salah.'; return; }
  err.textContent = '';
  saveSession(user);
  enterApp(user);
}

function doRegister() {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const jenjang = document.getElementById('r-jenjang').value;
  const pass = document.getElementById('r-pass').value;
  const err = document.getElementById('r-err');
  const ok = document.getElementById('r-ok');
  err.textContent = ''; ok.textContent = '';
  if (!name || !email || !pass) { err.textContent = 'Semua field wajib diisi.'; return; }
  if (pass.length < 6) { err.textContent = 'Password minimal 6 karakter.'; return; }
  const users = getUsers();
  if (users.find(u => u.email === email)) { err.textContent = 'Email sudah terdaftar.'; return; }
  const newUser = { name, email, jenjang, password: pass, plan: 'gratis', credits: 5, totalGen: 0 };
  users.push(newUser);
  saveUsers(users);
  ok.textContent = 'Berhasil daftar! Silakan masuk.';
  setTimeout(() => authTab('login'), 1200);
}

function enterApp(user) {
  currentUser = user;
  const av = user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('sb-av').textContent = av;
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-role').textContent = 'Guru ' + (user.jenjang || '');
  updatePlanUI();
  document.getElementById('wb-greeting').textContent = 'Halo, ' + user.name.split(' ')[0] + '! 👋';
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display = 'block';
  goPage('dashboard');
}

function doLogout() {
  clearSession();
  currentUser = null;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'block';
}

function updatePlanUI() {
  if (!currentUser) return;
  const isPrem = currentUser.plan === 'premium';
  const chip = document.getElementById('sb-plan');
  chip.textContent = isPrem ? 'Premium' : 'Gratis';
  chip.className = 'plan-chip' + (isPrem ? ' premium' : '');
  document.getElementById('sb-credit').textContent = isPrem ? '∞' : (currentUser.credits ?? 5);
}

function saveUserData() {
  if (!currentUser) return;
  const users = getUsers();
  const i = users.findIndex(u => u.email === currentUser.email);
  if (i > -1) { users[i] = { ...users[i], ...currentUser }; saveUsers(users); saveSession(users[i]); }
}

const PAGE_INFO = {
  dashboard: { title: 'Beranda', sub: 'Selamat datang di Asisten Guru by Mas Gema' },
  rpp: { title: 'Generator RPP', sub: 'Modul Ajar lengkap sesuai Kurikulum Merdeka' },
  soal: { title: 'Generator Soal', sub: 'Generate soal + kunci + pembahasan' },
  admin: { title: 'Asisten Administrasi', sub: 'Dokumen guru siap pakai dalam 1 klik' },
  pkb: { title: 'Laporan PKB', sub: 'Susun laporan pengembangan keprofesian' },
  upgrade: { title: 'Upgrade Premium', sub: 'Generate tanpa batas untuk semua tools' },
};

function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  [...document.querySelectorAll('.nav-item')].find(n => n.getAttribute('onclick') === `goPage('${id}')`)?.classList.add('active');
  const info = PAGE_INFO[id] || {};
  document.getElementById('tb-title').textContent = info.title || id;
  document.getElementById('tb-sub').textContent = info.sub || '';
}

function canGenerate() {
  if (!currentUser) return false;
  if (currentUser.plan === 'premium') return true;
  return (currentUser.credits ?? 5) > 0;
}

function useCredit() {
  if (!currentUser || currentUser.plan === 'premium') return;
  currentUser.credits = Math.max(0, (currentUser.credits ?? 5) - 1);
  currentUser.totalGen = (currentUser.totalGen || 0) + 1;
  saveUserData();
  updatePlanUI();
}

// Tentukan Fase berdasarkan kelas
function getFase(kelas) {
  if (kelas.includes('Kelas 1') || kelas.includes('Kelas 2')) return 'Fase A';
  if (kelas.includes('Kelas 3') || kelas.includes('Kelas 4')) return 'Fase B';
  if (kelas.includes('Kelas 5') || kelas.includes('Kelas 6')) return 'Fase C';
  if (kelas.includes('Kelas 7') || kelas.includes('Kelas 8') || kelas.includes('Kelas 9')) return 'Fase D';
  if (kelas.includes('Kelas 10')) return 'Fase E';
  if (kelas.includes('Kelas 11') || kelas.includes('Kelas 12')) return 'Fase F';
  return 'Fase D';
}

async function callAPI(prompt, system) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'HTTP ' + res.status);
  return data?.content?.[0]?.text || '';
}

// ═══════════════════════════════════════════════
//  PROMPT RPP SUPER LENGKAP - KURIKULUM MERDEKA
// ═══════════════════════════════════════════════
function buildRPPPrompt(mapel, kelas, kur, waktu, topik, tujuan) {
  const fase = getFase(kelas);

  if (kur === 'Kurikulum Merdeka') {
    return `Kamu adalah pakar pengembang kurikulum Indonesia berpengalaman 20 tahun. Buatkan MODUL AJAR Kurikulum Merdeka yang SANGAT LENGKAP berdasarkan SK BSKAP No. 032/H/KR/2024 untuk:

Mata Pelajaran : ${mapel}
Kelas          : ${kelas}
Fase           : ${fase}
Topik/Materi   : ${topik}
Alokasi Waktu  : ${waktu}
${tujuan ? 'Tujuan Khusus : ' + tujuan : ''}

Tulis dalam bahasa Indonesia baku. JANGAN gunakan simbol #, ##, **, *, ---. Gunakan HURUF KAPITAL untuk setiap judul bagian. Isi setiap bagian secara substantif dan detail.

====================================================
BAGIAN A: INFORMASI UMUM
====================================================

IDENTITAS MODUL
Nama Penyusun    : [Nama Guru]
Institusi        : [Nama Sekolah]
Tahun Penyusunan : 2024/2025
Mata Pelajaran   : ${mapel}
Fase / Kelas     : ${fase} / ${kelas}
Topik            : ${topik}
Alokasi Waktu    : ${waktu}

CAPAIAN PEMBELAJARAN (CP) - SK BSKAP No. 032/H/KR/2024
Tulis CP resmi ${mapel} untuk ${fase} berdasarkan SK BSKAP 032/H/KR/2024. Tulis narasi CP yang lengkap mencakup:
- CP Umum ${fase} untuk ${mapel}
- Elemen-elemen CP yang relevan dengan topik ${topik}

ALUR TUJUAN PEMBELAJARAN (ATP)
Tulis ATP yang menghubungkan CP dengan pembelajaran topik ${topik}

KOMPETENSI AWAL
Tuliskan 3-4 kompetensi prasyarat yang harus dimiliki siswa sebelum mempelajari ${topik}

PROFIL PELAJAR PANCASILA
Pilih 3 dimensi yang paling relevan dengan topik ${topik} dan jelaskan bagaimana setiap dimensi dikembangkan dalam pembelajaran ini:
1. [Dimensi 1]: [Penjelasan konkret keterkaitannya]
2. [Dimensi 2]: [Penjelasan konkret keterkaitannya]
3. [Dimensi 3]: [Penjelasan konkret keterkaitannya]

SARANA DAN PRASARANA
- Ruangan: [jenis ruangan]
- Media: [media pembelajaran yang dibutuhkan]
- Alat dan Bahan: [daftar lengkap]
- Sumber Belajar: [buku, website, video, dll]

TARGET PESERTA DIDIK
[Jelaskan target siswa: reguler/berkebutuhan khusus/berbakat, dan strategi diferensiasi]

MODEL DAN METODE PEMBELAJARAN
Model    : [PBL/PjBL/Discovery Learning/Inquiry - pilih yang paling sesuai]
Metode   : [diskusi kelompok, demonstrasi, tanya jawab, dll]
Pendekatan: Saintifik dengan diferensiasi

====================================================
BAGIAN B: KOMPONEN INTI
====================================================

TUJUAN PEMBELAJARAN
Berdasarkan CP ${fase} ${mapel}, tuliskan 4-5 tujuan pembelajaran yang:
- Menggunakan kata kerja operasional Bloom (C1-C6)
- Spesifik, terukur, dan dapat dicapai dalam ${waktu}
- Format: "Melalui [kegiatan], peserta didik mampu [kata kerja] [materi] dengan [kriteria keberhasilan]"

PEMAHAMAN BERMAKNA
[Tuliskan 2-3 kalimat tentang relevansi dan manfaat nyata topik ${topik} dalam kehidupan sehari-hari siswa]

PERTANYAAN PEMANTIK
Tulis 4 pertanyaan yang memancing rasa ingin tahu siswa tentang ${topik}:
1. [Pertanyaan berbasis pengalaman siswa]
2. [Pertanyaan berbasis fenomena nyata]
3. [Pertanyaan berbasis masalah]
4. [Pertanyaan yang menghubungkan dengan kehidupan]

PERSIAPAN PEMBELAJARAN
[Daftar lengkap hal yang perlu disiapkan guru sebelum pembelajaran]

====================================================
BAGIAN C: KEGIATAN PEMBELAJARAN
====================================================

KEGIATAN PEMBUKA (15 menit)
1. Orientasi: Salam, doa, dan pemeriksaan kehadiran
2. Apersepsi: [Cerita/pertanyaan yang menghubungkan dengan pengetahuan sebelumnya - tulis dengan detail]
3. Motivasi: [Cara guru memotivasi siswa - kaitkan dengan manfaat nyata topik]
4. Pertanyaan Pemantik: [Sampaikan pertanyaan pemantik dan respon yang diharapkan]
5. Penyampaian tujuan dan langkah pembelajaran

KEGIATAN INTI (sesuaikan dengan waktu tersisa)
Jabarkan minimal 7 langkah kegiatan yang DETAIL dan URUT:

Langkah 1 - [Nama Tahap] ([X] menit)
Kegiatan Guru : [detail kegiatan guru]
Kegiatan Siswa: [detail kegiatan siswa]
Pertanyaan Guru: [contoh pertanyaan yang dilontarkan]

Langkah 2 - [Nama Tahap] ([X] menit)
Kegiatan Guru : [detail]
Kegiatan Siswa: [detail]

[dst sampai langkah 7]

Diferensiasi Pembelajaran:
- Untuk siswa yang sudah paham: [kegiatan pengayaan selama inti]
- Untuk siswa yang belum paham: [pendampingan/scaffolding]

KEGIATAN PENUTUP (15 menit)
1. Refleksi bersama: [pertanyaan refleksi untuk siswa - tulis 3 pertanyaan]
2. Kesimpulan: [poin-poin kesimpulan yang diharapkan muncul]
3. Evaluasi singkat: [exit ticket / kuis lisan 2-3 soal]
4. Tindak lanjut: [PR atau persiapan pertemuan berikutnya]
5. Doa dan salam penutup

====================================================
BAGIAN D: ASESMEN LENGKAP
====================================================

1. ASESMEN DIAGNOSTIK (Sebelum Pembelajaran)
Tujuan: Mengetahui kemampuan awal dan gaya belajar siswa
Bentuk: Kuis diagnostik / pertanyaan lisan
Instrumen: Tulis 3 pertanyaan diagnostik beserta kunci dan interpretasinya:
   Pertanyaan 1: [soal] → Jika jawaban [X]: siswa sudah memahami [konsep], lanjutkan ke...
   Pertanyaan 2: [soal] → Jika jawaban [Y]: siswa perlu penguatan [konsep]...
   Pertanyaan 3: [soal] → Interpretasi: ...

2. ASESMEN FORMATIF (Selama Pembelajaran)
Tujuan: Memantau perkembangan belajar siswa secara berkelanjutan

   A. ASESMEN KOGNITIF (Pengetahuan)
   Teknik: Observasi tanya jawab, kuis singkat
   Instrumen - Soal Kognitif beserta Pembahasan:

   Soal 1 (C1-Mengingat): [tulis soal]
   Jawaban: [jawaban lengkap]
   Pembahasan: [penjelasan mengapa jawaban tersebut benar]
   Skor: 20 poin

   Soal 2 (C2-Memahami): [tulis soal]
   Jawaban: [jawaban lengkap]
   Pembahasan: [penjelasan detail]
   Skor: 20 poin

   Soal 3 (C3-Mengaplikasikan): [tulis soal]
   Jawaban: [jawaban lengkap]
   Pembahasan: [penjelasan detail]
   Skor: 20 poin

   Soal 4 (C4-Menganalisis/HOTs): [tulis soal berbasis kasus/fenomena nyata]
   Jawaban: [jawaban lengkap]
   Pembahasan: [penjelasan detail langkah demi langkah]
   Skor: 20 poin

   Soal 5 (C5-Mengevaluasi/HOTs): [tulis soal yang meminta siswa menilai/mengevaluasi]
   Jawaban: [jawaban lengkap dengan argumen]
   Pembahasan: [penjelasan kriteria evaluasi]
   Skor: 20 poin

   Total Skor Kognitif: 100 poin

   KRITERIA PENILAIAN KOGNITIF:
   Nilai 91-100 : Sangat Baik - Siswa menguasai seluruh kompetensi dengan sangat baik
   Nilai 81-90  : Baik        - Siswa menguasai sebagian besar kompetensi dengan baik
   Nilai 71-80  : Cukup       - Siswa cukup menguasai kompetensi dasar
   Nilai 61-70  : Perlu Bimbingan - Siswa perlu bimbingan tambahan
   Nilai < 61   : Remedial    - Siswa perlu program remedial khusus

   B. ASESMEN AFEKTIF (Sikap)
   Teknik: Observasi, jurnal sikap, penilaian antarteman
   Dimensi yang dinilai:

   Instrumen Observasi Sikap (Skala 1-4):
   
   Tabel Penilaian Afektif:
   No | Aspek Sikap | Indikator | 4 (SB) | 3 (B) | 2 (C) | 1 (K)
   1 | [Sikap 1 relevan dgn PPP] | [indikator konkret] | [deskripsi] | [deskripsi] | [deskripsi] | [deskripsi]
   2 | [Sikap 2] | [indikator] | [deskripsi] | [deskripsi] | [deskripsi] | [deskripsi]
   3 | [Sikap 3] | [indikator] | [deskripsi] | [deskripsi] | [deskripsi] | [deskripsi]
   4 | Tanggung jawab | Menyelesaikan tugas tepat waktu | Selalu | Sering | Kadang | Tidak pernah
   5 | Kerjasama | Aktif berkontribusi dalam kelompok | Selalu | Sering | Kadang | Tidak pernah

   Rumus Nilai Afektif: (Total Skor / 20) x 100
   
   KRITERIA PENILAIAN AFEKTIF:
   Nilai 91-100 : Sangat Baik (SB)
   Nilai 81-90  : Baik (B)
   Nilai 71-80  : Cukup (C)
   Nilai < 71   : Kurang (K) - perlu pembinaan sikap

   C. ASESMEN PSIKOMOTORIK (Keterampilan)
   Teknik: Unjuk kerja / praktik / observasi kinerja
   
   Instrumen Rubrik Psikomotorik:
   
   No | Aspek Keterampilan | Sangat Terampil (4) | Terampil (3) | Cukup Terampil (2) | Perlu Bimbingan (1)
   1 | [Keterampilan 1 yang relevan dgn topik] | [deskripsi detail] | [deskripsi] | [deskripsi] | [deskripsi]
   2 | [Keterampilan 2] | [deskripsi detail] | [deskripsi] | [deskripsi] | [deskripsi]
   3 | [Keterampilan 3] | [deskripsi detail] | [deskripsi] | [deskripsi] | [deskripsi]
   4 | Presentasi hasil | Sangat jelas, runtut, percaya diri | Jelas dan runtut | Cukup jelas | Kurang jelas
   5 | Penggunaan media/alat | Sangat tepat dan kreatif | Tepat | Cukup tepat | Kurang tepat

   Rumus Nilai Psikomotorik: (Total Skor / 20) x 100

   KRITERIA PENILAIAN PSIKOMOTORIK:
   Nilai 91-100 : Sangat Terampil
   Nilai 81-90  : Terampil
   Nilai 71-80  : Cukup Terampil
   Nilai < 71   : Perlu Bimbingan - berikan latihan tambahan

3. ASESMEN SUMATIF (Akhir Pembelajaran)
Tujuan: Mengukur ketercapaian tujuan pembelajaran secara menyeluruh
Bentuk: Tes tertulis (pilihan ganda + uraian) dan/atau proyek

   Soal Sumatif beserta Pembahasan Lengkap:

   PILIHAN GANDA (masing-masing 5 poin)

   Soal 1: [soal PG tingkat sedang]
   A. [opsi A]   B. [opsi B]   C. [opsi C]   D. [opsi D]
   Jawaban: [huruf]
   Pembahasan: [penjelasan lengkap mengapa jawaban tersebut benar dan mengapa yang lain salah]

   Soal 2: [soal PG tingkat sedang]
   A. [opsi A]   B. [opsi B]   C. [opsi C]   D. [opsi D]
   Jawaban: [huruf]
   Pembahasan: [penjelasan lengkap]

   Soal 3: [soal PG HOTs]
   A. [opsi A]   B. [opsi B]   C. [opsi C]   D. [opsi D]
   Jawaban: [huruf]
   Pembahasan: [penjelasan lengkap]

   URAIAN (masing-masing 10 poin)

   Soal 4 (Uraian - Pemahaman): [soal uraian tingkat C2-C3]
   Jawaban Ideal: [jawaban lengkap dengan poin-poin kunci]
   Pembahasan: [uraian jawaban yang diharapkan]
   Rubrik: Skor 10 jika..., Skor 7 jika..., Skor 4 jika..., Skor 1 jika...

   Soal 5 (Uraian - HOTs): [soal uraian berbasis kasus nyata C4-C6]
   Jawaban Ideal: [jawaban lengkap dengan argumen]
   Pembahasan: [uraian jawaban dengan penjelasan langkah berpikir]
   Rubrik: Skor 10 jika..., Skor 7 jika..., Skor 4 jika..., Skor 1 jika...

   NILAI AKHIR SUMATIF:
   Rumus: (Skor PG x 3 + Skor Uraian x 2) / Total x 100
   
   KRITERIA KETUNTASAN:
   Nilai >= 75 : Tuntas - lanjut ke materi berikutnya
   Nilai 60-74 : Remidi Parsial - pengayaan pada bagian yang belum tuntas
   Nilai < 60  : Remidi Total - perlu pembelajaran ulang seluruh materi

REKAPITULASI NILAI AKHIR:
Nilai Akhir = (Kognitif x 40%) + (Afektif x 20%) + (Psikomotorik x 20%) + (Sumatif x 20%)

====================================================
BAGIAN E: PENGAYAAN DAN REMEDIAL
====================================================

PROGRAM PENGAYAAN (untuk nilai >= 80)
Tujuan: Memperluas dan memperdalam pemahaman siswa yang sudah tuntas
Kegiatan:
1. [Kegiatan pengayaan 1 - lebih menantang dari materi reguler]
2. [Kegiatan pengayaan 2 - berbasis proyek/penelitian mini]
3. [Referensi bacaan/video tambahan untuk eksplorasi mandiri]

PROGRAM REMEDIAL (untuk nilai < 75)
Tujuan: Membantu siswa mencapai ketuntasan minimal
Identifikasi: [cara mengidentifikasi bagian yang belum dipahami]
Kegiatan:
1. [Remedial teaching dengan pendekatan berbeda]
2. [Tutor sebaya - siswa yang sudah tuntas membantu yang belum]
3. [Latihan soal tambahan dengan tingkat kesulitan lebih rendah]
Instrumen Remedial: [3 soal remedial yang lebih mudah dari soal asesmen utama, lengkap dengan jawaban]

====================================================
BAGIAN F: REFLEKSI GURU
====================================================

Pertanyaan refleksi untuk guru setelah pembelajaran:
1. Apakah seluruh peserta didik mencapai tujuan pembelajaran yang ditetapkan? Bukti apa yang mendukung?
2. Bagian kegiatan pembelajaran mana yang paling efektif dan mengapa?
3. Apa kendala yang muncul selama pembelajaran dan bagaimana cara mengatasinya?
4. Perbaikan apa yang akan saya lakukan pada pertemuan/pembelajaran berikutnya?
5. Apakah penggunaan media dan metode sudah optimal untuk semua gaya belajar siswa?

====================================================
BAGIAN G: LAMPIRAN
====================================================

LEMBAR KERJA PESERTA DIDIK (LKPD)

Judul LKPD: [Judul menarik terkait ${topik}]
Nama Siswa : ___________________________
Kelas       : ___________________________
Tanggal     : ___________________________

Tujuan LKPD: [sesuai tujuan pembelajaran]
Petunjuk: [instruksi cara mengerjakan]

Kegiatan 1: [Judul kegiatan]
[Deskripsi kegiatan, pertanyaan, atau tugas - minimal 3 item]

Kegiatan 2: [Judul kegiatan]
[Deskripsi kegiatan, pertanyaan, atau tugas]

Kegiatan 3: Refleksi
Apa yang kamu pelajari hari ini?
Apa yang masih membingungkan?
Apa yang ingin kamu pelajari lebih lanjut?

MATERI RINGKAS UNTUK SISWA
[Tulis ringkasan materi ${topik} yang mudah dipahami siswa, berisi poin-poin kunci, definisi penting, dan contoh konkret - minimal 300 kata]

Sumber Referensi:
- Buku Siswa ${mapel} ${kelas} Kurikulum Merdeka, Kemendikbudristek 2024
- guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/
- [sumber relevan lainnya]

Dibuat dengan: Asisten Guru by Mas Gema
Berdasarkan: SK BSKAP No. 032/H/KR/2024 tentang CP Kurikulum Merdeka`;

  } else {
    // K13
    return `Kamu adalah pakar pengembang kurikulum Indonesia. Buatkan RPP Kurikulum 2013 (K13) SANGAT LENGKAP untuk:

Mata Pelajaran : ${mapel}
Kelas/Semester : ${kelas}
Materi Pokok   : ${topik}
Alokasi Waktu  : ${waktu}
${tujuan ? 'Catatan: ' + tujuan : ''}

JANGAN gunakan simbol #, ##, **, *, ---. Gunakan HURUF KAPITAL untuk judul bagian.

====================================================
IDENTITAS RPP
====================================================
Satuan Pendidikan : [Nama Sekolah]
Mata Pelajaran    : ${mapel}
Kelas/Semester    : ${kelas}
Materi Pokok      : ${topik}
Alokasi Waktu     : ${waktu}
Tahun Pelajaran   : 2024/2025

====================================================
KOMPETENSI INTI
====================================================
KI-1: Menghayati dan mengamalkan ajaran agama yang dianutnya.
KI-2: Menghayati dan mengamalkan perilaku jujur, disiplin, santun, peduli (gotong royong, kerjasama, toleran, damai), bertanggung jawab, responsif, dan pro-aktif.
KI-3: Memahami, menerapkan, dan menganalisis pengetahuan faktual, konseptual, prosedural, dan metakognitif berdasarkan rasa ingin tahunya tentang ilmu pengetahuan, teknologi, seni, budaya, dan humaniora.
KI-4: Mengolah, menalar, dan menyaji dalam ranah konkret dan ranah abstrak terkait dengan pengembangan dari yang dipelajarinya di sekolah secara mandiri, bertindak secara efektif dan kreatif, serta mampu menggunakan metode sesuai kaidah keilmuan.

====================================================
KOMPETENSI DASAR DAN IPK
====================================================
KD 3 (Pengetahuan): [tulis KD pengetahuan yang relevan dengan ${topik}]
IPK 3.1: [kata kerja C1-C2 + materi spesifik]
IPK 3.2: [kata kerja C2-C3 + materi spesifik]
IPK 3.3: [kata kerja C3-C4 + materi spesifik]

KD 4 (Keterampilan): [tulis KD keterampilan yang relevan]
IPK 4.1: [kata kerja keterampilan + produk/kinerja yang diharapkan]
IPK 4.2: [kata kerja keterampilan + produk/kinerja]

====================================================
TUJUAN PEMBELAJARAN
====================================================
[Tulis 4-5 tujuan SMART dengan format: Melalui [kegiatan], siswa dapat [KKO] [materi] dengan [kriteria] sehingga [manfaat]]

====================================================
MATERI PEMBELAJARAN
====================================================
Materi Reguler    : [poin-poin materi inti ${topik}]
Materi Pengayaan  : [materi lebih lanjut untuk siswa cepat]
Materi Remedial   : [materi dasar untuk siswa yang belum tuntas]

====================================================
METODE PEMBELAJARAN
====================================================
Pendekatan : Saintifik
Model      : [Discovery Learning / PBL - pilih yang sesuai]
Metode     : [daftar metode: diskusi, tanya jawab, dll]

====================================================
MEDIA DAN SUMBER BELAJAR
====================================================
Media   : [daftar media]
Alat    : [daftar alat]
Sumber  : Buku Siswa ${mapel} K13, [sumber lain]

====================================================
LANGKAH PEMBELAJARAN
====================================================

PENDAHULUAN (15 menit)
[Detail kegiatan pendahuluan: orientasi, apersepsi, motivasi, pemberian acuan]

KEGIATAN INTI (sesuai waktu)
Mengamati    : [kegiatan mengamati - detail]
Menanya      : [kegiatan bertanya - contoh pertanyaan yang diharapkan]
Mengumpulkan : [kegiatan eksplorasi/mencoba - detail langkah]
Mengasosiasi : [kegiatan menalar/diskusi - detail]
Mengomunikasikan: [kegiatan presentasi/laporan - detail]

PENUTUP (15 menit)
[Detail kegiatan penutup: kesimpulan, refleksi, penugasan, salam]

====================================================
PENILAIAN
====================================================

PENILAIAN SIKAP (AFEKTIF)
Teknik: Observasi jurnal
Instrumen - Lembar Observasi Sikap:
No | Aspek | Indikator | 4 (SB) | 3 (B) | 2 (C) | 1 (K)
[Isi 5 aspek sikap dengan deskripsi lengkap setiap skor]
Rumus: (Skor Total / 20) x 100
Predikat: A (91-100), B (81-90), C (71-80), D (<71)

PENILAIAN PENGETAHUAN (KOGNITIF)
Teknik: Tes tertulis
Instrumen - Soal dan Pembahasan:

Pilihan Ganda (5 soal x 10 poin = 50 poin):
[Tulis 5 soal PG beserta 4 opsi, jawaban, dan pembahasan lengkap]

Uraian (2 soal x 25 poin = 50 poin):
[Tulis 2 soal uraian beserta kunci jawaban, pembahasan, dan rubrik penilaian]

Kriteria Penilaian Kognitif:
Nilai 91-100 : Sangat Baik
Nilai 81-90  : Baik
Nilai 71-80  : Cukup
Nilai <71    : Kurang (Remedial)

PENILAIAN KETERAMPILAN (PSIKOMOTORIK)
Teknik: Unjuk kerja / proyek
Instrumen - Rubrik Penilaian Keterampilan:
No | Aspek Keterampilan | 4 (ST) | 3 (T) | 2 (CT) | 1 (BT)
[Isi 5 aspek keterampilan dengan deskripsi lengkap]
Rumus: (Skor / 20) x 100

REKAPITULASI NILAI AKHIR:
NA = (Kognitif x 40%) + (Afektif x 30%) + (Psikomotorik x 30%)
KKM: 75

====================================================
PEMBELAJARAN REMEDIAL DAN PENGAYAAN
====================================================
[Detail program remedial dan pengayaan beserta instrumennya]

====================================================
LAMPIRAN: LKPD
====================================================
[Lembar Kerja Peserta Didik lengkap dengan petunjuk, kegiatan, dan pertanyaan refleksi]

Dibuat dengan: Asisten Guru by Mas Gema`;
  }
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/^[-*]\s+/gm, '• ')
    .replace(/^_{3,}$/gm, '').replace(/^-{3,}$/gm, '─────────────')
    .replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').trim();
}

function renderDisplay(text) {
  const e = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return e
    .replace(/^#{1,2}\s+(.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid #ede9fe;padding-bottom:5px;">$1</div>')
    .replace(/^#{3,6}\s+(.+)$/gm, '<div style="font-size:13px;font-weight:600;color:#4a4458;margin:10px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*]\s+(.+)$/gm, '<div style="margin:3px 0 3px 16px;font-size:13px;">•&nbsp;$1</div>')
    .replace(/^={4,}.*={4,}$/gm, '<hr style="border:none;border-top:2px solid #7c3aed;margin:14px 0;">')
    .replace(/^-{3,}$/gm, '<hr style="border:none;border-top:1px solid #e8e4f0;margin:10px 0;">')
    .replace(/\n/g, '<br>');
}

function setButtonLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<div class="loading-dots"><span></span><span></span><span></span></div> Membuat RPP lengkap... (30-60 detik)'
    : '▶ ' + label;
}

async function generateAI(type) {
  if (!canGenerate()) {
    alert('Kredit habis! Silakan upgrade ke Premium untuk generate tanpa batas.');
    goPage('upgrade');
    return;
  }

  let prompt = '', system = '', btnId = '', label = '', resId = '';

  if (type === 'rpp') {
    const mapel = document.getElementById('rpp-mapel').value || 'IPA';
    const kelas = document.getElementById('rpp-kelas').value;
    const kur = document.getElementById('rpp-kur').value;
    const waktu = document.getElementById('rpp-waktu').value;
    const topik = document.getElementById('rpp-topik').value || 'Sistem Pencernaan';
    const tujuan = document.getElementById('rpp-tujuan').value;
    prompt = buildRPPPrompt(mapel, kelas, kur, waktu, topik, tujuan);
    system = 'Kamu adalah pakar pengembang kurikulum dan modul ajar Indonesia dengan pengalaman 20 tahun. Buat modul ajar/RPP yang SANGAT LENGKAP, DETAIL, dan SIAP PAKAI. Setiap bagian harus diisi substantif, bukan hanya template kosong. Soal asesmen harus lengkap beserta jawaban dan pembahasan. Rubrik penilaian harus operasional. JANGAN gunakan simbol Markdown. Gunakan HURUF KAPITAL untuk judul bagian. Tulis dalam bahasa Indonesia baku yang baik.';
    btnId = 'btn-rpp'; label = 'Generate RPP Lengkap'; resId = 'res-rpp';

  } else if (type === 'soal') {
    const mapel = document.getElementById('soal-mapel').value || 'IPA';
    const kelas = document.getElementById('soal-kelas').value;
    const jenis = document.getElementById('soal-jenis').value;
    const jumlah = document.getElementById('soal-jumlah').value;
    const topik = document.getElementById('soal-topik').value || 'Sistem Pencernaan';
    const level = document.getElementById('soal-level').value;
    prompt = `Buatkan ${jumlah} soal ${jenis} BERKUALITAS TINGGI untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB disertai: jawaban lengkap dan pembahasan detail. Untuk PG sertakan 4 opsi dengan pengecoh yang masuk akal. Tulis "Soal 1:", "Soal 2:" dst. Di akhir tulis KUNCI JAWABAN dan REKAPITULASI. Tidak ada simbol markdown.`;
    system = 'Kamu ahli evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal berkualitas tinggi sesuai standar, dengan pembahasan yang mendidik dan mudah dipahami siswa. Tidak ada simbol Markdown.';
    btnId = 'btn-soal'; label = 'Generate Soal + Kunci + Pembahasan'; resId = 'res-soal';

  } else if (type === 'admin') {
    const jenis = document.getElementById('admin-jenis').value;
    const konteks = document.getElementById('admin-konteks').value;
    prompt = `Buatkan ${jenis} profesional untuk guru Indonesia. Konteks: ${konteks || 'umum'}. Format rapi, formal, lengkap, siap digunakan. Tidak ada simbol markdown.`;
    system = 'Kamu asisten administrasi sekolah profesional dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.';
    btnId = 'btn-admin'; label = 'Buat Dokumen'; resId = 'res-admin';

  } else if (type === 'pkb') {
    const nama = document.getElementById('pkb-nama').value || 'Guru';
    const mapel = document.getElementById('pkb-mapel').value || 'Umum';
    const kegiatan = document.getElementById('pkb-kegiatan').value || 'Pelatihan';
    const refleksi = document.getElementById('pkb-refleksi').value || 'Bermanfaat';
    prompt = `Buatkan Laporan PKB formal untuk Nama: ${nama}, Mapel: ${mapel}, Kegiatan: ${kegiatan}, Refleksi: ${refleksi}. Sertakan: Pendahuluan, Pelaksanaan, Hasil & Manfaat, Refleksi & RTL, Penutup. Narasi formal siap dilaporkan. Tidak ada simbol markdown.`;
    system = 'Kamu asisten penulisan laporan profesional dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.';
    btnId = 'btn-pkb'; label = 'Generate Laporan PKB'; resId = 'res-pkb';
  }

  setButtonLoading(btnId, true, label);
  const resEl = document.getElementById(resId);
  resEl.innerHTML = '';
  resEl.classList.remove('show');

  try {
    const result = await callAPI(prompt, system);
    showResult(resId, result);
    useCredit();
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;font-size:12px;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }

  setButtonLoading(btnId, false, label);
}

function showResult(resId, text) {
  const el = document.getElementById(resId);
  el.classList.add('show');
  el.dataset.raw = text;
  el.innerHTML = `
    <div class="result-label">Hasil</div>
    <div style="font-size:13px;line-height:1.85;color:#1a1523;">${renderDisplay(text)}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyResult('${resId}',this)">📋 Salin teks</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('${resId}')">🖨️ Print</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}')">⬇ Download Word</button>
    </div>`;
}

function copyResult(resId, btn) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  navigator.clipboard.writeText(stripMarkdown(raw)).catch(() => {});
  btn.textContent = '✓ Tersalin!';
  setTimeout(() => { btn.textContent = '📋 Salin teks'; }, 2000);
}

function printResult(resId) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  const clean = stripMarkdown(raw);
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const w = window.open('', '_blank');
  if (!w) { alert('Izinkan popup browser untuk fitur print.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>RPP — Asisten Guru</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;color:#000;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:12pt;margin-bottom:24pt;}
    .ht{font-size:16pt;font-weight:700;color:#7c3aed;}.hs{font-size:11pt;color:#555;margin-top:5pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">Asisten Guru by Mas Gema</div>
    <div class="hs">${currentUser ? currentUser.name + ' | ' : ''}${today} | Berdasarkan SK BSKAP No. 032/H/KR/2024</div></div>
    <pre>${clean}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function downloadWord(resId) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  if (!raw) { alert('Tidak ada konten untuk didownload.'); return; }
  if (!docxReady || typeof docx === 'undefined') {
    alert('Library Word sedang dimuat, tunggu 3 detik lalu coba lagi.'); return;
  }
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const children = [];
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'ASISTEN GURU BY MAS GEMA', bold: true, size: 30, color: '7c3aed', font: 'Times New Roman' })],
      spacing: { after: 80 }
    }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: (currentUser ? currentUser.name + '  |  ' : '') + today + '  |  Berdasarkan SK BSKAP No. 032/H/KR/2024', size: 18, color: '666666', font: 'Times New Roman' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } },
      spacing: { after: 360 }
    }));

    const lines = raw.split('\n');
    lines.forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 100 } })); return; }
      if (/^={4,}/.test(line)) {
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '7c3aed', space: 1 } }, spacing: { before: 200, after: 100 } }));
        return;
      }
      if (/^#{1,2}\s+/.test(line)) {
        const t = line.replace(/^#{1,2}\s+/, '').replace(/\*\*/g, '');
        children.push(new Paragraph({ children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 26, color: '7c3aed', font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'ddd6fe', space: 1 } }, spacing: { before: 320, after: 120 } }));
        return;
      }
      if (/^#{3,6}\s+/.test(line)) {
        const t = line.replace(/^#{3,6}\s+/, '').replace(/\*\*/g, '');
        children.push(new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 24, color: '4a4458', font: 'Times New Roman' })], spacing: { before: 240, after: 80 } }));
        return;
      }
      if (/^[-_]{3,}$/.test(line.trim())) {
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e8e4f0', space: 1 } }, spacing: { before: 100, after: 100 } }));
        return;
      }
      if (/^[-*]\s+/.test(line)) {
        const t = line.replace(/^[-*]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
        children.push(new Paragraph({ children: [new TextRun({ text: '\u2022  ' + t, size: 22, font: 'Times New Roman', color: '1a1523' })], indent: { left: 400 }, spacing: { before: 40, after: 40 } }));
        return;
      }
      const clean = line.trim();
      const isHeader = clean === clean.toUpperCase() && clean.length > 4 && /[A-Z]/.test(clean) && !/^\d/.test(clean) && !/^[A-D]\./.test(clean);
      const parts = clean.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.filter(p => p).map(p => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return new TextRun({ text: p.replace(/\*\*/g, ''), bold: true, size: 22, font: 'Times New Roman', color: '1a1523' });
        return new TextRun({ text: p.replace(/\*\*/g, ''), bold: isHeader, size: isHeader ? 23 : 22, font: 'Times New Roman', color: isHeader ? '3b0764' : '1a1523' });
      });
      children.push(new Paragraph({ children: runs.length ? runs : [new TextRun({ text: clean, size: 22, font: 'Times New Roman' })], spacing: { before: isHeader ? 240 : 60, after: 60 } }));
    });

    children.push(new Paragraph({ spacing: { before: 480 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— Dibuat dengan Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024 —', italics: true, size: 18, color: '9333ea', font: 'Times New Roman' })] }));

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } }, children }]
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ModulAjar_AsistenGuru_' + Date.now() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  } catch (e) { alert('Gagal download Word: ' + e.message); }
}

function hubungiAdmin() {
  alert('Hubungi Mas Gema untuk upgrade Premium!\n\nWhatsApp: (isi nomor WA kamu)');
}

(function init() {
  const session = getSession();
  if (session) {
    const users = getUsers();
    const fresh = users.find(u => u.email === session.email);
    enterApp(fresh || session);
  }
})();
