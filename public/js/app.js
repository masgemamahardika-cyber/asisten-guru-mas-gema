// ═══════════════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — 2-Stage Generate (RPP + Asesmen)
// ═══════════════════════════════════════

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

// Sync user ke Supabase supaya admin bisa lihat (fire and forget)
async function syncToSupabase(user) {
  try {
    await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'user_sync', user:{
        name:user.name, email:user.email, jenjang:user.jenjang,
        password:user.password, plan:user.plan||'gratis',
        credits:user.credits??5, total_gen:user.totalGen||0
      }})
    });
  } catch(e) { console.log('Supabase sync:', e.message); }
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
  syncToSupabase(newUser); // Sync ke Supabase agar admin bisa lihat
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
  // Sync kredit dan plan ke Supabase agar admin pantau
  syncToSupabase(currentUser);
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

// ═══════════════════════════
//  SYSTEM PROMPT + DATABASE CP
// ═══════════════════════════
function getSystemPrompt() {
  return `Kamu adalah pakar pengembang kurikulum Indonesia berpengalaman 20 tahun dari Asisten Guru by Mas Gema.

ATURAN WAJIB:
- JANGAN gunakan simbol Markdown: #, ##, **, *, ---, backtick
- Gunakan HURUF KAPITAL untuk setiap judul bagian
- Isi setiap bagian dengan konten NYATA dan LENGKAP, bukan placeholder
- Bahasa Indonesia baku yang jelas dan mudah dipahami

DATABASE CP SK BSKAP 032/H/KR/2024:

FASE A (Kelas 1-2 SD):
Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan kepada teman sebaya dan orang dewasa tentang diri dan lingkungan sekitarnya. Peserta didik menunjukkan minat terhadap teks, mampu memahami dan menyampaikan pesan, mengekspresikan perasaan dan gagasan, serta mampu membaca kata-kata yang dikenalinya sehari-hari dengan fasih.
Matematika: Peserta didik dapat melakukan operasi penjumlahan dan pengurangan bilangan cacah sampai 999. Peserta didik dapat mengenal dan menentukan panjang dan berat dengan satuan tidak baku dan satuan baku serta menyelesaikan masalah berkaitan dengan waktu.
IPAS/IPA: Peserta didik mengidentifikasi dan mengajukan pertanyaan tentang apa yang ada pada dirinya maupun kondisi di lingkungan rumah dan sekolah serta mengidentifikasi permasalahan sederhana yang berkaitan dengan kehidupan sehari-hari.

FASE B (Kelas 3-4 SD):
Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan dan konteks sosial. Peserta didik mampu memahami dan menyampaikan pesan, mengekspresikan perasaan, serta mempresentasikan informasi nonfiksi dan fiksi menggunakan beragam media.
Matematika: Peserta didik dapat melakukan operasi hitung bilangan cacah dan pecahan sederhana, menyelesaikan masalah berkaitan dengan keliling dan luas bangun datar, serta memahami konsep data dan peluang sederhana.
IPAS: Peserta didik mengidentifikasi proses perubahan wujud zat dan perubahan bentuk energi. Peserta didik mendeskripsikan keanekaragaman makhluk hidup, bagian-bagiannya, dan habitatnya serta memahami hubungan antar komponen ekosistem.
IPA: Peserta didik mengidentifikasi sifat-sifat benda, perubahan wujud zat, dan berbagai jenis gaya yang mempengaruhi gerak benda.
IPS: Peserta didik mengenal dan memahami kondisi geografis dan sosial budaya di lingkungan sekitarnya.

FASE C (Kelas 5-6 SD):
Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan, konteks sosial, akademis, dan vokasi. Peserta didik mampu memahami, mengolah, menginterpretasi, dan mengevaluasi informasi dari berbagai tipe teks tentang topik yang beragam.
Matematika: Peserta didik dapat melakukan operasi hitung bilangan cacah, bilangan desimal, bilangan negatif, dan pecahan. Peserta didik mampu mengukur luas dan volume serta menyelesaikan masalah yang berkaitan dengan bangun ruang dan data statistik.
IPAS: Peserta didik menjelaskan sistem organ pada manusia dan hewan, serta keterkaitan antara struktur dan fungsi organ tersebut. Peserta didik memahami konsep gaya, gerak, dan energi serta pengaruhnya dalam kehidupan sehari-hari. Peserta didik mendeskripsikan kondisi geografis dan sosial budaya Indonesia serta kaitannya dengan kehidupan bangsa.
IPA: Peserta didik menjelaskan sistem organ manusia dan kaitannya dengan kesehatan. Peserta didik memahami sifat-sifat listrik, magnet, dan penerapannya dalam teknologi sederhana.
IPS: Peserta didik memahami keragaman budaya, sejarah, dan kondisi geografis Indonesia serta kaitannya dengan kehidupan nasional.

FASE D (Kelas 7-9 SMP):
Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan, konteks sosial, akademis, dan vokasi. Peserta didik mampu memahami, mengolah, menginterpretasi, dan mengevaluasi berbagai tipe teks multimodal (fiksi dan nonfiksi).
Matematika: Peserta didik dapat menggunakan bilangan dalam berbagai representasi. Peserta didik mampu memahami relasi dan fungsi, persamaan linear, sistem persamaan linear dua variabel, serta menyelesaikan masalah kontekstual termasuk yang berkaitan dengan rasio, proporsi, dan persentase.
IPA: Peserta didik mengidentifikasi sifat dan karakteristik zat, mendeskripsikan prinsip dasar kimia dan fisika, serta menghubungkannya dengan fenomena alam dan teknologi. Peserta didik memahami sistem organ manusia dan mekanisme homeostasis tubuh.
IPS: Peserta didik memahami dan menganalisis kondisi geografis, kehidupan sosial-budaya, ekonomi, dan politik Indonesia dan dunia melalui berpikir historis dan kritis.
PPKn: Peserta didik menganalisis peran dan kedudukan warga negara, pentingnya berpartisipasi dalam kehidupan demokrasi, serta memahami nilai-nilai Pancasila dalam kehidupan berbangsa dan bernegara.
Bahasa Inggris: Peserta didik menggunakan bahasa Inggris untuk berkomunikasi dengan guru, teman sebaya, dan orang lain dalam berbagai macam situasi dan tujuan.

FASE E (Kelas 10 SMA):
Bahasa Indonesia: Peserta didik mampu mengevaluasi dan mengkreasi informasi berupa gagasan, pikiran, perasaan, pandangan, arahan atau pesan dari berbagai jenis teks untuk tujuan yang bervariasi.
Matematika: Peserta didik dapat menggunakan bilangan eksponen dan logaritma, komposisi fungsi, fungsi invers, trigonometri, geometri, dan statistika dasar untuk menyelesaikan berbagai masalah kontekstual.
Fisika: Peserta didik mampu menerapkan konsep vektor, kinematika, dinamika partikel, usaha dan energi, impuls dan momentum, serta gelombang dan optik dalam kehidupan sehari-hari.
Kimia: Peserta didik mampu mengamati, menyelidiki, dan menjelaskan fenomena sesuai kaidah kerja ilmiah dalam menjelaskan konsep kimia dalam kehidupan sehari-hari termasuk ikatan kimia, stoikiometri, dan larutan.
Biologi: Peserta didik memiliki kemampuan menerapkan pemahaman dan keterampilan sains dalam kehidupan nyata termasuk sel, jaringan, sistem organ, dan ekologi dasar.

FASE F (Kelas 11-12 SMA):
Bahasa Indonesia: Peserta didik mampu mengkreasi berbagai teks untuk menyampaikan pengamatan dan penilaian tentang topik yang beragam.
Matematika Lanjut: Peserta didik mampu menerapkan limit, turunan, integral, geometri analitik, dan peluang lanjut untuk menyelesaikan masalah.
Fisika: Peserta didik menganalisis penerapan hukum fisika dalam teknologi modern termasuk listrik-magnet, termodinamika, fisika modern, dan inti atom.`;
}

// ═══════════════════════════════════════
//  PROMPT BAGIAN 1: INFORMASI + KEGIATAN
// ═══════════════════════════════════════
function buildPrompt1(mapel, kelas, fase, waktu, topik, tujuan) {
  return `Buatkan MODUL AJAR Kurikulum Merdeka bagian INFORMASI UMUM dan KEGIATAN PEMBELAJARAN untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Fase: ${fase} | Topik: ${topik} | Waktu: ${waktu}
${tujuan ? 'Catatan: ' + tujuan : ''}

IDENTITAS MODUL
Nama Penyusun   : (nama guru)
Institusi       : (nama sekolah)
Tahun Pelajaran : 2024/2025
Mata Pelajaran  : ${mapel}
Fase dan Kelas  : ${fase} / ${kelas}
Topik           : ${topik}
Alokasi Waktu   : ${waktu}
Referensi CP    : SK BSKAP No. 032/H/KR/2024

CAPAIAN PEMBELAJARAN (CP) BERDASARKAN SK BSKAP 032/H/KR/2024
Capaian Pembelajaran ${mapel} ${fase}:
[Tulis narasi CP LENGKAP dan SESUNGGUHNYA untuk ${mapel} ${fase} - minimal 3 paragraf menjelaskan kompetensi akhir fase, elemen CP, dan ruang lingkup materi sesuai database CP yang kamu miliki]

Elemen CP yang Relevan dengan Topik ${topik}:
[Tulis elemen CP spesifik yang berkaitan langsung dengan ${topik}]

ALUR TUJUAN PEMBELAJARAN (ATP):
[Tulis 3-4 ATP yang menunjukkan urutan logis pembelajaran]

KOMPETENSI AWAL PESERTA DIDIK:
[Tulis 3 pengetahuan prasyarat yang harus dimiliki siswa]

PROFIL PELAJAR PANCASILA:
Pilih 3 dimensi paling relevan dan jelaskan implementasinya dalam pembelajaran ${topik}:
1. [Nama Dimensi]: [Penjelasan konkret cara pengembangan dalam kegiatan belajar ${topik}]
2. [Nama Dimensi]: [Penjelasan konkret]
3. [Nama Dimensi]: [Penjelasan konkret]

SARANA DAN PRASARANA:
[Daftar: ruangan, media, alat, bahan, sumber belajar]

MODEL DAN METODE PEMBELAJARAN:
Model     : [PBL/Discovery Learning/Inquiry - pilih yang sesuai]
Metode    : [daftar metode]
Pendekatan: Saintifik dan Diferensiasi

TUJUAN PEMBELAJARAN:
Berdasarkan CP ${fase} ${mapel} topik ${topik}, peserta didik mampu:
1. (C1-Mengingat) [tujuan spesifik dengan kriteria]
2. (C2-Memahami) [tujuan spesifik dengan kriteria]
3. (C3-Mengaplikasikan) [tujuan spesifik dengan kriteria]
4. (C4-Menganalisis) [tujuan spesifik dengan kriteria]

PEMAHAMAN BERMAKNA:
[2-3 kalimat tentang manfaat nyata ${topik} dalam kehidupan sehari-hari siswa]

PERTANYAAN PEMANTIK:
1. [Pertanyaan berbasis pengalaman siswa tentang ${topik}]
2. [Pertanyaan berbasis fenomena nyata]
3. [Pertanyaan HOTs yang merangsang rasa ingin tahu]

KEGIATAN PEMBELAJARAN

KEGIATAN PEMBUKA (15 menit)
[Tulis detail: salam/doa/presensi, apersepsi yang konkret dengan dialog guru-siswa, motivasi, penyampaian tujuan dan pertanyaan pemantik]

KEGIATAN INTI (isi sesuai waktu ${waktu})
Langkah 1 - Orientasi Masalah/Stimulasi:
Guru : [detail kegiatan guru]
Siswa: [detail kegiatan siswa]

Langkah 2 - Pengumpulan Informasi:
Guru : [detail]
Siswa: [detail eksplorasi/diskusi kelompok]

Langkah 3 - Pengolahan dan Analisis:
Guru : [detail bimbingan]
Siswa: [detail analisis dan diskusi]

Langkah 4 - Presentasi Hasil:
Guru : [detail]
Siswa: [detail presentasi dan tanya jawab antar kelompok]

Langkah 5 - Konfirmasi dan Penguatan:
Guru : [klarifikasi dan penguatan konsep kunci]
Siswa: [mencatat poin penting]

DIFERENSIASI:
Siswa sudah paham    : [kegiatan pengayaan saat inti]
Siswa belum paham    : [scaffolding dan pendampingan intensif]
Gaya belajar visual  : [adaptasi media visual]
Gaya belajar kinestetik: [adaptasi kegiatan hands-on]

KEGIATAN PENUTUP (15 menit)
[Tulis detail: refleksi siswa 3 pertanyaan, penguatan guru, exit ticket 2 soal beserta jawabannya, tindak lanjut/PR, doa dan salam]`;
}

// ════════════════════════════════════════
//  PROMPT BAGIAN 2: ASESMEN + TANDA TANGAN
// ════════════════════════════════════════
function buildPrompt2(mapel, kelas, fase, topik, waktu) {
  const today = new Date();
  const tglIndo = today.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const kota = 'Jakarta'; // default

  return `Buatkan BAGIAN ASESMEN LENGKAP untuk Modul Ajar ${mapel} ${kelas} ${fase} topik ${topik}.
Tulis semua bagian dengan konten NYATA dan LENGKAP. Jangan gunakan simbol Markdown.

ASESMEN

A. ASESMEN DIAGNOSTIK (Sebelum Pembelajaran)
Tujuan: Memetakan kemampuan awal dan gaya belajar siswa sebelum mempelajari ${topik}

Soal Diagnostik 1: [pertanyaan tentang pengetahuan dasar yang berkaitan dengan ${topik}]
Jawaban dan Interpretasi:
Jika menjawab benar  : Siswa telah memiliki dasar yang kuat, dapat langsung mengikuti pembelajaran inti
Jika menjawab salah  : Siswa perlu penguatan konsep prasyarat sebelum masuk materi inti

Soal Diagnostik 2: [pertanyaan pengalaman sehari-hari terkait ${topik}]
Jawaban dan Interpretasi:
Jika menjawab benar  : [interpretasi]
Jika menjawab salah  : [interpretasi dan tindak lanjut]

Soal Diagnostik 3: [pertanyaan minat dan motivasi belajar ${topik}]
Interpretasi: [cara guru menggunakan hasil untuk menyesuaikan pembelajaran]

B. ASESMEN FORMATIF - KOGNITIF
Teknik     : Tes Uraian
Jumlah Soal: 5 soal uraian
Waktu      : 30 menit

SOAL URAIAN 1 (Tingkat C1 - Mengingat) - Bobot 15 poin
Soal: [Tulis soal uraian yang menguji hapalan/ingatan konsep ${topik}]
Kunci Jawaban:
[Tulis kunci jawaban lengkap dan detail - minimal 4-5 kalimat]
Pembahasan:
[Tulis pembahasan mengapa jawaban tersebut benar, dengan penjelasan konsep yang mudah dipahami siswa]
Rubrik Penilaian:
Skor 15: Jawaban lengkap, tepat, dan menggunakan istilah yang benar
Skor 10: Jawaban sebagian besar benar, ada sedikit kekurangan
Skor 5 : Jawaban menunjukkan pemahaman dasar namun banyak kekurangan
Skor 0 : Tidak menjawab atau jawaban salah sepenuhnya

SOAL URAIAN 2 (Tingkat C2 - Memahami) - Bobot 15 poin
Soal: [Tulis soal uraian yang menguji pemahaman konsep ${topik} - minta siswa menjelaskan dengan kata-kata sendiri]
Kunci Jawaban:
[Tulis kunci jawaban lengkap]
Pembahasan:
[Penjelasan detail konsep yang diuji]
Rubrik Penilaian:
Skor 15: Penjelasan sangat jelas, menggunakan contoh yang tepat, kata-kata sendiri
Skor 10: Penjelasan cukup jelas, contoh ada namun kurang tepat
Skor 5 : Penjelasan masih menghapal, belum dipahami dengan baik
Skor 0 : Tidak menjawab atau salah sepenuhnya

SOAL URAIAN 3 (Tingkat C3 - Mengaplikasikan) - Bobot 20 poin
Soal: [Tulis soal berbasis situasi/kasus nyata yang meminta siswa menerapkan konsep ${topik}]
Kunci Jawaban:
[Tulis jawaban lengkap langkah demi langkah]
Pembahasan:
[Penjelasan cara penerapan konsep dalam situasi tersebut]
Rubrik Penilaian:
Skor 20: Penerapan konsep tepat, langkah-langkah benar, kesimpulan valid
Skor 15: Penerapan konsep tepat namun ada 1-2 langkah yang kurang tepat
Skor 10: Menunjukkan pemahaman konsep namun penerapan masih lemah
Skor 5 : Mencoba menerapkan namun banyak kesalahan
Skor 0 : Tidak menjawab atau tidak ada upaya penerapan konsep

SOAL URAIAN 4 (Tingkat C4 - Menganalisis/HOTs) - Bobot 25 poin
Soal: [Tulis soal berbasis kasus/fenomena nyata yang meminta analisis mendalam tentang ${topik} - gunakan konteks kehidupan sehari-hari atau isu terkini yang relevan]
Kunci Jawaban:
[Tulis jawaban analitis yang lengkap dengan argumen yang logis]
Pembahasan:
[Penjelasan proses berpikir analitis langkah demi langkah]
Rubrik Penilaian:
Skor 25: Analisis sangat mendalam, semua aspek dibahas, argumen logis dan berdasar fakta
Skor 20: Analisis baik, sebagian besar aspek dibahas, argumen cukup logis
Skor 15: Analisis cukup, beberapa aspek terlewat, argumen kurang kuat
Skor 10: Analisis dangkal, lebih banyak deskripsi daripada analisis
Skor 0 : Tidak menjawab atau tidak ada upaya analisis

SOAL URAIAN 5 (Tingkat C5 - Mengevaluasi/HOTs) - Bobot 25 poin
Soal: [Tulis soal yang meminta siswa menilai, membuat keputusan, atau memberikan solusi terkait masalah nyata yang berkaitan dengan ${topik}]
Kunci Jawaban:
[Tulis jawaban evaluatif yang lengkap dengan kriteria penilaian yang jelas]
Pembahasan:
[Penjelasan kriteria evaluasi dan mengapa suatu keputusan/solusi lebih baik dari yang lain]
Rubrik Penilaian:
Skor 25: Evaluasi sangat tepat, kriteria jelas, didukung data/bukti yang relevan, solusi inovatif
Skor 20: Evaluasi baik, kriteria ada, didukung alasan yang logis
Skor 15: Evaluasi cukup, ada kriteria namun kurang didukung bukti
Skor 10: Evaluasi masih berupa pendapat tanpa kriteria yang jelas
Skor 0 : Tidak menjawab atau tidak ada upaya evaluasi

TOTAL NILAI KOGNITIF = Skor Soal 1 + Skor Soal 2 + Skor Soal 3 + Skor Soal 4 + Skor Soal 5
Total Maksimal: 100 poin

Kriteria Nilai Kognitif:
Sangat Baik  (A): 91-100 poin - Menguasai seluruh CP, mampu berpikir HOTs dengan sangat baik
Baik         (B): 81-90 poin  - Menguasai sebagian besar CP, mampu analisis dan evaluasi dasar
Cukup        (C): 71-80 poin  - Menguasai CP dasar, perlu penguatan pada tingkat analisis
Perlu Bimbingan: 61-70 poin  - Baru menguasai hafalan, perlu remedial pada pemahaman
Remedial     (E): < 61 poin   - Belum menguasai CP minimal, perlu pembelajaran ulang

C. ASESMEN FORMATIF - AFEKTIF (SIKAP)
Teknik    : Observasi oleh guru selama pembelajaran
Instrumen : Lembar Observasi Sikap

RUBRIK PENILAIAN AFEKTIF

Aspek 1: [Dimensi PPP 1 yang paling relevan dengan ${topik}]
Indikator : [Perilaku konkret yang dapat diamati guru selama pembelajaran ${topik}]
Skor 4 (Sangat Baik) : [Deskripsi perilaku sangat baik - selalu konsisten, menjadi contoh bagi teman]
Skor 3 (Baik)        : [Deskripsi perilaku baik - sering muncul, hanya sesekali perlu pengingat]
Skor 2 (Cukup)       : [Deskripsi perilaku cukup - kadang-kadang muncul, perlu dorongan guru]
Skor 1 (Kurang)      : [Deskripsi perilaku kurang - jarang muncul, perlu bimbingan intensif]

Aspek 2: [Dimensi PPP 2 yang relevan]
Indikator : [Perilaku konkret]
Skor 4 (Sangat Baik) : [Deskripsi spesifik]
Skor 3 (Baik)        : [Deskripsi spesifik]
Skor 2 (Cukup)       : [Deskripsi spesifik]
Skor 1 (Kurang)      : [Deskripsi spesifik]

Aspek 3: Gotong Royong - Kerjasama dalam Kelompok
Indikator : Aktif berkontribusi dan menghargai pendapat teman saat diskusi ${topik}
Skor 4 (Sangat Baik) : Selalu aktif memimpin diskusi, mendengarkan semua pendapat, mencari solusi bersama
Skor 3 (Baik)        : Sering aktif berdiskusi, menghargai pendapat orang lain, sesekali perlu diingatkan
Skor 2 (Cukup)       : Ikut serta dalam diskusi namun belum konsisten, kadang mendominasi atau pasif
Skor 1 (Kurang)      : Pasif dalam diskusi, tidak menghargai pendapat teman, perlu pendampingan

Aspek 4: Mandiri - Kemandirian Belajar
Indikator : Mengerjakan tugas dan mencari informasi secara mandiri tanpa bergantung berlebihan
Skor 4 (Sangat Baik) : Selalu berinisiatif mencari sumber lain, mengerjakan mandiri, membantu teman
Skor 3 (Baik)        : Sering mengerjakan mandiri, hanya bertanya jika benar-benar perlu
Skor 2 (Cukup)       : Masih sering bertanya sebelum mencoba sendiri, perlu dorongan
Skor 1 (Kurang)      : Selalu bergantung pada guru atau teman, tidak mau mencoba sendiri

Aspek 5: Bernalar Kritis
Indikator : Mengajukan pertanyaan kritis dan memberikan argumen berdasarkan bukti/data tentang ${topik}
Skor 4 (Sangat Baik) : Selalu mengajukan pertanyaan yang tajam, argumen selalu berbasis bukti dan logis
Skor 3 (Baik)        : Sering bernalar kritis, argumen cukup berdasar, pertanyaan relevan
Skor 2 (Cukup)       : Kadang bertanya kritis, sebagian argumen berdasar pendapat pribadi
Skor 1 (Kurang)      : Jarang bertanya, menerima informasi apa adanya tanpa analisis

Rumus Nilai Afektif = (Total Skor / 20) x 100
Kriteria: A (91-100/Sangat Baik), B (81-90/Baik), C (71-80/Cukup), D (<71/Kurang-Perlu Pembinaan)

Lembar Rekapitulasi Observasi Afektif:
No | Nama Siswa | Aspek 1 | Aspek 2 | Aspek 3 | Aspek 4 | Aspek 5 | Total | Nilai | Predikat
1  | .......... |    /4   |    /4   |    /4   |    /4   |    /4   |  /20  |       |
2  | .......... |    /4   |    /4   |    /4   |    /4   |    /4   |  /20  |       |
(dst)

D. ASESMEN FORMATIF - PSIKOMOTORIK (KETERAMPILAN)
Teknik    : Observasi unjuk kerja dan penilaian produk/hasil kerja siswa
Instrumen : Rubrik Penilaian Keterampilan

RUBRIK PENILAIAN PSIKOMOTORIK

Aspek 1: [Keterampilan utama yang paling relevan dengan ${topik} - sesuaikan dengan kegiatan inti]
Indikator : [Kinerja konkret yang dapat diamati]
Skor 4 (Sangat Terampil) : [Deskripsi kinerja sangat baik - akurat, efisien, kreatif, mandiri]
Skor 3 (Terampil)        : [Deskripsi kinerja baik - sebagian besar benar, sedikit bantuan]
Skor 2 (Cukup Terampil)  : [Deskripsi kinerja cukup - perlu beberapa koreksi, butuh bimbingan]
Skor 1 (Perlu Bimbingan) : [Deskripsi kinerja kurang - banyak kesalahan, butuh pendampingan penuh]

Aspek 2: [Keterampilan teknis 2 terkait ${topik}]
Indikator : [kinerja yang diamati]
Skor 4 (Sangat Terampil) : [deskripsi spesifik dan operasional]
Skor 3 (Terampil)        : [deskripsi spesifik]
Skor 2 (Cukup Terampil)  : [deskripsi spesifik]
Skor 1 (Perlu Bimbingan) : [deskripsi spesifik]

Aspek 3: [Keterampilan berpikir/analisis dalam praktik terkait ${topik}]
Skor 4 (Sangat Terampil) : Mampu mengidentifikasi masalah, menganalisis, dan membuat solusi yang tepat secara mandiri
Skor 3 (Terampil)        : Mampu menganalisis dengan panduan minimal, solusi cukup tepat
Skor 2 (Cukup Terampil)  : Mampu mengikuti langkah analisis namun perlu banyak bimbingan
Skor 1 (Perlu Bimbingan) : Belum mampu menganalisis, hanya mengikuti instruksi dasar

Aspek 4: Kemampuan Presentasi dan Komunikasi
Indikator : Menyampaikan hasil kerja tentang ${topik} secara jelas dan sistematis
Skor 4 (Sangat Terampil) : Presentasi sangat jelas, sistematis, percaya diri, menggunakan media efektif, mampu menjawab pertanyaan
Skor 3 (Terampil)        : Presentasi jelas dan sistematis, cukup percaya diri, menjawab sebagian besar pertanyaan
Skor 2 (Cukup Terampil)  : Presentasi cukup jelas namun kurang sistematis atau kurang percaya diri
Skor 1 (Perlu Bimbingan) : Presentasi kurang jelas, tidak sistematis, tidak percaya diri

Aspek 5: Ketepatan Penggunaan Alat/Media/Sumber Belajar
Skor 4 (Sangat Terampil) : Menggunakan semua alat/media dengan sangat tepat, efisien, dan kreatif
Skor 3 (Terampil)        : Menggunakan alat/media dengan tepat, beberapa penggunaan kurang optimal
Skor 2 (Cukup Terampil)  : Menggunakan alat/media dengan cukup tepat, ada beberapa kesalahan
Skor 1 (Perlu Bimbingan) : Kurang tepat menggunakan alat/media, perlu demonstrasi ulang

Rumus Nilai Psikomotorik = (Total Skor / 20) x 100
Kriteria:
Sangat Terampil (A): 91-100 - Kompeten penuh, dapat dijadikan tutor sebaya
Terampil (B)       : 81-90  - Kompeten, sesekali perlu bimbingan
Cukup Terampil (C) : 71-80  - Cukup kompeten, perlu latihan tambahan
Perlu Bimbingan (D): < 71   - Belum kompeten, perlu program remedial keterampilan

Lembar Rekapitulasi Psikomotorik:
No | Nama Siswa | Aspek 1 | Aspek 2 | Aspek 3 | Aspek 4 | Aspek 5 | Total | Nilai | Predikat
1  | .......... |    /4   |    /4   |    /4   |    /4   |    /4   |  /20  |       |
2  | .......... |    /4   |    /4   |    /4   |    /4   |    /4   |  /20  |       |
(dst)

REKAPITULASI NILAI AKHIR
Komponen           | Bobot | Nilai | Nilai Tertimbang
Kognitif (Uraian)  | 40%   |       |
Afektif (Sikap)    | 30%   |       |
Psikomotorik       | 30%   |       |
NILAI AKHIR        | 100%  |       |

Rumus: Nilai Akhir = (Kognitif x 0,4) + (Afektif x 0,3) + (Psikomotorik x 0,3)
Kriteria Ketuntasan Minimum (KKM): 75

E. PROGRAM REMEDIAL
Sasaran   : Peserta didik dengan Nilai Akhir < 75
Waktu     : [Setelah pembelajaran / di luar jam pelajaran]
Pendekatan: Pembelajaran dengan metode dan media berbeda dari kegiatan utama

Identifikasi Kebutuhan:
Nilai 61-74 (Remidi Parsial) : Pengulangan pada bagian ${topik} yang belum dikuasai
Nilai < 61  (Remidi Total)   : Pembelajaran ulang seluruh materi ${topik} dengan pendekatan berbeda

Kegiatan Remedial:
1. Pembelajaran ulang dengan pendekatan konkret/visual yang lebih sederhana
2. Tutor sebaya: siswa yang sudah tuntas mendampingi siswa yang belum
3. Latihan soal bertahap dari yang paling mudah

Soal Remedial (Tingkat Lebih Mudah):
Soal R1: [Soal mudah C1 tentang konsep dasar ${topik}]
Kunci   : [Jawaban lengkap]
Pembahasan: [Penjelasan sederhana yang mudah dipahami]

Soal R2: [Soal mudah C2 tentang pemahaman dasar ${topik}]
Kunci   : [Jawaban lengkap]
Pembahasan: [Penjelasan sederhana]

Soal R3: [Soal C3 aplikasi sederhana terkait ${topik}]
Kunci   : [Jawaban lengkap]
Pembahasan: [Penjelasan langkah-langkah sederhana]

F. PROGRAM PENGAYAAN
Sasaran   : Peserta didik dengan Nilai Akhir >= 80
Tujuan    : Memperluas dan memperdalam pemahaman ${topik}
Prinsip   : Tidak memberi soal yang sama, melainkan perluasan materi

Kegiatan Pengayaan:
1. [Kegiatan lebih menantang berbasis proyek mini terkait ${topik}]
2. [Kegiatan berbasis penelitian/eksplorasi mandiri]
3. Menjadi tutor sebaya untuk membantu teman yang remedial

Soal Pengayaan (Tingkat HOTs Lebih Tinggi):
Soal P1: [Soal HOTs C6-Kreasi yang menantang tentang ${topik} - meminta siswa membuat sesuatu atau merancang solusi]
Kunci   : [Jawaban ideal/kunci pokok]
Pembahasan: [Penjelasan proses berpikir kreatif yang diharapkan]

Referensi untuk Pengayaan Mandiri:
1. Buku Siswa ${mapel} ${kelas} Kurikulum Merdeka 2024 - Kemendikbudristek
2. guru.kemdikbud.go.id/kurikulum/referensi-penerapan/capaian-pembelajaran/
3. [Sumber digital/video edukasi relevan tentang ${topik}]

G. REFLEKSI GURU
Setelah pembelajaran berlangsung, guru menjawab:
1. Apakah seluruh tujuan pembelajaran tercapai berdasarkan hasil asesmen? Apa buktinya?
2. Kegiatan mana yang paling efektif membantu siswa memahami ${topik}?
3. Kendala apa yang muncul dan bagaimana cara mengatasinya ke depan?
4. Modifikasi apa yang akan dilakukan untuk pembelajaran ${topik} berikutnya?

═══════════════════════════════════════════════
LEMBAR PENGESAHAN
═══════════════════════════════════════════════

Mengetahui,                         ${kota}, ${tglIndo}
Kepala Sekolah                      Guru ${mapel}




_______________________             _______________________
NIP.                                NIP.

Catatan Kepala Sekolah:
.....................................................................
.....................................................................

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
    .replace(/^={4,}.*$/gm, '<hr style="border:none;border-top:2px solid #7c3aed;margin:14px 0;">')
    .replace(/\n/g, '<br>');
}

function setButtonLoading(btnId, loading, label, step) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    const steps = ['Tahap 1/2: Membuat RPP & Kegiatan...', 'Tahap 2/2: Membuat Asesmen Lengkap...'];
    btn.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div> ${steps[step || 0]}`;
  } else {
    btn.innerHTML = '▶ ' + label;
  }
}

async function generateAI(type) {
  if (!canGenerate()) {
    alert('Kredit habis! Silakan upgrade ke Premium.');
    goPage('upgrade');
    return;
  }

  if (type === 'rpp') {
    await generateRPP();
    return;
  }

  let prompt = '', system = '', btnId = '', label = '', resId = '';

  if (type === 'soal') {
    const mapel = document.getElementById('soal-mapel').value || 'IPA';
    const kelas = document.getElementById('soal-kelas').value;
    const jenis = document.getElementById('soal-jenis').value;
    const jumlah = document.getElementById('soal-jumlah').value;
    const topik = document.getElementById('soal-topik').value || 'Sistem Pencernaan';
    const level = document.getElementById('soal-level').value;
    prompt = `Buatkan ${jumlah} soal ${jenis} berkualitas tinggi untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB disertai jawaban lengkap dan pembahasan detail. Untuk PG sertakan 4 opsi dengan pengecoh yang masuk akal. Tulis Soal 1, Soal 2 dst. Di akhir tulis KUNCI JAWABAN. Tidak ada simbol markdown.`;
    system = 'Kamu ahli evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal berkualitas tinggi dengan pembahasan mendidik. Tidak ada simbol Markdown.';
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
    prompt = `Buatkan Laporan PKB formal untuk Nama: ${nama}, Mapel: ${mapel}, Kegiatan: ${kegiatan}, Refleksi: ${refleksi}. Sertakan: Pendahuluan, Pelaksanaan Kegiatan, Hasil dan Manfaat, Refleksi dan RTL, Penutup. Narasi formal siap dilaporkan. Tidak ada simbol markdown.`;
    system = 'Kamu asisten penulisan laporan profesional dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.';
    btnId = 'btn-pkb'; label = 'Generate Laporan PKB'; resId = 'res-pkb';
  }

  setButtonLoading(btnId, true, label, 0);
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

  setButtonLoading(btnId, false, label, 0);
}

// ═══════════════════════════
//  GENERATE RPP 2 TAHAP
// ═══════════════════════════
async function generateRPP() {
  const mapel = document.getElementById('rpp-mapel').value || 'IPA';
  const kelas = document.getElementById('rpp-kelas').value;
  const kur = document.getElementById('rpp-kur').value;
  const waktu = document.getElementById('rpp-waktu').value;
  const topik = document.getElementById('rpp-topik').value || 'Sistem Pencernaan';
  const tujuan = document.getElementById('rpp-tujuan').value;
  const fase = getFase(kelas);
  const system = getSystemPrompt();
  const resEl = document.getElementById('res-rpp');

  resEl.innerHTML = '';
  resEl.classList.remove('show');

  // TAHAP 1: RPP Body
  setButtonLoading('btn-rpp', true, 'Generate RPP Lengkap', 0);
  resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;">
    <div style="font-size:24px;margin-bottom:.5rem;">⏳</div>
    <div style="font-weight:600;margin-bottom:4px;">Tahap 1/2: Membuat RPP & Kegiatan Pembelajaran...</div>
    <div style="font-size:11px;color:#7c7490;">Mohon tunggu 30-40 detik</div>
  </div>`;
  resEl.classList.add('show');

  let part1 = '';
  try {
    part1 = await callAPI(buildPrompt1(mapel, kelas, fase, waktu, topik, tujuan), system);
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
    return;
  }

  // TAHAP 2: Asesmen Lengkap
  setButtonLoading('btn-rpp', true, 'Generate RPP Lengkap', 1);
  resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;">
    <div style="font-size:24px;margin-bottom:.5rem;">📝</div>
    <div style="font-weight:600;margin-bottom:4px;">Tahap 2/2: Membuat Asesmen, Remedial & Tanda Tangan...</div>
    <div style="font-size:11px;color:#7c7490;">Hampir selesai, mohon tunggu 30-40 detik lagi</div>
  </div>`;

  let part2 = '';
  try {
    part2 = await callAPI(buildPrompt2(mapel, kelas, fase, topik, waktu), system);
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
    return;
  }

  // Gabung hasil
  const fullResult = part1 + '\n\n' + part2;
  showResult('res-rpp', fullResult);
  useCredit();
  setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
}

function showResult(resId, text) {
  const el = document.getElementById(resId);
  el.classList.add('show');
  el.dataset.raw = text;
  el.innerHTML = `
    <div class="result-label">Hasil — RPP Lengkap Kurikulum Merdeka</div>
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
    <style>
      body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;color:#000;line-height:1.85;}
      .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:12pt;margin-bottom:24pt;}
      .ht{font-size:16pt;font-weight:700;color:#7c3aed;}
      .hs{font-size:10pt;color:#555;margin-top:4pt;}
      pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
      @media print{@page{margin:2.5cm;size:A4;}}
    </style></head><body>
    <div class="hd">
      <div class="ht">MODUL AJAR — ASISTEN GURU BY MAS GEMA</div>
      <div class="hs">${currentUser ? currentUser.name : 'Guru'} | ${today}</div>
      <div class="hs">Berdasarkan SK BSKAP No. 032/H/KR/2024 Kurikulum Merdeka</div>
    </div>
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

    // HEADER
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MODUL AJAR', bold: true, size: 32, color: '7c3aed', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ASISTEN GURU BY MAS GEMA', bold: true, size: 26, color: '7c3aed', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (currentUser ? currentUser.name + '  |  ' : '') + today, size: 20, color: '555555', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Berdasarkan SK BSKAP No. 032/H/KR/2024 — Kurikulum Merdeka', size: 18, color: '9333ea', italics: true, font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } }, spacing: { after: 400 } }));

    // KONTEN
    raw.split('\n').forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 120 } })); return; }

      if (/^={4,}/.test(line)) {
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '7c3aed', space: 1 } }, spacing: { before: 200, after: 120 } }));
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
      const isAllCaps = clean === clean.toUpperCase() && clean.length > 4 && /[A-Z]/.test(clean) && !/^\d/.test(clean) && !/^[A-D]\./.test(clean) && !/^(NIP|No\.|Skor)/.test(clean);
      const parts = clean.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.filter(p => p).map(p => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return new TextRun({ text: p.replace(/\*\*/g, ''), bold: true, size: 22, font: 'Times New Roman', color: '1a1523' });
        return new TextRun({ text: p.replace(/\*\*/g, ''), bold: isAllCaps, size: isAllCaps ? 23 : 22, font: 'Times New Roman', color: isAllCaps ? '3b0764' : '1a1523' });
      });
      children.push(new Paragraph({ children: runs.length ? runs : [new TextRun({ text: clean, size: 22, font: 'Times New Roman' })], spacing: { before: isAllCaps ? 240 : 60, after: 60 } }));
    });

    // FOOTER
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
