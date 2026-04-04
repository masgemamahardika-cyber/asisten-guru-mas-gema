// ═══════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — RPP Lengkap Version
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
  rpp: { title: 'Generator RPP', sub: 'Buat RPP lengkap otomatis dengan AI' },
  soal: { title: 'Generator Soal', sub: 'Generate soal + kunci jawaban dalam detik' },
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

async function callAPI(prompt, system) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: system || 'Kamu adalah asisten AI guru Indonesia dari platform Asisten Guru by Mas Gema. Buat konten pendidikan berkualitas tinggi sesuai standar Kemendikbud terbaru. PENTING: Jangan gunakan simbol Markdown seperti #, ##, **, *, atau ---. Gunakan teks biasa. Untuk judul bagian gunakan huruf KAPITAL. Langsung ke isi tanpa perkenalan.',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'HTTP ' + res.status);
  return data?.content?.[0]?.text || '';
}

// ── PROMPT RPP LENGKAP ──
function buildRPPPrompt(mapel, kelas, kur, waktu, topik, tujuan) {
  if (kur === 'Kurikulum Merdeka') {
    return `Buatkan MODUL AJAR / RPP Kurikulum Merdeka yang LENGKAP dan DETAIL untuk:
- Mata Pelajaran: ${mapel}
- Fase/Kelas: ${kelas}
- Topik/Materi: ${topik}
- Alokasi Waktu: ${waktu}
${tujuan ? '- Tujuan khusus: ' + tujuan : ''}

Wajib memuat SEMUA komponen berikut secara lengkap:

A. INFORMASI UMUM
   - Identitas (Nama Penyusun, Institusi, Tahun, Mata Pelajaran, Fase, Kelas, Alokasi Waktu)
   - Kompetensi Awal (prasyarat pengetahuan siswa)
   - Profil Pelajar Pancasila (pilih 2-3 yang relevan dan jelaskan keterkaitannya)
   - Sarana dan Prasarana (ruangan, alat, bahan)
   - Target Peserta Didik (reguler/berkebutuhan khusus/berbakat)
   - Model Pembelajaran (PBL/PjBL/Discovery Learning/dll)

B. KOMPONEN INTI
   1. TUJUAN PEMBELAJARAN
      Tulis minimal 3-4 tujuan pembelajaran yang spesifik, terukur, menggunakan kata kerja operasional (C1-C6 Bloom)
   
   2. PEMAHAMAN BERMAKNA
      Tuliskan apa manfaat nyata materi ini dalam kehidupan sehari-hari siswa
   
   3. PERTANYAAN PEMANTIK
      Tulis 3-4 pertanyaan menarik yang memancing rasa ingin tahu siswa di awal pembelajaran
   
   4. PERSIAPAN PEMBELAJARAN
      Hal-hal yang perlu disiapkan guru sebelum mengajar

C. KEGIATAN PEMBELAJARAN

   KEGIATAN PEMBUKA (10-15 menit)
   - Salam, doa, presensi
   - Apersepsi (kaitan dengan materi sebelumnya)
   - Motivasi (alasan pentingnya materi)
   - Penyampaian tujuan dan langkah pembelajaran
   - Pertanyaan pemantik

   KEGIATAN INTI (sesuaikan dengan waktu)
   Deskripsikan langkah-langkah pembelajaran secara DETAIL dan URUT:
   - Aktivitas siswa dan guru di setiap tahap
   - Metode yang digunakan (diskusi, praktik, presentasi, dll)
   - Pertanyaan-pertanyaan yang dilontarkan guru
   - Diferensiasi untuk siswa yang sudah paham dan yang belum paham
   - Minimal 5-7 langkah kegiatan yang jelas

   KEGIATAN PENUTUP (10-15 menit)
   - Refleksi dan kesimpulan bersama siswa
   - Penguatan materi oleh guru
   - Penilaian singkat (kuis lisan/exit ticket)
   - Tindak lanjut (PR/persiapan pertemuan berikutnya)
   - Doa dan salam penutup

D. ASESMEN
   1. Asesmen Diagnostik (sebelum pembelajaran - untuk mengetahui kemampuan awal)
   2. Asesmen Formatif (selama pembelajaran - untuk memantau perkembangan):
      - Bentuk asesmen (observasi/tanya jawab/kuis)
      - Instrumen yang digunakan
   3. Asesmen Sumatif (akhir pembelajaran):
      - Jenis tagihan (tes tertulis/proyek/portofolio)
      - Indikator penilaian

E. PENGAYAAN DAN REMEDIAL
   - Program pengayaan untuk siswa yang sudah mencapai tujuan
   - Program remedial untuk siswa yang belum mencapai tujuan

F. REFLEKSI GURU
   Pertanyaan refleksi untuk guru setelah pembelajaran (3-4 pertanyaan)

G. LAMPIRAN
   - Lembar Kerja Peserta Didik (LKPD) - berisi minimal 3-5 soal/tugas
   - Bahan bacaan/materi ringkas untuk siswa
   - Rubrik penilaian (jika ada tugas/proyek)

Tulis dengan bahasa Indonesia yang baku, jelas, dan mudah dipahami. Buat sedetail dan selengkap mungkin sehingga guru bisa langsung menggunakan tanpa perlu menambah banyak hal.`;

  } else {
    // K13
    return `Buatkan RPP (Rencana Pelaksanaan Pembelajaran) Kurikulum 2013 yang LENGKAP dan DETAIL untuk:
- Mata Pelajaran: ${mapel}
- Kelas/Semester: ${kelas}
- Materi Pokok: ${topik}
- Alokasi Waktu: ${waktu}
${tujuan ? '- Tujuan khusus: ' + tujuan : ''}

Wajib memuat SEMUA komponen berikut secara lengkap:

A. IDENTITAS
   Satuan Pendidikan, Mata Pelajaran, Kelas/Semester, Materi Pokok, Alokasi Waktu

B. KOMPETENSI INTI (KI 1, KI 2, KI 3, KI 4)
   Tulis lengkap keempat KI sesuai jenjang

C. KOMPETENSI DASAR DAN INDIKATOR PENCAPAIAN KOMPETENSI
   - KD dari KI-3 dan KI-4
   - IPK minimal 3-4 untuk masing-masing KD
   - Gunakan kata kerja operasional Bloom

D. TUJUAN PEMBELAJARAN
   Tulis minimal 4 tujuan pembelajaran yang SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
   Format: Melalui [kegiatan], siswa dapat [kata kerja operasional] [materi] dengan [tingkat ketercapaian]

E. MATERI PEMBELAJARAN
   - Materi Reguler (inti)
   - Materi Pengayaan
   - Materi Remedial
   Sertakan poin-poin materi yang akan dipelajari

F. METODE PEMBELAJARAN
   - Pendekatan: Saintifik
   - Model: (Pilih dan jelaskan: PBL/Discovery Learning/Inquiry/dll)
   - Metode: (diskusi, tanya jawab, demonstrasi, dll)

G. MEDIA DAN SUMBER BELAJAR
   - Media pembelajaran yang digunakan
   - Alat dan bahan
   - Sumber belajar (buku, internet, dll)

H. LANGKAH-LANGKAH PEMBELAJARAN

   PERTEMUAN 1 (${waktu})

   PENDAHULUAN (15 menit)
   - Orientasi (salam, doa, presensi, lingkungan bersih)
   - Apersepsi (kaitan dengan materi sebelumnya/pengalaman siswa)
   - Motivasi (manfaat mempelajari materi)
   - Pemberian acuan (KD, tujuan, materi, penilaian)

   KEGIATAN INTI (sesuai waktu)
   Jabarkan 5M Saintifik secara detail:
   1. Mengamati: (apa yang diamati siswa, berapa menit)
   2. Menanya: (pertanyaan apa yang diharapkan muncul, peran guru)
   3. Mengumpulkan Informasi/Mencoba: (kegiatan eksplorasi, sumber informasi)
   4. Mengasosiasi/Menalar: (kegiatan diskusi, analisis, kesimpulan)
   5. Mengomunikasikan: (presentasi, pelaporan hasil)
   
   Deskripsikan setiap tahap dengan DETAIL: apa yang dilakukan guru, apa yang dilakukan siswa, berapa menit

   PENUTUP (15 menit)
   - Kesimpulan (bersama siswa)
   - Refleksi dan umpan balik
   - Penugasan
   - Rencana pertemuan berikutnya
   - Doa dan salam

I. PENILAIAN HASIL PEMBELAJARAN
   1. Penilaian Sikap
      - Teknik: Observasi
      - Instrumen: Jurnal sikap (format tabel: No, Nama, Catatan, Butir Sikap, Tindak Lanjut)
   
   2. Penilaian Pengetahuan
      - Teknik: Tes tertulis
      - Instrumen: Kisi-kisi soal dan soal (minimal 5 soal pilihan ganda + 2 uraian)
      - Kunci jawaban
      - Pedoman penskoran
   
   3. Penilaian Keterampilan
      - Teknik: Unjuk kerja/Proyek/Portofolio
      - Instrumen: Rubrik penilaian (format tabel)

J. PEMBELAJARAN REMEDIAL
   Kegiatan pembelajaran remedial bagi siswa yang belum tuntas (nilai < KKM)

K. PEMBELAJARAN PENGAYAAN
   Kegiatan pengayaan bagi siswa yang sudah tuntas

Tulis dengan bahasa Indonesia yang baku dan lengkap. Buat sedetail mungkin sehingga guru bisa langsung menggunakan RPP ini di kelas.`;
  }
}

function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^[-*]\s+/gm, '• ')
    .replace(/^_{3,}$/gm, '')
    .replace(/^-{3,}$/gm, '─────────────')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();
}

function renderDisplay(text) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/^#{1,2}\s+(.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid #ede9fe;padding-bottom:5px;">$1</div>')
    .replace(/^#{3,6}\s+(.+)$/gm, '<div style="font-size:13px;font-weight:600;color:#4a4458;margin:10px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-*]\s+(.+)$/gm, '<div style="margin:3px 0 3px 16px;font-size:13px;">•&nbsp;$1</div>')
    .replace(/^-{3,}$/gm, '<hr style="border:none;border-top:1px solid #e8e4f0;margin:12px 0;">')
    .replace(/\n/g, '<br>');
}

function setButtonLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<div class="loading-dots"><span></span><span></span><span></span></div> Generating...'
    : '▶ ' + label;
}

async function generateAI(type) {
  if (!canGenerate()) {
    alert('Kredit habis! Silakan upgrade ke Premium untuk generate tanpa batas.');
    goPage('upgrade');
    return;
  }

  let prompt = '';
  let system = '';
  let btnId = '';
  let label = '';
  let resId = '';

  if (type === 'rpp') {
    const mapel = document.getElementById('rpp-mapel').value || 'Matematika';
    const kelas = document.getElementById('rpp-kelas').value;
    const kur = document.getElementById('rpp-kur').value;
    const waktu = document.getElementById('rpp-waktu').value;
    const topik = document.getElementById('rpp-topik').value || 'Bilangan Bulat';
    const tujuan = document.getElementById('rpp-tujuan').value;
    prompt = buildRPPPrompt(mapel, kelas, kur, waktu, topik, tujuan);
    system = 'Kamu adalah pakar pengembang kurikulum dan RPP Indonesia berpengalaman 20 tahun dari Asisten Guru by Mas Gema. Buat RPP yang SANGAT LENGKAP, DETAIL, dan SIAP PAKAI sesuai standar Kemendikbud terbaru. Tulis dalam bahasa Indonesia baku. JANGAN gunakan simbol Markdown seperti #, ##, **, *, ---. Gunakan huruf KAPITAL untuk judul bagian. Setiap bagian harus diisi dengan lengkap dan substantif, bukan hanya poin kosong.';
    btnId = 'btn-rpp'; label = 'Generate RPP'; resId = 'res-rpp';

  } else if (type === 'soal') {
    const mapel = document.getElementById('soal-mapel').value || 'IPA';
    const kelas = document.getElementById('soal-kelas').value;
    const jenis = document.getElementById('soal-jenis').value;
    const jumlah = document.getElementById('soal-jumlah').value;
    const topik = document.getElementById('soal-topik').value || 'Sistem Pencernaan';
    const level = document.getElementById('soal-level').value;
    prompt = `Buatkan ${jumlah} soal ${jenis} berkualitas tinggi untuk:
- Mata Pelajaran: ${mapel}
- Kelas: ${kelas}
- Topik: ${topik}
- Tingkat kesulitan: ${level}

Untuk setiap soal pilihan ganda sertakan 4 opsi (A, B, C, D) yang baik (pengecoh masuk akal).
Di akhir tulis KUNCI JAWABAN dan PEMBAHASAN singkat setiap soal.
Tulis "Soal 1:", "Soal 2:" dst. Gunakan teks biasa tanpa simbol markdown.`;
    system = 'Kamu adalah ahli evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal berkualitas tinggi sesuai standar Kemendikbud, HOTS, dan valid. Jangan gunakan simbol Markdown.';
    btnId = 'btn-soal'; label = 'Generate Soal + Kunci Jawaban'; resId = 'res-soal';

  } else if (type === 'admin') {
    const jenis = document.getElementById('admin-jenis').value;
    const konteks = document.getElementById('admin-konteks').value;
    prompt = `Buatkan ${jenis} yang lengkap dan profesional untuk guru Indonesia.
Konteks: ${konteks || 'dokumen umum'}
Buat format yang rapi, formal, dan langsung bisa digunakan. Jangan gunakan simbol markdown.`;
    system = 'Kamu adalah asisten administrasi sekolah profesional dari Asisten Guru by Mas Gema. Buat dokumen administrasi yang formal, rapi, dan siap digunakan. Jangan gunakan simbol Markdown.';
    btnId = 'btn-admin'; label = 'Buat Dokumen'; resId = 'res-admin';

  } else if (type === 'pkb') {
    const nama = document.getElementById('pkb-nama').value || 'Guru';
    const mapel = document.getElementById('pkb-mapel').value || 'Umum';
    const kegiatan = document.getElementById('pkb-kegiatan').value || 'Pelatihan';
    const refleksi = document.getElementById('pkb-refleksi').value || 'Bermanfaat';
    prompt = `Buatkan Laporan Pengembangan Keprofesian Berkelanjutan (PKB) yang lengkap dan profesional untuk:
- Nama Guru: ${nama}
- Mata Pelajaran: ${mapel}
- Kegiatan PKB: ${kegiatan}
- Refleksi: ${refleksi}

Sertakan:
1. Pendahuluan (latar belakang mengikuti kegiatan)
2. Pelaksanaan Kegiatan (waktu, tempat, penyelenggara, narasumber, peserta)
3. Hasil dan Manfaat (apa yang dipelajari, kompetensi yang meningkat)
4. Refleksi dan Rencana Tindak Lanjut (implementasi di kelas)
5. Penutup

Tulis formal 4-5 paragraf per bagian. Jangan gunakan simbol markdown.`;
    system = 'Kamu adalah asisten penulisan laporan profesional guru Indonesia dari Asisten Guru by Mas Gema. Buat laporan PKB yang formal, substantif, dan siap dilaporkan ke kepala sekolah/dinas. Jangan gunakan simbol Markdown.';
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
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print — Asisten Guru</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;color:#000;line-height:1.8;}
    .hd{text-align:center;border-bottom:2pt solid #7c3aed;padding-bottom:12pt;margin-bottom:24pt;}
    .ht{font-size:16pt;font-weight:700;color:#7c3aed;}.hs{font-size:11pt;color:#555;margin-top:5pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">Asisten Guru by Mas Gema</div>
    <div class="hs">${currentUser ? currentUser.name + ' | ' : ''}${today}</div></div>
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
      children: [new TextRun({ text: (currentUser ? currentUser.name + '  |  ' : '') + today, size: 20, color: '666666', font: 'Times New Roman' })],
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7c3aed', space: 1 } },
      spacing: { after: 360 }
    }));

    const lines = raw.split('\n');
    lines.forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { after: 100 } })); return; }

      if (/^#{1,2}\s+/.test(line)) {
        const t = line.replace(/^#{1,2}\s+/, '').replace(/\*\*/g, '');
        children.push(new Paragraph({
          children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 26, color: '7c3aed', font: 'Times New Roman' })],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'ddd6fe', space: 1 } },
          spacing: { before: 320, after: 120 }
        }));
        return;
      }

      if (/^#{3,6}\s+/.test(line)) {
        const t = line.replace(/^#{3,6}\s+/, '').replace(/\*\*/g, '');
        children.push(new Paragraph({
          children: [new TextRun({ text: t, bold: true, size: 24, color: '4a4458', font: 'Times New Roman' })],
          spacing: { before: 240, after: 80 }
        }));
        return;
      }

      if (/^[-_]{3,}$/.test(line.trim())) {
        children.push(new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'e8e4f0', space: 1 } },
          spacing: { before: 120, after: 120 }
        }));
        return;
      }

      if (/^[-*]\s+/.test(line)) {
        const t = line.replace(/^[-*]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1');
        children.push(new Paragraph({
          children: [new TextRun({ text: '\u2022  ' + t, size: 22, font: 'Times New Roman', color: '1a1523' })],
          indent: { left: 400 },
          spacing: { before: 40, after: 40 }
        }));
        return;
      }

      const clean = line.trim();
      const isHeader = clean === clean.toUpperCase() && clean.length > 4 && /[A-Z]/.test(clean) && !/^\d/.test(clean);
      const parts = clean.split(/(\*\*[^*]+\*\*)/g);
      const runs = parts.filter(p => p).map(p => {
        if (/^\*\*[^*]+\*\*$/.test(p)) {
          return new TextRun({ text: p.replace(/\*\*/g, ''), bold: true, size: 22, font: 'Times New Roman', color: '1a1523' });
        }
        return new TextRun({ text: p.replace(/\*\*/g, ''), bold: isHeader, size: isHeader ? 23 : 22, font: 'Times New Roman', color: isHeader ? '3b0764' : '1a1523' });
      });

      children.push(new Paragraph({
        children: runs.length ? runs : [new TextRun({ text: clean, size: 22, font: 'Times New Roman' })],
        spacing: { before: isHeader ? 240 : 60, after: 60 }
      }));
    });

    children.push(new Paragraph({ spacing: { before: 480 } }));
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '— Dibuat dengan Asisten Guru by Mas Gema —', italics: true, size: 18, color: '9333ea', font: 'Times New Roman' })]
    }));

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
      sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } }, children }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RPP_AsistenGuru_' + Date.now() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);

  } catch (e) {
    alert('Gagal download Word: ' + e.message);
  }
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
