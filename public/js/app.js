// ═══════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — CP Eksplisit Version
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
  rpp: { title: 'Generator RPP', sub: 'Modul Ajar lengkap sesuai Kurikulum Merdeka 2024' },
  soal: { title: 'Generator Soal', sub: 'Soal + kunci + pembahasan otomatis' },
  admin: { title: 'Asisten Administrasi', sub: 'Dokumen guru siap pakai dalam 1 klik' },
  pkb: { title: 'Laporan PKB', sub: 'Laporan pengembangan keprofesian profesional' },
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
//  SYSTEM PROMPT DENGAN DATABASE CP LENGKAP
// ═══════════════════════════════════════════════
function getRPPSystemPrompt() {
  return `Kamu adalah pakar pengembang kurikulum dan modul ajar Indonesia berpengalaman 20 tahun dari Asisten Guru by Mas Gema.

TUGAS UTAMA: Buat Modul Ajar/RPP yang SANGAT LENGKAP dan LANGSUNG DAPAT DIGUNAKAN.

ATURAN PENULISAN:
- JANGAN gunakan simbol Markdown: #, ##, **, *, ---, backtick
- Gunakan HURUF KAPITAL untuk setiap judul bagian utama
- Tulis dalam bahasa Indonesia baku yang jelas
- Setiap bagian WAJIB diisi dengan konten substantif, BUKAN placeholder atau template kosong
- Khusus CAPAIAN PEMBELAJARAN: tulis teks narasi CP yang SESUNGGUHNYA sesuai SK BSKAP 032/H/KR/2024, bukan template

DATABASE CAPAIAN PEMBELAJARAN SK BSKAP 032/H/KR/2024:

FASE A (Kelas 1-2 SD):
- Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan kepada teman sebaya dan orang dewasa tentang diri dan lingkungan sekitarnya. Peserta didik menunjukkan minat terhadap teks, mampu memahami dan menyampaikan pesan, serta mengekspresikan perasaan dan gagasan. Peserta didik mampu membaca kata-kata yang dikenalinya sehari-hari dengan fasih.
- Matematika: Peserta didik dapat melakukan operasi penjumlahan dan pengurangan bilangan cacah sampai 999. Peserta didik dapat mengenal dan menentukan panjang dan berat dengan satuan tidak baku dan satuan baku.
- IPAS: Peserta didik mengidentifikasi dan mengajukan pertanyaan tentang apa yang ada pada dirinya maupun kondisi di lingkungan rumah dan sekolah serta mengidentifikasi permasalahan sederhana yang berkaitan dengan kehidupan sehari-hari.
- PPKn: Peserta didik mampu mengenal dan mencintai lingkungan alam dan sosial di sekitar rumah dan sekolah sebagai bagian dari NKRI.
- PJOK: Peserta didik dapat menunjukkan berbagai aktivitas pola gerak dasar melalui permainan sederhana dan tradisional.

FASE B (Kelas 3-4 SD):
- Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan dan konteks sosial. Peserta didik mampu memahami dan menyampaikan pesan dan mengekspresikan perasaan, serta mempresentasikan informasi nonfiksi dan fiksi menggunakan beragam media.
- Matematika: Peserta didik dapat melakukan operasi hitung bilangan cacah dan pecahan sederhana. Peserta didik mampu menyelesaikan masalah berkaitan dengan keliling dan luas bangun datar.
- IPAS: Peserta didik mengidentifikasi proses perubahan wujud zat dan perubahan bentuk energi dalam kehidupan sehari-hari. Peserta didik mendeskripsikan keanekaragaman makhluk hidup, bagian-bagiannya, dan habitatnya.
- PPKn: Peserta didik mampu mengidentifikasi aturan di keluarga, sekolah, dan lingkungan sekitar tempat tinggal serta melaksanakannya dengan bimbingan orang tua dan guru.
- IPA (jika terpisah): Peserta didik mengidentifikasi sifat-sifat benda, perubahan wujud zat, dan berbagai jenis gaya yang mempengaruhi gerak benda.
- IPS (jika terpisah): Peserta didik mengenal dan memahami kondisi geografis dan sosial budaya di lingkungan sekitarnya.

FASE C (Kelas 5-6 SD):
- Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan, konteks sosial, akademis, dan vokasi. Peserta didik mampu memahami, mengolah, menginterpretasi, dan mengevaluasi informasi dari berbagai tipe teks.
- Matematika: Peserta didik dapat melakukan operasi hitung bilangan cacah, bilangan desimal, bilangan negatif, dan pecahan. Peserta didik mampu mengukur luas dan volume serta menyelesaikan masalah yang berkaitan dengan bangun ruang.
- IPAS: Peserta didik menjelaskan sistem organ pada manusia dan hewan, serta keterkaitan antara struktur dan fungsi organ tersebut. Peserta didik memahami konsep gaya, gerak, dan energi serta pengaruhnya dalam kehidupan sehari-hari.
- IPA: Peserta didik menjelaskan sistem organ manusia dan kaitannya dengan kesehatan. Peserta didik memahami sifat-sifat listrik, magnet, dan penerapannya dalam teknologi sederhana.
- IPS: Peserta didik memahami keragaman budaya, sejarah, dan kondisi geografis Indonesia serta kaitannya dengan kehidupan nasional.

FASE D (Kelas 7-9 SMP):
- Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan, konteks sosial, akademis, dan vokasi. Peserta didik mampu memahami, mengolah, menginterpretasi, dan mengevaluasi berbagai tipe teks multimodal.
- Matematika: Peserta didik dapat menggunakan bilangan dalam berbagai representasi. Peserta didik mampu memahami relasi dan fungsi, persamaan linear, sistem persamaan linear dua variabel, serta menyelesaikan masalah kontekstual.
- IPA: Peserta didik mengidentifikasi sifat dan karakteristik zat, mendeskripsikan prinsip dasar kimia dan fisika, serta menghubungkannya dengan fenomena alam dan teknologi. Peserta didik memahami sistem organ manusia dan mekanisme homeostasis.
- IPS: Peserta didik memahami dan menganalisis kondisi geografis, kehidupan sosial-budaya, ekonomi, dan politik Indonesia dan dunia.
- PPKn: Peserta didik menganalisis peran dan kedudukan warga negara, pentingnya berpartisipasi dalam kehidupan demokrasi, serta memahami nilai-nilai Pancasila dalam kehidupan berbangsa dan bernegara.

FASE E (Kelas 10 SMA):
- Bahasa Indonesia: Peserta didik mampu mengevaluasi dan mengkreasi informasi berupa gagasan, pikiran, perasaan, pandangan, arahan atau pesan dari berbagai jenis teks untuk tujuan yang bervariasi.
- Matematika: Peserta didik dapat menggunakan bilangan eksponen dan logaritma, komposisi fungsi, fungsi invers, trigonometri, geometri, dan statistika untuk menyelesaikan berbagai masalah kontekstual.
- Fisika: Peserta didik mampu menerapkan konsep dan prinsip vektor, kinematika dan dinamika partikel, usaha dan energi, impuls dan momentum, gerak harmonik, gelombang, fluida, termodinamika, listrik dan magnet, serta fisika modern.
- Kimia: Peserta didik mampu mengamati, menyelidiki, dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam menjelaskan konsep kimia dalam kehidupan sehari-hari.
- Biologi: Peserta didik memiliki kemampuan menerapkan pemahaman dan keterampilan sains dalam kehidupan nyata dan dalam pemecahan masalah global.

FASE F (Kelas 11-12 SMA):
- Bahasa Indonesia: Peserta didik mampu mengkreasi berbagai teks untuk menyampaikan pengamatan dan penilaian tentang topik yang beragam.
- Matematika Tingkat Lanjut: Peserta didik mampu menerapkan limit, turunan, integral, geometri analitik, transformasi geometri, bilangan kompleks, dan peluang untuk menyelesaikan masalah.
- Fisika: Peserta didik menganalisis penerapan hukum fisika dalam teknologi terkini dan permasalahan dalam kehidupan modern.

PROFIL PELAJAR PANCASILA (dimensi yang dapat dipilih):
1. Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia
2. Berkebinekaan Global
3. Bergotong-royong
4. Mandiri
5. Bernalar Kritis
6. Kreatif

Berdasarkan database CP di atas, TULIS CP yang SPESIFIK dan RELEVAN dengan mata pelajaran dan fase yang diminta. Jangan tulis "[tulis CP di sini]" atau template kosong - tulis narasi CP yang SESUNGGUHNYA.`;
}

// ═══════════════════════════════════════════════
//  PROMPT RPP SUPER LENGKAP
// ═══════════════════════════════════════════════
function buildRPPPrompt(mapel, kelas, kur, waktu, topik, tujuan) {
  const fase = getFase(kelas);

  return `Buatkan MODUL AJAR Kurikulum Merdeka yang SANGAT LENGKAP untuk:

Mata Pelajaran : ${mapel}
Kelas          : ${kelas}
Fase           : ${fase}
Topik          : ${topik}
Waktu          : ${waktu}
${tujuan ? 'Catatan      : ' + tujuan : ''}

PENTING: Isi SETIAP bagian dengan konten nyata dan lengkap. JANGAN tulis placeholder atau template kosong. Khusus CP, salin dan sesuaikan dari database CP ${fase} ${mapel} yang ada di pengetahuanmu.

IDENTITAS MODUL
Nama Penyusun    : (isi nama guru)
Institusi        : (isi nama sekolah)
Tahun Pelajaran  : 2024/2025
Mata Pelajaran   : ${mapel}
Fase dan Kelas   : ${fase} / ${kelas}
Topik            : ${topik}
Alokasi Waktu    : ${waktu}
Referensi CP     : SK BSKAP No. 032/H/KR/2024

CAPAIAN PEMBELAJARAN (CP)
Berdasarkan SK BSKAP No. 032/H/KR/2024, Capaian Pembelajaran ${mapel} ${fase} adalah:
[TULIS NARASI CP LENGKAP DAN SESUNGGUHNYA untuk ${mapel} ${fase} - minimal 3 paragraf menjelaskan kompetensi akhir fase, elemen-elemen CP, dan ruang lingkup materi]

ELEMEN CAPAIAN PEMBELAJARAN YANG RELEVAN DENGAN TOPIK ${topik.toUpperCase()}:
[Tulis elemen CP spesifik yang berkaitan langsung dengan topik ${topik}]

ALUR TUJUAN PEMBELAJARAN (ATP):
[Tulis 3-5 ATP yang menunjukkan urutan logis pembelajaran menuju pencapaian CP]

KOMPETENSI AWAL PESERTA DIDIK:
[Tulis 3 pengetahuan/keterampilan prasyarat yang harus sudah dimiliki siswa]

PROFIL PELAJAR PANCASILA:
Pilih 3 dimensi paling relevan dan jelaskan implementasinya dalam pembelajaran ${topik}:
1. [Nama Dimensi]: [Penjelasan konkret bagaimana dimensi ini dikembangkan dalam kegiatan pembelajaran topik ${topik}]
2. [Nama Dimensi]: [Penjelasan konkret]
3. [Nama Dimensi]: [Penjelasan konkret]

SARANA DAN PRASARANA:
[Daftar lengkap: ruangan, media, alat, bahan, sumber belajar]

MODEL DAN METODE:
Model      : [pilih: PBL/PjBL/Discovery Learning/Inquiry Learning]
Metode     : [daftar metode yang digunakan]
Pendekatan : Saintifik, Diferensiasi, TPACK

TUJUAN PEMBELAJARAN:
Berdasarkan CP ${fase} ${mapel} dan topik ${topik}, peserta didik mampu:
1. [Kata kerja C1 - Mengingat] + [konten spesifik] dengan [kriteria] melalui [kegiatan]
2. [Kata kerja C2 - Memahami] + [konten spesifik] dengan [kriteria] melalui [kegiatan]
3. [Kata kerja C3 - Mengaplikasikan] + [konten spesifik] dengan [kriteria] melalui [kegiatan]
4. [Kata kerja C4 - Menganalisis] + [konten spesifik] dengan [kriteria] melalui [kegiatan]

PEMAHAMAN BERMAKNA:
[2-3 kalimat: apa manfaat nyata mempelajari ${topik} dalam kehidupan sehari-hari siswa kelas ${kelas}]

PERTANYAAN PEMANTIK:
1. [Pertanyaan yang menghubungkan pengalaman siswa dengan ${topik}]
2. [Pertanyaan berbasis fenomena atau masalah nyata terkait ${topik}]
3. [Pertanyaan HOTs yang merangsang berpikir kritis tentang ${topik}]

KEGIATAN PEMBELAJARAN

PEMBUKA (15 menit)
1. Orientasi: [salam, doa, presensi, cek kesiapan belajar]
2. Apersepsi: [cerita/pertanyaan konkret yang menghubungkan pengetahuan sebelumnya dengan ${topik} - tulis narasi lengkap dialog guru-siswa]
3. Motivasi: [cara guru memotivasi dengan menunjukkan manfaat nyata ${topik}]
4. Penyampaian tujuan dan alur pembelajaran

INTI (sesuaikan durasi dengan ${waktu})
Langkah 1 - Stimulasi (... menit)
Guru : [detail kegiatan guru]
Siswa: [detail kegiatan siswa]
Media: [media yang digunakan]

Langkah 2 - Identifikasi Masalah (... menit)
Guru : [detail]
Siswa: [detail - pertanyaan yang diharapkan muncul]

Langkah 3 - Pengumpulan Data (... menit)
Guru : [detail bimbingan]
Siswa: [detail kegiatan eksplorasi/diskusi]

Langkah 4 - Pengolahan Data (... menit)
Guru : [detail]
Siswa: [detail analisis dan diskusi kelompok]

Langkah 5 - Pembuktian dan Presentasi (... menit)
Guru : [detail]
Siswa: [detail presentasi dan tanya jawab]

Langkah 6 - Kesimpulan (... menit)
Guru : [detail peran guru]
Siswa: [detail penarikan kesimpulan]

DIFERENSIASI:
Siswa sudah paham    : [kegiatan pengayaan selama pembelajaran inti]
Siswa belum paham    : [scaffolding dan pendampingan]
Gaya belajar visual  : [adaptasi untuk visual learner]
Gaya belajar kinestetik: [adaptasi untuk kinestetik learner]

PENUTUP (15 menit)
1. Refleksi siswa (jawab 3 pertanyaan):
   a. Apa yang paling menarik dari pembelajaran hari ini?
   b. Apa yang masih membingungkan?
   c. Bagaimana kamu akan menerapkan pengetahuan ini?
2. Penguatan dan klarifikasi konsep penting
3. Exit ticket: [tulis 2 soal exit ticket beserta kunci jawaban]
4. Tindak lanjut: [PR atau persiapan pertemuan berikutnya]
5. Doa dan salam

ASESMEN

ASESMEN DIAGNOSTIK (Sebelum Pembelajaran)
Tujuan: Pemetaan kemampuan awal dan gaya belajar
Bentuk: Pertanyaan lisan / kuis singkat

Soal Diagnostik 1: [pertanyaan tentang pengetahuan prasyarat ${topik}]
Interpretasi: Jika siswa menjawab benar → sudah siap, Jika salah → perlu penguatan dasar

Soal Diagnostik 2: [pertanyaan konsep dasar]
Interpretasi: [interpretasi jawaban]

Soal Diagnostik 3: [pertanyaan pengalaman sehari-hari terkait ${topik}]
Interpretasi: [interpretasi jawaban]

ASESMEN FORMATIF

A. ASESMEN KOGNITIF (Pengetahuan - Taksonomi Bloom)
Teknik: Tes tertulis, tanya jawab, kuis

Soal 1 - Mengingat (C1) - Skor 20:
[Tulis soal yang menguji hapalan/ingatan tentang ${topik}]
Jawaban: [jawaban lengkap]
Pembahasan: [penjelasan detail mengapa jawaban tersebut benar]

Soal 2 - Memahami (C2) - Skor 20:
[Tulis soal yang menguji pemahaman konsep ${topik}]
Jawaban: [jawaban lengkap]
Pembahasan: [penjelasan detail]

Soal 3 - Mengaplikasikan (C3) - Skor 20:
[Tulis soal berbasis situasi nyata yang meminta siswa menerapkan konsep ${topik}]
Jawaban: [jawaban lengkap]
Pembahasan: [penjelasan langkah penyelesaian]

Soal 4 - Menganalisis (C4/HOTs) - Skor 20:
[Tulis soal berbasis kasus/fenomena yang meminta analisis tentang ${topik}]
Jawaban: [jawaban lengkap dengan argumen analitis]
Pembahasan: [penjelasan proses berpikir analitis]

Soal 5 - Mengevaluasi (C5/HOTs) - Skor 20:
[Tulis soal yang meminta siswa menilai atau membuat keputusan terkait ${topik}]
Jawaban: [jawaban dengan evaluasi yang terukur]
Pembahasan: [penjelasan kriteria evaluasi]

Total Skor Kognitif: 100

KRITERIA PENILAIAN KOGNITIF:
Sangat Baik  (A): 91-100 → Menguasai seluruh CP dengan sangat baik, mampu berpikir HOTs
Baik         (B): 81-90  → Menguasai sebagian besar CP, mampu aplikasi dan analisis dasar
Cukup        (C): 71-80  → Menguasai CP dasar, perlu penguatan pada tingkat analisis
Perlu Bimbingan (D): 61-70 → Baru menguasai hafalan, perlu remedial pada pemahaman
Remedial     (E): < 61   → Belum menguasai CP minimal, perlu pembelajaran ulang

B. ASESMEN AFEKTIF (Sikap - Sesuai Profil Pelajar Pancasila)
Teknik: Observasi, jurnal guru, penilaian antarteman

Lembar Observasi Sikap (Skala 1-4):
Aspek 1 - [Dimensi PPP 1 yang relevan dengan ${topik}]:
Indikator: [perilaku konkret yang bisa diamati]
Skor 4 (Sangat Baik) : [deskripsi perilaku sangat baik - selalu konsisten]
Skor 3 (Baik)        : [deskripsi perilaku baik - sering muncul]
Skor 2 (Cukup)       : [deskripsi perilaku cukup - kadang-kadang]
Skor 1 (Kurang)      : [deskripsi perilaku kurang - jarang/tidak pernah]

Aspek 2 - [Dimensi PPP 2]:
Indikator: [perilaku konkret]
Skor 4: [deskripsi] | Skor 3: [deskripsi] | Skor 2: [deskripsi] | Skor 1: [deskripsi]

Aspek 3 - Gotong Royong (Kerjasama dalam kelompok):
Indikator: Aktif berkontribusi dan menghargai pendapat teman dalam diskusi ${topik}
Skor 4: Selalu aktif berkontribusi, menghargai semua pendapat, memimpin diskusi produktif
Skor 3: Sering aktif dan menghargai pendapat, sesekali perlu diingatkan
Skor 2: Kadang aktif, belum konsisten menghargai pendapat berbeda
Skor 1: Pasif dalam diskusi, cenderung tidak menghargai pendapat teman

Aspek 4 - Mandiri (Kemandirian belajar):
Indikator: Mengerjakan tugas secara mandiri tanpa bergantung pada orang lain
Skor 4: Selalu mengerjakan mandiri, berinisiatif mencari sumber lain
Skor 3: Sering mandiri, sesekali bertanya ke teman/guru
Skor 2: Masih bergantung, perlu dorongan untuk mandiri
Skor 1: Selalu bergantung, tidak mau mencoba sendiri

Aspek 5 - Bernalar Kritis:
Indikator: Mengajukan pertanyaan dan memberikan pendapat berdasarkan bukti/data
Skor 4: Selalu mengajukan pertanyaan kritis dan argumen berbasis bukti
Skor 3: Sering bernalar kritis, argumen cukup berdasar
Skor 2: Kadang bertanya, argumen masih berdasarkan pendapat pribadi
Skor 1: Jarang bertanya, menerima informasi tanpa analisis

Rumus Nilai Afektif: (Total Skor / 20) x 100
Predikat: A (91-100/SB), B (81-90/B), C (71-80/C), D (<71/K)

C. ASESMEN PSIKOMOTORIK (Keterampilan)
Teknik: Unjuk kerja, observasi kinerja, produk

Rubrik Penilaian Keterampilan:
Aspek 1 - [Keterampilan utama terkait ${topik}]:
Skor 4 (Sangat Terampil): [deskripsi kinerja sangat baik - detail dan operasional]
Skor 3 (Terampil)       : [deskripsi kinerja baik]
Skor 2 (Cukup Terampil) : [deskripsi kinerja cukup, ada kekurangan minor]
Skor 1 (Perlu Bimbingan): [deskripsi kinerja kurang, perlu pendampingan penuh]

Aspek 2 - [Keterampilan pendukung 1]:
[Deskripsi skor 4, 3, 2, 1 secara operasional]

Aspek 3 - [Keterampilan pendukung 2]:
[Deskripsi skor 4, 3, 2, 1]

Aspek 4 - Kemampuan Presentasi/Komunikasi:
Skor 4: Menyampaikan hasil dengan sangat jelas, sistematis, percaya diri, dan menarik
Skor 3: Menyampaikan dengan jelas dan sistematis, cukup percaya diri
Skor 2: Menyampaikan cukup jelas namun kurang sistematis atau kurang percaya diri
Skor 1: Menyampaikan kurang jelas, tidak sistematis, tidak percaya diri

Aspek 5 - Penggunaan Media/Alat:
Skor 4: Menggunakan media/alat dengan sangat tepat, kreatif, dan inovatif
Skor 3: Menggunakan media/alat dengan tepat
Skor 2: Menggunakan media/alat cukup tepat, ada beberapa kesalahan
Skor 1: Kurang tepat menggunakan media/alat, perlu bimbingan

Rumus Nilai Psikomotorik: (Total Skor / 20) x 100

KRITERIA PENILAIAN PSIKOMOTORIK:
Sangat Terampil  (A): 91-100
Terampil         (B): 81-90
Cukup Terampil   (C): 71-80
Perlu Bimbingan  (D): < 71 → Berikan latihan tambahan terbimbing

ASESMEN SUMATIF (Akhir Pembelajaran)
Teknik: Tes tertulis + unjuk kerja/produk

Soal Sumatif Pilihan Ganda (5 soal x 6 poin = 30 poin):
[Tulis 5 soal PG beserta 4 opsi A/B/C/D, kunci jawaban, dan pembahasan singkat masing-masing]

Soal Sumatif Uraian (2 soal):
Soal Uraian 1 (35 poin):
[Tulis soal uraian tingkat pemahaman-aplikasi]
Kunci Jawaban: [jawaban ideal dengan poin-poin kunci]
Pembahasan   : [uraian penjelasan]
Rubrik       : Skor 35-30 jika..., Skor 29-20 jika..., Skor 19-10 jika..., Skor <10 jika...

Soal Uraian 2 (35 poin) - HOTs:
[Tulis soal uraian berbasis kasus nyata terkait ${topik}]
Kunci Jawaban: [jawaban ideal dengan argumen]
Pembahasan   : [uraian berpikir tingkat tinggi]
Rubrik       : Skor 35-30 jika..., Skor 29-20 jika..., Skor 19-10 jika..., Skor <10 jika...

NILAI AKHIR SUMATIF = (Skor PG + Skor Uraian) / 100 x 100

KRITERIA KETUNTASAN SUMATIF:
Tuntas (>= 75)       : Lanjut ke materi berikutnya
Remidi Parsial (60-74): Pengulangan bagian yang belum tuntas
Remidi Total (< 60)  : Pembelajaran ulang seluruh materi ${topik}

REKAPITULASI NILAI AKHIR:
NA = (Nilai Kognitif Formatif x 30%) + (Nilai Afektif x 20%) + (Nilai Psikomotorik x 20%) + (Nilai Sumatif x 30%)

PENGAYAAN DAN REMEDIAL

PROGRAM PENGAYAAN (NA >= 80):
1. [Kegiatan pengayaan 1 - lebih mendalam dari materi reguler, terkait ${topik}]
2. [Kegiatan pengayaan 2 - berbasis proyek mini atau penelitian sederhana]
3. Sumber referensi lanjutan: [buku, website, video edukasi terkait ${topik}]
Soal Pengayaan (lebih menantang):
[Tulis 2 soal HOTs tingkat tinggi untuk pengayaan beserta kunci dan pembahasan]

PROGRAM REMEDIAL (NA < 75):
Identifikasi: [cara mendeteksi bagian yang belum dipahami - wawancara/analisis jawaban]
Strategi:
1. [Remedial teaching dengan pendekatan berbeda - misal visual/konkret]
2. Tutor sebaya: siswa yang sudah tuntas mendampingi yang belum
3. Latihan bertahap dari yang paling mudah
Soal Remedial (lebih mudah dari asesmen utama):
Soal R1: [soal mudah tentang konsep dasar ${topik}]
Jawaban: [jawaban] | Pembahasan: [penjelasan sederhana]
Soal R2: [soal mudah tingkat pemahaman]
Jawaban: [jawaban] | Pembahasan: [penjelasan sederhana]
Soal R3: [soal mudah tingkat aplikasi dasar]
Jawaban: [jawaban] | Pembahasan: [penjelasan sederhana]

REFLEKSI GURU:
Setelah pembelajaran, guru menjawab pertanyaan berikut:
1. Apakah tujuan pembelajaran tercapai? Apa buktinya? (berdasarkan hasil asesmen)
2. Bagian kegiatan mana yang paling efektif membantu siswa memahami ${topik}?
3. Kendala apa yang muncul dan bagaimana cara mengatasinya?
4. Bagaimana saya akan memodifikasi pembelajaran ${topik} untuk pertemuan/kelas berikutnya?
5. Siswa mana yang perlu perhatian khusus dan intervensi seperti apa yang tepat?

LAMPIRAN 1: LEMBAR KERJA PESERTA DIDIK (LKPD)

Judul  : Lembar Kerja - ${topik}
Kelas  : ${kelas}
Nama   : _____________________________ Tanggal: ______________
Tujuan : [sesuai tujuan pembelajaran]
Petunjuk: [instruksi pengerjaan]

Kegiatan 1 - [Judul Kegiatan Eksplorasi]:
[Deskripsi kegiatan konkret yang harus dilakukan siswa]
[Tabel/kolom untuk isian/jawaban]
Pertanyaan diskusi:
a. [pertanyaan 1]
b. [pertanyaan 2]
c. [pertanyaan 3]

Kegiatan 2 - [Judul Kegiatan Analisis]:
[Deskripsi kegiatan analisis yang lebih dalam]
[Pertanyaan analitis 2-3 soal]

Kegiatan 3 - Refleksi Diri:
a. Apa yang kamu pelajari hari ini tentang ${topik}?
b. Bagian mana yang paling menarik? Mengapa?
c. Apa yang masih ingin kamu ketahui tentang ${topik}?

LAMPIRAN 2: MATERI RINGKAS

MATERI POKOK: ${topik.toUpperCase()}
[Tulis ringkasan materi ${topik} yang komprehensif minimal 400 kata, mencakup: definisi, konsep utama, contoh nyata dalam kehidupan sehari-hari, fakta menarik, dan keterkaitan dengan materi lain. Gunakan bahasa yang mudah dipahami siswa ${kelas}]

Referensi:
1. Buku Siswa ${mapel} ${kelas} Kurikulum Merdeka, Kemendikbudristek 2024
2. SK BSKAP No. 032/H/KR/2024 tentang Capaian Pembelajaran
3. guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/
4. [sumber referensi relevan lainnya]

Dibuat dengan: Asisten Guru by Mas Gema
Berdasarkan  : SK BSKAP No. 032/H/KR/2024 Kurikulum Merdeka`;
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
    alert('Kredit habis! Silakan upgrade ke Premium.');
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
    system = getRPPSystemPrompt();
    btnId = 'btn-rpp'; label = 'Generate RPP Lengkap'; resId = 'res-rpp';

  } else if (type === 'soal') {
    const mapel = document.getElementById('soal-mapel').value || 'IPA';
    const kelas = document.getElementById('soal-kelas').value;
    const jenis = document.getElementById('soal-jenis').value;
    const jumlah = document.getElementById('soal-jumlah').value;
    const topik = document.getElementById('soal-topik').value || 'Sistem Pencernaan';
    const level = document.getElementById('soal-level').value;
    prompt = `Buatkan ${jumlah} soal ${jenis} berkualitas tinggi untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal wajib disertai jawaban lengkap dan pembahasan detail. Untuk PG sertakan 4 opsi dengan pengecoh yang masuk akal. Tulis Soal 1, Soal 2 dst. Di akhir tulis KUNCI JAWABAN. Tidak ada simbol markdown.`;
    system = 'Kamu ahli evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal berkualitas tinggi dengan pembahasan yang mendidik. Tidak ada simbol Markdown.';
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
    prompt = `Buatkan Laporan PKB formal untuk Nama: ${nama}, Mapel: ${mapel}, Kegiatan: ${kegiatan}, Refleksi: ${refleksi}. Sertakan: Pendahuluan, Pelaksanaan Kegiatan, Hasil dan Manfaat, Refleksi dan Rencana Tindak Lanjut, Penutup. Narasi formal siap dilaporkan ke kepala sekolah. Tidak ada simbol markdown.`;
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
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Modul Ajar — Asisten Guru</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;color:#000;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:12pt;margin-bottom:24pt;}
    .ht{font-size:16pt;font-weight:700;color:#7c3aed;}.hs{font-size:10pt;color:#555;margin-top:5pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">Asisten Guru by Mas Gema</div>
    <div class="hs">${currentUser ? currentUser.name + ' | ' : ''}${today}</div>
    <div class="hs">Berdasarkan SK BSKAP No. 032/H/KR/2024 Kurikulum Merdeka</div></div>
    <pre>${clean}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function downloadWord(resId) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  if (!raw) { alert('Tidak ada konten.'); return; }
  if (!docxReady || typeof docx === 'undefined') {
    alert('Library Word sedang dimuat, tunggu 3 detik lalu coba lagi.'); return;
  }
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const children = [];

    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ASISTEN GURU BY MAS GEMA', bold: true, size: 30, color: '7c3aed', font: 'Times New Roman' })], spacing: { after: 80 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (currentUser ? currentUser.name + '  |  ' : '') + today, size: 18, color: '666666', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Berdasarkan SK BSKAP No. 032/H/KR/2024 - Kurikulum Merdeka', size: 16, color: '9333ea', italics: true, font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } }, spacing: { after: 360 } }));

    raw.split('\n').forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 100 } })); return; }
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
    a.href = url;
    a.download = 'ModulAjar_AsistenGuru_' + Date.now() + '.docx';
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
