// ASISTEN GURU BY MAS GEMA — Final Version

const API = '/api/chat';
let currentUser = null;
let docxReady = false;
let activePlatform = 'instagram';
let savedKisiKisi = { mapel:'', kelas:'', jenis:'', materi:'', jmlPG:0, jmlUraian:0, level:'', teks:'' };

// Load docx
(function(){
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

// Storage helpers
const UK = 'ag_users_v2';
const SK = 'ag_session_v2';
const getUsers = () => { try { return JSON.parse(localStorage.getItem(UK)||'[]'); } catch { return []; } };
const saveUsers = u => localStorage.setItem(UK, JSON.stringify(u));
const getSession = () => { try { return JSON.parse(localStorage.getItem(SK)||'null'); } catch { return null; } };
const saveSession = s => localStorage.setItem(SK, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(SK);

// AUTH
function authTab(t) {
  document.getElementById('form-login').style.display = t==='login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = t==='register' ? 'block' : 'none';
  document.querySelectorAll('.atab').forEach((el,i) =>
    el.classList.toggle('active', (i===0&&t==='login')||(i===1&&t==='register'))
  );
}

function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  const err = document.getElementById('l-err');
  if (!email||!pass) { err.textContent='Email dan password wajib diisi.'; return; }
  const user = getUsers().find(u => u.email===email && u.password===pass);
  if (!user) { err.textContent='Email atau password salah.'; return; }
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
  err.textContent=''; ok.textContent='';
  if (!name||!email||!pass) { err.textContent='Semua field wajib diisi.'; return; }
  if (pass.length<6) { err.textContent='Password minimal 6 karakter.'; return; }
  const users = getUsers();
  if (users.find(u=>u.email===email)) { err.textContent='Email sudah terdaftar.'; return; }
  const user = { name, email, jenjang, password:pass, plan:'gratis', credits:5, totalGen:0 };
  users.push(user);
  saveUsers(users);
  ok.textContent = '✓ Berhasil daftar! Silakan masuk.';
  setTimeout(() => authTab('login'), 1500);
}

function enterApp(user) {
  currentUser = user;
  const av = user.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  document.getElementById('sb-av').textContent = av;
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-role').textContent = 'Guru '+(user.jenjang||'');
  document.getElementById('wb-greeting').textContent = 'Halo, '+user.name.split(' ')[0]+'! 👋';
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
  const isPrem = currentUser.plan==='premium'||currentUser.plan==='tahunan';
  const chip = document.getElementById('sb-plan');
  chip.textContent = isPrem ? 'Premium ⭐' : 'Gratis';
  chip.className = 'plan-chip'+(isPrem?' premium':'');
  document.getElementById('sb-credit').textContent = isPrem ? '∞' : (currentUser.credits??5);
}

function saveUserData() {
  if (!currentUser) return;
  const users = getUsers();
  const i = users.findIndex(u=>u.email===currentUser.email);
  if (i>-1) { users[i]={...users[i],...currentUser}; saveUsers(users); saveSession(users[i]); }
}

function useCredit() {
  if (!currentUser) return;
  const isPrem = currentUser.plan==='premium'||currentUser.plan==='tahunan';
  if (!isPrem) currentUser.credits = Math.max(0,(currentUser.credits??5)-1);
  currentUser.totalGen = (currentUser.totalGen||0)+1;
  saveUserData();
  updatePlanUI();
}

// NAVIGATION
const PAGE_INFO = {
  dashboard:{title:'Beranda',sub:'Selamat datang di Asisten Guru by Mas Gema'},
  rpp:{title:'Generator RPP',sub:'Modul Ajar Kurikulum Merdeka + CP + Asesmen 3 Ranah'},
  kisi:{title:'📊 Kisi-Kisi → Soal Otomatis',sub:'Format resmi Kemendikbud — tersambung langsung ke generate soal!'},
  soal:{title:'Generator Soal Cepat',sub:'Generate soal tanpa kisi-kisi'},
  'admin-doc':{title:'Asisten Administrasi',sub:'Dokumen guru siap pakai'},
  pkb:{title:'Laporan PKB',sub:'Laporan pengembangan keprofesian profesional'},
  medsos:{title:'📱 Generator Konten Medsos',sub:'Bangun personal branding & monetize sebagai guru konten kreator'},
  upgrade:{title:'Upgrade Premium',sub:'Generate tanpa batas semua tools'},
  bayar:{title:'Konfirmasi Pembayaran',sub:'Transfer dan kirim bukti'},
  riwayat:{title:'Riwayat Pembayaran',sub:'Status transaksi kamu'},
};

function goPage(id) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page = document.getElementById('page-'+id);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  [...document.querySelectorAll('.nav-item')].find(n=>n.getAttribute('onclick')===`goPage('${id}')`)?.classList.add('active');
  const info = PAGE_INFO[id]||{};
  document.getElementById('tb-title').textContent = info.title||id;
  document.getElementById('tb-sub').textContent = info.sub||'';
}

function canGenerate() {
  if (!currentUser) return false;
  if (currentUser.plan==='premium'||currentUser.plan==='tahunan') return true;
  return (currentUser.credits??5)>0;
}

// AI CALL - langsung ke Anthropic
async function callAI(prompt, system, maxTokens=4000) {
  const res = await fetch(API, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({
      model:'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: system||'Kamu asisten AI guru Indonesia dari Asisten Guru by Mas Gema. Buat konten pendidikan berkualitas. Jangan gunakan simbol Markdown.',
      messages:[{role:'user',content:prompt}]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message||data?.error||'API error '+res.status);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Tidak ada hasil dari AI');
  return text;
}

// PLATFORM MEDSOS
function setPlatform(platform) {
  activePlatform = platform;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  const btn = document.getElementById('ptab-'+platform);
  if (btn) btn.classList.add('active');
}

// PAYMENT (localStorage)
function submitPayment() {
  if (!currentUser) return;
  const paketRaw = document.getElementById('pay-paket').value;
  const [paket, price] = paketRaw.split(':');
  const sender = document.getElementById('pay-sender').value.trim();
  const date = document.getElementById('pay-date').value;
  const ok = document.getElementById('pay-ok');
  const err = document.getElementById('pay-err');
  ok.textContent=''; err.textContent='';
  if (!sender) { err.textContent='Nama pengirim wajib diisi.'; return; }
  const txns = JSON.parse(localStorage.getItem('ag_txns_'+currentUser.email)||'[]');
  txns.unshift({ paket, price, sender_name:sender, transfer_date:date, status:'pending', created_at:new Date().toISOString() });
  localStorage.setItem('ag_txns_'+currentUser.email, JSON.stringify(txns));
  ok.textContent = '✓ Konfirmasi tersimpan! Hubungi Mas Gema untuk verifikasi.';
}

function loadRiwayat() {
  if (!currentUser) return;
  const el = document.getElementById('riwayat-list');
  const txns = JSON.parse(localStorage.getItem('ag_txns_'+currentUser.email)||'[]');
  if (!txns.length) { el.textContent='Belum ada riwayat pembayaran.'; return; }
  const sc = {pending:'#d97706',verified:'#16a34a',rejected:'#dc2626'};
  const sl = {pending:'⏳ Menunggu Verifikasi',verified:'✓ Terverifikasi',rejected:'✕ Ditolak'};
  el.innerHTML = txns.map(t=>`
    <div style="border:1px solid #e8e4f0;border-radius:10px;padding:.875rem;margin-bottom:.75rem;background:#fff;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;font-weight:600;">Paket ${t.paket} — Rp ${parseInt(t.price).toLocaleString('id-ID')}</span>
        <span style="font-size:11px;font-weight:600;color:${sc[t.status]||'#666'}">${sl[t.status]||t.status}</span>
      </div>
      <div style="font-size:11px;color:#7c7490;">Pengirim: ${t.sender_name} | Transfer: ${t.transfer_date}</div>
    </div>`).join('');
}

// BUTTON LOADING
function setBtnLoading(btnId, loading, label, msg) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<div class="loading-dots"><span></span><span></span><span></span></div> ${msg||'Generating...'}`
    : `▶ ${label}`;
}

// ════════════════════════════
//  KISI-KISI GENERATOR
// ════════════════════════════
function setAlurStep(step) {
  for (let i=1;i<=4;i++) {
    const el = document.getElementById('step-'+i);
    if (!el) continue;
    el.classList.remove('active','done');
    if (i<step) el.classList.add('done');
    else if (i===step) el.classList.add('active');
  }
}

async function generateKisiKisi() {
  if (!canGenerate()) { alert('Kredit habis! Upgrade ke Premium.'); goPage('upgrade'); return; }

  const mapel = document.getElementById('kisi-mapel').value||'IPA';
  const kelas = document.getElementById('kisi-kelas').value;
  const jenis = document.getElementById('kisi-jenis').value;
  const semester = document.getElementById('kisi-semester').value;
  const materi = document.getElementById('kisi-materi').value||'Sistem Pencernaan';
  const jmlPG = parseInt(document.getElementById('kisi-jml-pg').value)||0;
  const jmlUraian = parseInt(document.getElementById('kisi-jml-uraian').value)||0;
  const level = document.getElementById('kisi-level').value;

  savedKisiKisi = { mapel, kelas, jenis, materi, jmlPG, jmlUraian, level, teks:'' };

  setBtnLoading('btn-kisi', true, 'Generate Kisi-Kisi Resmi', 'Membuat kisi-kisi resmi...');
  const resEl = document.getElementById('res-kisi');
  resEl.innerHTML=''; resEl.classList.remove('show');
  document.getElementById('soal-from-kisi-card').style.display='none';
  document.getElementById('download-gabungan-card').style.display='none';
  setAlurStep(2);

  const prompt = `Buatkan KISI-KISI SOAL format resmi Kemendikbud untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Semester: ${semester}
Jenis Penilaian: ${jenis} | Tahun Pelajaran: 2024/2025
Materi: ${materi}
Jumlah soal PG: ${jmlPG} | Jumlah soal Uraian: ${jmlUraian}
Distribusi level: ${level}

Buat kisi-kisi dalam format tabel dengan pemisah | (garis tegak):
No | Kompetensi Dasar / CP | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal

Ketentuan:
- Setiap baris = 1 soal
- Indikator soal dimulai kata kerja operasional (siswa dapat mengidentifikasi/menjelaskan/menganalisis/dst)
- Level kognitif tulis: C1-Mengingat, C2-Memahami, C3-Mengaplikasikan, C4-Menganalisis, C5-Mengevaluasi, C6-Mencipta
- Nomor soal urut dari 1

Distribusi level berdasarkan "${level}":
- Seimbang: 10% C1, 20% C2, 30% C3, 20% C4, 10% C5, 10% C6
- Mudah dominan: 30% C1, 30% C2, 20% C3, 10% C4, 5% C5, 5% C6
- Sedang dominan: 10% C1, 15% C2, 35% C3, 25% C4, 10% C5, 5% C6
- HOTs dominan: 5% C1, 10% C2, 20% C3, 30% C4, 20% C5, 15% C6

Setelah tabel, tambahkan:
REKAPITULASI:
- Total soal PG: ${jmlPG}
- Total soal Uraian: ${jmlUraian}
- Total seluruh: ${jmlPG+jmlUraian}
- Distribusi per level: (rinci)

Tidak ada simbol Markdown. Tabel harus rapi dan konsisten.`;

  const system = `Kamu pengembang instrumen penilaian pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat kisi-kisi format resmi Kemendikbud yang valid dan operasional. Tidak ada simbol Markdown.`;

  try {
    const result = await callAI(prompt, system);
    savedKisiKisi.teks = result;
    resEl.dataset.raw = result;
    resEl.classList.add('show');
    resEl.innerHTML = `
      <div class="result-label">📊 Kisi-Kisi Soal Resmi — ${jenis} ${mapel} ${kelas}</div>
      <div style="font-size:12px;line-height:1.8;color:#1a1523;font-family:monospace;white-space:pre-wrap;overflow-x:auto;">${esc(result)}</div>
      <div class="result-actions">
        <button class="btn-copy" onclick="copyResult('res-kisi',this)">📋 Salin</button>
        <button class="btn-dl btn-dl-print" onclick="printResult('res-kisi')">🖨️ Print</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWord('res-kisi','KisiKisi')">⬇ Word</button>
      </div>`;
    document.getElementById('soal-from-kisi-card').style.display='block';
    setAlurStep(3);
    useCredit();
  } catch(err) {
    resEl.classList.add('show');
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    setAlurStep(1);
  }
  setBtnLoading('btn-kisi', false, 'Generate Kisi-Kisi Resmi', '');
}

async function generateSoalDariKisi() {
  if (!canGenerate()) { alert('Kredit habis!'); goPage('upgrade'); return; }
  const { mapel, kelas, jenis, jmlPG, jmlUraian, teks } = savedKisiKisi;
  if (!teks) { alert('Generate kisi-kisi dulu!'); return; }

  const btn = document.getElementById('btn-gen-soal-kisi');
  const resEl = document.getElementById('res-soal-kisi');
  btn.disabled=true;
  btn.innerHTML='<div class="loading-dots"><span></span><span></span><span></span></div> Generating soal dari kisi-kisi... (30-60 detik)';
  resEl.innerHTML=''; resEl.classList.remove('show');
  document.getElementById('download-gabungan-card').style.display='none';

  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const prompt = `Berdasarkan kisi-kisi soal berikut, buatkan soal yang PERSIS sesuai:

${teks}

Instruksi:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Penilaian: ${jenis} | Tanggal: ${today}

Buat TEPAT ${jmlPG} soal Pilihan Ganda dan ${jmlUraian} soal Uraian sesuai kisi-kisi.
Setiap soal PG harus punya 4 opsi (A,B,C,D) dengan pengecoh yang masuk akal.
Level kognitif setiap soal harus PERSIS sesuai kisi-kisi.

FORMAT:

SOAL PILIHAN GANDA

1. [soal sesuai indikator kisi-kisi]
A. [opsi] B. [opsi] C. [opsi] D. [opsi]

[lanjut sampai soal ${jmlPG}]

SOAL URAIAN

${jmlPG+1}. [soal uraian sesuai kisi-kisi]
[lanjut sampai soal ${jmlPG+jmlUraian}]

KUNCI JAWABAN DAN PEMBAHASAN

PILIHAN GANDA:
1. Jawaban: [huruf] | Pembahasan: [penjelasan mengapa benar]
[dst]

URAIAN:
${jmlPG+1}. Kunci: [jawaban lengkap ideal]
Pembahasan: [penjelasan detail]
Rubrik: Skor [x] jika..., Skor [y] jika..., Skor [z] jika...

PEDOMAN PENILAIAN:
Skor PG: ${jmlPG} soal x [skor] = [total]
Skor Uraian: [rincian]
Total maksimal: 100

Tidak ada simbol Markdown.`;

  const system = `Kamu ahli penyusunan soal evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal persis sesuai kisi-kisi, valid, berkualitas tinggi. Pembahasan mendidik dan mudah dipahami. Tidak ada simbol Markdown.`;

  try {
    const result = await callAI(prompt, system, 4000);
    resEl.dataset.raw = result;
    resEl.classList.add('show');
    resEl.innerHTML = `
      <div class="result-label">✅ Soal + Kunci + Pembahasan (dari Kisi-Kisi)</div>
      <div style="font-size:13px;line-height:1.85;color:#1a1523;white-space:pre-wrap;">${esc(result)}</div>
      <div class="result-actions">
        <button class="btn-copy" onclick="copyResult('res-soal-kisi',this)">📋 Salin</button>
        <button class="btn-dl btn-dl-print" onclick="printResult('res-soal-kisi')">🖨️ Print</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWord('res-soal-kisi','Soal')">⬇ Word</button>
      </div>`;
    document.getElementById('download-gabungan-card').style.display='block';
    setAlurStep(4);
    useCredit();
  } catch(err) {
    resEl.classList.add('show');
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
  }
  btn.disabled=false;
  btn.textContent='✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
}

async function downloadWordGabungan() {
  const k = document.getElementById('res-kisi')?.dataset.raw||'';
  const s = document.getElementById('res-soal-kisi')?.dataset.raw||'';
  await downloadWordFromText(`KISI-KISI SOAL\n${'='.repeat(60)}\n\n${k}\n\n${'='.repeat(60)}\nSOAL + KUNCI JAWABAN + PEMBAHASAN\n${'='.repeat(60)}\n\n${s}`, 'KisiKisi_Soal_');
}

function printGabungan() {
  const k = document.getElementById('res-kisi')?.dataset.raw||'';
  const s = document.getElementById('res-soal-kisi')?.dataset.raw||'';
  printText(`KISI-KISI SOAL\n${'='.repeat(60)}\n\n${k}\n\n${'='.repeat(60)}\nSOAL + KUNCI JAWABAN\n${'='.repeat(60)}\n\n${s}`);
}

function copyGabungan(btn) {
  const k = document.getElementById('res-kisi')?.dataset.raw||'';
  const s = document.getElementById('res-soal-kisi')?.dataset.raw||'';
  navigator.clipboard.writeText(`KISI-KISI\n\n${k}\n\nSOAL\n\n${s}`).catch(()=>{});
  btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent='📋 Salin Semua';},2000);
}

// RPP
function getFase(kelas) {
  if (kelas.includes('Kelas 1')||kelas.includes('Kelas 2')) return 'Fase A';
  if (kelas.includes('Kelas 3')||kelas.includes('Kelas 4')) return 'Fase B';
  if (kelas.includes('Kelas 5')||kelas.includes('Kelas 6')) return 'Fase C';
  if (kelas.includes('Kelas 7')||kelas.includes('Kelas 8')||kelas.includes('Kelas 9')) return 'Fase D';
  if (kelas.includes('Kelas 10')) return 'Fase E';
  return 'Fase F';
}

const SYS_RPP = `Kamu pakar kurikulum Indonesia dari Asisten Guru by Mas Gema. ATURAN: Jangan gunakan simbol Markdown (#,##,**,*,---). Gunakan HURUF KAPITAL untuk judul bagian. Isi semua bagian dengan konten NYATA dan LENGKAP.
CP SK BSKAP 032/H/KR/2024:
Fase A(1-2 SD): Bahasa Indonesia: berkomunikasi dan bernalar tentang diri dan lingkungan. Matematika: operasi bilangan cacah sampai 999. IPAS: mengidentifikasi kondisi lingkungan rumah dan sekolah.
Fase B(3-4 SD): Bahasa Indonesia: memahami dan menyampaikan pesan beragam media. Matematika: operasi bilangan cacah, pecahan, keliling dan luas. IPAS: perubahan wujud zat, keanekaragaman makhluk hidup.
Fase C(5-6 SD): Bahasa Indonesia: memahami dan mengolah berbagai tipe teks. Matematika: bilangan desimal, negatif, pecahan, luas dan volume. IPA: sistem organ manusia, gaya dan energi. IPS: keragaman budaya Indonesia.
Fase D(7-9 SMP): Bahasa Indonesia: memahami dan mengevaluasi teks multimodal. Matematika: relasi, fungsi, persamaan linear, SPLDV. IPA: sifat zat, sistem organ, homeostasis. IPS: kondisi geografis dan sosial-budaya Indonesia.
Fase E(10 SMA): Bahasa Indonesia: mengevaluasi dan mengkreasi informasi. Matematika: eksponen, trigonometri, geometri, statistika. Fisika: vektor, kinematika, dinamika. Kimia: fenomena kimia. Biologi: sains dalam kehidupan.
Fase F(11-12 SMA): Bahasa Indonesia: mengkreasi berbagai teks. Matematika: limit, turunan, integral.`;

async function generateRPP() {
  if (!canGenerate()) { alert('Kredit habis! Upgrade ke Premium.'); goPage('upgrade'); return; }
  const mapel = document.getElementById('rpp-mapel').value||'IPA';
  const kelas = document.getElementById('rpp-kelas').value;
  const waktu = document.getElementById('rpp-waktu').value;
  const topik = document.getElementById('rpp-topik').value||'Sistem Pencernaan';
  const catatan = document.getElementById('rpp-tujuan').value;
  const fase = getFase(kelas);
  const resEl = document.getElementById('res-rpp');
  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Membuat RPP & Kegiatan...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">30-40 detik</div></div>`;
  resEl.classList.add('show');
  setBtnLoading('btn-rpp',true,'Generate RPP Lengkap','Tahap 1/2: Membuat RPP & Kegiatan...');

  const p1 = `Buatkan MODUL AJAR Kurikulum Merdeka bagian INFORMASI UMUM dan KEGIATAN untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Fase: ${fase} | Topik: ${topik} | Waktu: ${waktu}
${catatan?'Catatan: '+catatan:''}

IDENTITAS MODUL
Nama Penyusun: (nama guru) | Institusi: (nama sekolah) | Tahun: 2024/2025
Mata Pelajaran: ${mapel} | Fase/Kelas: ${fase}/${kelas} | Topik: ${topik} | Waktu: ${waktu}
Referensi CP: SK BSKAP No. 032/H/KR/2024

CAPAIAN PEMBELAJARAN (CP) BERDASARKAN SK BSKAP 032/H/KR/2024
[Tulis narasi CP LENGKAP dan SESUNGGUHNYA untuk ${mapel} ${fase} minimal 3 paragraf sesuai database CP]

ELEMEN CP RELEVAN DENGAN TOPIK ${topik.toUpperCase()}:
[Tulis elemen CP spesifik]

ALUR TUJUAN PEMBELAJARAN: [3-4 ATP urutan logis]
KOMPETENSI AWAL: [3 prasyarat]

PROFIL PELAJAR PANCASILA:
1. [Dimensi]: [implementasi konkret dalam pembelajaran ${topik}]
2. [Dimensi]: [implementasi]
3. [Dimensi]: [implementasi]

SARANA DAN PRASARANA: [ruangan, media, alat, bahan, sumber belajar]
MODEL DAN METODE: Model: [PBL/Discovery/Inquiry] | Metode: [...] | Pendekatan: Saintifik

TUJUAN PEMBELAJARAN:
1.(C1)[...] 2.(C2)[...] 3.(C3)[...] 4.(C4)[...]

PEMAHAMAN BERMAKNA: [manfaat nyata ${topik} dalam kehidupan sehari-hari]
PERTANYAAN PEMANTIK: 1.[...] 2.[...] 3.[...]

KEGIATAN PEMBUKA (15 menit)
[Detail: salam/doa/presensi, apersepsi dialog guru-siswa, motivasi, penyampaian tujuan]

KEGIATAN INTI (sesuai ${waktu})
Langkah 1 - Stimulasi: Guru: [...] | Siswa: [...]
Langkah 2 - Pengumpulan Informasi: Guru: [...] | Siswa: [...]
Langkah 3 - Pengolahan Data: Guru: [...] | Siswa: [...]
Langkah 4 - Presentasi: Guru: [...] | Siswa: [...]
Langkah 5 - Konfirmasi: Guru: [...] | Siswa: [...]
DIFERENSIASI: Sudah paham: [...] | Belum paham: [...]

KEGIATAN PENUTUP (15 menit)
[Refleksi 3 pertanyaan, exit ticket 2 soal + jawaban, tindak lanjut, doa/salam]`;

  let part1='';
  try {
    part1 = await callAI(p1, SYS_RPP);
  } catch(err) {
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;
    setBtnLoading('btn-rpp',false,'Generate RPP Lengkap','');
    return;
  }

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Membuat Asesmen & Tanda Tangan...</div></div>`;
  setBtnLoading('btn-rpp',true,'Generate RPP Lengkap','Tahap 2/2: Membuat Asesmen...');

  const p2 = `Buatkan BAGIAN ASESMEN LENGKAP untuk Modul Ajar ${mapel} ${kelas} ${fase} topik ${topik}. Isi NYATA dan LENGKAP. Tidak ada simbol Markdown.

ASESMEN

A. ASESMEN DIAGNOSTIK
Soal 1: [...] | Jawaban: [...] | Jika benar: [...] | Jika salah: [...]
Soal 2: [...] | Jawaban: [...] | Interpretasi: [...]

B. ASESMEN KOGNITIF - 5 SOAL URAIAN

SOAL 1 (C1-Mengingat) Bobot 15 poin
Soal: [...] | Kunci: [jawaban lengkap] | Pembahasan: [...] | Rubrik: 15/10/5/0

SOAL 2 (C2-Memahami) Bobot 15 poin
Soal: [...] | Kunci: [...] | Pembahasan: [...] | Rubrik: 15/10/5/0

SOAL 3 (C3-Mengaplikasikan) Bobot 20 poin
Soal: [...] | Kunci: [...] | Pembahasan: [...] | Rubrik: 20/15/10/5/0

SOAL 4 (C4-Menganalisis/HOTs) Bobot 25 poin
Soal: [berbasis kasus nyata] | Kunci: [...] | Pembahasan: [...] | Rubrik: 25/20/15/10/0

SOAL 5 (C5-Mengevaluasi/HOTs) Bobot 25 poin
Soal: [evaluasi/solusi masalah] | Kunci: [...] | Pembahasan: [...] | Rubrik: 25/20/15/10/0

C. ASESMEN AFEKTIF - RUBRIK OBSERVASI SIKAP (Skala 1-4)
[5 aspek sesuai PPP, setiap aspek ada indikator dan deskripsi skor 4,3,2,1]
Rumus: (Total/20)x100
Tabel rekapitulasi: No | Nama | Asp1-5 | Total | Nilai | Predikat

D. ASESMEN PSIKOMOTORIK - RUBRIK KETERAMPILAN (Skala 1-4)
[5 aspek keterampilan relevan dengan ${topik}, setiap aspek deskripsi skor 4,3,2,1]
Rumus: (Total/20)x100
Tabel rekapitulasi: No | Nama | Asp1-5 | Total | Nilai | Predikat

REKAPITULASI NILAI AKHIR
NA = (Kognitif x 40%) + (Afektif x 30%) + (Psikomotorik x 30%) | KKM: 75

E. PROGRAM REMEDIAL (Nilai < 75)
Soal R1 (C1 mudah): [...] | Kunci: [...] | Pembahasan sederhana: [...]
Soal R2 (C2 mudah): [...] | Kunci: [...] | Pembahasan: [...]
Soal R3 (C3 mudah): [...] | Kunci: [...] | Pembahasan: [...]

F. PROGRAM PENGAYAAN (Nilai >= 80)
Soal P1 (C6-Kreasi): [...] | Panduan: [...] | Proses kreatif: [...]

G. REFLEKSI GURU
1. Tujuan tercapai? Bukti apa?
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

  let part2='';
  try {
    part2 = await callAI(p2, SYS_RPP);
  } catch(err) {
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
    setBtnLoading('btn-rpp',false,'Generate RPP Lengkap','');
    return;
  }

  showResult('res-rpp', part1+'\n\n'+part2);
  useCredit();
  setBtnLoading('btn-rpp',false,'Generate RPP Lengkap','');
}

// GENERATE AI LAINNYA
async function generateAI(type) {
  if (!canGenerate()) { alert('Kredit habis! Upgrade ke Premium.'); goPage('upgrade'); return; }
  if (type==='rpp') { await generateRPP(); return; }
  if (type==='medsos') { await generateMedsos(); return; }

  const cfgs = {
    soal: {
      btnId:'btn-soal', label:'Generate Soal + Kunci Jawaban', resId:'res-soal',
      getPrompt: ()=>{
        const mapel=document.getElementById('soal-mapel').value||'IPA';
        const kelas=document.getElementById('soal-kelas').value;
        const jenis=document.getElementById('soal-jenis').value;
        const jumlah=document.getElementById('soal-jumlah').value;
        const topik=document.getElementById('soal-topik').value||'Sistem Pencernaan';
        const level=document.getElementById('soal-level').value;
        return `Buatkan ${jumlah} soal ${jenis} berkualitas untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB ada jawaban lengkap dan pembahasan. PG sertakan 4 opsi. Akhiri dengan KUNCI JAWABAN. Tidak ada simbol Markdown.`;
      },
      system:'Kamu ahli evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Soal berkualitas, pembahasan mendidik. Tidak ada simbol Markdown.'
    },
    admin: {
      btnId:'btn-admin', label:'Buat Dokumen', resId:'res-admin',
      getPrompt: ()=>`Buatkan ${document.getElementById('admin-jenis').value} profesional. Konteks: ${document.getElementById('admin-konteks').value||'umum'}. Format rapi, formal, siap digunakan. Tidak ada simbol Markdown.`,
      system:'Kamu asisten administrasi sekolah dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    },
    pkb: {
      btnId:'btn-pkb', label:'Generate Laporan PKB', resId:'res-pkb',
      getPrompt: ()=>{
        const nama=document.getElementById('pkb-nama').value||'Guru';
        const mapel=document.getElementById('pkb-mapel').value||'Umum';
        const kegiatan=document.getElementById('pkb-kegiatan').value||'Pelatihan';
        const refleksi=document.getElementById('pkb-refleksi').value||'Bermanfaat';
        return `Buatkan Laporan PKB formal: Nama ${nama}, Mapel ${mapel}, Kegiatan ${kegiatan}, Refleksi ${refleksi}. Bagian: Pendahuluan, Pelaksanaan, Hasil & Manfaat, Refleksi & RTL, Penutup. Formal siap dilaporkan. Tidak ada simbol Markdown.`;
      },
      system:'Kamu asisten penulisan laporan dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    }
  };

  const cfg = cfgs[type];
  if (!cfg) return;

  setBtnLoading(cfg.btnId, true, cfg.label, 'Generating...');
  const resEl = document.getElementById(cfg.resId);
  resEl.innerHTML=''; resEl.classList.remove('show');

  try {
    const result = await callAI(cfg.getPrompt(), cfg.system);
    showResult(cfg.resId, result);
    useCredit();
  } catch(err) {
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }
  setBtnLoading(cfg.btnId, false, cfg.label, '');
}

async function generateMedsos() {
  const topik=document.getElementById('med-topik').value||'Tips belajar';
  const jenis=document.getElementById('med-jenis').value;
  const mapel=document.getElementById('med-mapel').value||'Umum';
  const tone=document.getElementById('med-tone').value;
  const audiens=document.getElementById('med-audiens').value;
  const btn=document.getElementById('btn-medsos');
  const resEl=document.getElementById('res-medsos');

  btn.disabled=true;
  btn.innerHTML='<div class="loading-dots"><span></span><span></span><span></span></div> Generating konten...';
  resEl.innerHTML=''; resEl.classList.remove('show');

  const platNama={instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',twitter:'Twitter/X',whatsapp:'WhatsApp'}[activePlatform]||'Instagram';
  const toneMap={'Santai & Friendly':'santai dan akrab','Inspiratif & Motivasi':'inspiratif dan memotivasi','Profesional & Edukatif':'profesional namun mudah dipahami','Lucu & Relatable':'humoris dan relatable','Storytelling':'bercerita yang mengalir'};

  const prompt = `Buat konten ${platNama} untuk guru Indonesia:
Platform: ${platNama} | Jenis: ${jenis} | Topik: ${topik} | Mapel: ${mapel}
Tone: ${toneMap[tone]||tone} | Target: ${audiens||'guru Indonesia'}

Buat konten yang langsung bisa dicopy-paste ke ${platNama}.
Sertakan juga:
1. Konten utama siap pakai
2. Tips posting optimal
3. 3 ide konten lanjutan
4. Cara monetize dari konten ini

Tidak ada simbol Markdown berlebihan.`;

  try {
    const result = await callAI(prompt, 'Kamu content strategist media sosial edukasi terbaik Indonesia dari Asisten Guru by Mas Gema. Konten viral, bermanfaat, siap pakai. Tidak ada simbol Markdown berlebihan.');
    showResult('res-medsos', result);
    useCredit();
  } catch(err) {
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }
  btn.disabled=false;
  btn.innerHTML='✨ Generate Konten Medsos';
}

// DISPLAY & EXPORT
function esc(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderDisplay(text) {
  return esc(text)
    .replace(/^#{1,2}\s+(.+)$/gm,'<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid #ede9fe;padding-bottom:5px;">$1</div>')
    .replace(/^#{3,6}\s+(.+)$/gm,'<div style="font-size:13px;font-weight:600;color:#4a4458;margin:10px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^[-*]\s+(.+)$/gm,'<div style="margin:3px 0 3px 16px;">•&nbsp;$1</div>')
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
  const raw = document.getElementById(resId)?.dataset.raw||'';
  navigator.clipboard.writeText(raw).catch(()=>{});
  const prev = btn.textContent;
  btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent=prev;},2000);
}

function printText(text) {
  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const w = window.open('','_blank');
  if (!w) { alert('Izinkan popup browser.'); return; }
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Asisten Guru</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:10pt;margin-bottom:20pt;}
    .ht{font-size:15pt;font-weight:700;color:#7c3aed;}.hs{font-size:10pt;color:#555;margin-top:4pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">Asisten Guru by Mas Gema</div>
    <div class="hs">${currentUser?currentUser.name:''} | ${today}</div></div>
    <pre>${esc(text)}</pre></body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

function printResult(resId) {
  printText(document.getElementById(resId)?.dataset.raw||'');
}

async function downloadWordFromText(text, prefix='AsistenGuru_') {
  if (!docxReady||typeof docx==='undefined') { alert('Library Word dimuat, tunggu 3 detik.'); return; }
  try {
    const {Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle} = docx;
    const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const children = [];
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'ASISTEN GURU BY MAS GEMA',bold:true,size:28,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:(currentUser?currentUser.name+'  |  ':'')+today,size:20,color:'555555',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Berdasarkan SK BSKAP No. 032/H/KR/2024 — Kurikulum Merdeka',size:18,color:'9333ea',italics:true,font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:400}}));

    text.split('\n').forEach(line=>{
      if (!line.trim()) { children.push(new Paragraph({spacing:{after:120}})); return; }
      if (/^[=\-]{4,}$/.test(line.trim())) {
        children.push(new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'e8e4f0',space:1}},spacing:{before:100,after:100}}));
        return;
      }
      const clean = line.trim();
      const isH = clean===clean.toUpperCase() && clean.length>4 && /[A-Z]/.test(clean) && !/^\d/.test(clean) && !/^[A-D][\.|]/.test(clean) && !/^(NIP|No\.)/.test(clean);
      children.push(new Paragraph({
        children:[new TextRun({text:clean,bold:isH,size:isH?24:22,font:'Times New Roman',color:isH?'3b0764':'1a1523'})],
        spacing:{before:isH?240:60,after:60}
      }));
    });

    children.push(new Paragraph({spacing:{before:480}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Asisten Guru by Mas Gema —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));

    const doc = new Document({styles:{default:{document:{run:{font:'Times New Roman',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1800}}},children}]});
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=prefix+Date.now()+'.docx';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  } catch(e) { alert('Gagal download Word: '+e.message); }
}

async function downloadWord(resId, label) {
  const raw = document.getElementById(resId)?.dataset.raw||'';
  if (!raw) { alert('Tidak ada konten.'); return; }
  await downloadWordFromText(raw, label+'_AsistenGuru_');
}

// AUTO LOGIN
(function init(){
  const session = getSession();
  if (session) {
    const users = getUsers();
    const fresh = users.find(u=>u.email===session.email);
    enterApp(fresh||session);
  }
  const pd = document.getElementById('pay-date');
  if (pd) pd.value = new Date().toISOString().split('T')[0];
})();
