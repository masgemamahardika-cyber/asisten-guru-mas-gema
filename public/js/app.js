// ═══════════════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — Supabase Integrated Version
// ═══════════════════════════════════════

const API = '/api/chat';
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

// Session di localStorage (hanya simpan data minimal)
const getSession = () => { try { return JSON.parse(localStorage.getItem('ag_session') || 'null'); } catch { return null; } };
const saveSession = s => localStorage.setItem('ag_session', JSON.stringify(s));
const clearSession = () => localStorage.removeItem('ag_session');

// ── API HELPER ──
async function api(action, data = {}) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...data })
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Server error');
  return result;
}

// ── AUTH ──
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
  btn.disabled = true; btn.textContent = 'Memproses...';
  try {
    const result = await api('user_login', { email, password: pass });
    err.textContent = '';
    saveSession(result.user);
    enterApp(result.user);
  } catch (e) {
    err.textContent = e.message;
  }
  btn.disabled = false; btn.textContent = 'Masuk ke Asisten Guru';
}

async function doRegister() {
  const name = document.getElementById('r-name').value.trim();
  const email = document.getElementById('r-email').value.trim();
  const jenjang = document.getElementById('r-jenjang').value;
  const pass = document.getElementById('r-pass').value;
  const err = document.getElementById('r-err');
  const ok = document.getElementById('r-ok');
  const btn = document.getElementById('btn-register');
  err.textContent = ''; ok.textContent = '';
  if (!name || !email || !pass) { err.textContent = 'Semua field wajib diisi.'; return; }
  if (pass.length < 6) { err.textContent = 'Password minimal 6 karakter.'; return; }
  btn.disabled = true; btn.textContent = 'Mendaftar...';
  try {
    await api('user_register', { name, email, password: pass, jenjang });
    ok.textContent = '✓ Berhasil daftar! Silakan masuk.';
    setTimeout(() => authTab('login'), 1500);
  } catch (e) {
    err.textContent = e.message;
  }
  btn.disabled = false; btn.textContent = 'Daftar Sekarang — Gratis';
}

function enterApp(user) {
  currentUser = user;
  const av = user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  document.getElementById('sb-av').textContent = av;
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-role').textContent = 'Guru ' + (user.jenjang || '');
  document.getElementById('wb-greeting').textContent = 'Halo, ' + user.name.split(' ')[0] + '! 👋';
  updatePlanUI();
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
  const isPrem = currentUser.plan === 'premium' || currentUser.plan === 'tahunan';
  const chip = document.getElementById('sb-plan');
  chip.textContent = isPrem ? 'Premium ⭐' : 'Gratis';
  chip.className = 'plan-chip' + (isPrem ? ' premium' : '');
  document.getElementById('sb-credit').textContent = isPrem ? '∞' : (currentUser.credits ?? 5);
}

async function useCredit() {
  if (!currentUser) return;
  if (currentUser.plan === 'premium' || currentUser.plan === 'tahunan') {
    currentUser.total_gen = (currentUser.total_gen || 0) + 1;
  } else {
    currentUser.credits = Math.max(0, (currentUser.credits ?? 5) - 1);
    currentUser.total_gen = (currentUser.total_gen || 0) + 1;
  }
  saveSession(currentUser);
  updatePlanUI();
  // Update ke Supabase
  api('user_update', { id: currentUser.id, credits: currentUser.credits, total_gen: currentUser.total_gen, plan: currentUser.plan }).catch(() => {});
}

// ── NAVIGASI ──
const PAGE_INFO = {
  dashboard: { title: 'Beranda', sub: 'Selamat datang di Asisten Guru by Mas Gema' },
  rpp: { title: 'Generator RPP', sub: 'Modul Ajar Kurikulum Merdeka lengkap + CP + Asesmen' },
  soal: { title: 'Generator Soal', sub: 'Soal + kunci + pembahasan otomatis' },
  'admin-doc': { title: 'Asisten Administrasi', sub: 'Dokumen guru siap pakai dalam 1 klik' },
  pkb: { title: 'Laporan PKB', sub: 'Laporan pengembangan keprofesian profesional' },
  upgrade: { title: 'Upgrade Premium', sub: 'Generate tanpa batas untuk semua tools' },
  'upgrade-form': { title: 'Konfirmasi Pembayaran', sub: 'Transfer dan kirim bukti ke admin' },
  riwayat: { title: 'Riwayat Pembayaran', sub: 'Status transaksi kamu' },
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
  if (id === 'riwayat') loadRiwayat();
  if (id === 'upgrade-form') document.getElementById('pay-date').value = new Date().toISOString().split('T')[0];
}

// ── PAYMENT ──
async function submitPayment() {
  if (!currentUser) return;
  const paketRaw = document.getElementById('pay-paket').value;
  const [paket, price, credits] = paketRaw.split(':');
  const sender = document.getElementById('pay-sender').value.trim();
  const date = document.getElementById('pay-date').value;
  const ok = document.getElementById('pay-ok');
  const err = document.getElementById('pay-err');
  const btn = document.getElementById('btn-pay');
  ok.textContent = ''; err.textContent = '';
  if (!sender) { err.textContent = 'Nama pengirim wajib diisi.'; return; }
  btn.disabled = true; btn.textContent = 'Mengirim...';
  try {
    await api('create_transaction', {
      user_id: currentUser.id, user_name: currentUser.name, user_email: currentUser.email,
      paket, price: parseInt(price), credits_added: parseInt(credits),
      sender_name: sender, transfer_date: date
    });
    ok.textContent = '✓ Konfirmasi berhasil dikirim! Admin akan memverifikasi dalam 1x24 jam.';
    setTimeout(() => goPage('riwayat'), 2000);
  } catch (e) {
    err.textContent = e.message;
  }
  btn.disabled = false; btn.textContent = '📤 Kirim Konfirmasi Pembayaran';
}

async function loadRiwayat() {
  if (!currentUser) return;
  const el = document.getElementById('riwayat-list');
  el.textContent = 'Memuat...';
  try {
    const result = await api('get_user_transactions', { user_email: currentUser.email });
    const txns = result.transactions || [];
    if (!txns.length) { el.textContent = 'Belum ada riwayat pembayaran.'; return; }
    const statusColor = { pending: '#d97706', verified: '#16a34a', rejected: '#dc2626' };
    const statusLabel = { pending: 'Menunggu Verifikasi', verified: '✓ Terverifikasi', rejected: '✕ Ditolak' };
    el.innerHTML = txns.map(t => `
      <div style="border:1px solid #e8e4f0;border-radius:10px;padding:.875rem;margin-bottom:.75rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.25rem;">
          <span style="font-weight:600;">Paket ${t.paket.charAt(0).toUpperCase()+t.paket.slice(1)} — Rp ${parseInt(t.price).toLocaleString('id-ID')}</span>
          <span style="font-size:11px;font-weight:600;color:${statusColor[t.status]||'#666'}">${statusLabel[t.status]||t.status}</span>
        </div>
        <div style="font-size:11px;color:#7c7490;">Pengirim: ${t.sender_name} | Tanggal: ${t.transfer_date} | Dikirim: ${new Date(t.created_at).toLocaleDateString('id-ID')}</div>
      </div>`).join('');
    // Cek apakah ada yang baru verified → refresh user data
    const verified = txns.find(t => t.status === 'verified' && t.user_email === currentUser.email);
    if (verified) {
      const fresh = await api('user_get', { email: currentUser.email });
      if (fresh.user) { currentUser = fresh.user; saveSession(currentUser); updatePlanUI(); }
    }
  } catch (e) {
    el.textContent = 'Gagal memuat: ' + e.message;
  }
}

// ── AI GENERATE ──
function canGenerate() {
  if (!currentUser) return false;
  if (currentUser.plan === 'premium' || currentUser.plan === 'tahunan') return true;
  return (currentUser.credits ?? 5) > 0;
}

async function callAI(prompt, system) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ai',
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: system || 'Kamu asisten AI guru Indonesia dari Asisten Guru by Mas Gema. Buat konten pendidikan sesuai standar Kemendikbud. Jangan gunakan simbol Markdown. Langsung ke isi.',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'API error');
  return data?.content?.[0]?.text || '';
}

function getFase(kelas) {
  if (kelas.includes('Kelas 1') || kelas.includes('Kelas 2')) return 'Fase A';
  if (kelas.includes('Kelas 3') || kelas.includes('Kelas 4')) return 'Fase B';
  if (kelas.includes('Kelas 5') || kelas.includes('Kelas 6')) return 'Fase C';
  if (kelas.includes('Kelas 7') || kelas.includes('Kelas 8') || kelas.includes('Kelas 9')) return 'Fase D';
  if (kelas.includes('Kelas 10')) return 'Fase E';
  return 'Fase F';
}

function getSystemPrompt() {
  return `Kamu adalah pakar pengembang kurikulum Indonesia dari Asisten Guru by Mas Gema. ATURAN: Jangan gunakan simbol Markdown (#, ##, **, *, ---). Gunakan HURUF KAPITAL untuk judul bagian. Isi semua bagian dengan konten NYATA dan LENGKAP.

DATABASE CP SK BSKAP 032/H/KR/2024:
Fase A (Kelas 1-2 SD): Bahasa Indonesia: Peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai tujuan kepada teman sebaya dan orang dewasa tentang diri dan lingkungan sekitarnya. Matematika: Peserta didik dapat melakukan operasi penjumlahan dan pengurangan bilangan cacah sampai 999. IPAS: Peserta didik mengidentifikasi dan mengajukan pertanyaan tentang kondisi di lingkungan rumah dan sekolah.
Fase B (Kelas 3-4 SD): Bahasa Indonesia: Peserta didik mampu memahami dan menyampaikan pesan serta mempresentasikan informasi menggunakan beragam media. Matematika: Peserta didik dapat melakukan operasi hitung bilangan cacah dan pecahan sederhana, menyelesaikan masalah keliling dan luas bangun datar. IPAS: Peserta didik mengidentifikasi proses perubahan wujud zat dan mendeskripsikan keanekaragaman makhluk hidup.
Fase C (Kelas 5-6 SD): Bahasa Indonesia: Peserta didik mampu memahami, mengolah, menginterpretasi informasi dari berbagai tipe teks. Matematika: Peserta didik dapat melakukan operasi hitung bilangan desimal, negatif, dan pecahan, mengukur luas dan volume. IPAS: Peserta didik menjelaskan sistem organ manusia dan memahami konsep gaya, gerak, dan energi. IPA: Peserta didik menjelaskan sistem organ manusia kaitannya dengan kesehatan. IPS: Peserta didik memahami keragaman budaya dan kondisi geografis Indonesia.
Fase D (Kelas 7-9 SMP): Bahasa Indonesia: Peserta didik mampu memahami, mengolah, menginterpretasi, dan mengevaluasi berbagai tipe teks multimodal. Matematika: Peserta didik mampu memahami relasi dan fungsi, persamaan linear, SPLDV, serta menyelesaikan masalah kontekstual. IPA: Peserta didik mengidentifikasi sifat dan karakteristik zat, memahami sistem organ manusia dan homeostasis. IPS: Peserta didik memahami kondisi geografis, sosial-budaya, ekonomi, dan politik Indonesia dan dunia. PPKn: Peserta didik menganalisis peran warga negara dan nilai-nilai Pancasila.
Fase E (Kelas 10 SMA): Bahasa Indonesia: Peserta didik mampu mengevaluasi dan mengkreasi informasi dari berbagai jenis teks. Matematika: Peserta didik menggunakan eksponen, logaritma, trigonometri, geometri, dan statistika. Fisika: Peserta didik menerapkan konsep vektor, kinematika, dinamika, usaha-energi, impuls-momentum. Kimia: Peserta didik menjelaskan fenomena kimia sesuai kaidah ilmiah. Biologi: Peserta didik menerapkan sains dalam kehidupan nyata.
Fase F (Kelas 11-12 SMA): Bahasa Indonesia: Peserta didik mengkreasi berbagai teks. Matematika: Peserta didik menerapkan limit, turunan, integral, dan peluang lanjut. Fisika: Peserta didik menganalisis penerapan fisika dalam teknologi modern.`;
}

function buildPrompt1(mapel, kelas, fase, waktu, topik, catatan) {
  return `Buatkan MODUL AJAR Kurikulum Merdeka bagian INFORMASI UMUM dan KEGIATAN untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Fase: ${fase} | Topik: ${topik} | Waktu: ${waktu}
${catatan ? 'Catatan: ' + catatan : ''}

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
[Tulis narasi CP LENGKAP dan SESUNGGUHNYA untuk ${mapel} ${fase} - minimal 3 paragraf]

ELEMEN CP YANG RELEVAN DENGAN TOPIK ${topik.toUpperCase()}:
[Tulis elemen CP spesifik terkait ${topik}]

ALUR TUJUAN PEMBELAJARAN (ATP):
[Tulis 3-4 ATP urutan logis menuju CP]

KOMPETENSI AWAL PESERTA DIDIK:
[3 pengetahuan prasyarat]

PROFIL PELAJAR PANCASILA:
1. [Dimensi 1]: [Implementasi konkret dalam pembelajaran ${topik}]
2. [Dimensi 2]: [Implementasi konkret]
3. [Dimensi 3]: [Implementasi konkret]

SARANA DAN PRASARANA:
[Ruangan, media, alat, bahan, sumber belajar]

MODEL DAN METODE:
Model: [PBL/Discovery/Inquiry] | Metode: [daftar] | Pendekatan: Saintifik

TUJUAN PEMBELAJARAN:
1. (C1) [tujuan + kriteria]
2. (C2) [tujuan + kriteria]
3. (C3) [tujuan + kriteria]
4. (C4) [tujuan + kriteria]

PEMAHAMAN BERMAKNA:
[Manfaat nyata ${topik} dalam kehidupan sehari-hari]

PERTANYAAN PEMANTIK:
1. [Berbasis pengalaman siswa]
2. [Berbasis fenomena nyata]
3. [Pertanyaan HOTs]

KEGIATAN PEMBUKA (15 menit)
[Detail: salam/doa/presensi, apersepsi dengan dialog guru-siswa, motivasi, penyampaian tujuan]

KEGIATAN INTI (sesuai ${waktu})
Langkah 1 - Orientasi/Stimulasi:
Guru: [detail] | Siswa: [detail]
Langkah 2 - Pengumpulan Informasi:
Guru: [detail] | Siswa: [eksplorasi/diskusi kelompok]
Langkah 3 - Pengolahan dan Analisis:
Guru: [bimbingan] | Siswa: [analisis dan diskusi]
Langkah 4 - Presentasi Hasil:
Guru: [detail] | Siswa: [presentasi dan tanya jawab]
Langkah 5 - Konfirmasi:
Guru: [klarifikasi dan penguatan konsep] | Siswa: [mencatat poin penting]

DIFERENSIASI:
Sudah paham: [pengayaan saat inti] | Belum paham: [scaffolding]
Visual: [adaptasi] | Kinestetik: [adaptasi]

KEGIATAN PENUTUP (15 menit)
[Refleksi 3 pertanyaan, penguatan, exit ticket 2 soal + jawaban, tindak lanjut, doa/salam]`;
}

function buildPrompt2(mapel, kelas, fase, topik) {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Buatkan BAGIAN ASESMEN LENGKAP untuk Modul Ajar ${mapel} ${kelas} ${fase} topik ${topik}. Isi NYATA dan LENGKAP. Tidak ada simbol Markdown.

ASESMEN

A. ASESMEN DIAGNOSTIK
Soal Diagnostik 1: [pertanyaan pengetahuan dasar ${topik}]
Jawaban: [jawaban] | Jika benar: [tindak lanjut] | Jika salah: [tindak lanjut]
Soal Diagnostik 2: [pertanyaan pengalaman sehari-hari terkait ${topik}]
Jawaban: [jawaban] | Interpretasi: [cara guru menyesuaikan pembelajaran]
Soal Diagnostik 3: [pertanyaan minat/motivasi]
Interpretasi: [cara memanfaatkan hasil]

B. ASESMEN KOGNITIF - 5 SOAL URAIAN
Teknik: Tes Uraian | Waktu: 30 menit | Total: 100 poin

SOAL URAIAN 1 (C1 - Mengingat) - Bobot 15 poin
Soal: [soal uraian menguji hapalan konsep ${topik}]
Kunci Jawaban: [jawaban lengkap dan detail minimal 4 kalimat]
Pembahasan: [penjelasan mengapa jawaban benar, dengan konsep yang mudah dipahami]
Rubrik: Skor 15 (lengkap dan tepat) | Skor 10 (sebagian besar benar) | Skor 5 (pemahaman dasar) | Skor 0 (salah/tidak menjawab)

SOAL URAIAN 2 (C2 - Memahami) - Bobot 15 poin
Soal: [soal menguji pemahaman - minta siswa jelaskan dengan kata sendiri]
Kunci Jawaban: [jawaban lengkap]
Pembahasan: [penjelasan detail konsep]
Rubrik: Skor 15 (sangat jelas, contoh tepat) | Skor 10 (cukup jelas) | Skor 5 (masih menghapal) | Skor 0 (salah)

SOAL URAIAN 3 (C3 - Mengaplikasikan) - Bobot 20 poin
Soal: [soal berbasis situasi nyata - terapkan konsep ${topik}]
Kunci Jawaban: [jawaban langkah demi langkah]
Pembahasan: [penjelasan cara penerapan]
Rubrik: Skor 20 (tepat, langkah benar) | Skor 15 (tepat, 1-2 langkah kurang) | Skor 10 (konsep benar, penerapan lemah) | Skor 5 (ada upaya) | Skor 0 (tidak menjawab)

SOAL URAIAN 4 (C4 - Menganalisis/HOTs) - Bobot 25 poin
Soal: [soal berbasis kasus/fenomena nyata kehidupan sehari-hari terkait ${topik} - minta analisis mendalam]
Kunci Jawaban: [jawaban analitis dengan argumen logis]
Pembahasan: [proses berpikir analitis langkah demi langkah]
Rubrik: Skor 25 (analisis mendalam, semua aspek, argumen berdasar fakta) | Skor 20 (analisis baik) | Skor 15 (analisis cukup) | Skor 10 (lebih deskripsi dari analisis) | Skor 0 (tidak ada upaya)

SOAL URAIAN 5 (C5 - Mengevaluasi/HOTs) - Bobot 25 poin
Soal: [soal evaluasi - minta siswa nilai, buat keputusan, atau beri solusi masalah nyata terkait ${topik}]
Kunci Jawaban: [jawaban evaluatif dengan kriteria yang jelas]
Pembahasan: [kriteria evaluasi dan mengapa solusi tertentu lebih baik]
Rubrik: Skor 25 (evaluasi tepat, kriteria jelas, didukung bukti, inovatif) | Skor 20 (baik, logis) | Skor 15 (cukup, kurang bukti) | Skor 10 (pendapat tanpa kriteria) | Skor 0 (tidak menjawab)

Total Nilai Kognitif = Soal 1 + Soal 2 + Soal 3 + Soal 4 + Soal 5 (Maksimal: 100 poin)
Kriteria: A (91-100/Sangat Baik) | B (81-90/Baik) | C (71-80/Cukup) | D (61-70/Perlu Bimbingan) | E (<61/Remedial)

C. ASESMEN AFEKTIF - RUBRIK OBSERVASI SIKAP
Teknik: Observasi selama pembelajaran | Skala: 1-4

RUBRIK PENILAIAN AFEKTIF

Aspek 1: [Dimensi PPP paling relevan dengan ${topik}]
Indikator: [perilaku konkret yang bisa diamati]
Skor 4 (Sangat Baik): [deskripsi perilaku - selalu konsisten, jadi contoh]
Skor 3 (Baik): [deskripsi - sering muncul, sesekali perlu pengingat]
Skor 2 (Cukup): [deskripsi - kadang-kadang, perlu dorongan]
Skor 1 (Kurang): [deskripsi - jarang, perlu bimbingan intensif]

Aspek 2: [Dimensi PPP kedua relevan dengan ${topik}]
Indikator: [perilaku konkret]
Skor 4: [deskripsi spesifik] | Skor 3: [deskripsi] | Skor 2: [deskripsi] | Skor 1: [deskripsi]

Aspek 3: Gotong Royong (Kerjasama Kelompok)
Indikator: Aktif berkontribusi dan menghargai pendapat teman dalam diskusi ${topik}
Skor 4: Selalu aktif, memimpin diskusi produktif, menghargai semua pendapat
Skor 3: Sering aktif, menghargai pendapat, sesekali perlu diingatkan
Skor 2: Ikut serta namun belum konsisten, kadang mendominasi atau pasif
Skor 1: Pasif, tidak menghargai pendapat teman, perlu pendampingan

Aspek 4: Mandiri (Kemandirian Belajar)
Indikator: Mengerjakan tugas mandiri tanpa bergantung berlebihan
Skor 4: Selalu berinisiatif mencari sumber lain, mengerjakan mandiri, membantu teman
Skor 3: Sering mandiri, hanya bertanya jika benar-benar perlu
Skor 2: Masih sering bertanya sebelum mencoba, perlu dorongan
Skor 1: Selalu bergantung pada guru/teman, tidak mau mencoba sendiri

Aspek 5: Bernalar Kritis
Indikator: Mengajukan pertanyaan kritis dan memberikan argumen berbasis bukti tentang ${topik}
Skor 4: Selalu mengajukan pertanyaan tajam, argumen selalu berbasis bukti dan logis
Skor 3: Sering bernalar kritis, argumen cukup berdasar
Skor 2: Kadang bertanya kritis, sebagian argumen berdasar pendapat pribadi
Skor 1: Jarang bertanya, menerima informasi apa adanya

Rumus Nilai Afektif = (Total Skor / 20) x 100
Kriteria: A-Sangat Baik (91-100) | B-Baik (81-90) | C-Cukup (71-80) | D-Kurang (<71/Perlu Pembinaan)

LEMBAR REKAPITULASI AFEKTIF:
No | Nama Siswa | Asp.1 | Asp.2 | Asp.3 | Asp.4 | Asp.5 | Total /20 | Nilai | Predikat
1  | .......... |  /4   |  /4   |  /4   |  /4   |  /4   |           |       |
(dst untuk semua siswa)

D. ASESMEN PSIKOMOTORIK - RUBRIK KETERAMPILAN
Teknik: Observasi unjuk kerja dan penilaian produk | Skala: 1-4

RUBRIK PENILAIAN PSIKOMOTORIK

Aspek 1: [Keterampilan utama terkait ${topik} - sesuaikan dengan kegiatan inti]
Indikator: [kinerja konkret yang diamati]
Skor 4 (Sangat Terampil): [akurat, efisien, kreatif, mandiri - deskripsi spesifik]
Skor 3 (Terampil): [sebagian besar benar, sedikit bantuan - deskripsi spesifik]
Skor 2 (Cukup Terampil): [perlu beberapa koreksi, butuh bimbingan - deskripsi]
Skor 1 (Perlu Bimbingan): [banyak kesalahan, butuh pendampingan penuh - deskripsi]

Aspek 2: [Keterampilan teknis 2 terkait ${topik}]
Indikator: [kinerja yang diamati]
Skor 4 (Sangat Terampil): [deskripsi operasional]
Skor 3 (Terampil): [deskripsi] | Skor 2 (Cukup): [deskripsi] | Skor 1 (Perlu Bimbingan): [deskripsi]

Aspek 3: [Keterampilan analisis dalam praktik terkait ${topik}]
Skor 4: Mampu identifikasi masalah, analisis, dan buat solusi tepat secara mandiri
Skor 3: Mampu analisis dengan panduan minimal, solusi cukup tepat
Skor 2: Mampu ikuti langkah analisis namun perlu banyak bimbingan
Skor 1: Belum mampu analisis, hanya ikuti instruksi dasar

Aspek 4: Presentasi dan Komunikasi Hasil
Indikator: Menyampaikan hasil kerja tentang ${topik} secara jelas dan sistematis
Skor 4: Sangat jelas, sistematis, percaya diri, media efektif, mampu jawab pertanyaan
Skor 3: Jelas dan sistematis, cukup percaya diri, jawab sebagian besar pertanyaan
Skor 2: Cukup jelas namun kurang sistematis atau kurang percaya diri
Skor 1: Kurang jelas, tidak sistematis, tidak percaya diri

Aspek 5: Penggunaan Alat/Media/Sumber Belajar
Skor 4: Menggunakan semua alat/media dengan sangat tepat, efisien, dan kreatif
Skor 3: Menggunakan dengan tepat, beberapa penggunaan kurang optimal
Skor 2: Cukup tepat, ada beberapa kesalahan penggunaan
Skor 1: Kurang tepat, perlu demonstrasi ulang dari guru

Rumus Nilai Psikomotorik = (Total Skor / 20) x 100
Kriteria: A-Sangat Terampil (91-100) | B-Terampil (81-90) | C-Cukup (71-80) | D-Perlu Bimbingan (<71)

LEMBAR REKAPITULASI PSIKOMOTORIK:
No | Nama Siswa | Asp.1 | Asp.2 | Asp.3 | Asp.4 | Asp.5 | Total /20 | Nilai | Predikat
1  | .......... |  /4   |  /4   |  /4   |  /4   |  /4   |           |       |
(dst untuk semua siswa)

REKAPITULASI NILAI AKHIR
Komponen         | Bobot | Nilai | Nilai Tertimbang
Kognitif (Uraian)| 40%   | ...   | ...
Afektif (Sikap)  | 30%   | ...   | ...
Psikomotorik     | 30%   | ...   | ...
NILAI AKHIR      | 100%  |       | = (Kognitif x 0,4) + (Afektif x 0,3) + (Psikomotorik x 0,3)
KKM              : 75

E. PROGRAM REMEDIAL
Sasaran: Nilai Akhir < 75
Nilai 61-74 (Remidi Parsial): Pengulangan bagian yang belum dikuasai
Nilai < 61 (Remidi Total): Pembelajaran ulang seluruh materi dengan pendekatan berbeda

Kegiatan Remedial:
1. Pembelajaran ulang dengan pendekatan visual/konkret lebih sederhana
2. Tutor sebaya: siswa tuntas mendampingi yang belum
3. Latihan soal bertahap dari termudah

Soal Remedial (lebih mudah):
Soal R1 (C1): [soal mudah konsep dasar ${topik}]
Kunci: [jawaban] | Pembahasan: [penjelasan sederhana]

Soal R2 (C2): [soal mudah pemahaman dasar]
Kunci: [jawaban] | Pembahasan: [penjelasan sederhana]

Soal R3 (C3 sederhana): [soal aplikasi mudah]
Kunci: [jawaban] | Pembahasan: [langkah-langkah sederhana]

F. PROGRAM PENGAYAAN
Sasaran: Nilai Akhir >= 80
Kegiatan:
1. [Proyek mini terkait ${topik} yang lebih menantang]
2. [Eksplorasi/penelitian sederhana mandiri]
3. Menjadi tutor sebaya untuk membantu teman remedial

Soal Pengayaan (HOTs tinggi):
Soal P1 (C6-Kreasi): [soal sangat menantang - rancang/ciptakan sesuatu terkait ${topik}]
Kunci/Panduan: [kunci pokok dan kriteria penilaian]
Pembahasan: [proses berpikir kreatif yang diharapkan]

G. REFLEKSI GURU
1. Apakah seluruh tujuan pembelajaran tercapai berdasarkan hasil asesmen? Buktinya apa?
2. Kegiatan mana yang paling efektif membantu siswa memahami ${topik}?
3. Kendala apa yang muncul dan bagaimana cara mengatasinya ke depan?
4. Modifikasi apa yang akan dilakukan untuk pembelajaran berikutnya?

LEMBAR PENGESAHAN

Mengetahui,                              [Kota/Kabupaten], ${today}
Kepala Sekolah,                          Guru ${mapel},




_________________________________        _________________________________
[Nama Kepala Sekolah]                    [Nama Guru]
NIP. ____________________________        NIP. ____________________________

Catatan Kepala Sekolah:
_______________________________________________________________
_______________________________________________________________

Dibuat dengan: Asisten Guru by Mas Gema
Berdasarkan  : SK BSKAP No. 032/H/KR/2024 - Kurikulum Merdeka 2024`;
}

function setButtonLoading(btnId, loading, label, step) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    const steps = ['Tahap 1/2: Membuat RPP & Kegiatan...', 'Tahap 2/2: Membuat Asesmen & Tanda Tangan...'];
    btn.innerHTML = `<div class="loading-dots"><span></span><span></span><span></span></div> ${steps[step || 0]}`;
  } else {
    btn.innerHTML = '▶ ' + label;
  }
}

async function generateAI(type) {
  if (!canGenerate()) {
    alert('Kredit habis! Silakan upgrade ke Premium untuk generate tanpa batas.');
    goPage('upgrade');
    return;
  }

  if (type === 'rpp') { await generateRPP(); return; }

  const configs = {
    soal: {
      btnId: 'btn-soal', label: 'Generate Soal + Kunci Jawaban', resId: 'res-soal',
      getPrompt: () => {
        const mapel = document.getElementById('soal-mapel').value || 'IPA';
        const kelas = document.getElementById('soal-kelas').value;
        const jenis = document.getElementById('soal-jenis').value;
        const jumlah = document.getElementById('soal-jumlah').value;
        const topik = document.getElementById('soal-topik').value || 'Sistem Pencernaan';
        const level = document.getElementById('soal-level').value;
        return `Buatkan ${jumlah} soal ${jenis} berkualitas untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB ada jawaban lengkap dan pembahasan detail. PG sertakan 4 opsi dengan pengecoh masuk akal. Tulis Soal 1, Soal 2 dst. Akhiri dengan KUNCI JAWABAN. Tidak ada simbol markdown.`;
      },
      system: 'Kamu ahli evaluasi pendidikan dari Asisten Guru by Mas Gema. Buat soal berkualitas dengan pembahasan mendidik. Tidak ada simbol Markdown.'
    },
    admin: {
      btnId: 'btn-admin', label: 'Buat Dokumen', resId: 'res-admin',
      getPrompt: () => `Buatkan ${document.getElementById('admin-jenis').value} profesional. Konteks: ${document.getElementById('admin-konteks').value || 'umum'}. Format rapi, formal, siap digunakan. Tidak ada simbol markdown.`,
      system: 'Kamu asisten administrasi sekolah dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    },
    pkb: {
      btnId: 'btn-pkb', label: 'Generate Laporan PKB', resId: 'res-pkb',
      getPrompt: () => {
        const nama = document.getElementById('pkb-nama').value || 'Guru';
        const mapel = document.getElementById('pkb-mapel').value || 'Umum';
        const kegiatan = document.getElementById('pkb-kegiatan').value || 'Pelatihan';
        const refleksi = document.getElementById('pkb-refleksi').value || 'Bermanfaat';
        return `Buatkan Laporan PKB formal: Nama ${nama}, Mapel ${mapel}, Kegiatan ${kegiatan}, Refleksi ${refleksi}. Bagian: Pendahuluan, Pelaksanaan, Hasil & Manfaat, Refleksi & RTL, Penutup. Formal siap dilaporkan. Tidak ada simbol markdown.`;
      },
      system: 'Kamu asisten penulisan laporan dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    }
  };

  const cfg = configs[type];
  if (!cfg) return;

  setButtonLoading(cfg.btnId, true, cfg.label, 0);
  const resEl = document.getElementById(cfg.resId);
  resEl.innerHTML = ''; resEl.classList.remove('show');

  try {
    const result = await callAI(cfg.getPrompt(), cfg.system);
    showResult(cfg.resId, result);
    await useCredit();
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;font-size:12px;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }
  setButtonLoading(cfg.btnId, false, cfg.label, 0);
}

async function generateRPP() {
  const mapel = document.getElementById('rpp-mapel').value || 'IPA';
  const kelas = document.getElementById('rpp-kelas').value;
  const kur = document.getElementById('rpp-kur').value;
  const waktu = document.getElementById('rpp-waktu').value;
  const topik = document.getElementById('rpp-topik').value || 'Sistem Pencernaan';
  const catatan = document.getElementById('rpp-tujuan').value;
  const fase = getFase(kelas);
  const system = getSystemPrompt();
  const resEl = document.getElementById('res-rpp');

  resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;margin-bottom:.5rem;">⏳</div><div style="font-weight:600;">Tahap 1/2: Membuat RPP & Kegiatan...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">30-40 detik</div></div>`;
  resEl.classList.add('show');
  setButtonLoading('btn-rpp', true, 'Generate RPP Lengkap', 0);

  let part1 = '';
  try {
    part1 = await callAI(buildPrompt1(mapel, kelas, fase, waktu, topik, catatan), system);
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
    return;
  }

  resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;margin-bottom:.5rem;">📝</div><div style="font-weight:600;">Tahap 2/2: Membuat Asesmen & Tanda Tangan...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">Hampir selesai, 30-40 detik lagi</div></div>`;
  setButtonLoading('btn-rpp', true, 'Generate RPP Lengkap', 1);

  let part2 = '';
  try {
    part2 = await callAI(buildPrompt2(mapel, kelas, fase, topik), system);
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
    return;
  }

  const fullResult = part1 + '\n\n' + part2;
  showResult('res-rpp', fullResult);
  await useCredit();
  setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
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

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/^[-*]\s+/gm, '• ')
    .replace(/^_{3,}$/gm, '').replace(/^-{3,}$/gm, '─────────────')
    .replace(/`(.+?)`/g, '$1').trim();
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
  if (!w) { alert('Izinkan popup browser.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Modul Ajar</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:10pt;margin-bottom:20pt;}
    .ht{font-size:15pt;font-weight:700;color:#7c3aed;}.hs{font-size:10pt;color:#555;margin-top:4pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">ASISTEN GURU BY MAS GEMA</div>
    <div class="hs">${currentUser ? currentUser.name : 'Guru'} | ${today}</div>
    <div class="hs">Berdasarkan SK BSKAP No. 032/H/KR/2024</div></div>
    <pre>${clean}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

async function downloadWord(resId) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  if (!raw) { alert('Tidak ada konten.'); return; }
  if (!docxReady || typeof docx === 'undefined') { alert('Library Word dimuat, tunggu 3 detik.'); return; }
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const children = [];
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MODUL AJAR — ASISTEN GURU BY MAS GEMA', bold: true, size: 28, color: '7c3aed', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (currentUser ? currentUser.name + '  |  ' : '') + today, size: 20, color: '555555', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Berdasarkan SK BSKAP No. 032/H/KR/2024 — Kurikulum Merdeka', size: 18, color: '9333ea', italics: true, font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } }, spacing: { after: 400 } }));

    raw.split('\n').forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 120 } })); return; }
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
      const isH = clean === clean.toUpperCase() && clean.length > 4 && /[A-Z]/.test(clean) && !/^\d/.test(clean) && !/^[A-D]\./.test(clean) && !/^(NIP|No\.)/.test(clean);
      const parts = clean.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.filter(p => p).map(p =>
        /^\*\*[^*]+\*\*$/.test(p)
          ? new TextRun({ text: p.replace(/\*\*/g, ''), bold: true, size: 22, font: 'Times New Roman', color: '1a1523' })
          : new TextRun({ text: p.replace(/\*\*/g, ''), bold: isH, size: isH ? 23 : 22, font: 'Times New Roman', color: isH ? '3b0764' : '1a1523' })
      );
      children.push(new Paragraph({ children: runs.length ? runs : [new TextRun({ text: clean, size: 22, font: 'Times New Roman' })], spacing: { before: isH ? 240 : 60, after: 60 } }));
    });

    children.push(new Paragraph({ spacing: { before: 480 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— Dibuat dengan Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024 —', italics: true, size: 18, color: '9333ea', font: 'Times New Roman' })] }));

    const doc = new Document({ styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } }, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ModulAjar_' + Date.now() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  } catch (e) { alert('Gagal download Word: ' + e.message); }
}

function hubungiAdmin() { alert('Hubungi Mas Gema untuk upgrade Premium!\n\nWhatsApp: (isi nomor WA kamu)'); }

// ── AUTO LOGIN ──
(function init() {
  const session = getSession();
  if (session) enterApp(session);
  // Set default tanggal bayar
  const pd = document.getElementById('pay-date');
  if (pd) pd.value = new Date().toISOString().split('T')[0];
})();
