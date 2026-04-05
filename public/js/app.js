// ═══════════════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — Kisi-Kisi + Soal + Medsos
// ═══════════════════════════════════════

const API = '/api/chat';
let currentUser = null;
let docxReady = false;
let activePlatform = 'instagram';

// Data kisi-kisi yang tersimpan untuk dipakai generate soal
let savedKisiKisi = { mapel: '', kelas: '', jenis: '', materi: '', jmlPG: 0, jmlUraian: 0, level: '', teks: '' };

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

const getSession = () => { try { return JSON.parse(localStorage.getItem('ag_session') || 'null'); } catch { return null; } };
const saveSession = s => localStorage.setItem('ag_session', JSON.stringify(s));
const clearSession = () => localStorage.removeItem('ag_session');

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
  } catch (e) { err.textContent = e.message; }
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
  } catch (e) { err.textContent = e.message; }
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
  document.getElementById('app-screen').style.display = 'flex';
  goPage('dashboard');
  const pd = document.getElementById('pay-date');
  if (pd) pd.value = new Date().toISOString().split('T')[0];
}

function doLogout() {
  clearSession(); currentUser = null;
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
  if (currentUser.plan !== 'premium' && currentUser.plan !== 'tahunan') {
    currentUser.credits = Math.max(0, (currentUser.credits ?? 5) - 1);
  }
  currentUser.total_gen = (currentUser.total_gen || 0) + 1;
  saveSession(currentUser);
  updatePlanUI();
  api('user_update', { id: currentUser.id, credits: currentUser.credits, total_gen: currentUser.total_gen, plan: currentUser.plan }).catch(() => {});
}

// ── NAVIGASI ──
const PAGE_INFO = {
  dashboard: { title: 'Beranda', sub: 'Selamat datang di Asisten Guru by Mas Gema' },
  rpp: { title: 'Generator RPP', sub: 'Modul Ajar Kurikulum Merdeka + CP + Asesmen 3 Ranah' },
  kisi: { title: '📊 Kisi-Kisi → Soal Otomatis', sub: 'Format resmi Kemendikbud — kisi-kisi jadi, soal langsung tersambung!' },
  soal: { title: 'Generator Soal Cepat', sub: 'Generate soal tanpa kisi-kisi' },
  'admin-doc': { title: 'Asisten Administrasi', sub: 'Dokumen guru siap pakai' },
  pkb: { title: 'Laporan PKB', sub: 'Laporan pengembangan keprofesian profesional' },
  medsos: { title: '📱 Generator Konten Medsos', sub: 'Bangun personal branding & monetize sebagai guru konten kreator' },
  upgrade: { title: 'Upgrade Premium', sub: 'Generate tanpa batas semua tools' },
  bayar: { title: 'Konfirmasi Pembayaran', sub: 'Transfer dan kirim bukti' },
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
}

function canGenerate() {
  if (!currentUser) return false;
  if (currentUser.plan === 'premium' || currentUser.plan === 'tahunan') return true;
  return (currentUser.credits ?? 5) > 0;
}

async function callAI(prompt, system, maxTokens = 4000) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ai',
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: system,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'API error');
  return data?.content?.[0]?.text || '';
}

// ── PLATFORM MEDSOS ──
function setPlatform(platform) {
  activePlatform = platform;
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  const btn = document.getElementById('ptab-' + platform);
  if (btn) btn.classList.add('active');
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
    ok.textContent = '✓ Konfirmasi terkirim! Admin akan verifikasi dalam 1x24 jam.';
    setTimeout(() => goPage('riwayat'), 2000);
  } catch (e) { err.textContent = e.message; }
  btn.disabled = false; btn.textContent = '📤 Kirim Konfirmasi';
}

async function loadRiwayat() {
  if (!currentUser) return;
  const el = document.getElementById('riwayat-list');
  el.textContent = 'Memuat...';
  try {
    const result = await api('get_user_transactions', { user_email: currentUser.email });
    const txns = result.transactions || [];
    if (!txns.length) { el.textContent = 'Belum ada riwayat pembayaran.'; return; }
    const sc = { pending: '#d97706', verified: '#16a34a', rejected: '#dc2626' };
    const sl = { pending: '⏳ Menunggu Verifikasi', verified: '✓ Terverifikasi', rejected: '✕ Ditolak' };
    el.innerHTML = txns.map(t => `
      <div class="txn-item">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:600;">Paket ${t.paket} — Rp ${parseInt(t.price).toLocaleString('id-ID')}</span>
          <span style="font-size:11px;font-weight:600;color:${sc[t.status]||'#666'}">${sl[t.status]||t.status}</span>
        </div>
        <div style="font-size:11px;color:#7c7490;">Pengirim: ${t.sender_name} | Transfer: ${t.transfer_date}</div>
      </div>`).join('');
  } catch (e) { el.textContent = 'Gagal: ' + e.message; }
}

// ══════════════════════════════════════
//  KISI-KISI GENERATOR
// ══════════════════════════════════════
function setAlurStep(step) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step-' + i);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    else if (i === step) el.classList.add('active');
  }
}

async function generateKisiKisi() {
  if (!canGenerate()) {
    alert('Kredit habis! Silakan upgrade ke Premium.');
    goPage('upgrade'); return;
  }

  const mapel = document.getElementById('kisi-mapel').value || 'IPA';
  const kelas = document.getElementById('kisi-kelas').value;
  const jenis = document.getElementById('kisi-jenis').value;
  const semester = document.getElementById('kisi-semester').value;
  const materi = document.getElementById('kisi-materi').value || 'Sistem Pencernaan';
  const jmlPG = document.getElementById('kisi-jml-pg').value;
  const jmlUraian = document.getElementById('kisi-jml-uraian').value;
  const level = document.getElementById('kisi-level').value;

  // Simpan untuk dipakai generate soal
  savedKisiKisi = { mapel, kelas, jenis, materi, jmlPG: parseInt(jmlPG), jmlUraian: parseInt(jmlUraian), level, teks: '' };

  const btn = document.getElementById('btn-kisi');
  const resEl = document.getElementById('res-kisi');
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> Membuat kisi-kisi resmi...';
  resEl.innerHTML = ''; resEl.classList.remove('show');
  document.getElementById('soal-from-kisi-card').style.display = 'none';
  document.getElementById('download-gabungan-card').style.display = 'none';
  setAlurStep(2);

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const prompt = `Buatkan KISI-KISI SOAL format resmi Kemendikbud untuk:
Satuan Pendidikan : (nama sekolah)
Mata Pelajaran    : ${mapel}
Kelas / Semester  : ${kelas} / ${semester}
Jenis Penilaian   : ${jenis}
Tahun Pelajaran   : 2024/2025
Materi            : ${materi}
Jumlah Soal PG    : ${jmlPG} soal
Jumlah Uraian     : ${jmlUraian} soal
Distribusi Level  : ${level}

Buat kisi-kisi dalam format tabel dengan kolom:
No | Kompetensi Dasar / Capaian Pembelajaran | Materi | Indikator Soal | Level Kognitif (C1-C6) | Bentuk Soal | Nomor Soal

Aturan distribusi level kognitif berdasarkan "${level}":
- Seimbang: C1(10%) C2(20%) C3(30%) C4(20%) C5(10%) C6(10%)
- Mudah dominan: C1(30%) C2(30%) C3(20%) C4(10%) C5(5%) C6(5%)
- Sedang dominan: C1(10%) C2(15%) C3(35%) C4(25%) C5(10%) C6(5%)
- HOTs dominan: C1(5%) C2(10%) C3(20%) C4(30%) C5(20%) C6(15%)

Setiap baris kisi-kisi harus punya:
- KD/CP yang spesifik sesuai ${mapel} ${kelas}
- Materi yang konkret
- Indikator soal yang operasional (dimulai kata kerja: siswa dapat mengidentifikasi, menjelaskan, menganalisis, dll)
- Level C yang tepat
- Nomor soal yang urut

Setelah tabel kisi-kisi, tambahkan:
REKAPITULASI SOAL
- Total PG: ${jmlPG} soal
- Total Uraian: ${jmlUraian} soal
- Total seluruh soal: ${parseInt(jmlPG) + parseInt(jmlUraian)} soal
- Distribusi level: (rinci per level berapa soal)

Tulis dalam format teks biasa yang rapi. Pisahkan kolom tabel dengan | (garis tegak). Header tabel diulang setiap 10 baris. Tidak ada simbol Markdown.`;

  const system = `Kamu adalah pengembang instrumen penilaian pendidikan Indonesia berpengalaman dari Asisten Guru by Mas Gema. Buat kisi-kisi soal sesuai format resmi Kemendikbud yang valid, terukur, dan bisa langsung digunakan. Indikator soal harus spesifik dan operasional. Tidak ada simbol Markdown.`;

  try {
    const result = await callAI(prompt, system);
    savedKisiKisi.teks = result;

    resEl.dataset.raw = result;
    resEl.classList.add('show');
    resEl.innerHTML = `
      <div class="result-label">📊 Kisi-Kisi Soal Resmi — ${jenis} ${mapel} ${kelas}</div>
      <div style="font-size:12px;line-height:1.8;color:#1a1523;font-family:monospace;white-space:pre-wrap;overflow-x:auto;">${result.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="result-actions">
        <button class="btn-copy" onclick="copyResult('res-kisi',this)">📋 Salin Kisi-Kisi</button>
        <button class="btn-dl btn-dl-print" onclick="printResult('res-kisi')">🖨️ Print Kisi-Kisi</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWord('res-kisi','Kisi-Kisi')">⬇ Word Kisi-Kisi</button>
      </div>`;

    // Tampilkan tombol generate soal
    document.getElementById('soal-from-kisi-card').style.display = 'block';
    setAlurStep(3);
    await useCredit();
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
    setAlurStep(1);
  }

  btn.disabled = false;
  btn.innerHTML = '📊 Generate Kisi-Kisi Resmi';
}

async function generateSoalDariKisi() {
  if (!canGenerate()) {
    alert('Kredit habis! Silakan upgrade ke Premium.');
    goPage('upgrade'); return;
  }

  const { mapel, kelas, jenis, materi, jmlPG, jmlUraian, level, teks } = savedKisiKisi;
  if (!teks) { alert('Generate kisi-kisi dulu!'); return; }

  const btn = document.getElementById('btn-gen-soal-kisi');
  const resEl = document.getElementById('res-soal-kisi');
  btn.disabled = true;
  btn.textContent = '⏳ Generating soal dari kisi-kisi... (30-60 detik)';
  resEl.innerHTML = ''; resEl.classList.remove('show');
  document.getElementById('download-gabungan-card').style.display = 'none';

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const prompt = `Berdasarkan kisi-kisi soal berikut, buatkan soal yang PERSIS sesuai kisi-kisi tersebut:

KISI-KISI:
${teks}

INSTRUKSI PEMBUATAN SOAL:
Mata Pelajaran : ${mapel}
Kelas          : ${kelas}
Jenis Penilaian: ${jenis}
Tanggal        : ${today}

WAJIB:
1. Buat TEPAT ${jmlPG} soal Pilihan Ganda sesuai indikator di kisi-kisi
2. Buat TEPAT ${jmlUraian} soal Uraian sesuai indikator di kisi-kisi
3. Setiap soal PG harus punya 4 opsi (A, B, C, D) dengan pengecoh yang masuk akal
4. Level kognitif setiap soal harus sesuai yang tercantum di kisi-kisi
5. Nomor soal harus sesuai nomor di kisi-kisi
6. Di akhir soal, tulis KUNCI JAWABAN dan PEMBAHASAN untuk semua soal

FORMAT OUTPUT:

SOAL PILIHAN GANDA

1. [Soal sesuai indikator C1/C2/dst dari kisi-kisi]
A. [opsi A]
B. [opsi B]
C. [opsi C]
D. [opsi D]

(lanjut sampai soal ke-${jmlPG})

SOAL URAIAN

${jmlPG > 0 ? parseInt(jmlPG) + 1 : 1}. [Soal uraian sesuai indikator dari kisi-kisi]
(lanjut sampai soal ke-${parseInt(jmlPG) + parseInt(jmlUraian)})

KUNCI JAWABAN DAN PEMBAHASAN

PILIHAN GANDA:
1. Jawaban: [huruf] | Pembahasan: [penjelasan detail mengapa benar dan mengapa opsi lain salah]
2. dst...

URAIAN:
${jmlPG > 0 ? parseInt(jmlPG) + 1 : 1}. Kunci Jawaban: [jawaban lengkap ideal]
Pembahasan: [penjelasan detail langkah demi langkah]
Skor Maksimal: [skor] | Rubrik: [kriteria penilaian]
dst...

PEDOMAN PENILAIAN:
Total skor PG: ${jmlPG} x [skor per soal] = [total]
Total skor Uraian: [rincian per soal]
Total skor maksimal: 100

Tidak ada simbol Markdown.`;

  const system = `Kamu adalah ahli penyusunan soal evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal yang persis sesuai kisi-kisi, valid, reliabel, dan berkualitas tinggi. Level kognitif harus tepat sesuai kisi-kisi. Pembahasan harus mendidik dan mudah dipahami siswa. Tidak ada simbol Markdown.`;

  try {
    const result = await callAI(prompt, system, 4000);
    resEl.dataset.raw = result;
    resEl.classList.add('show');
    resEl.innerHTML = `
      <div class="result-label">✅ Soal + Kunci + Pembahasan — Tersambung dari Kisi-Kisi</div>
      <div style="font-size:13px;line-height:1.85;color:#1a1523;white-space:pre-wrap;">${result.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="result-actions">
        <button class="btn-copy" onclick="copyResult('res-soal-kisi',this)">📋 Salin Soal</button>
        <button class="btn-dl btn-dl-print" onclick="printResult('res-soal-kisi')">🖨️ Print Soal</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWord('res-soal-kisi','Soal')">⬇ Word Soal</button>
      </div>`;

    // Tampilkan tombol download gabungan
    document.getElementById('download-gabungan-card').style.display = 'block';
    setAlurStep(4);
    await useCredit();
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }

  btn.disabled = false;
  btn.textContent = '✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
}

// Download Word gabungan Kisi-Kisi + Soal
async function downloadWordGabungan() {
  const kisiTeks = document.getElementById('res-kisi')?.dataset.raw || '';
  const soalTeks = document.getElementById('res-soal-kisi')?.dataset.raw || '';
  if (!kisiTeks || !soalTeks) { alert('Generate kisi-kisi dan soal dulu!'); return; }

  const gabungan = `KISI-KISI SOAL\n${'='.repeat(60)}\n\n${kisiTeks}\n\n${'='.repeat(60)}\nSOAL, KUNCI JAWABAN, DAN PEMBAHASAN\n${'='.repeat(60)}\n\n${soalTeks}`;
  await downloadWordFromText(gabungan, 'KisiKisi_dan_Soal_AsistenGuru_');
}

function printGabungan() {
  const kisiTeks = document.getElementById('res-kisi')?.dataset.raw || '';
  const soalTeks = document.getElementById('res-soal-kisi')?.dataset.raw || '';
  const gabungan = `KISI-KISI SOAL\n${'='.repeat(60)}\n\n${kisiTeks}\n\n${'='.repeat(60)}\nSOAL + KUNCI JAWABAN + PEMBAHASAN\n${'='.repeat(60)}\n\n${soalTeks}`;
  printText(gabungan);
}

function copyGabungan(btn) {
  const kisiTeks = document.getElementById('res-kisi')?.dataset.raw || '';
  const soalTeks = document.getElementById('res-soal-kisi')?.dataset.raw || '';
  const gabungan = `KISI-KISI SOAL\n${'='.repeat(60)}\n\n${kisiTeks}\n\n${'='.repeat(60)}\nSOAL + KUNCI JAWABAN\n${'='.repeat(60)}\n\n${soalTeks}`;
  navigator.clipboard.writeText(gabungan).catch(() => {});
  btn.textContent = '✓ Tersalin!';
  setTimeout(() => { btn.textContent = '📋 Salin Semua'; }, 2000);
}

// ── AI GENERATE LAINNYA ──
function getFase(kelas) {
  if (kelas.includes('Kelas 1') || kelas.includes('Kelas 2')) return 'Fase A';
  if (kelas.includes('Kelas 3') || kelas.includes('Kelas 4')) return 'Fase B';
  if (kelas.includes('Kelas 5') || kelas.includes('Kelas 6')) return 'Fase C';
  if (kelas.includes('Kelas 7') || kelas.includes('Kelas 8') || kelas.includes('Kelas 9')) return 'Fase D';
  if (kelas.includes('Kelas 10')) return 'Fase E';
  return 'Fase F';
}

function getSystemRPP() {
  return `Kamu adalah pakar pengembang kurikulum Indonesia dari Asisten Guru by Mas Gema. ATURAN: Jangan gunakan simbol Markdown. Gunakan HURUF KAPITAL untuk judul bagian. Isi semua bagian dengan konten NYATA dan LENGKAP.

DATABASE CP SK BSKAP 032/H/KR/2024:
Fase A: Bahasa Indonesia: berkomunikasi dan bernalar tentang diri dan lingkungan. Matematika: operasi penjumlahan dan pengurangan bilangan cacah sampai 999. IPAS: mengidentifikasi kondisi di lingkungan rumah dan sekolah.
Fase B: Bahasa Indonesia: memahami dan menyampaikan pesan menggunakan beragam media. Matematika: operasi hitung bilangan cacah dan pecahan sederhana, keliling dan luas bangun datar. IPAS: perubahan wujud zat, keanekaragaman makhluk hidup.
Fase C: Bahasa Indonesia: memahami, mengolah, menginterpretasi informasi dari berbagai tipe teks. Matematika: operasi hitung bilangan desimal, negatif, pecahan, luas dan volume. IPAS/IPA: sistem organ manusia, gaya dan energi. IPS: keragaman budaya Indonesia.
Fase D: Bahasa Indonesia: memahami, mengolah, mengevaluasi teks multimodal. Matematika: relasi, fungsi, persamaan linear, SPLDV. IPA: sifat zat, sistem organ manusia dan homeostasis. IPS: kondisi geografis, sosial-budaya Indonesia dan dunia.
Fase E: Bahasa Indonesia: mengevaluasi dan mengkreasi informasi dari berbagai teks. Matematika: eksponen, logaritma, trigonometri, geometri, statistika. Fisika: vektor, kinematika, dinamika. Kimia: fenomena kimia. Biologi: sains dalam kehidupan nyata.
Fase F: Bahasa Indonesia: mengkreasi berbagai teks. Matematika: limit, turunan, integral. Fisika: penerapan dalam teknologi.`;
}

function buildPrompt1(mapel, kelas, fase, waktu, topik, catatan) {
  return `Buatkan MODUL AJAR Kurikulum Merdeka bagian INFORMASI UMUM dan KEGIATAN untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Fase: ${fase} | Topik: ${topik} | Waktu: ${waktu}
${catatan ? 'Catatan: ' + catatan : ''}

IDENTITAS MODUL
Nama Penyusun: (nama guru) | Institusi: (nama sekolah) | Tahun: 2024/2025
Mata Pelajaran: ${mapel} | Fase/Kelas: ${fase}/${kelas} | Topik: ${topik} | Waktu: ${waktu}
Referensi CP: SK BSKAP No. 032/H/KR/2024

CAPAIAN PEMBELAJARAN (CP) BERDASARKAN SK BSKAP 032/H/KR/2024
[Tulis narasi CP LENGKAP untuk ${mapel} ${fase} - minimal 3 paragraf]

ELEMEN CP RELEVAN DENGAN ${topik.toUpperCase()}:
[Tulis elemen CP spesifik terkait ${topik}]

ALUR TUJUAN PEMBELAJARAN (ATP): [3-4 ATP urutan logis]
KOMPETENSI AWAL: [3 prasyarat]

PROFIL PELAJAR PANCASILA:
1. [Dimensi 1]: [implementasi dalam ${topik}]
2. [Dimensi 2]: [implementasi]
3. [Dimensi 3]: [implementasi]

SARANA DAN PRASARANA: [lengkap]
MODEL DAN METODE: Model: [pilih] | Metode: [daftar] | Pendekatan: Saintifik

TUJUAN PEMBELAJARAN:
1. (C1) [...] | 2. (C2) [...] | 3. (C3) [...] | 4. (C4) [...]

PEMAHAMAN BERMAKNA: [manfaat nyata ${topik}]
PERTANYAAN PEMANTIK: 1. [...] | 2. [...] | 3. [...]

KEGIATAN PEMBUKA (15 menit) [apersepsi dengan dialog, motivasi, tujuan]
KEGIATAN INTI (sesuai ${waktu})
Langkah 1-5: [detail setiap langkah: Guru: [...] | Siswa: [...]]
DIFERENSIASI: Sudah paham: [...] | Belum paham: [...]
KEGIATAN PENUTUP (15 menit) [refleksi, exit ticket 2 soal + jawaban, tindak lanjut]`;
}

function buildPrompt2(mapel, kelas, fase, topik) {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Buatkan BAGIAN ASESMEN LENGKAP untuk Modul Ajar ${mapel} ${kelas} ${fase} topik ${topik}. Isi NYATA, LENGKAP, tanpa simbol Markdown.

ASESMEN

A. ASESMEN DIAGNOSTIK
Soal 1: [...] | Jawaban: [...] | Interpretasi benar: [...] | Interpretasi salah: [...]
Soal 2: [...] | Jawaban: [...] | Interpretasi: [...]

B. ASESMEN KOGNITIF - 5 SOAL URAIAN

SOAL 1 (C1-Mengingat) - 15 poin
Soal: [...] | Kunci: [...] | Pembahasan: [...] | Rubrik: 15/10/5/0

SOAL 2 (C2-Memahami) - 15 poin
Soal: [...] | Kunci: [...] | Pembahasan: [...] | Rubrik: 15/10/5/0

SOAL 3 (C3-Mengaplikasikan) - 20 poin
Soal: [...] | Kunci: [...] | Pembahasan: [...] | Rubrik: 20/15/10/5/0

SOAL 4 (C4-Menganalisis/HOTs) - 25 poin
Soal: [berbasis kasus nyata] | Kunci: [...] | Pembahasan: [...] | Rubrik: 25/20/15/10/0

SOAL 5 (C5-Mengevaluasi/HOTs) - 25 poin
Soal: [evaluasi/solusi masalah] | Kunci: [...] | Pembahasan: [...] | Rubrik: 25/20/15/10/0

C. ASESMEN AFEKTIF - RUBRIK OBSERVASI (Skala 1-4)
[5 aspek sikap sesuai PPP dengan deskripsi skor 4,3,2,1 untuk masing-masing]
Rumus: (Total/20)x100 | Lembar rekapitulasi tabel

D. ASESMEN PSIKOMOTORIK - RUBRIK KETERAMPILAN (Skala 1-4)
[5 aspek keterampilan dengan deskripsi skor 4,3,2,1]
Rumus: (Total/20)x100 | Lembar rekapitulasi tabel

REKAPITULASI NILAI AKHIR:
NA = (Kognitif x 40%) + (Afektif x 30%) + (Psikomotorik x 30%) | KKM: 75

E. REMEDIAL (Nilai < 75)
Soal R1 (C1 mudah): [...] | Kunci: [...] | Pembahasan: [sederhana]
Soal R2 (C2 mudah): [...] | Kunci: [...] | Pembahasan: [sederhana]
Soal R3 (C3 mudah): [...] | Kunci: [...] | Pembahasan: [sederhana]

F. PENGAYAAN (Nilai >= 80)
Soal P1 (C6-Kreasi): [...] | Panduan: [...] | Proses kreatif: [...]

G. REFLEKSI GURU
1. Tujuan tercapai? Bukti?
2. Kegiatan paling efektif?
3. Kendala dan solusi?
4. Modifikasi berikutnya?

LEMBAR PENGESAHAN

Mengetahui,                              [Kota], ${today}
Kepala Sekolah,                          Guru ${mapel},




_______________________________          _______________________________
[Nama Kepala Sekolah]                    [Nama Guru]
NIP. ___________________________         NIP. ___________________________

Dibuat dengan: Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024`;
}

function buildMedsosPrompt(platform, jenis, topik, mapel, tone, audiens) {
  const cfg = {
    instagram: { nama: 'Instagram', tips: 'Hook kuat di 3 baris pertama' },
    tiktok: { nama: 'TikTok', tips: 'Hook 3 detik pertama, hook-value-CTA' },
    youtube: { nama: 'YouTube', tips: 'Judul SEO-friendly, deskripsi lengkap' },
    twitter: { nama: 'Twitter/X', tips: 'Thread 5-8 tweet, tweet pertama paling menarik' },
    whatsapp: { nama: 'WhatsApp', tips: 'Personal, hangat, paragraf pendek, ada CTA' }
  }[platform] || { nama: 'Instagram', tips: '' };

  const toneMap = {
    'Santai & Friendly': 'santai, akrab seperti teman, gunakan "kamu"',
    'Inspiratif & Motivasi': 'inspiratif, membangkitkan semangat, penuh afirmasi positif',
    'Profesional & Edukatif': 'profesional namun mudah dipahami, berbasis fakta',
    'Lucu & Relatable': 'ringan, ada humor relatable untuk guru dan siswa',
    'Storytelling': 'bercerita yang mengalir, ada konflik-solusi'
  };

  return `Kamu adalah content strategist media sosial edukasi terbaik Indonesia dari Asisten Guru by Mas Gema.

Buat konten ${cfg.nama}:
Platform: ${cfg.nama} | Jenis: ${jenis} | Topik: ${topik} | Mapel: ${mapel}
Tone: ${toneMap[tone] || tone} | Target: ${audiens || 'guru Indonesia'} | Tips: ${cfg.tips}

Buat konten yang langsung bisa dicopy-paste. Sertakan juga:
1. Konten utama siap pakai
2. Tips cara posting optimal (waktu, tagging, dll)
3. 3 ide konten lanjutan bertema sama
4. Potensi monetize dari konten ini

Tidak ada simbol Markdown berlebihan.`;
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
    alert('Kredit habis! Silakan upgrade ke Premium.');
    goPage('upgrade'); return;
  }
  if (type === 'rpp') { await generateRPP(); return; }
  if (type === 'medsos') { await generateMedsos(); return; }

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
        return `Buatkan ${jumlah} soal ${jenis} untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB ada jawaban lengkap dan pembahasan. PG sertakan 4 opsi. Akhiri dengan KUNCI JAWABAN. Tidak ada simbol markdown.`;
      },
      system: 'Kamu ahli evaluasi pendidikan dari Asisten Guru by Mas Gema. Soal berkualitas, pembahasan mendidik. Tidak ada simbol Markdown.'
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
  const waktu = document.getElementById('rpp-waktu').value;
  const topik = document.getElementById('rpp-topik').value || 'Sistem Pencernaan';
  const catatan = document.getElementById('rpp-tujuan').value;
  const fase = getFase(kelas);
  const system = getSystemRPP();
  const resEl = document.getElementById('res-rpp');

  resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;margin-bottom:.5rem;">⏳</div><div style="font-weight:600;">Tahap 1/2: Membuat RPP & Kegiatan...</div><div style="font-size:11px;color:#7c7490;">30-40 detik</div></div>`;
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

  resEl.innerHTML = `<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;margin-bottom:.5rem;">📝</div><div style="font-weight:600;">Tahap 2/2: Membuat Asesmen & Tanda Tangan...</div></div>`;
  setButtonLoading('btn-rpp', true, 'Generate RPP Lengkap', 1);

  let part2 = '';
  try {
    part2 = await callAI(buildPrompt2(mapel, kelas, fase, topik), system);
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
    return;
  }

  showResult('res-rpp', part1 + '\n\n' + part2);
  await useCredit();
  setButtonLoading('btn-rpp', false, 'Generate RPP Lengkap', 0);
}

async function generateMedsos() {
  const topik = document.getElementById('med-topik').value || 'Tips belajar';
  const jenis = document.getElementById('med-jenis').value;
  const mapel = document.getElementById('med-mapel').value || 'Umum';
  const tone = document.getElementById('med-tone').value;
  const audiens = document.getElementById('med-audiens').value;
  const btn = document.getElementById('btn-medsos');
  const resEl = document.getElementById('res-medsos');
  btn.disabled = true;
  btn.innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div> Generating konten...';
  resEl.innerHTML = ''; resEl.classList.remove('show');
  try {
    const result = await callAI(buildMedsosPrompt(activePlatform, jenis, topik, mapel, tone, audiens),
      'Kamu content strategist media sosial edukasi terbaik Indonesia dari Asisten Guru by Mas Gema. Buat konten viral, bermanfaat, siap pakai. Tidak ada simbol Markdown berlebihan.');
    showResult('res-medsos', result);
    await useCredit();
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }
  btn.disabled = false;
  btn.innerHTML = '✨ Generate Konten Medsos';
}

// ── DISPLAY & EXPORT ──
function renderDisplay(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^#{1,2}\s+(.+)$/gm,'<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid #ede9fe;padding-bottom:5px;">$1</div>')
    .replace(/^#{3,6}\s+(.+)$/gm,'<div style="font-size:13px;font-weight:600;color:#4a4458;margin:10px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^[-*]\s+(.+)$/gm,'<div style="margin:3px 0 3px 16px;font-size:13px;">•&nbsp;$1</div>')
    .replace(/^-{3,}$/gm,'<hr style="border:none;border-top:1px solid #e8e4f0;margin:10px 0;">')
    .replace(/\n/g,'<br>');
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
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}','Dokumen')">⬇ Download Word</button>
    </div>`;
}

function copyResult(resId, btn) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  navigator.clipboard.writeText(raw).catch(() => {});
  const prev = btn.textContent;
  btn.textContent = '✓ Tersalin!';
  setTimeout(() => { btn.textContent = prev; }, 2000);
}

function printText(text) {
  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const w = window.open('', '_blank');
  if (!w) { alert('Izinkan popup browser.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Asisten Guru</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:10pt;margin-bottom:20pt;}
    .ht{font-size:15pt;font-weight:700;color:#7c3aed;}.hs{font-size:10pt;color:#555;margin-top:4pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">Asisten Guru by Mas Gema</div>
    <div class="hs">${currentUser ? currentUser.name : ''} | ${today} | SK BSKAP No. 032/H/KR/2024</div></div>
    <pre>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

function printResult(resId) {
  printText(document.getElementById(resId)?.dataset.raw || '');
}

async function downloadWordFromText(text, prefix = 'AsistenGuru_') {
  if (!docxReady || typeof docx === 'undefined') { alert('Library Word dimuat, tunggu 3 detik.'); return; }
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const children = [];
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ASISTEN GURU BY MAS GEMA', bold: true, size: 28, color: '7c3aed', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: (currentUser ? currentUser.name + '  |  ' : '') + today, size: 20, color: '555555', font: 'Times New Roman' })], spacing: { after: 60 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Berdasarkan SK BSKAP No. 032/H/KR/2024 — Kurikulum Merdeka', size: 18, color: '9333ea', italics: true, font: 'Times New Roman' })], border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } }, spacing: { after: 400 } }));

    text.split('\n').forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 120 } })); return; }
      if (/^={4,}/.test(line) || /^-{4,}/.test(line)) {
        children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e8e4f0', space: 1 } }, spacing: { before: 100, after: 100 } }));
        return;
      }
      const clean = line.trim();
      const isH = clean === clean.toUpperCase() && clean.length > 4 && /[A-Z]/.test(clean) && !/^\d/.test(clean) && !/^[A-D1-9][\.|:]/.test(clean) && !/^(NIP|No\.)/.test(clean);
      children.push(new Paragraph({
        children: [new TextRun({ text: clean, bold: isH, size: isH ? 24 : 22, font: 'Times New Roman', color: isH ? '3b0764' : '1a1523' })],
        spacing: { before: isH ? 240 : 60, after: 60 }
      }));
    });

    children.push(new Paragraph({ spacing: { before: 480 } }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '— Asisten Guru by Mas Gema —', italics: true, size: 18, color: '9333ea', font: 'Times New Roman' })] }));

    const doc = new Document({ styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } }, sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } }, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = prefix + Date.now() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  } catch (e) { alert('Gagal download Word: ' + e.message); }
}

async function downloadWord(resId, label) {
  const raw = document.getElementById(resId)?.dataset.raw || '';
  if (!raw) { alert('Tidak ada konten.'); return; }
  await downloadWordFromText(raw, label + '_AsistenGuru_');
}

(function init() {
  const session = getSession();
  if (session) enterApp(session);
  const pd = document.getElementById('pay-date');
  if (pd) pd.value = new Date().toISOString().split('T')[0];
})();
