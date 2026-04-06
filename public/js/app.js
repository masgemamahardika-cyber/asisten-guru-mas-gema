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

async function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  const err = document.getElementById('l-err');
  const btn = document.getElementById('btn-login');
  if (!email || !pass) { err.textContent = 'Email dan password wajib diisi.'; return; }

  // Coba localStorage dulu
  const localUser = getUsers().find(u => u.email === email && u.password === pass);
  if (localUser) {
    err.textContent = '';
    saveSession(localUser);
    enterApp(localUser);
    return;
  }

  // Jika gagal di localStorage, coba Supabase (untuk user yang password-nya di-reset admin)
  if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa...'; }
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'user_login', email, password: pass })
    });
    const data = await res.json();
    if (res.ok && data.user) {
      // Sync dari Supabase ke localStorage (termasuk password baru)
      const users = getUsers();
      const idx = users.findIndex(u => u.email === email);
      const freshUser = { ...data.user, password: pass, totalGen: data.user.total_gen || 0 };
      if (idx > -1) { users[idx] = { ...users[idx], ...freshUser }; }
      else { users.push(freshUser); }
      saveUsers(users);
      err.textContent = '';
      saveSession(freshUser);
      enterApp(freshUser);
    } else {
      err.textContent = 'Email atau password salah.';
    }
  } catch(e) {
    err.textContent = 'Email atau password salah.';
  }
  if (btn) { btn.disabled = false; btn.textContent = 'Masuk ke Asisten Guru'; }
}

// Sync user ke Supabase supaya admin bisa lihat (fire and forget)
async function syncToSupabase(user) {
  try {
    await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'user_sync', user:{
        name:user.name, email:user.email, jenjang:user.jenjang,
        password:user.password, plan:user.plan||'gratis',
        credits:user.credits??5, total_gen:user.totalGen||0,
        wa:user.wa||'', deviceId:user.deviceId||''
      }})
    });
  } catch(e) { console.log('Supabase sync:', e.message); }
}

// Device fingerprint anti-abuse
function getDeviceId() {
  let did = localStorage.getItem('ag_device_id');
  if (!did) {
    did = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem('ag_device_id', did);
  }
  return did;
}

function doRegister() {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const waRaw = document.getElementById('r-wa')?.value.trim() || '';
  const jenjang = document.getElementById('r-jenjang').value;
  const pass = document.getElementById('r-pass').value;
  const err = document.getElementById('r-err');
  const ok = document.getElementById('r-ok');
  err.textContent = ''; ok.textContent = '';

  if (!name || !email || !pass) { err.textContent = 'Semua field wajib diisi.'; return; }
  if (!waRaw) { err.textContent = 'No. WhatsApp wajib diisi untuk verifikasi akun.'; return; }
  if (pass.length < 6) { err.textContent = 'Password minimal 6 karakter.'; return; }

  // Format WA — pastikan angka saja
  const waClean = waRaw.replace(/\D/g, '');
  if (waClean.length < 9) { err.textContent = 'No. WhatsApp tidak valid.'; return; }
  const wa = '62' + (waClean.startsWith('0') ? waClean.slice(1) : waClean.startsWith('62') ? waClean.slice(2) : waClean);

  const users = getUsers();
  if (users.find(u => u.email === email)) { err.textContent = 'Email sudah terdaftar.'; return; }

  // Cek WA sudah dipakai akun lain
  if (users.find(u => u.wa === wa)) {
    err.textContent = 'Nomor WhatsApp ini sudah terdaftar di akun lain.';
    return;
  }

  // Cek device fingerprint — sudah pernah daftar dari perangkat ini?
  const deviceId = getDeviceId();
  const deviceUsed = users.find(u => u.deviceId === deviceId);
  if (deviceUsed) {
    err.textContent = '⚠️ Perangkat ini sudah memiliki akun (' + deviceUsed.email + '). Silakan login atau hubungi admin.';
    return;
  }

  const newUser = {
    name, email, wa, jenjang, password: pass,
    plan: 'gratis', credits: 5, totalGen: 0,
    deviceId,
    registeredAt: new Date().toISOString()
  };
  users.push(newUser);
  saveUsers(users);
  syncToSupabase(newUser);
  ok.textContent = '✓ Berhasil daftar! Silakan masuk.';
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
  // Tampilkan badge histori
  const hist = loadHistory();
  updateHistoryBadge(hist.length);
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
  rpp: { title: '📘 Generator Modul Ajar', sub: 'Modul Ajar Kurikulum Merdeka + CP + Asesmen' },
  soal: { title: '✅ Generator Soal', sub: 'Soal + kunci + pembahasan otomatis' },
  kisi: { title: '📊 Kisi-Kisi → Soal', sub: 'Tabel kisi-kisi resmi → soal tersambung otomatis' },
  admin: { title: '📋 Asisten Administrasi', sub: 'Dokumen guru siap pakai dalam 1 klik' },
  pkb: { title: '⭐ Laporan PKB', sub: 'Laporan pengembangan keprofesian profesional' },
  medsos: { title: '📱 Konten Medsos', sub: 'Bangun personal branding & monetize' },
  histori: { title: '📂 Histori Generate', sub: 'Semua hasil generate kamu tersimpan di sini' },
  upgrade: { title: '⚡ Upgrade Premium', sub: 'Generate tanpa batas untuk semua tools' },
};

function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  [...document.querySelectorAll('.nav-item')].find(n => n.getAttribute('onclick') === `goPage('${id}')`)?.classList.add('active');
  const info = PAGE_INFO[id] || {};
  document.getElementById('tb-title').textContent = info.title || id;
  document.getElementById('tb-sub').textContent = info.sub || '';
  // Render halaman histori saat dibuka
  if (id === 'histori') renderHistoryPage();
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
1. Buku Siswa ${mapel} ${kelas} Kurikulum Merdeka 2024
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

// Label judul per jenis hasil
const RESULT_LABELS = {
  'res-rpp': '📘 Hasil Modul Ajar',
  'res-soal': '✅ Hasil Generator Soal',
  'res-admin': '📋 Hasil Dokumen Administrasi',
  'res-pkb': '⭐ Hasil Laporan PKB',
  'res-medsos': '📱 Hasil Konten Medsos',
  'res-kisi': '📊 Hasil Kisi-Kisi Soal',
  'res-soal-kisi': '✅ Soal dari Kisi-Kisi',
};

function showResult(resId, text) {
  const el = document.getElementById(resId);
  el.classList.add('show');
  el.dataset.raw = text;
  // Simpan meta identitas supaya Word download bisa pakai
  if (resId === 'res-rpp') {
    el.dataset.sekolah = document.getElementById('rpp-sekolah')?.value || '';
    el.dataset.guru    = document.getElementById('rpp-guru')?.value || '';
    el.dataset.kepsek  = document.getElementById('rpp-kepsek')?.value || '';
    el.dataset.mapel   = document.getElementById('rpp-mapel')?.value || '';
  }
  const label = RESULT_LABELS[resId] || 'Hasil';
  el.innerHTML = `
    <div class="result-label">${label}</div>
    <div style="font-size:13px;line-height:1.85;color:#1a1523;">${renderDisplay(text)}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyResult('${resId}',this)">📋 Salin teks</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('${resId}')">🖨️ Print</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}')">⬇ Download Word</button>
    </div>`;
  // Simpan ke histori otomatis
  saveHistory(resId, text);
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
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
            AlignmentType, BorderStyle, WidthType, ShadingType } = docx;
    const today = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });

    const children = [];

    // === HEADER ===
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MODUL AJAR', bold: true, size: 34, color: '7c3aed', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Asisten Guru by Mas Gema', size: 22, color: '5b21b6', font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } }, spacing: { after: 400 } }));

    // === PROSES BARIS PER BARIS ===
    const lines = raw.split('\n');
    let i = 0;

    // Helper buat sel tabel Word
    const mkCell = (text, opts = {}) => new TableCell({
      width: opts.w ? { size: opts.w, type: WidthType.PERCENTAGE } : undefined,
      shading: opts.bg ? { type: ShadingType.SOLID, color: opts.bg } : undefined,
      children: [new Paragraph({
        alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text: String(text||''), bold: !!opts.bold, size: opts.size || 20, color: opts.color || '1a1523', font: 'Times New Roman' })]
      })]
    });

    // Helper baris identitas (Nama Sekolah : ...)
    const isIdentitas = (l) => /^(Nama Penyusun|Nama Sekolah|Tahun Pelajaran|Fase\/Kelas|Semester|Mata Pelajaran|Materi Ajar|Waktu Pelaksanaan|Alokasi Waktu)\s*:/.test(l.trim());

    // Helper deteksi baris tabel (mengandung | dan minimal 3 kolom)
    const isTabelLine = (l) => {
      const t = l.trim();
      return t.includes('|') && t.split('|').filter(c => c.trim()).length >= 3;
    };

    // Helper deteksi TTD
    const isTTDStart = (l) => /^(Cirebon|Jakarta|Bandung|Surabaya|Yogyakarta|Semarang|Medan|Makassar|Palembang|[A-Z][a-z]+(,?\s+\d{1,2}\s+[A-Z][a-z]+\s+\d{4}))/i.test(l.trim()) || /^Mengetahui/i.test(l.trim());

    // Kumpulkan blok tabel
    const flushTable = (tableLines) => {
      if (!tableLines.length) return;
      const allCols = tableLines.map(l => l.trim().split('|').map(c=>c.trim()).filter(c=>c));
      if (!allCols.length) return;

      // Tentukan header: baris pertama yang mengandung kata kunci header
      const headerKeywords = /^(no|indikator|aspek|keterampilan|nama siswa|rentang|jawaban|aspek yang|no\.|mata pelajaran)/i;
      let hIdx = allCols.findIndex(cols => cols.length > 1 && headerKeywords.test(cols[0]));
      if (hIdx === -1) hIdx = 0;

      const headerCols = allCols[hIdx];
      const dataLines = allCols.filter((_, idx) => idx !== hIdx && !/^[-|]+$/.test(tableLines[idx]?.trim()));

      // Level color mapping
      const levelBg = {'C1':'dbeafe','C2':'e0f2fe','C3':'d1fae5','C4':'fef3c7','C5':'fce7f3','C6':'f3e8ff'};
      const getLC = (t) => { for (const [k,v] of Object.entries(levelBg)) { if(t.includes(k)) return v; } return null; };

      const colW = Math.floor(100 / headerCols.length);

      const hRow = new TableRow({ tableHeader: true, children: headerCols.map(h =>
        mkCell(h, { w: colW, bg: '7c3aed', bold: true, size: 18, color: 'ffffff', center: true })
      )});

      const dRows = dataLines.map((cols, ri) => {
        const evenBg = ri % 2 === 1 ? 'f9f9f9' : 'ffffff';
        return new TableRow({ children: headerCols.map((_, ci) => {
          const val = cols[ci] || '';
          const lvlBg = getLC(val);
          return mkCell(val, { w: colW, bg: lvlBg || evenBg, bold: ci===0 || !!lvlBg, size: 18, center: ci===0 || !!lvlBg });
        })});
      });

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hRow, ...dRows] }));
      children.push(new Paragraph({ spacing: { after: 120 } }));
    };

    // Blok TTD dalam kotak 2 kolom
    const makeTTD = (kepsekName, guruName, sekolah, mapel, kota, tgl) => {
      const left = `Mengetahui,\nKepala ${sekolah||'Sekolah'}\n\n\n\n${kepsekName||'_______________________________'}\nNIP. ___________________________`;
      const right = `${kota||'[Kota]'}, ${tgl}\nGuru ${mapel||'Mata Pelajaran'}\n\n\n\n${guruName||'_______________________________'}\nNIP. ___________________________`;

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: left.split('\n').map(t => new Paragraph({ children: [new TextRun({ text: t, size: 20, font: 'Times New Roman', bold: t.startsWith('NIP')||t.includes('Kepala')||t.includes('Guru') ? false : /[A-Z]{3,}/.test(t) })] })) }),
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: right.split('\n').map(t => new Paragraph({ children: [new TextRun({ text: t, size: 20, font: 'Times New Roman' })] })) }),
        ]})]
      });
    };

    // Ambil meta dari dataset jika ada
    const el = document.getElementById(resId);
    const metaSekolah = el?.dataset.sekolah || '';
    const metaGuru = el?.dataset.guru || '';
    const metaKepsek = el?.dataset.kepsek || '';
    const metaMapel = el?.dataset.mapel || '';

    let pendingTableLines = [];
    let ttdDetected = false;
    let ttdLines = [];

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Baris tabel
      if (isTabelLine(trimmed)) {
        if (pendingTableLines.length === 0 || isTabelLine(lines[i-1]?.trim()||'')) {
          pendingTableLines.push(trimmed);
          i++; continue;
        }
      }
      // Flush tabel jika baris bukan tabel lagi
      if (pendingTableLines.length > 0) {
        flushTable(pendingTableLines);
        pendingTableLines = [];
      }

      // Kosong
      if (!trimmed) { children.push(new Paragraph({ spacing: { after: 80 } })); i++; continue; }

      // Garis pembatas
      if (/^[=\-]{4,}$/.test(trimmed)) {
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'ddd6fe', space: 1 } }, spacing: { before: 80, after: 80 } }));
        i++; continue;
      }

      // LEMBAR_PENGESAHAN marker
      if (/^LEMBAR_PENGESAHAN/.test(trimmed)) {
        children.push(new Paragraph({ spacing: { before: 400 } }));
        children.push(new Paragraph({ children: [new TextRun({ text: 'LEMBAR PENGESAHAN', bold: true, size: 24, color: '7c3aed', font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '7c3aed', space: 1 } }, spacing: { after: 200 } }));
        // Buat TTD kotak dari meta
        children.push(makeTTD(metaKepsek, metaGuru, metaSekolah, metaMapel, '', today));
        i++; continue;
      }

      // Deteksi TTD inline (kota, tanggal)
      if (isTTDStart(trimmed) && !ttdDetected) {
        ttdDetected = true;
        // Kumpulkan 8 baris berikutnya untuk blok TTD
        const ttdBlock = [];
        for (let j = 0; j < 10 && i+j < lines.length; j++) {
          ttdBlock.push(lines[i+j].trim());
        }
        // Extract nama kepsek dan guru dari blok
        const namaPattern = /^[A-Z][a-zA-Z\s.,]+,?\s+[MS]\.[A-Za-z]+\.?$/;
        const namaList = ttdBlock.filter(l => namaPattern.test(l));
        const kepsekNama = namaList[0] || metaKepsek || '[Nama Kepala Sekolah]';
        const guruNama = namaList[1] || metaGuru || '[Nama Guru]';

        // Ambil kota+tanggal dari baris pertama blok
        const kotaTgl = ttdBlock[0] || today;

        children.push(new Paragraph({ spacing: { before: 400 } }));
        children.push(makeTTD(kepsekNama, guruNama, metaSekolah, metaMapel, '', kotaTgl));
        // Skip baris TTD
        i += 10; continue;
      }

      // Baris identitas (kode: A. B. C. ... K.)
      if (/^[A-K]\.\s/.test(trimmed)) {
        children.push(new Paragraph({ children: [new TextRun({ text: trimmed, bold: true, size: 24, color: '7c3aed', font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'ede9fe', space: 1 } }, spacing: { before: 320, after: 120 } }));
        i++; continue;
      }

      // Sintak
      if (/^Sintak\s+\d+/i.test(trimmed)) {
        children.push(new Paragraph({ children: [new TextRun({ text: trimmed, bold: true, size: 22, color: '059669', font: 'Times New Roman' })], spacing: { before: 200, after: 80 } }));
        i++; continue;
      }

      // Kegiatan Pendahuluan/Inti/Penutup
      if (/^Kegiatan (Pendahuluan|Inti|Penutup)/i.test(trimmed)) {
        children.push(new Paragraph({ children: [new TextRun({ text: trimmed, bold: true, size: 22, color: '1e40af', font: 'Times New Roman' })], spacing: { before: 240, after: 80 } }));
        i++; continue;
      }

      // Heading KAPITAL
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 && /[A-Z]/.test(trimmed) && !/^\d/.test(trimmed) && !/^(NIP|NO\.|SKOR)/.test(trimmed) && !/^[A-D][\.\|]/.test(trimmed)) {
        children.push(new Paragraph({ children: [new TextRun({ text: trimmed, bold: true, size: 22, color: '3b0764', font: 'Times New Roman' })], spacing: { before: 200, after: 80 } }));
        i++; continue;
      }

      // Baris identitas dengan format "Nama Penyusun : ..."
      if (isIdentitas(trimmed)) {
        const [key, ...val] = trimmed.split(':');
        children.push(new Paragraph({ children: [
          new TextRun({ text: key.padEnd(22) + ': ', bold: true, size: 20, font: 'Times New Roman' }),
          new TextRun({ text: val.join(':').trim(), size: 20, font: 'Times New Roman' })
        ], spacing: { before: 40, after: 40 } }));
        i++; continue;
      }

      // Baris label deep learning
      const cleanLine = trimmed
        .replace(/\(Mindful learning \/ Berkesadaran\)/gi, '[Mindful]')
        .replace(/\(Mindful\)/gi, '[Mindful]')
        .replace(/\(Meaningful Learning\)/gi, '[Meaningful]')
        .replace(/\(Meaningful\)/gi, '[Meaningful]')
        .replace(/\(Joyful Learning\)/gi, '[Joyful]')
        .replace(/\(Joyful\)/gi, '[Joyful]')
        .replace(/\(Apersepsi\)/gi, '[Apersepsi]')
        .replace(/\*\*(.+?)\*\*/g, '$1');

      children.push(new Paragraph({ children: [new TextRun({ text: cleanLine, size: 20, font: 'Times New Roman', color: '1a1523' })], spacing: { before: 40, after: 40 } }));
      i++;
    }

    // Flush sisa tabel
    if (pendingTableLines.length > 0) flushTable(pendingTableLines);

    // Footer
    children.push(new Paragraph({ spacing: { before: 480 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— Dibuat dengan Asisten Guru by Mas Gema —', italics: true, size: 18, color: '9333ea', font: 'Times New Roman' })] }));

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Times New Roman', size: 20 } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } }, children }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ModulAjar_AsistenGuru_' + Date.now() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  } catch (e) { alert('Gagal download Word: ' + e.message); console.error(e); }
}

// ═══════════════════════════════════════════
//  SISTEM HISTORI GENERATE
//  Menyimpan setiap hasil generate per user
//  Tidak mengubah data lain apapun
// ═══════════════════════════════════════════

const HISTORY_MAX = 30; // max item per user

// Info tiap jenis hasil
const HISTORY_META = {
  'res-rpp':        { icon:'📘', label:'Modul Ajar',         color:'#7c3aed', bg:'#ede9fe' },
  'res-soal':       { icon:'✅', label:'Generator Soal',     color:'#059669', bg:'#d1fae5' },
  'res-admin':      { icon:'📋', label:'Dokumen Admin',      color:'#1e40af', bg:'#dbeafe' },
  'res-pkb':        { icon:'⭐', label:'Laporan PKB',        color:'#92400e', bg:'#fef3c7' },
  'res-medsos':     { icon:'📱', label:'Konten Medsos',      color:'#b45309', bg:'#fef3c7' },
  'res-kisi':       { icon:'📊', label:'Kisi-Kisi Soal',     color:'#065f46', bg:'#d1fae5' },
  'res-soal-kisi':  { icon:'✅', label:'Soal dari Kisi-Kisi',color:'#065f46', bg:'#d1fae5' },
};

function getHistoryKey() {
  return currentUser ? 'ag_history_' + currentUser.email : null;
}

function saveHistory(resId, text) {
  if (!currentUser || !text || text.length < 50) return;
  const key = getHistoryKey();
  if (!key) return;

  const meta = HISTORY_META[resId];
  if (!meta) return;

  // Buat judul dari konten (ambil baris bermakna pertama)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length > 5);
  let judul = lines.find(l => l.length > 10 && l.length < 80) || meta.label;
  // Bersihkan marker
  judul = judul.replace(/^[A-K]\.\s+/, '').replace(/[#*=|]/g, '').trim().slice(0, 70);

  // Ambil preview (100 karakter pertama konten bermakna)
  const preview = lines.slice(0, 3).join(' ').replace(/[#*=|]/g, '').slice(0, 120) + '...';

  const item = {
    id: Date.now(),
    resId,
    icon: meta.icon,
    label: meta.label,
    color: meta.color,
    bg: meta.bg,
    judul,
    preview,
    tanggal: new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }),
    jam: new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }),
    content: text,
    // Meta tambahan
    mapel: document.getElementById('rpp-mapel')?.value || document.getElementById('kisi-mapel')?.value || document.getElementById('soal-mapel')?.value || '',
    kelas: document.getElementById('rpp-kelas')?.value || document.getElementById('kisi-kelas')?.value || document.getElementById('soal-kelas')?.value || '',
  };

  try {
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift(item); // tambah di depan (terbaru duluan)
    if (history.length > HISTORY_MAX) history.pop(); // buang yang paling lama
    localStorage.setItem(key, JSON.stringify(history));
    // Update badge di sidebar
    updateHistoryBadge(history.length);
  } catch(e) { console.log('History save error:', e); }
}

function loadHistory() {
  const key = getHistoryKey();
  if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

function deleteHistory(id) {
  const key = getHistoryKey();
  if (!key) return;
  const history = loadHistory().filter(h => h.id !== id);
  localStorage.setItem(key, JSON.stringify(history));
  renderHistoryPage();
  updateHistoryBadge(history.length);
}

function clearAllHistory() {
  if (!confirm('Hapus semua histori? Tindakan ini tidak bisa dibatalkan.')) return;
  const key = getHistoryKey();
  if (key) localStorage.removeItem(key);
  renderHistoryPage();
  updateHistoryBadge(0);
}

function updateHistoryBadge(count) {
  const badge = document.getElementById('history-badge');
  if (badge) { badge.textContent = count; badge.style.display = count > 0 ? 'inline' : 'none'; }
}

function viewHistoryItem(id) {
  const item = loadHistory().find(h => h.id === id);
  if (!item) return;

  // Tampilkan di modal viewer
  const modal = document.getElementById('modal-history-view');
  const title = document.getElementById('modal-history-title');
  const body = document.getElementById('modal-history-body');
  const dlBtn = document.getElementById('modal-history-dl');
  const copyBtn = document.getElementById('modal-history-copy');

  if (!modal) return;
  title.textContent = item.icon + ' ' + item.judul;
  body.innerHTML = `<div style="font-size:12px;line-height:1.85;color:#1a1523;white-space:pre-wrap;max-height:60vh;overflow-y:auto;">${item.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
  dlBtn.onclick = () => {
    const tempEl = document.createElement('div');
    tempEl.id = '__temp_hist_' + id;
    tempEl.dataset.raw = item.content;
    tempEl.style.display = 'none';
    document.body.appendChild(tempEl);
    downloadWord('__temp_hist_' + id).finally(() => { setTimeout(() => { tempEl.remove(); }, 2000); });
  };
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(item.content).catch(() => {});
    copyBtn.textContent = '✓ Tersalin!';
    setTimeout(() => { copyBtn.textContent = '📋 Salin'; }, 2000);
  };
  modal.style.display = 'flex';
}

function renderHistoryPage() {
  const history = loadHistory();
  const container = document.getElementById('history-container');
  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;color:#9ca3af;">
        <div style="font-size:40px;margin-bottom:1rem;">📂</div>
        <div style="font-size:15px;font-weight:600;color:#4a4458;margin-bottom:6px;">Belum ada histori</div>
        <div style="font-size:13px;">Setiap hasil generate akan tersimpan di sini otomatis</div>
      </div>`;
    return;
  }

  // Group by tanggal
  const groups = {};
  history.forEach(h => {
    if (!groups[h.tanggal]) groups[h.tanggal] = [];
    groups[h.tanggal].push(h);
  });

  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
    <div style="font-size:13px;color:#7c7490;">${history.length} hasil tersimpan (maks. ${HISTORY_MAX})</div>
    <button onclick="clearAllHistory()" style="padding:6px 14px;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">🗑️ Hapus Semua</button>
  </div>`;

  Object.entries(groups).forEach(([tanggal, items]) => {
    html += `<div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin:1rem 0 .5rem;">${tanggal}</div>`;
    items.forEach(h => {
      html += `
        <div style="background:#fff;border:1px solid #e8e4f0;border-radius:12px;padding:1rem 1.25rem;margin-bottom:.75rem;display:flex;align-items:flex-start;gap:1rem;transition:box-shadow .2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(124,58,237,.1)'" onmouseout="this.style.boxShadow='none'">
          <div style="width:42px;height:42px;border-radius:10px;background:${h.bg};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${h.icon}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:4px;flex-wrap:wrap;">
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${h.bg};color:${h.color};">${h.label}</span>
              ${h.mapel ? `<span style="font-size:10px;color:#7c7490;">${h.mapel}${h.kelas?' — '+h.kelas:''}</span>` : ''}
              <span style="font-size:10px;color:#9ca3af;margin-left:auto;">${h.jam}</span>
            </div>
            <div style="font-size:13px;font-weight:600;color:#1a1523;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h.judul}</div>
            <div style="font-size:11px;color:#7c7490;line-height:1.5;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${h.preview}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:.5rem;flex-shrink:0;">
            <button onclick="viewHistoryItem(${h.id})" style="padding:6px 12px;background:#ede9fe;color:#7c3aed;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;">👁️ Lihat</button>
            <button onclick="deleteHistory(${h.id})" style="padding:6px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;">🗑️</button>
          </div>
        </div>`;
    });
  });

  container.innerHTML = html;
}

function hubungiAdmin() {
  alert('Hubungi Mas Gema untuk upgrade Premium!\n\nWhatsApp: (isi nomor WA kamu)');
}

// ═══════════════════════════════════════
//  KISI-KISI GENERATOR — LENGKAP
// ═══════════════════════════════════════

let savedKisiKisi = { mapel:'', kelas:'', jenis:'', bentuk:'', materi:'', jmlSoal:0, jmlPG:0, jmlUraian:0, level:'', teks:'', rows:[] };

// Dinamis: tampilkan field jumlah soal sesuai jenis soal
function onKisiBentukChange() {
  const bentuk = document.getElementById('kisi-bentuk')?.value || '';
  const isCampuran = bentuk.includes('Campuran');

  const wrapPG = document.getElementById('kisi-wrap-pg');
  const wrapUraian = document.getElementById('kisi-wrap-uraian');
  const wrapSingle = document.getElementById('kisi-wrap-single');
  const lbl = document.getElementById('kisi-jml-single-label');

  if (wrapPG) wrapPG.style.display = isCampuran ? 'block' : 'none';
  if (wrapUraian) wrapUraian.style.display = isCampuran ? 'block' : 'none';
  if (wrapSingle) wrapSingle.style.display = isCampuran ? 'none' : 'block';

  // Update label sesuai jenis soal yang dipilih
  if (lbl) {
    if (bentuk.includes('Uraian') || bentuk.includes('Esai')) lbl.textContent = 'Jumlah Soal Uraian';
    else if (bentuk.includes('Benar')) lbl.textContent = 'Jumlah Soal Benar/Salah';
    else if (bentuk.includes('Menjodohkan')) lbl.textContent = 'Jumlah Soal Menjodohkan';
    else if (bentuk.includes('Isian')) lbl.textContent = 'Jumlah Soal Isian Singkat';
    else lbl.textContent = 'Jumlah Soal Pilihan Ganda';
  }
}

function setAlurStep(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step-' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    else if (i === step) el.classList.add('active');
  }
}

function parseKisiRows(text) {
  const lines = text.split('\n');
  const rows = [];
  let rekap = '';
  let inRekap = false;
  for (const line of lines) {
    if (/REKAPITULASI|REKAP/i.test(line)) { inRekap = true; }
    if (inRekap) { rekap += line + '\n'; continue; }
    const trimmed = line.trim();
    if (!trimmed || /^[-=]+$/.test(trimmed)) continue;
    if (trimmed.includes('|')) {
      const cols = trimmed.split('|').map(c => c.trim()).filter(c => c);
      if (cols.length >= 4) {
        if (/^no$/i.test(cols[0]) || /kompetensi|indikator/i.test(cols[1]) || /^-+$/.test(cols[0])) continue;
        rows.push({ no: cols[0]||'', kd: cols[1]||'', materi: cols[2]||'', indikator: cols[3]||'', level: cols[4]||'', bentuk: cols[5]||'', nomor: cols[6]||'' });
      }
    }
  }
  return { rows, rekap };
}

function renderKisiHTML(rows, info) {
  const lc = { 'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff' };
  const getLC = l => { for (const [k,v] of Object.entries(lc)) { if (l.includes(k)) return v; } return '#f5f3ff'; };
  if (!rows.length) return `<div style="color:#7c7490;padding:1rem;">Teks kisi-kisi tersimpan, siap untuk generate soal.</div>`;
  return `<style>.kisi-tbl{width:100%;border-collapse:collapse;font-size:11px;min-width:650px;}.kisi-tbl th{background:#7c3aed;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;border:1px solid #5b21b6;}.kisi-tbl td{padding:8px 10px;border:1px solid #cbd5e1;vertical-align:top;line-height:1.5;}.kisi-tbl tr:nth-child(even) td{background:#f8fafc;}</style>
  <div style="background:#7c3aed;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;">📊 Kisi-Kisi Soal — ${info.jenis} | ${info.mapel} | ${info.kelas}</div>
  <div style="overflow-x:auto;"><table class="kisi-tbl">
    <thead><tr><th style="width:4%">No</th><th style="width:22%">KD / CP</th><th style="width:16%">Materi Pokok</th><th style="width:30%">Indikator Soal</th><th style="width:12%">Level Kognitif</th><th style="width:9%">Bentuk Soal</th><th style="width:7%">No. Soal</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td style="text-align:center;font-weight:700;color:#7c3aed;">${r.no}</td>
      <td>${r.kd}</td><td>${r.materi}</td><td>${r.indikator}</td>
      <td style="text-align:center;background:${getLC(r.level)};font-weight:600;">${r.level}</td>
      <td style="text-align:center;font-weight:600;color:${/uraian|esai/i.test(r.bentuk)?'#065f46':'#1e40af'};">${r.bentuk||'-'}</td>
      <td style="text-align:center;font-weight:700;">${r.nomor}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

async function generateKisiKisi() {
  if (!canGenerate()) { alert('Kredit habis! Upgrade ke Premium.'); goPage('upgrade'); return; }

  const mapel = document.getElementById('kisi-mapel')?.value || 'IPA';
  const kelas = document.getElementById('kisi-kelas')?.value || 'SD Kelas 5';
  const jenis = document.getElementById('kisi-jenis')?.value || 'Ulangan Harian';
  const bentuk = document.getElementById('kisi-bentuk')?.value || 'Pilihan Ganda (PG)';
  const semester = document.getElementById('kisi-semester')?.value || 'Ganjil (1)';
  const materi = document.getElementById('kisi-materi')?.value || 'Sistem Pencernaan';
  const level = document.getElementById('kisi-level')?.value || 'Seimbang C1-C6';

  const isCampuran = bentuk.includes('Campuran');
  let jmlPG = 0, jmlUraian = 0, jmlSoal = 0;

  if (isCampuran) {
    jmlPG = parseInt(document.getElementById('kisi-jml-pg')?.value || '15');
    jmlUraian = parseInt(document.getElementById('kisi-jml-uraian')?.value || '5');
    jmlSoal = jmlPG + jmlUraian;
  } else {
    jmlSoal = parseInt(document.getElementById('kisi-jml-single')?.value || '20');
    if (bentuk.includes('Uraian')) { jmlUraian = jmlSoal; }
    else { jmlPG = jmlSoal; }
  }

  savedKisiKisi = { mapel, kelas, jenis, bentuk, materi, jmlSoal, jmlPG, jmlUraian, level, teks: '', rows: [] };

  const btn = document.getElementById('btn-kisi');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> Membuat kisi-kisi...'; }
  const resEl = document.getElementById('res-kisi');
  if (resEl) { resEl.innerHTML = ''; resEl.classList.remove('show'); }
  const sfk = document.getElementById('soal-from-kisi-card');
  const dlg = document.getElementById('download-gabungan-card');
  if (sfk) sfk.style.display = 'none';
  if (dlg) dlg.style.display = 'none';
  setAlurStep(2);

  const prompt = `Buatkan KISI-KISI SOAL format resmi untuk:
Mata Pelajaran  : ${mapel}
Kelas           : ${kelas}
Semester        : ${semester}
Jenis Penilaian : ${jenis}
Bentuk Soal     : ${bentuk}
Materi          : ${materi}
${isCampuran ? `Jumlah PG: ${jmlPG} | Jumlah Uraian: ${jmlUraian} | Total: ${jmlSoal}` : `Jumlah Soal: ${jmlSoal}`}
Distribusi Level: ${level}

WAJIB: Buat tabel dengan TEPAT 7 kolom dipisah karakter |
Format setiap baris data:
No | KD / Capaian Pembelajaran | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal

Ketentuan:
- Total baris data = ${jmlSoal} soal
${isCampuran ? `- Baris 1 s/d ${jmlPG} = Pilihan Ganda\n- Baris ${jmlPG+1} s/d ${jmlSoal} = Uraian` : `- Semua = ${bentuk}`}
- Level format: C1-Mengingat / C2-Memahami / C3-Mengaplikasikan / C4-Menganalisis / C5-Mengevaluasi / C6-Mencipta
- KD/CP sesuai ${mapel} ${kelas} Kurikulum Merdeka
- Indikator operasional: mulai kata kerja (mengidentifikasi / menjelaskan / menganalisis / dst)

Distribusi level "${level}":
Seimbang   : 10%C1 20%C2 30%C3 20%C4 10%C5 10%C6
Mudah      : 30%C1 30%C2 20%C3 10%C4 5%C5 5%C6
Sedang     : 10%C1 15%C2 35%C3 25%C4 10%C5 5%C6
HOTs       : 5%C1 10%C2 20%C3 30%C4 20%C5 15%C6

Setelah tabel, tulis:
REKAPITULASI
${isCampuran ? `Pilihan Ganda: ${jmlPG} soal | Uraian: ${jmlUraian} soal | Total: ${jmlSoal} soal` : `Total soal: ${jmlSoal} soal (${bentuk})`}
Distribusi level: [rinci per level berapa soal]`;

  const system = `Kamu pengembang instrumen penilaian pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat kisi-kisi format resmi. Setiap baris tabel harus konsisten 7 kolom dengan pemisah |. Jangan sebut Kemendikbud. Tidak ada Markdown.`;

  try {
    const text = await callAPI(prompt, system);
    savedKisiKisi.teks = text;
    const { rows, rekap } = parseKisiRows(text);
    savedKisiKisi.rows = rows;

    if (resEl) {
      resEl.dataset.raw = text;
      resEl.classList.add('show');
      const tableHTML = renderKisiHTML(rows, { mapel, kelas, jenis, bentuk, jmlPG, jmlUraian, jmlSoal });
      const rekapHTML = rekap ? `<div style="margin-top:1rem;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:1rem;"><div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:6px;">REKAPITULASI</div><div style="font-size:12px;color:#1a1523;white-space:pre-wrap;">${rekap.replace(/REKAPITULASI\n?/i,'').trim()}</div></div>` : '';
      resEl.innerHTML = `
        <div class="result-label">📊 Hasil Kisi-Kisi Soal</div>
        ${tableHTML}
        ${rekapHTML}
        <div class="result-actions" style="margin-top:1rem;">
          <button class="btn-copy" onclick="copyResult('res-kisi',this)">📋 Salin</button>
          <button class="btn-dl btn-dl-print" onclick="printKisiKisi()">🖨️ Print</button>
        </div>`;
    }

    if (sfk) sfk.style.display = 'block';
    setAlurStep(3);
    useCredit();
    saveHistory('res-kisi', text);
  } catch (err) {
    if (resEl) { resEl.classList.add('show'); resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`; }
    setAlurStep(1);
  }

  if (btn) { btn.disabled = false; btn.innerHTML = '📊 Generate Kisi-Kisi Resmi'; }
}

async function generateSoalDariKisi() {
  if (!canGenerate()) { alert('Kredit habis!'); goPage('upgrade'); return; }
  const { mapel, kelas, jenis, bentuk, jmlSoal, jmlPG, jmlUraian, teks } = savedKisiKisi;
  if (!teks) { alert('Generate kisi-kisi dulu!'); return; }

  const btn = document.getElementById('btn-gen-soal-kisi');
  const resEl = document.getElementById('res-soal-kisi');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> Generating soal...'; }
  if (resEl) { resEl.innerHTML = ''; resEl.classList.remove('show'); }
  const dlg = document.getElementById('download-gabungan-card');
  if (dlg) dlg.style.display = 'none';

  const today = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const sysP = `Kamu ahli penyusunan soal evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal persis sesuai kisi-kisi. Tidak ada simbol Markdown.`;

  const makePrompt = (mulai, akhir, isFirst) => `
${isFirst ? `Kisi-kisi:\n${teks}\n\nInstruksi:` : `Lanjutan generate soal (kisi-kisi sama).\nInstruksi:`}
Mapel: ${mapel} | Kelas: ${kelas} | Penilaian: ${jenis} | Tanggal: ${today}
Buat soal NOMOR ${mulai} s.d. ${akhir}. Level kognitif PERSIS sesuai kisi-kisi.
${mulai <= jmlPG && jmlPG > 0 ? `Nomor ${mulai}-${Math.min(akhir,jmlPG)} = Pilihan Ganda dengan 4 opsi (A,B,C,D).` : ''}
${akhir > jmlPG && jmlUraian > 0 ? `Nomor ${Math.max(mulai,jmlPG+1)}-${akhir} = Uraian.` : ''}
${jmlPG === 0 ? `Semua soal berbentuk ${bentuk}.` : ''}

Format output:
${mulai <= jmlPG || jmlPG === 0 ? 'SOAL PILIHAN GANDA / SOAL' : 'SOAL URAIAN'}

${mulai}. [soal sesuai kisi-kisi]
${jmlPG > 0 && mulai <= jmlPG ? 'A. [...] B. [...] C. [...] D. [...]' : ''}
[lanjut sampai soal ${akhir}]

KUNCI JAWABAN DAN PEMBAHASAN
[kunci + pembahasan lengkap soal ${mulai}-${akhir}]`;

  let fullResult = '';
  try {
    if (jmlSoal <= 10) {
      fullResult = await callAPI(makePrompt(1, jmlSoal, true), sysP);
      useCredit();
    } else {
      const tengah = Math.ceil(jmlSoal / 2);
      if (resEl) { resEl.classList.add('show'); resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:20px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Soal 1-${tengah}...</div></div>`; }
      if (btn) btn.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div> Tahap 1/2: Soal 1-${tengah}...`;

      const p1 = await callAPI(makePrompt(1, tengah, true), sysP);

      if (resEl) resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:20px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Soal ${tengah+1}-${jmlSoal}...</div></div>`;
      if (btn) btn.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div> Tahap 2/2: Soal ${tengah+1}-${jmlSoal}...`;

      const p2 = await callAPI(makePrompt(tengah + 1, jmlSoal, false), sysP);
      fullResult = p1 + '\n\n' + '─'.repeat(50) + '\n\n' + p2;
      useCredit();
    }
  } catch (err) {
    if (resEl) { resEl.classList.add('show'); resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`; }
    if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Soal dari Kisi-Kisi Ini'; }
    return;
  }

  if (resEl) {
    resEl.dataset.raw = fullResult;
    resEl.classList.add('show');
    resEl.innerHTML = `
      <div class="result-label">✅ Soal + Kunci + Pembahasan (${jmlSoal} soal lengkap)</div>
      <div style="font-size:13px;line-height:1.85;color:#1a1523;white-space:pre-wrap;">${fullResult.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="result-actions">
        <button class="btn-copy" onclick="copyResult('res-soal-kisi',this)">📋 Salin</button>
        <button class="btn-dl btn-dl-print" onclick="printResult('res-soal-kisi')">🖨️ Print</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWordSoalKisi()">⬇ Download Word</button>
      </div>`;
  }
  if (dlg) dlg.style.display = 'block';
  setAlurStep(4);
  saveHistory('res-soal-kisi', fullResult);
  if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Soal dari Kisi-Kisi Ini'; }
}

async function downloadWordSoalKisi() {
  const raw = document.getElementById('res-soal-kisi')?.dataset.raw || '';
  if (!raw) { alert('Tidak ada konten.'); return; }
  await downloadWord('res-soal-kisi');
}

function copyGabungan(btn) {
  const k = savedKisiKisi.teks || '';
  const s = document.getElementById('res-soal-kisi')?.dataset.raw || '';
  navigator.clipboard.writeText('KISI-KISI\n\n' + k + '\n\nSOAL\n\n' + s).catch(() => {});
  btn.textContent = '✓ Tersalin!';
  setTimeout(() => { btn.textContent = '📋 Salin Semua'; }, 2000);
}

function printKisiKisi() {
  const { rows, mapel, kelas, jenis, jmlSoal, jmlPG, jmlUraian } = savedKisiKisi;
  if (!rows.length) { printResult('res-kisi'); return; }
  const today = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const w = window.open('', '_blank');
  if (!w) { alert('Izinkan popup browser.'); return; }
  const lc = { 'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff' };
  const getLC = l => { for (const [k,v] of Object.entries(lc)) { if (l.includes(k)) return v; } return '#fff'; };
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kisi-Kisi Soal</title>
    <style>body{font-family:'Times New Roman',serif;font-size:10pt;padding:1cm 1.5cm;}
    h2,h3{text-align:center;margin:4px 0;}h2{font-size:13pt;color:#7c3aed;}h3{font-size:11pt;}
    table{width:100%;border-collapse:collapse;margin:10px 0;}
    th{background:#7c3aed;color:#fff;padding:6px 8px;border:1px solid #555;font-size:9pt;font-weight:700;}
    td{padding:5px 8px;border:1px solid #888;font-size:9pt;vertical-align:top;line-height:1.3;}
    tr:nth-child(even) td{background:#f9f9f9;}
    @media print{@page{margin:1cm;size:A4 landscape;}}</style></head><body>
    <h2>KISI-KISI SOAL</h2><h3>${jenis} — ${mapel} — ${kelas}</h3>
    <p style="text-align:center;font-size:9pt;">Tahun 2024/2025 | ${jmlPG>0&&jmlUraian>0?jmlPG+' PG + '+jmlUraian+' Uraian = ':' '}${jmlSoal} soal | ${today}</p>
    <table><thead><tr><th style="width:4%">No</th><th style="width:22%">KD / CP</th><th style="width:16%">Materi</th><th style="width:30%">Indikator Soal</th><th style="width:12%">Level</th><th style="width:9%">Bentuk</th><th style="width:7%">No. Soal</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td style="text-align:center;font-weight:700;">${r.no}</td><td>${r.kd}</td><td>${r.materi}</td><td>${r.indikator}</td><td style="text-align:center;background:${getLC(r.level)};font-weight:700;">${r.level}</td><td style="text-align:center;font-weight:700;">${r.bentuk}</td><td style="text-align:center;font-weight:700;">${r.nomor}</td></tr>`).join('')}</tbody></table>
    <p style="font-size:8pt;text-align:center;color:#666;margin-top:8px;">Asisten Guru by Mas Gema</p>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

(function init() {
  const session = getSession();
  if (session) {
    const users = getUsers();
    const fresh = users.find(u => u.email === session.email);
    enterApp(fresh || session);
  }
})();
