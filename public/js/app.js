// ═══════════════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — 2-Stage Generate (RPP + Asesmen)
// ═══════════════════════════════════════

const UK = 'ag_users_v1';
const SK = 'ag_session_v1';
const API_URL = '/api/chat';
let currentUser = null;
let docxReady = false;
let activePlatform = 'instagram';

function setPlatform(p) {
  activePlatform = p;
  document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
  const btn = document.getElementById('ptab-' + p);
  if (btn) btn.classList.add('active');
}

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
// ═══════════════════════════════════════════════════════
//  SINTAK DATA — struktur per model (tanpa template literal)
//  Gunakan getSintakList(model) untuk mengakses
// ═══════════════════════════════════════════════════════
function getSintakList(model) {
  const S = {
    'Project Based Learning (PjBL)': [
      { nama:'Sintak 1: Penentuan Pertanyaan Mendasar (Driving Question)', label:'Meaningful Learning' },
      { nama:'Sintak 2: Mendesain Perencanaan Proyek',                      label:'Meaningful Learning' },
      { nama:'Sintak 3: Menyusun Jadwal Pelaksanaan',                       label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 4: Memonitoring Kemajuan dan Progres Proyek',          label:'Joyful Learning' },
      { nama:'Sintak 5: Menguji dan Mempresentasikan Hasil',                label:'Joyful Learning' },
      { nama:'Sintak 6: Evaluasi dan Refleksi Pengalaman Belajar',          label:'Mindful learning / Berkesadaran' },
    ],
    'Problem Based Learning (PBL)': [
      { nama:'Sintak 1: Orientasi Siswa pada Masalah',                                label:'Meaningful Learning' },
      { nama:'Sintak 2: Mengorganisasi Siswa untuk Belajar',                          label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 3: Membimbing Penyelidikan Individual dan Kelompok',              label:'Joyful Learning' },
      { nama:'Sintak 4: Mengembangkan dan Menyajikan Hasil Karya',                    label:'Meaningful Learning' },
      { nama:'Sintak 5: Menganalisis dan Mengevaluasi Proses Pemecahan Masalah',      label:'Mindful learning / Berkesadaran' },
    ],
    'Discovery Learning': [
      { nama:'Sintak 1: Stimulasi (Pemberian Rangsangan)',            label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 2: Problem Statement (Identifikasi Masalah)',    label:'Meaningful Learning' },
      { nama:'Sintak 3: Data Collection (Pengumpulan Data)',          label:'Joyful Learning' },
      { nama:'Sintak 4: Data Processing (Pengolahan Data)',           label:'Meaningful Learning' },
      { nama:'Sintak 5: Verification (Pembuktian)',                   label:'Joyful Learning' },
      { nama:'Sintak 6: Generalization (Menarik Kesimpulan Umum)',   label:'Mindful learning / Berkesadaran' },
    ],
    'Inquiry Learning': [
      { nama:'Sintak 1: Orientasi dan Pemberian Pertanyaan Awal',           label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 2: Merumuskan Masalah dan Hipotesis',                  label:'Meaningful Learning' },
      { nama:'Sintak 3: Mengumpulkan Data dan Informasi',                   label:'Joyful Learning' },
      { nama:'Sintak 4: Menganalisis dan Mengolah Data',                    label:'Meaningful Learning' },
      { nama:'Sintak 5: Menguji Hipotesis dengan Data',                     label:'Joyful Learning' },
      { nama:'Sintak 6: Merumuskan dan Mengomunikasikan Kesimpulan',        label:'Mindful learning / Berkesadaran' },
    ],
    'Cooperative Learning': [
      { nama:'Sintak 1: Menyampaikan Tujuan dan Memotivasi Siswa',          label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 2: Menyajikan dan Menyampaikan Informasi',             label:'Meaningful Learning' },
      { nama:'Sintak 3: Mengorganisasikan Siswa ke dalam Kelompok Belajar', label:'Joyful Learning' },
      { nama:'Sintak 4: Membimbing Kelompok Bekerja dan Belajar',           label:'Meaningful Learning' },
      { nama:'Sintak 5: Evaluasi Hasil Belajar Kelompok',                   label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 6: Memberikan Penghargaan atas Capaian Kelompok',      label:'Joyful Learning' },
    ],
    'Direct Instruction': [
      { nama:'Sintak 1: Orientasi dan Penyampaian Tujuan Pembelajaran',     label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 2: Presentasi dan Demonstrasi Materi oleh Guru',       label:'Meaningful Learning' },
      { nama:'Sintak 3: Latihan Terstruktur dengan Panduan Guru',           label:'Joyful Learning' },
      { nama:'Sintak 4: Latihan Terbimbing dan Pemantauan Pemahaman',       label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 5: Latihan Mandiri dan Umpan Balik Independen',        label:'Meaningful Learning' },
    ],
    'Flipped Classroom': [
      { nama:'Sintak 1: Pemberian Materi Mandiri Pra-Kelas (video/modul)',  label:'Mindful learning / Berkesadaran' },
      { nama:'Sintak 2: Refleksi Awal dan Klarifikasi Pemahaman Siswa',     label:'Meaningful Learning' },
      { nama:'Sintak 3: Eksplorasi Mendalam dan Diskusi Aktif di Kelas',    label:'Joyful Learning' },
      { nama:'Sintak 4: Penerapan dan Produksi - Mengerjakan Tugas Bermakna', label:'Meaningful Learning' },
      { nama:'Sintak 5: Presentasi, Umpan Balik, dan Konsolidasi Belajar',  label:'Joyful Learning' },
    ],
  };
  return S[model] || S['Project Based Learning (PjBL)'];
}


async function syncToSupabase(user) {
  try {
    await fetch('/api/chat', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'user_sync', user:{
        name:user.name, email:user.email, jenjang:user.jenjang,
        password:user.password, plan:user.plan||'gratis',
        credits:user.credits??5, total_gen:user.totalGen||0,
        wa:user.wa||'', deviceId:user.deviceId||'',
        creditDate:user.creditDate||getTodayKey()
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
    plan: 'gratis', credits: 5, totalGen: 0, creditDate: getTodayKey(),
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

// ════════════════════════════
//  PAYMENT & RIWAYAT
// ════════════════════════════
// Pilih paket dari halaman upgrade → pre-fill form bayar
// ═══════════════════════════════════════════
//  SIMPAN & RESTORE IDENTITAS FORM
//  Auto-save saat generate, auto-fill saat buka
// ═══════════════════════════════════════════
const IDENTITY_KEY = 'ag_identity_';

// Field-field identitas yang disimpan per user
const IDENTITY_FIELDS = [
  'rpp-sekolah','rpp-kota','rpp-guru','rpp-nip-guru',
  'rpp-kepsek','rpp-nip-kepsek','rpp-tahun'
];

function saveIdentity() {
  if (!currentUser) return;
  const data = {};
  IDENTITY_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  localStorage.setItem(IDENTITY_KEY + currentUser.email, JSON.stringify(data));
}

function restoreIdentity() {
  if (!currentUser) return;
  const raw = localStorage.getItem(IDENTITY_KEY + currentUser.email);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    IDENTITY_FIELDS.forEach(id => {
      const el = document.getElementById(id);
      if (el && data[id]) el.value = data[id];
    });
  } catch(e) {}
}

function clearSavedIdentity() {
  if (!currentUser) return;
  localStorage.removeItem(IDENTITY_KEY + currentUser.email);
  IDENTITY_FIELDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  // Tunjukkan konfirmasi singkat
  const btn = document.querySelector('[onclick="clearSavedIdentity()"]');
  if (btn) { const orig = btn.textContent; btn.textContent = '✓ Dihapus'; setTimeout(() => btn.textContent = orig, 2000); }
}

function selectPaket(paketValue) {
  const select = document.getElementById('pay-paket');
  if (select) select.value = paketValue;
  goPage('bayar');
  setTimeout(() => {
    const el = document.getElementById('pay-sender');
    if (el) el.focus();
  }, 300);
}

function submitPayment() {
  if (!currentUser) return;
  const paketRaw = document.getElementById('pay-paket')?.value || 'premium:49000';
  const [paket, price] = paketRaw.split(':');
  const sender = document.getElementById('pay-sender')?.value.trim() || '';
  const date   = document.getElementById('pay-date')?.value || '';
  const waUser = document.getElementById('pay-wa')?.value.trim() || '';
  const ok  = document.getElementById('pay-ok');
  const err = document.getElementById('pay-err');
  ok.textContent = ''; err.textContent = '';

  if (!sender) { err.textContent = 'Nama pengirim wajib diisi.'; return; }
  if (!date)   { err.textContent = 'Tanggal transfer wajib diisi.'; return; }

  // Simpan ke localStorage
  const txns = JSON.parse(localStorage.getItem('ag_txns_' + currentUser.email) || '[]');
  txns.unshift({
    paket, price,
    sender_name: sender,
    transfer_date: date,
    wa_user: waUser,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  localStorage.setItem('ag_txns_' + currentUser.email, JSON.stringify(txns));

  // Sync ke Supabase (fire & forget)
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create_transaction',
      user_id: currentUser.id || '',
      user_name: currentUser.name,
      user_email: currentUser.email,
      paket, price: parseInt(price),
      credits_added: -1,
      sender_name: sender,
      transfer_date: date,
      wa_user: waUser
    })
  }).catch(() => {});

  // Update link WA admin dengan info transfer
  const paketLabel = paket === 'tahunan' ? 'Premium Tahunan (Rp 399.000)' : 'Premium Bulanan (Rp 49.000)';
  const msg = encodeURIComponent(
    `Halo Mas Gema, saya sudah transfer untuk upgrade ${paketLabel}.\n\n` +
    `Nama    : ${currentUser.name}\n` +
    `Email   : ${currentUser.email}\n` +
    `Paket   : ${paketLabel}\n` +
    `Pengirim: ${sender}\n` +
    `Tanggal : ${date}\n\n` +
    `Mohon diverifikasi ya. Terima kasih! 🙏`
  );
  const waLink = document.getElementById('wa-admin-link');
  if (waLink) waLink.href = `https://wa.me/6287723317506?text=${msg}`;

  ok.textContent = '✓ Konfirmasi tersimpan! Sekarang kirim bukti transfer ke WhatsApp Admin di bawah ini.';
}

function loadRiwayat() {
  if (!currentUser) return;
  const el = document.getElementById('riwayat-list');
  if (!el) return;
  const txns = JSON.parse(localStorage.getItem('ag_txns_' + currentUser.email) || '[]');
  if (!txns.length) { el.innerHTML = '<div style="text-align:center;padding:2rem;color:#9ca3af;">Belum ada riwayat pembayaran</div>'; return; }
  const sc = { pending: '#d97706', verified: '#16a34a', rejected: '#dc2626' };
  const sl = { pending: '⏳ Menunggu Verifikasi', verified: '✓ Terverifikasi', rejected: '✕ Ditolak' };
  el.innerHTML = txns.map(t => `
    <div style="border:1px solid #e8e4f0;border-radius:10px;padding:.875rem;margin-bottom:.75rem;background:#fff;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:600;">Paket ${t.paket} — Rp ${parseInt(t.price||0).toLocaleString('id-ID')}</span>
        <span style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;background:${t.status==='verified'?'#d1fae5':t.status==='rejected'?'#fee2e2':'#fef3c7'};color:${sc[t.status]||'#666'}">${sl[t.status]||t.status}</span>
      </div>
      <div style="font-size:11px;color:#7c7490;">Pengirim: ${t.sender_name} | Tanggal: ${t.transfer_date} | Dikirim: ${new Date(t.created_at).toLocaleDateString('id-ID')}</div>
      ${t.status==='pending'?`<a href="https://wa.me/6287723317506?text=${encodeURIComponent('Halo Mas Gema, saya sudah kirim konfirmasi pembayaran '+t.paket+' atas nama '+t.sender_name+'. Mohon diverifikasi.')}" target="_blank" style="display:inline-block;margin-top:6px;font-size:11px;color:#16a34a;font-weight:600;">📱 Kirim Bukti WA Admin</a>`:''}
    </div>`).join('');
}

// ══════════════════════════════════════════
//  PAKET & KREDIT HARIAN
// ══════════════════════════════════════════
const PLANS = {
  gratis:            { label:'Gratis',           dailyCredits:5,  harga:0,       hargaLabel:'Gratis' },
  reguler_bulanan:   { label:'Reguler Bulanan',  dailyCredits:20, harga:19000,   hargaLabel:'Rp 19.000/bln' },
  premium_bulanan:   { label:'Premium Bulanan',  dailyCredits:70, harga:49000,   hargaLabel:'Rp 49.000/bln' },
  reguler_tahunan:   { label:'Reguler Tahunan',  dailyCredits:25, harga:190000,  hargaLabel:'Rp 190.000/thn' },
  premium_tahunan:   { label:'Premium Tahunan',  dailyCredits:70, harga:490000,  hargaLabel:'Rp 490.000/thn' },
};
// Paket yang lebih tinggi untuk upsell
const UPSELL = {
  gratis:'reguler_bulanan', reguler_bulanan:'premium_bulanan',
  premium_bulanan:'premium_tahunan', reguler_tahunan:'premium_tahunan', premium_tahunan:null
};

function getTodayKey() {
  return new Date().toISOString().slice(0,10); // YYYY-MM-DD
}

// Cek dan reset kredit harian jika hari baru
function checkDailyReset() {
  if (!currentUser) return;
  const plan = currentUser.plan || 'gratis';
  const planInfo = PLANS[plan] || PLANS.gratis;
  const todayKey = getTodayKey();
  const lastDate = currentUser.creditDate || '';
  if (lastDate !== todayKey) {
    // Hari baru → reset kredit
    currentUser.credits = planInfo.dailyCredits;
    currentUser.creditDate = todayKey;
    saveUserData();
  }
}

function updatePlanUI() {
  if (!currentUser) return;
  checkDailyReset();
  const plan = currentUser.plan || 'gratis';
  const planInfo = PLANS[plan] || PLANS.gratis;
  const chip = document.getElementById('sb-plan');
  chip.textContent = planInfo.label;
  chip.className = 'plan-chip' + (plan !== 'gratis' ? ' premium' : '');
  const credits = currentUser.credits ?? planInfo.dailyCredits;
  document.getElementById('sb-credit').textContent = credits;
  // Update label kredit
  const lbl = document.getElementById('sb-credit-label');
  if (lbl) lbl.textContent = 'Kredit hari ini';
}

function saveUserData() {
  if (!currentUser) return;
  const users = getUsers();
  const i = users.findIndex(u => u.email === currentUser.email);
  if (i > -1) { users[i] = { ...users[i], ...currentUser }; saveUsers(users); saveSession(users[i]); }
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
  // Render halaman khusus saat dibuka
  if (id === 'histori') renderHistoryPage();
  if (id === 'riwayat') loadRiwayat();
  if (id === 'rpp') setTimeout(restoreIdentity, 50); // Restore form identitas
}

function canGenerate() {
  if (!currentUser) return false;
  checkDailyReset();
  const credits = currentUser.credits ?? 0;
  if (credits > 0) return true;
  // Kredit habis — tampilkan pesan upsell
  const plan = currentUser.plan || 'gratis';
  const planInfo = PLANS[plan] || PLANS.gratis;
  const upsell = UPSELL[plan];
  const upsellInfo = upsell ? PLANS[upsell] : null;
  const upsellMsg = upsellInfo
    ? `\n\nNaik ke paket ${upsellInfo.label} (${upsellInfo.hargaLabel}) untuk ${upsellInfo.dailyCredits} kredit/hari!`
    : '';
  alert(`⏰ Kredit hari ini habis!\n\nKredit akan direset otomatis pukul 00:00 menjadi ${planInfo.dailyCredits} kredit.${upsellMsg}\n\nAtau upgrade paket di menu Upgrade Premium.`);
  return false;
}

function useCredit() {
  if (!currentUser) return;
  checkDailyReset();
  const credits = currentUser.credits ?? 0;
  if (credits <= 0) return;
  currentUser.credits = credits - 1;
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
// ══════════════════════════════════════════════════
//  PROMPT 1 — IDENTITAS, PROFIL LULUSAN, KEGIATAN
// ══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
//  PROMPT 1 — IDENTITAS + KEGIATAN PEMBELAJARAN (5-6/sintak)
// ═══════════════════════════════════════════════════════════

// buildPrompt1 — hanya bagian A-H + Pendahuluan + Penutup
// Sintak inti ditangani oleh buildSintakHTML() di generateRPP
function buildPrompt1(mapel, kelas, fase, waktu, topik, tujuan, model, pendekatan, metode) {
  const selectedModel = model || 'Project Based Learning (PjBL)';
  const sintakList    = getSintakList(selectedModel);
  return `Tulis Modul Ajar ${mapel} ${kelas} topik ${topik} — bagian identitas A-I dan Kegiatan Pendahuluan + Penutup SAJA.
JANGAN tulis Kegiatan Inti dan sintak — akan diisi terpisah.
JANGAN pakai Markdown (#, ##, **, *). Konten NYATA. Bahasa Indonesia baku.
${tujuan ? 'Catatan: ' + tujuan : ''}

A. Capaian Pembelajaran
[Tulis CP LENGKAP dari SK BSKAP 032/H/KR/2024 untuk ${mapel} ${fase} — min. 3 paragraf NYATA, bukan generik]
Elemen CP relevan dengan ${topik}: [Elemen CP yang berkaitan langsung]

B. Tujuan Pembelajaran
1. (C4) Dengan ${metode.split(',')[0].trim()}, peserta didik dapat menganalisis [aspek utama ${topik}] secara mendalam dengan tepat.
2. (C5) Dengan ${selectedModel}, peserta didik dapat mengevaluasi [dampak/pentingnya ${topik}] berdasarkan kriteria jelas dan berbasis data.
3. (C6) Dengan diskusi dan presentasi, peserta didik dapat merancang [solusi konkret terkait ${topik}] yang dapat diterapkan.

C. Indikator Pencapaian Tujuan
1. [C4 operasional spesifik ${topik}]
2. [C5 operasional spesifik ${topik}]
3. [C6 merancang produk terkait ${topik}]

D. Kompetensi Awal Peserta Didik
1. [Prasyarat 1 spesifik ${topik}]
2. [Prasyarat 2 spesifik ${topik}]
3. [Prasyarat 3 spesifik ${topik}]

E. Profil Lulusan (8 Dimensi)
Delapan dimensi: Beriman-Bertakwa, Berkebinekaan Global, Bergotong Royong, Mandiri, Bernalar Kritis, Kreatif, Cinta Tanah Air, Berwawasan Lingkungan.
Pilih 4 paling relevan dengan ${topik}:
[Dimensi 1 paling relevan]: [Implementasi konkret 2 kalimat dalam pembelajaran ${topik}]
[Dimensi 2]: [Implementasi konkret 2 kalimat]
[Dimensi 3]: [Implementasi konkret 2 kalimat]
[Dimensi 4]: [Implementasi konkret 2 kalimat]

F. Sarana dan Prasarana
Media        : [Media konkret spesifik ${topik}]
Alat         : [Alat yang dibutuhkan]
Bahan        : [Bahan yang dibutuhkan]
Sumber Belajar: [Sumber belajar konkret]

G. Model Pembelajaran
Pendekatan : ${pendekatan}
Model      : ${selectedModel}
Metode     : ${metode}

H. Pemahaman Bermakna
1. [Manfaat nyata ${topik} dalam kehidupan sehari-hari siswa]
2. [Keterkaitan ${topik} dengan isu aktual]
3. [Relevansi ${topik} untuk masa depan]

I. Pertanyaan Pemantik
1. [Pertanyaan berbasis pengalaman siswa tentang ${topik}]
2. [Pertanyaan berbasis fenomena nyata ${topik}]
3. [Pertanyaan HOTs tentang ${topik}]

J. Kegiatan Pembelajaran

Kegiatan Awal (10 menit) (Mindful learning / Berkesadaran)
1. Guru membuka kelas dengan salam, doa, dan memeriksa kesiapan belajar siswa. Guru menyampaikan topik "${topik}" beserta relevansinya dalam kehidupan nyata. (Mindful learning / Berkesadaran)
2. Guru menampilkan [media apersepsi konkret terkait ${topik}] dan mengajukan pertanyaan pemantik: "[pertanyaan pemantik 1 spesifik]" dan "[pertanyaan pemantik 2 spesifik]". 3-4 siswa menyampaikan pendapat. (Pembangunan Persepsi/Apersepsi)
3. Guru mengaitkan jawaban siswa dengan ${topik} dan menyampaikan motivasi belajar yang relevan.
4. Guru menyampaikan tujuan pembelajaran, alur ${selectedModel} yang terdiri dari ${sintakList.length} sintak, dan kriteria keberhasilan. (Penguatan Tujuan Pembelajaran)
5. Guru membentuk kelompok 3-5 orang heterogen dengan peran: ketua, notulen, presenter, anggota aktif.

Kegiatan Penutup (10 menit) (Meaningful Learning)
1. Guru merangkum poin kunci ${topik} dan mengaitkan dengan tujuan pembelajaran.
2. Exit Ticket: Pertanyaan 1: [Soal C2 spesifik ${topik}] Jawaban ideal: [Jawaban singkat]. Pertanyaan 2: [Soal C3 penerapan ${topik}] Jawaban ideal: [Jawaban singkat].
3. Tindak Lanjut: Siswa mengamati [fenomena ${topik}] selama seminggu dan mencatat di jurnal.
4. Guru menyampaikan topik pertemuan berikutnya.
5. Kelas ditutup dengan doa dan salam.

Catatan Validasi: Ini hanya referensi modul ajar, untuk lebih lengkapnya bisa ditambahkan dan diedit sesuai keinginan Anda.`;
}

function buildPrompt2(mapel, kelas, fase, topik, waktu) {
  return `Lanjutkan Modul Ajar ${mapel} ${kelas} topik ${topik} — Bagian ASESMEN KOGNITIF.
ATURAN: Jangan pakai Markdown. Tabel wajib format: Kolom1 | Kolom2 | Kolom3. Isi NYATA spesifik ${topik}.

==============================
K. ASESMEN
==============================

K.1. Asesmen Diagnostik (Sebelum Pembelajaran)

Tujuan: Memetakan kemampuan awal dan kesiapan belajar siswa sebelum ${topik}.

Soal 1: [Tulis soal C1/C2 spesifik mengukur prasyarat ${topik}]
Jawaban ideal: [Jawaban lengkap]
Interpretasi: Jika benar — siswa siap ikuti inti. Jika salah — guru beri penguatan prasyarat 5 menit.

Soal 2: [Tulis soal berbasis pengalaman sehari-hari terkait ${topik}]
Jawaban ideal: [Jawaban yang diharapkan]
Interpretasi: [Cara guru menyesuaikan pembelajaran]

Soal 3: [Tulis soal tentang minat dan pengetahuan awal tentang ${topik}]
Interpretasi: Guru mencatat hasil untuk menyesuaikan contoh dan konteks pembelajaran.

==============================
K.2. Kisi-Kisi Penilaian Kognitif
==============================

Teknik: Tes Uraian | Waktu: 30 menit | Total: 100 poin

No | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal | Bobot
1 | [Menjelaskan konsep utama ${topik}] | C1-Mengingat | Uraian | 1 | 15
2 | [Memahami proses/mekanisme ${topik} dengan kata sendiri] | C2-Memahami | Uraian | 2 | 15
3 | [Menerapkan konsep ${topik} pada situasi nyata] | C3-Mengaplikasikan | Uraian | 3 | 20
4 | [Menganalisis hubungan sebab-akibat ${topik}] | C4-Menganalisis | Uraian | 4 | 25
5 | [Mengevaluasi masalah dan memberi solusi ${topik}] | C5-Mengevaluasi | Uraian | 5 | 25

==============================
K.3. Soal Uraian Kognitif
==============================

SOAL 1 (C1 - Mengingat) Bobot 15 Poin
[Tulis soal C1 NYATA dan SPESIFIK untuk ${topik}]
Kunci Jawaban:
[Tulis kunci lengkap min. 4 kalimat ilmiah dan jelas]
Pembahasan:
[Tulis penjelasan mengapa benar, bahasa mudah dipahami]
Rubrik: Skor 15 = lengkap dan tepat | Skor 10 = sebagian besar benar | Skor 5 = dasar saja | Skor 0 = tidak menjawab

SOAL 2 (C2 - Memahami) Bobot 15 Poin
[Tulis soal C2 NYATA — siswa jelaskan dengan kata sendiri atau beri contoh terkait ${topik}]
Kunci Jawaban:
[Tulis kunci lengkap]
Pembahasan:
[Tulis penjelasan konsep]
Rubrik: Skor 15 = jelas dan contoh tepat | Skor 10 = cukup jelas | Skor 5 = masih menghafal | Skor 0 = tidak menjawab

SOAL 3 (C3 - Mengaplikasikan) Bobot 20 Poin
[Tulis soal C3 NYATA berbasis kasus kehidupan nyata — siswa terapkan konsep ${topik}]
Kunci Jawaban:
[Tulis jawaban langkah demi langkah]
Pembahasan:
[Tulis cara penerapan konsep]
Rubrik: Skor 20 = tepat dan runtut | Skor 15 = tepat sedikit kurang | Skor 10 = konsep benar | Skor 5 = ada upaya | Skor 0 = tidak menjawab

SOAL 4 (C4 - Menganalisis/HOTs) Bobot 25 Poin
[Tulis soal HOTs C4 berbasis fenomena nyata — analisis mendalam terkait ${topik}]
Kunci Jawaban:
[Tulis jawaban analitis lengkap dengan argumen logis berbasis data]
Pembahasan:
[Tulis proses berpikir analitis]
Rubrik: Skor 25 = mendalam, semua aspek, berbasis bukti | Skor 20 = baik | Skor 15 = cukup | Skor 10 = deskriptif | Skor 0 = tidak menjawab

SOAL 5 (C5 - Mengevaluasi/HOTs) Bobot 25 Poin
[Tulis soal HOTs C5 — siswa menilai/memutuskan/memberi solusi masalah nyata ${topik}]
Kunci Jawaban:
[Tulis jawaban evaluatif lengkap dengan kriteria jelas]
Pembahasan:
[Tulis kriteria evaluasi dan alasan solusi terbaik]
Rubrik: Skor 25 = tepat, kriteria jelas, berbasis bukti | Skor 20 = baik | Skor 15 = cukup | Skor 10 = opini | Skor 0 = tidak menjawab

Nilai Kognitif = Total Skor (maks. 100) | KKM: 75
A: 91-100 | B: 81-90 | C: 71-80 | D: 61-70 | Remedial: di bawah 61`;
}

// ═══════════════════════════════════════════════════
//  PROMPT 3 — RUBRIK AFEKTIF + PSIKOMOTORIK + TTD
// ═══════════════════════════════════════════════════
function buildPrompt3(mapel, kelas, fase, topik, sekolah, guru, nipGuru, kepsek, nipKepsek, kota) {
  const tgl = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  return `Lanjutkan Modul Ajar ${mapel} ${kelas} topik ${topik} — Bagian RUBRIK PENILAIAN dan LEMBAR PENGESAHAN.
ATURAN WAJIB:
1. Jangan pakai Markdown. SEMUA rubrik dan rekapitulasi WAJIB format tabel: Kolom1 | Kolom2 | Kolom3
2. Isi NYATA dan SPESIFIK untuk topik ${topik}
3. JANGAN tambahkan "Catatan: Modul ajar ini berlaku untuk semester..." — DILARANG
4. JANGAN tambahkan "Pengawas Sekolah" atau jabatan apapun selain Kepala Sekolah dan Guru — DILARANG
5. Di Lembar Pengesahan hanya ada 2 pihak: Kepala Sekolah (kiri) dan Guru (kanan)
6. Nama, NIP, dan instansi sudah tertera — JANGAN ubah atau tambah nama fiktif

==============================
K.4. Rubrik Penilaian Afektif (Sikap)
==============================

Teknik: Observasi selama kegiatan | Skala: 1-4 | Jumlah Aspek: 5

Aspek Sikap | Indikator yang Diamati | Skor 4 (Sangat Baik) | Skor 3 (Baik) | Skor 2 (Cukup) | Skor 1 (Perlu Bimbingan)
Tanggung Jawab | Menyelesaikan tugas kelompok sesuai peran dan waktu | Selalu selesai tepat waktu, tanpa diingatkan, menjadi teladan | Selesai dengan sedikit pengingat dari guru | Kadang mengabaikan tugas atau perannya | Tidak menyelesaikan tanpa bimbingan intensif
Bergotong Royong | Aktif berkontribusi dan mendukung anggota dalam proyek ${topik} | Selalu aktif, memimpin diskusi, mendengarkan semua, mencari solusi bersama | Sering aktif, menghargai pendapat, kadang perlu diingatkan | Kadang pasif atau mendominasi diskusi | Tidak kooperatif, tidak menghargai teman
Bernalar Kritis | Mengajukan pertanyaan dan argumen berbasis fakta tentang ${topik} | Selalu mengajukan pertanyaan tajam, argumen berbasis data valid | Sering bernalar kritis, argumen cukup berdasar | Kadang kritis, sebagian argumen berupa opini | Jarang bertanya, menerima informasi tanpa analisis
Mandiri | Mengerjakan tugas secara independen terkait ${topik} | Selalu berinisiatif, tidak bergantung, aktif cari sumber tambahan | Sering mandiri, bertanya hanya jika sangat perlu | Masih sering bertanya sebelum mencoba sendiri | Selalu bergantung, tidak mau mencoba mandiri
[Dimensi Profil Lulusan paling relevan ${topik}] | [Indikator perilaku konkret yang diamati guru terkait ${topik}] | [Deskripsi skor 4 spesifik konteks ${topik}] | [Deskripsi skor 3 spesifik] | [Deskripsi skor 2 spesifik] | [Deskripsi skor 1 spesifik]

Nilai Afektif = (Total Skor / 20) x 100
A: 91-100 (Sangat Baik) | B: 81-90 (Baik) | C: 71-80 (Cukup) | D: di bawah 71 (Perlu Pembinaan)

Lembar Rekapitulasi Penilaian Afektif:
No | Nama Siswa | Tanggung Jawab (/4) | Bergotong Royong (/4) | Bernalar Kritis (/4) | Mandiri (/4) | Dimensi 5 (/4) | Total (/20) | Nilai | Predikat
1 | .......................................... | | | | | | | |
2 | .......................................... | | | | | | | |
3 | .......................................... | | | | | | | |
4 | .......................................... | | | | | | | |
5 | .......................................... | | | | | | | |

==============================
K.5. Rubrik Penilaian Psikomotorik (Keterampilan)
==============================

Teknik: Penilaian Kinerja dan Produk | Skala: 1-4 | Jumlah Aspek: 5

Aspek Keterampilan | Indikator yang Dinilai | Skor 4 (Sangat Terampil) | Skor 3 (Terampil) | Skor 2 (Cukup Terampil) | Skor 1 (Perlu Bimbingan)
Perencanaan Proyek | Merancang rencana kerja terstruktur untuk proyek ${topik} | Perencanaan sangat lengkap, runtut, semua aspek dipertimbangkan matang | Cukup lengkap, sebagian besar aspek ada | Ada langkah penting yang terlewat | Tidak ada perencanaan yang jelas
Ketepatan dan Keakuratan Informasi | Menyajikan data dan fakta akurat tentang ${topik} | Semua informasi tepat, relevan, dari sumber terpercaya | Sebagian besar tepat dan relevan | Beberapa informasi kurang sesuai | Banyak informasi tidak relevan atau tidak akurat
Kreativitas dan Orisinalitas | Menampilkan gagasan kreatif dan orisinal dalam proyek ${topik} | Sangat kreatif, orisinal, menampilkan sudut pandang baru | Cukup kreatif dengan beberapa ide segar | Kurang variatif, mengikuti contoh yang ada | Tidak ada kreativitas, hanya menyalin
Kolaborasi dan Kerja Sama Tim | Aktif berkontribusi dan mendukung tim dalam proyek ${topik} | Selalu aktif, pembagian tugas adil, mendukung anggota yang kesulitan | Cukup aktif, pembagian tugas cukup merata | Kurang aktif, kontribusi tidak merata | Tidak bekerja sama, kontribusi tidak bermakna
Penyajian dan Komunikasi | Menyampaikan hasil proyek ${topik} secara jelas dan menarik | Sangat jelas, sistematis, percaya diri, media efektif, mampu jawab semua pertanyaan | Jelas, sistematis, cukup percaya diri | Cukup jelas namun kurang sistematis atau percaya diri | Tidak jelas, tidak sistematis, tidak percaya diri

Nilai Psikomotorik = (Total Skor / 20) x 100
SB: 91-100 | B: 81-90 | C: 71-80 | PB: di bawah 71 (Perlu Bimbingan)

Lembar Rekapitulasi Penilaian Psikomotorik:
No | Nama Siswa | Perencanaan (/4) | Ketepatan Info (/4) | Kreativitas (/4) | Kerja Sama (/4) | Penyajian (/4) | Total (/20) | Nilai | Predikat
1 | .......................................... | | | | | | | |
2 | .......................................... | | | | | | | |
3 | .......................................... | | | | | | | |
4 | .......................................... | | | | | | | |
5 | .......................................... | | | | | | | |

==============================
K.6. Rekapitulasi Nilai Akhir
==============================

Komponen Penilaian | Bobot | Nilai Perolehan | Nilai Tertimbang
Kognitif (Soal Uraian) | 40% | ............. | ..... x 0,4 = .....
Afektif (Sikap) | 30% | ............. | ..... x 0,3 = .....
Psikomotorik (Keterampilan) | 30% | ............. | ..... x 0,3 = .....
NILAI AKHIR | 100% | | Jumlah Nilai Tertimbang

Rumus: Nilai Akhir = (Kognitif x 0,4) + (Afektif x 0,3) + (Psikomotorik x 0,3). KKM: 75.

==============================
L. Pengayaan dan Remedial
==============================

Kegiatan Pengayaan
Sasaran: Peserta didik mencapai KKM lebih cepat dan memiliki pemahaman mendalam
Tujuan : Memberikan tantangan berpikir kritis dan kreatif lebih lanjut
Bentuk : [Kegiatan pengayaan KONKRET terkait ${topik} — misal: proyek mini, riset, tutor sebaya]
Durasi : Fleksibel dalam jam pelajaran atau tugas mandiri di rumah

Kegiatan Remedial
Sasaran: Peserta didik dengan Nilai Akhir di bawah 75
Tujuan : Memahami kembali konsep dasar ${topik} secara bertahap
Bentuk : Pembelajaran ulang dengan pendekatan berbeda, bimbingan individual, LKS scaffolding
Durasi : Jam tambahan atau sesi bimbingan kecil

LEMBAR_PENGESAHAN`;
}


function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1').replace(/^[-*]\s+/gm, '• ')
    .replace(/^_{3,}$/gm, '').replace(/^-{3,}$/gm, '─────────────')
    .replace(/`(.+?)`/g, '$1').replace(/\[(.+?)\]\(.+?\)/g, '$1').trim();
}

// ══════════════════════════════════════════════
//  RENDER MODUL AJAR — TABEL OTOMATIS + FORMAT
//  Deteksi baris | → render jadi HTML table
// ══════════════════════════════════════════════
// ══════════════════════════════════════════════════
//  RENDER MODUL AJAR — Fix identitas, tabel, TTD
// ══════════════════════════════════════════════════

function renderTTDBox(meta) {
  const kota      = meta.kota      || '[Kota]';
  const tanggal   = meta.tanggal   || new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const sekolah   = meta.sekolah   || 'Sekolah';
  const kepsek    = meta.kepsek    || '______________________________';
  const nipKepsek = meta.nipKepsek || '-';
  const guru      = meta.guru      || '______________________________';
  const nipGuru   = meta.nipGuru   || '-';
  const mapel     = meta.mapel     || 'Mata Pelajaran';
  return `<div style="border:1.5px solid #cbd5e1;border-radius:8px;overflow:hidden;margin:24px 0;">
    <div style="background:#7c3aed;color:#fff;padding:9px 14px;font-size:13px;font-weight:700;letter-spacing:.04em;">LEMBAR PENGESAHAN</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;">
      <div style="padding:20px 18px;border-right:1.5px solid #e2e8f0;line-height:2;">
        <div style="font-size:13px;color:#4a4458;">Mengetahui,</div>
        <div style="font-size:13px;font-weight:600;color:#1a1523;">Kepala ${sekolah}</div>
        <div style="height:60px;"></div>
        <div style="font-size:14px;font-weight:700;color:#1a1523;border-top:1.5px solid #1a1523;padding-top:5px;">${kepsek}</div>
        <div style="font-size:12px;color:#4a4458;">NIP. ${nipKepsek}</div>
      </div>
      <div style="padding:20px 18px;line-height:2;text-align:left;">
        <div style="font-size:13px;color:#4a4458;">${kota}, ${tanggal}</div>
        <div style="font-size:13px;font-weight:600;color:#1a1523;">Guru</div>
        <div style="height:60px;"></div>
        <div style="font-size:14px;font-weight:700;color:#1a1523;border-top:1.5px solid #1a1523;padding-top:5px;">${guru}</div>
        <div style="font-size:12px;color:#4a4458;">NIP. ${nipGuru}</div>
      </div>
    </div>
  </div>`;
}

function renderModulAjar(text, meta = {}) {
  // Hapus blok pengesahan AI sebelum filter per-baris
  // (AI kadang generate seluruh blok pengesahan sebelum LEMBAR_PENGESAHAN marker)
  let cleanText = text;

  // Hapus blok: dari "LEMBAR PENGESAHAN" (versi AI) sampai sebelum "LEMBAR_PENGESAHAN" (marker kita)
  // atau sampai "L. LEMBAR PENGESAHAN"
  // Hapus baris "M. Lembar Pengesahan" dari AI (letter + spasi + LEMBAR PENGESAHAN)
  cleanText = cleanText.replace(/^[A-Z]\.\s+LEMBAR\s+PENGESAHAN.*$/gim, '');
  // Hapus konten pengesahan AI - HANYA yang pakai spasi ("LEMBAR PENGESAHAN")
  // JANGAN hapus "LEMBAR_PENGESAHAN" (underscore = marker kita untuk kotak TTD)
  cleanText = cleanText.replace(/LEMBAR PENGESAHAN[\s\S]*?(?=LEMBAR_PENGESAHAN)/gi, '\n');

  // Hapus baris-baris pengesahan palsu dari AI
  const BLOCKED_PATTERNS = [
    /modul ajar ini berlaku untuk semester/i,
    /dapat direvisi sesuai kebutuhan pembelajaran/i,
    /pengawas sekolah/i,
    /koordinator kurikulum/i,
    /^[J-Z]\.\s*$/,          // huruf sendirian tanpa konten (M. L. K. dll)
    /^[J-Z]\.\s+lembar/i,    // M. Lembar Pengesahan dll
    /telah diperiksa dan disetujui/i,
    /tanggal pengesahan\s*:/i,
    /^penyusun\s*,?\s*$/i,
    /^mengetahui\s*,?\s*$/i,
    /^kepala\s+sd\b/i,
    /^kepala\s+smp\b/i,
    /^kepala\s+sma\b/i,
    /^kepala\s+smk\b/i,
    /guru kelas\s+[vixcl0-9]+\s*$/i,
    /^_{10,}\s*$/,           // garis bawah panjang (tanda tangan kosong)
    /^NIP\.\s*\.{5,}/,       // NIP. ................
    /^NIP\.\s*-+\s*$/,       // NIP. -----
    /NIP\.\s*\d{6,}/,        // NIP palsu dari AI
  ];

  const lines = cleanText.split('\n').filter(line => {
    return !BLOCKED_PATTERNS.some(pat => pat.test(line.trim()));
  });

  let html = '';
  let tableLines = [];
  let inTable = false;

  // Warna level kognitif
  const levelColors = {
    'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5',
    'C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'
  };

  function getCellBg(val) {
    for (const [k,v] of Object.entries(levelColors)) {
      if (val && val.includes(k)) return v;
    }
    return null;
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Deteksi baris tabel: minimal punya 2 karakter |
  function isTableRow(line) {
    const t = line.trim();
    return (t.match(/\|/g) || []).length >= 2;
  }

  function flushTable(rows) {
    if (!rows.length) return '';
    // Filter baris separator murni (----|----|)
    const data = rows.filter(r => !/^[\s\-|]+$/.test(r));
    if (data.length < 1) return '';

    // Split kolom — JANGAN filter empty agar kolom tetap sejajar
    const allCols = data.map(r => {
      let parts = r.split('|').map(c => c.trim());
      // Hapus elemen kosong di awal/akhir (dari | di tepi)
      if (parts[0] === '') parts = parts.slice(1);
      if (parts.length && parts[parts.length-1] === '') parts = parts.slice(0,-1);
      return parts;
    });

    if (!allCols.length) return '';
    const maxCols = Math.max(...allCols.map(r => r.length));
    if (maxCols < 2) return data.map(r => `<div style="font-size:13px;line-height:1.85;">${esc(r)}</div>`).join('');

    // Baris pertama = header
    const headers = allCols[0];
    const bodyRows = allCols.slice(1);

    // Lebar kolom sama rata
    const colW = Math.floor(100 / maxCols);

    let t = `<div style="overflow-x:auto;margin:10px 0;">
<table style="width:100%;border-collapse:collapse;font-size:12px;min-width:400px;">
<thead><tr>`;
    headers.forEach(h => {
      t += `<th style="background:#7c3aed;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:600;border:1px solid #5b21b6;">${esc(h)}</th>`;
    });
    t += `</tr></thead><tbody>`;

    bodyRows.forEach((cols, ri) => {
      const evenBg = ri % 2 === 1 ? '#f8fafc' : '#fff';
      t += '<tr>';
      for (let ci = 0; ci < maxCols; ci++) {
        const val = cols[ci] !== undefined ? cols[ci] : '';
        const bg = getCellBg(val) || evenBg;
        const bold = ci === 0 || !!getCellBg(val);
        t += `<td style="padding:7px 10px;border:1px solid #cbd5e1;vertical-align:top;line-height:1.5;background:${bg};${bold?'font-weight:600;':''}">${esc(val)}</td>`;
      }
      t += '</tr>';
    });
    t += `</tbody></table></div>`;
    return t;
  }

  // Pola identitas — semua field modul ajar
  const IDENTITAS_RE = /^(Nama Penyusun|Nama Sekolah|Kepala Sekolah|Tahun Pelajaran|Fase\/Kelas|Fase|Kelas|Semester|Mata Pelajaran|Materi Ajar|Waktu Pelaksanaan|Alokasi Waktu|Referensi|Pendekatan|Model|Metode|Teknik|Instrumen|Waktu)\s*:/i;

  function renderLine(line) {
    const t = line.trim();
    if (!t) return '<div style="height:8px;"></div>';

    // Garis pembatas
    if (/^={4,}/.test(t)) return '<hr style="border:none;border-top:2px solid #7c3aed;margin:16px 0;">';
    if (/^-{4,}$/.test(t)) return '<hr style="border:none;border-top:1px solid #e8e4f0;margin:8px 0;">';

    // LEMBAR_PENGESAHAN — render kotak TTD
    if (/^LEMBAR_PENGESAHAN$/.test(t)) {
      return renderTTDBox(meta);
    }

    // Judul besar: "MODUL AJAR"
    if (/^MODUL AJAR$/.test(t)) {
      return `<div style="font-size:18px;font-weight:700;color:#7c3aed;text-align:center;margin:8px 0 16px;letter-spacing:.04em;">MODUL AJAR</div>`;
    }

    // Bagian A–L — kotak ungu, teks center
    if (/^[A-L]\.\s+\S/.test(t)) {
      return `<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:22px 0 8px;padding:7px 14px;background:#ede9fe;border-radius:6px;border-left:4px solid #7c3aed;text-align:left;">${esc(t)}</div>`;
    }

    // Sub-bagian J.1, J.2 dll — kotak biru
    if (/^[A-Z]\.\d+\.?\s+\S/.test(t)) {
      return `<div style="font-size:13px;font-weight:700;color:#1e40af;margin:16px 0 6px;padding:5px 10px;background:#eff6ff;border-radius:5px;border-left:3px solid #1e40af;text-align:left;">${esc(t)}</div>`;
    }

    // Kegiatan Pendahuluan / Inti / Penutup — kotak biru
    if (/^Kegiatan (Awal|Inti|Penutup)/i.test(t)) {
      return `<div style="font-size:13px;font-weight:700;color:#1e40af;margin:16px 0 6px;padding:6px 12px;background:#eff6ff;border-radius:6px;text-align:left;">${esc(t)}</div>`;
    }

    // Sintak N — kotak hijau
    if (/^Sintak\s+\d+/i.test(t)) {
      return `<div style="font-size:13px;font-weight:700;color:#059669;margin:14px 0 6px;padding:5px 10px;background:#ecfdf5;border-radius:5px;border-left:3px solid #059669;text-align:left;">${esc(t)}</div>`;
    }

    // Heading KAPITAL penuh
    if (t === t.toUpperCase() && t.length > 6 && /[A-Z]{3,}/.test(t) && !/^\d/.test(t) && !/^[A-D][\.\|]/.test(t) && !t.includes('|')) {
      return `<div style="font-size:12px;font-weight:700;color:#4a4458;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px;padding:4px 0;border-bottom:1px solid #e8e4f0;">${esc(t)}</div>`;
    }

    // Identitas (bold, rata kiri sejajar, TIDAK justify)
    if (IDENTITAS_RE.test(t)) {
      const colonIdx = t.indexOf(':');
      const key = t.slice(0, colonIdx).trim();
      const val = t.slice(colonIdx + 1).trim();
      return `<div style="display:flex;gap:0;font-size:13px;padding:3px 0;line-height:1.7;">
        <strong style="min-width:200px;color:#1a1523;">${esc(key)}</strong>
        <span style="color:#1a1523;">: ${esc(val)}</span>
      </div>`;
    }

    // Badge Deep Learning
    const withBadge = esc(t)
      .replace(/\(Mindful learning \/ Berkesadaran\)/gi, '<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Mindful</span>')
      .replace(/\(Mindful\)/gi, '<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Mindful</span>')
      .replace(/\(Meaningful Learning\)/gi, '<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Meaningful</span>')
      .replace(/\(Meaningful\)/gi, '<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Meaningful</span>')
      .replace(/\(Joyful Learning\)/gi, '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Joyful</span>')
      .replace(/\(Joyful\)/gi, '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Joyful</span>')
      .replace(/\(Pembangunan Persepsi\/Apersepsi\)/gi, '<span style="background:#f3e8ff;color:#7c3aed;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Apersepsi</span>')
      .replace(/\(Penguatan Tujuan Pembelajaran\)/gi, '<span style="background:#ede9fe;color:#5b21b6;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Tujuan</span>')
      .replace(/\(Refleksi Awal dan Diskusi Singkat\)/gi, '<span style="background:#ecfdf5;color:#047857;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Refleksi</span>');

    // Item bernomor (1. 2. 3. dst) — justify dengan indent
    if (/^\d+\.\s/.test(t)) {
      const numMatch = t.match(/^(\d+\.)(\s+)(.*)$/);
      if (numMatch) {
        return `<div style="font-size:13px;line-height:1.9;color:#1a1523;padding:2px 0;text-align:justify;display:flex;gap:6px;"><span style="flex-shrink:0;font-weight:600;min-width:20px;">${esc(numMatch[1])}</span><span style="flex:1;">${withBadge.replace(esc(numMatch[1]+numMatch[2]),'')}</span></div>`;
      }
    }
    // Teks isi biasa — justify rata kanan kiri
    return `<div style="font-size:13px;line-height:1.9;color:#1a1523;padding:2px 0;text-align:justify;">${withBadge}</div>`;
  }

  // Helper: apakah baris adalah item bernomor (1. 2. 3. dst)
  function isNumberedItem(line) {
    return /^\d+\.\s+\S/.test(line.trim());
  }
  function getNumberedContent(line) {
    return line.trim().replace(/^\d+\.\s+/, '');
  }

  let listLines = [];
  const flushList = () => {
    if (!listLines.length) return '';
    const items = listLines.map(l => {
      const content = getNumberedContent(l);
      // Terapkan badge deep learning pada isi item
      const withBadge = esc(content)
        .replace(/\(Mindful learning \/ Berkesadaran\)/gi, '<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Mindful</span>')
        .replace(/\(Mindful\)/gi, '<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Mindful</span>')
        .replace(/\(Meaningful Learning\)/gi, '<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Meaningful</span>')
        .replace(/\(Meaningful\)/gi, '<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Meaningful</span>')
        .replace(/\(Joyful Learning\)/gi, '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Joyful</span>')
        .replace(/\(Joyful\)/gi, '<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Joyful</span>')
        .replace(/\(Pembangunan Persepsi\/Apersepsi\)/gi, '<span style="background:#f3e8ff;color:#7c3aed;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Apersepsi</span>')
        .replace(/\(Penguatan Tujuan Pembelajaran\)/gi, '<span style="background:#ede9fe;color:#5b21b6;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Tujuan</span>')
        .replace(/\(Refleksi Awal dan Diskusi Singkat\)/gi, '<span style="background:#ecfdf5;color:#047857;font-size:10px;font-weight:700;padding:1px 7px;border-radius:8px;margin-left:4px;">Refleksi</span>');
      return `<li style="font-size:13px;line-height:1.9;color:#1a1523;padding:2px 0;text-align:justify;">${withBadge}</li>`;
    }).join('');
    listLines = [];
    return `<ol style="padding-left:1.5rem;margin:6px 0;">${items}</ol>`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isTableRow(line)) {
      // Flush list dulu jika ada
      if (listLines.length > 0) { html += flushList(); }
      inTable = true;
      tableLines.push(line.trim());
    } else if (isNumberedItem(line)) {
      // Flush table dulu jika ada
      if (inTable && tableLines.length > 0) {
        html += flushTable(tableLines);
        tableLines = [];
        inTable = false;
      }
      listLines.push(line);
    } else {
      // Flush list dan table jika ada
      if (listLines.length > 0) { html += flushList(); }
      if (inTable && tableLines.length > 0) {
        html += flushTable(tableLines);
        tableLines = [];
        inTable = false;
      }
      html += renderLine(line);
    }
  }
  // Flush sisa
  if (listLines.length > 0) { html += flushList(); }
  if (inTable && tableLines.length > 0) { html += flushTable(tableLines); }

  return html;
}

function renderDisplay(text) {
  // Untuk hasil non-RPP tetap pakai renderDisplay sederhana
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
    const steps = [
      'Tahap 1/3: Membuat Identitas & Kegiatan Pembelajaran...',
      'Tahap 2/3: Membuat Kisi-Kisi & Soal Uraian...',
      'Tahap 3/3: Membuat Rubrik Penilaian & Pengesahan...'
    ];
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
    try {
      await generateRPP();
    } catch(e) {
      console.error('generateRPP error:', e);
      setButtonLoading('btn-rpp', false, 'Generate Modul Ajar Lengkap', 0);
      const resEl = document.getElementById('res-rpp');
      if (resEl) { resEl.classList.add('show'); resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${e.message}</div>`; }
    }
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
  } else if (type === 'medsos') {
    const topik   = document.getElementById('med-topik')?.value || 'Tips belajar';
    const jenis   = document.getElementById('med-jenis')?.value || 'Caption + Hashtag';
    const mapelM  = document.getElementById('med-mapel')?.value || 'Umum';
    const tone    = document.getElementById('med-tone')?.value || 'Santai & Friendly';
    const audiens = document.getElementById('med-audiens')?.value || 'guru Indonesia';
    const platMap = {instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',twitter:'Twitter/X',whatsapp:'WhatsApp'};
    const platform = platMap[activePlatform] || 'Instagram';
    const toneMap = {'Santai & Friendly':'santai dan akrab seperti teman','Inspiratif & Motivasi':'inspiratif dan memotivasi','Profesional & Edukatif':'profesional namun mudah dipahami','Lucu & Relatable':'humoris dan relatable','Storytelling':'bercerita yang mengalir'};
    prompt = `Buat konten ${platform} untuk guru Indonesia:
Platform : ${platform}
Jenis    : ${jenis}
Topik    : ${topik}
Mapel    : ${mapelM}
Tone     : ${toneMap[tone] || tone}
Target   : ${audiens}

Buat konten yang langsung bisa dicopy-paste ke ${platform}. Sertakan:
1. Konten utama siap pakai (lengkap dengan hashtag jika Instagram/TikTok)
2. Tips cara posting optimal di ${platform}
3. 3 ide konten lanjutan dengan tema serupa
4. Cara monetize dari konten ini

Tidak ada simbol Markdown berlebihan.`;
    system = 'Kamu content strategist media sosial edukasi terbaik Indonesia dari Asisten Guru by Mas Gema. Buat konten viral, bermanfaat, dan siap pakai. Tidak ada simbol Markdown berlebihan.';
    btnId = 'btn-medsos'; label = 'Generate Konten Medsos'; resId = 'res-medsos';
  }

  // Jika type tidak dikenal atau prompt kosong, hentikan
  if (!prompt || !btnId) { console.warn('generateAI: type tidak dikenal:', type); return; }

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

// ═══════════════════════════════════════════════════
//  GENERATE MODUL AJAR — Sintak dibangun JS, bukan AI
// ═══════════════════════════════════════════════════

// Bangun HTML sintak langsung dari JS (tidak bergantung AI)
async function buildSintakHTML(model, topik, mapel, kelas) {
  const list = getSintakList(model) || getSintakList('Project Based Learning (PjBL)');
  const sysP = `Kamu penulis Modul Ajar PPG Indonesia profesional.
ATURAN:
- JANGAN pakai Markdown (#, ##, **, *)
- Tulis konten NYATA dan SPESIFIK untuk topik: ${topik} | Mapel: ${mapel} | Kelas: ${kelas}
- Setiap kegiatan min. 2 kalimat operasional
- Bahasa Indonesia baku`;

  // Minta AI isi konten untuk SEMUA sintak sekaligus
  const sintakKerangka = list.map((s, idx) => {
    return '\n' + s.nama + ' (' + s.label + ')\n' +
      '1. [Kegiatan guru konkret untuk ' + topik + ' - min. 2 kalimat]\n' +
      '2. [Kegiatan siswa konkret - apa yang dilakukan - min. 2 kalimat]\n' +
      '3. [Pertanyaan pemandu guru-siswa relevan dengan ' + topik + ']\n' +
      '4. [Kegiatan kolaboratif terkait ' + topik + ' - hasil yang diharapkan]\n' +
      '5. [Penutup sintak: umpan balik atau transisi ke sintak berikutnya]';
  }).join('\n')

  const prompt = `Tulis isi kegiatan untuk SEMUA ${list.length} sintak di bawah ini.
Topik: ${topik} | Mapel: ${mapel} | Kelas: ${kelas} | Model: ${model}

PENTING: Tulis SEMUA ${list.length} sintak dari nomor 1 sampai ${list.length}. JANGAN melewati atau menggabungkan sintak. JANGAN pakai Markdown.

${sintakKerangka}

Tulis isi nyata dan spesifik untuk setiap poin 1-5 pada setiap sintak. Gunakan konteks topik ${topik} yang konkret.`;

  try {
    return await callAPI(prompt, sysP, 4000);
  } catch(e) {
    // Fallback: gunakan panduan default dari sintakData
    return list.map(s => s.nama + '\n\n' + s.panduan).join('\n\n');
  }
}

async function generateRPP() {
  saveIdentity(); // Simpan identitas sebelum generate
  const sekolah    = document.getElementById('rpp-sekolah')?.value || '[Nama Sekolah]';
  const kota       = document.getElementById('rpp-kota')?.value || '[Kota]';
  const guru       = document.getElementById('rpp-guru')?.value || '[Nama Guru]';
  const nipGuru    = document.getElementById('rpp-nip-guru')?.value || '-';
  const kepsek     = document.getElementById('rpp-kepsek')?.value || '[Nama Kepala Sekolah]';
  const nipKepsek  = document.getElementById('rpp-nip-kepsek')?.value || '-';
  const tahun      = document.getElementById('rpp-tahun')?.value || '2024/2025';
  const mapel      = document.getElementById('rpp-mapel')?.value || 'IPA';
  const kelas      = document.getElementById('rpp-kelas')?.value || 'Kelas 5 SD';
  const waktu      = document.getElementById('rpp-waktu')?.value || '2 x 35 menit';
  const semester   = document.getElementById('rpp-semester')?.value || 'Ganjil (1)';
  const topik      = document.getElementById('rpp-topik')?.value || 'Sistem Pencernaan';
  const pendekatan = document.getElementById('rpp-pendekatan')?.value || 'Deep Learning (Pembelajaran Mendalam)';
  const model      = document.getElementById('rpp-model')?.value || 'Project Based Learning (PjBL)';
  const metode     = document.getElementById('rpp-metode')?.value || 'Diskusi kelompok, tanya jawab, penugasan';
  const catatan    = document.getElementById('rpp-tujuan')?.value || '';
  const fase       = getFase(kelas);
  const today      = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const sintakList = getSintakList(model) || getSintakList('Project Based Learning (PjBL)');

  const resEl = document.getElementById('res-rpp');
  resEl.dataset.sekolah   = sekolah;
  resEl.dataset.guru      = guru;
  resEl.dataset.nipGuru   = nipGuru;
  resEl.dataset.kepsek    = kepsek;
  resEl.dataset.nipKepsek = nipKepsek;
  resEl.dataset.mapel     = mapel;
  resEl.dataset.kota      = kota;
  resEl.innerHTML = '';
  resEl.classList.remove('show');

  const sysPrompt = getSystemPrompt();

  const showProgress = (step, total, msg, icon='⏳') => {
    resEl.classList.add('show');
    resEl.innerHTML = `<div style="padding:2rem;text-align:center;color:#7c3aed;">
      <div style="font-size:32px;">${icon}</div>
      <div style="font-weight:600;margin-top:.75rem;font-size:15px;">${msg}</div>
      <div style="font-size:12px;color:#7c7490;margin-top:6px;">Tahap ${step} dari ${total} — mohon tunggu 30-45 detik</div>
      <div style="margin-top:1rem;background:#ede9fe;border-radius:99px;height:6px;overflow:hidden;">
        <div style="background:#7c3aed;height:6px;width:${Math.round((step/total)*100)}%;border-radius:99px;transition:width .3s;"></div>
      </div>
    </div>`;
  };

  // Identitas block (dibangun JS, bukan AI)
  const identitasBlock = `Nama Penyusun     : ${guru}
Nama Sekolah      : ${sekolah}
Tahun Pelajaran   : ${tahun}
Fase/Kelas        : ${fase}/${kelas}
Semester          : ${semester}
Mata Pelajaran    : ${mapel}
Materi Ajar       : ${topik}
Waktu Pelaksanaan : ${today}
Alokasi Waktu     : ${waktu}
Pendekatan        : ${pendekatan}
Model             : ${model}
Metode            : ${metode}`;

  // TAHAP 1 — Bagian A-I (tanpa sintak inti)
  setButtonLoading('btn-rpp', true, 'Generate Modul Ajar Lengkap', 0);
  showProgress(1, 4, 'Membuat Identitas & Tujuan Pembelajaran...', '⏳');

  const p1 = `Tulis Modul Ajar ${mapel} ${kelas} topik ${topik} bagian A-H dan Pendahuluan + Penutup saja.
JANGAN tulis Kegiatan Inti dan sintak — bagian itu akan diisi terpisah.
JANGAN pakai Markdown. Konten NYATA dan SPESIFIK. Bahasa Indonesia baku.
${catatan ? 'Catatan: ' + catatan : ''}

MODUL AJAR

A. Capaian Pembelajaran
[Tulis CP LENGKAP dari SK BSKAP 032/H/KR/2024 untuk ${mapel} ${fase} — min. 3 paragraf nyata]

Elemen CP relevan dengan ${topik}:
[Elemen CP yang berkaitan langsung]

B. Tujuan Pembelajaran
1. (C4) Dengan ${metode.split(',')[0].trim()}, peserta didik dapat menganalisis [aspek utama ${topik}] secara mendalam dengan tepat.
2. (C5) Dengan ${model}, peserta didik dapat mengevaluasi [dampak/pentingnya ${topik}] berdasarkan kriteria jelas.
3. (C6) Dengan diskusi dan presentasi, peserta didik dapat merancang [solusi konkret terkait ${topik}].

C. Indikator Pencapaian Tujuan
1. [C4 operasional spesifik ${topik}]
2. [C5 operasional spesifik ${topik}]
3. [C6 merancang produk terkait ${topik}]

D. Kompetensi Awal Peserta Didik
1. [Prasyarat 1 spesifik ${topik}]
2. [Prasyarat 2 spesifik ${topik}]
3. [Prasyarat 3 spesifik ${topik}]

E. Profil Lulusan (8 Dimensi)
Dimensi: Beriman-Bertakwa, Berkebinekaan Global, Bergotong Royong, Mandiri, Bernalar Kritis, Kreatif, Cinta Tanah Air, Berwawasan Lingkungan.
Pilih 4 yang paling relevan dengan ${topik}:
[Dimensi 1]: [Implementasi konkret min. 2 kalimat dalam pembelajaran ${topik}]
[Dimensi 2]: [Implementasi konkret min. 2 kalimat]
[Dimensi 3]: [Implementasi konkret min. 2 kalimat]
[Dimensi 4]: [Implementasi konkret min. 2 kalimat]

F. Sarana dan Prasarana
Media        : [Media konkret spesifik ${topik}]
Alat         : [Alat yang dibutuhkan]
Bahan        : [Bahan yang dibutuhkan]
Sumber Belajar: [Sumber konkret]

G. Model Pembelajaran
Pendekatan : ${pendekatan}
Model      : ${model}
Metode     : ${metode}

H. Pemahaman Bermakna
1. [Manfaat nyata ${topik} dalam kehidupan sehari-hari siswa]
2. [Keterkaitan ${topik} dengan isu aktual]
3. [Relevansi ${topik} untuk masa depan]

I. Pertanyaan Pemantik
1. [Pertanyaan berbasis pengalaman siswa terkait ${topik}]
2. [Pertanyaan berbasis fenomena nyata ${topik}]
3. [Pertanyaan HOTs tentang ${topik}]

J. Kegiatan Pembelajaran

Kegiatan Awal (10 menit) (Mindful learning / Berkesadaran)
1. Guru membuka kelas dengan salam, doa, dan memeriksa kesiapan belajar siswa. Guru melakukan presensi dan menyampaikan bahwa hari ini akan belajar tentang "${topik}" yang sangat berkaitan dengan kehidupan sehari-hari. (Mindful learning / Berkesadaran)
2. Guru menampilkan [media apersepsi konkret terkait ${topik}] dan mengajukan pertanyaan pemantik: "[pertanyaan 1 spesifik]" dan "[pertanyaan 2 spesifik]". Siswa diberi 2 menit berpikir, lalu 3-4 siswa menyampaikan pendapat. (Pembangunan Persepsi/Apersepsi)
3. Guru mengaitkan jawaban siswa dengan ${topik} dan menyampaikan relevansinya dalam kehidupan nyata.
4. Guru menyampaikan tujuan pembelajaran, alur ${model} yang terdiri dari ${sintakList.length} sintak, dan kriteria keberhasilan. (Penguatan Tujuan Pembelajaran)
5. Guru membentuk kelompok 3-5 orang heterogen dengan peran: ketua, notulen, presenter, anggota aktif.

Kegiatan Penutup (10 menit) (Meaningful Learning)
1. Guru merangkum poin kunci ${topik} dan mengaitkan dengan tujuan pembelajaran.
2. Exit Ticket:
Pertanyaan 1: [Soal C2 spesifik ${topik} — cek pemahaman]
Jawaban ideal: [Jawaban singkat yang diharapkan]
Pertanyaan 2: [Soal C3 spesifik ${topik} — penerapan nyata]
Jawaban ideal: [Jawaban singkat yang diharapkan]
3. Tindak Lanjut: Siswa diminta mengamati [fenomena ${topik}] selama seminggu ke depan.
4. Guru menyampaikan topik pertemuan berikutnya.
5. Kelas ditutup dengan doa dan salam penutup.`;

  let part1 = '';
  try {
    part1 = identitasBlock + '\n\n' + await callAPI(p1, sysPrompt, 4000);
  } catch(e) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${e.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate Modul Ajar Lengkap', 0);
    return;
  }

  // TAHAP 2 — Sintak inti (AI isi konten, JS atur struktur)
  setButtonLoading('btn-rpp', true, 'Generate Modul Ajar Lengkap', 1);
  showProgress(2, 4, `Membuat ${sintakList.length} Sintak Kegiatan Inti (${model})...`, '📝');

  let sintakContent = '';
  try {
    sintakContent = await buildSintakHTML(model, topik, mapel, kelas);
  } catch(e) {
    sintakContent = sintakList.map(s => s.nama + '\n\n' + s.panduan).join('\n\n');
  }

  // Gabung: pastikan SEMUA sintak ada
  // Post-process: cek sintak mana yang hilang, tambahkan dari data
  let finalSintak = sintakContent;

  // Pastikan semua sintak ada (tambah yang hilang dari data)
  sintakList.forEach((s, idx) => {
    const sintakNum = `Sintak ${idx + 1}`;
    if (!finalSintak.includes(sintakNum)) {
      finalSintak += '\n\n' + s.nama + ' (' + s.label + ')\n\n' +
        '1. Guru membuka kegiatan sintak ini dengan menyampaikan tujuan dan konteks yang relevan bagi siswa.\n' +
        '2. Siswa melaksanakan kegiatan sesuai arahan guru, aktif berpartisipasi dan berkontribusi dalam kelompok.\n' +
        '3. Guru mengajukan pertanyaan pemandu: "Apa yang kalian temukan? Apa hubungannya dengan materi yang dipelajari?"\n' +
        '4. Siswa berdiskusi kelompok, berbagi temuan, dan menyepakati kesimpulan bersama.\n' +
        '5. Guru memberikan umpan balik, mengklarifikasi, dan memandu transisi ke tahap berikutnya.';
    }
  });

  // Post-process: renumber semua item dalam setiap sintak agar berurutan 1,2,3,4,5
  // (AI sering generate semua sebagai "1." - fix ini memastikan urutan benar)
  const renumberSintak = (text) => {
    const lines  = text.split('\n');
    const result = [];
    let   counter = 0;
    let   inSintak = false;

    for (const line of lines) {
      const t = line.trim();
      // Deteksi header sintak → reset counter
      if (/^Sintak\s+\d+/i.test(t)) {
        inSintak  = true;
        counter   = 0;
        result.push(line);
        continue;
      }
      // Deteksi item bernomor (1. 2. 3. dst) saat di dalam sintak
      if (inSintak && /^\d+\.\s+\S/.test(t)) {
        counter++;
        // Ganti nomor dengan counter yang benar
        result.push(line.replace(/^\d+\./, counter + '.'));
        continue;
      }
      // Reset ketika keluar dari sintak (blank line besar / heading lain)
      if (inSintak && /^[A-Z]\.\s+\S/.test(t)) {
        inSintak = false;
        counter  = 0;
      }
      result.push(line);
    }
    return result.join('\n');
  };

  finalSintak = renumberSintak(finalSintak);

  // TAHAP 3 — Asesmen kognitif
  setButtonLoading('btn-rpp', true, 'Generate Modul Ajar Lengkap', 2);
  showProgress(3, 4, 'Membuat Kisi-Kisi & Soal Uraian...', '📊');

  let part2 = '';
  try {
    part2 = await callAPI(buildPrompt2(mapel, kelas, fase, topik, waktu), sysPrompt, 4000);
  } catch(e) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 3: ${e.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate Modul Ajar Lengkap', 0);
    return;
  }

  // TAHAP 4 — Rubrik penilaian (tanpa pengesahan dari AI)
  setButtonLoading('btn-rpp', true, 'Generate Modul Ajar Lengkap', 3);
  showProgress(4, 4, 'Membuat Rubrik Penilaian & Pengesahan...', '✍️');

  let part3 = '';
  try {
    part3 = await callAPI(buildPrompt3(mapel, kelas, fase, topik, sekolah, guru, nipGuru, kepsek, nipKepsek, kota), sysPrompt, 4000);
  } catch(e) {
    resEl.innerHTML = `<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 4: ${e.message}</div>`;
    setButtonLoading('btn-rpp', false, 'Generate Modul Ajar Lengkap', 0);
    return;
  }

  // Susun hasil akhir
  // Bagian sintak diselipkan di antara Pendahuluan dan Penutup
  let finalPart1 = part1;
  // Sisipkan sintak setelah "Kegiatan Pendahuluan"
  // Cari marker Kegiatan Penutup dengan berbagai kemungkinan format dari AI
  const penutupVariants = [
    'Kegiatan Penutup (10 menit)',
    'Kegiatan Penutup (15 menit)',
    'Kegiatan Penutup (5 menit)',
    'Kegiatan Penutup',
  ];
  let insertMarker = penutupVariants.find(v => finalPart1.includes(v));
  if (insertMarker) {
    finalPart1 = finalPart1.replace(
      insertMarker,
      `\nKegiatan Inti (${sintakList.length} Sintak — ${model})\n\n${finalSintak}\n\n${insertMarker}`
    );
  } else {
    finalPart1 += '\n\nKegiatan Inti (' + sintakList.length + ' Sintak — ' + model + ')\n\n' + finalSintak;
  }

  // Pastikan tidak ada nama palsu di part3
  const sanitizePart3 = (text) => {
    let clean = text;
    // Hapus seluruh blok "LEMBAR PENGESAHAN" yang dibuat AI
    // (kita punya LEMBAR_PENGESAHAN marker sendiri di bawah)
    clean = clean.replace(/L\.?\s*LEMBAR\s+PENGESAHAN[\s\S]*/i, '');
    clean = clean.replace(/LEMBAR\s+PENGESAHAN[\s\S]*/i, '');
    // Hapus baris-baris sisa pengesahan
    const badLines = [
      /Pengawas Sekolah/i,
      /berlaku untuk semester/i,
      /dapat direvisi sesuai kebutuhan/i,
      /Koordinator Kurikulum/i,
      /Tanggal Pengesahan/i,
      /^Penyusun\s*,?\s*$/i,
      /^Mengetahui\s*,?\s*$/i,
      /guru kelas\s+[ivxlc0-9]+\s*$/i,
      /^_{5,}\s*$/,
      /^NIP\.\s*[\._\-]{3,}/,
    ];
    clean = clean.split('\n').filter(l => !badLines.some(p => p.test(l.trim()))).join('\n');
    return clean;
  };

  const fullResult = finalPart1 + '\n\n' + part2 + '\n\n' + sanitizePart3(part3) + '\n\nLEMBAR_PENGESAHAN';
  showResult('res-rpp', fullResult);
  useCredit();
  setButtonLoading('btn-rpp', false, 'Generate Modul Ajar Lengkap', 0);
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
  if (resId === 'res-rpp') {
    el.dataset.sekolah  = document.getElementById('rpp-sekolah')?.value || '';
    el.dataset.guru     = document.getElementById('rpp-guru')?.value || '';
    el.dataset.nipGuru  = document.getElementById('rpp-nip-guru')?.value || '-';
    el.dataset.kepsek   = document.getElementById('rpp-kepsek')?.value || '';
    el.dataset.nipKepsek= document.getElementById('rpp-nip-kepsek')?.value || '-';
    el.dataset.mapel    = document.getElementById('rpp-mapel')?.value || '';
    el.dataset.kota     = document.getElementById('rpp-kota')?.value || '';
  }
  const label = RESULT_LABELS[resId] || 'Hasil';
  let rendered;
  if (resId === 'res-rpp') {
    const meta = {
      sekolah  : el.dataset.sekolah,
      guru     : el.dataset.guru,
      nipGuru  : el.dataset.nipGuru,
      kepsek   : el.dataset.kepsek,
      nipKepsek: el.dataset.nipKepsek,
      mapel    : el.dataset.mapel,
      kota     : el.dataset.kota,
      tanggal  : new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})
    };
    rendered = renderModulAjar(text, meta);
  } else {
    rendered = renderDisplay(text);
  }
  el.innerHTML = `
    <div class="result-label">${label}</div>
    <div style="line-height:1.85;color:#1a1523;">${rendered}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyResult('${resId}',this)">📋 Salin teks</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('${resId}')">🖨️ Print</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}')">⬇ Word</button>
      ${resId === 'res-rpp' ? `<button class="btn-dl" style="background:#dc2626;color:#fff;" onclick="downloadPDF('${resId}')">⬇ PDF</button>` : ''}
    </div>`;
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
    const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const el = document.getElementById(resId);

    // Helper teks bersih
    const clean = s => String(s||'')
      .replace(/\(Mindful learning \/ Berkesadaran\)/gi,'[Mindful]')
      .replace(/\(Meaningful Learning\)/gi,'[Meaningful]')
      .replace(/\(Joyful Learning\)/gi,'[Joyful]')
      .replace(/\(Mindful\)/gi,'[Mindful]')
      .replace(/\(Meaningful\)/gi,'[Meaningful]')
      .replace(/\(Joyful\)/gi,'[Joyful]')
      .replace(/\*\*(.+?)\*\*/g,'$1').replace(/\*(.+?)\*/g,'$1').trim();

    // Helper paragraph
    const mkPara = (text, opts = {}) => new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { before: opts.before || 60, after: opts.after || 60 },
      children: [new TextRun({
        text: String(text||''),
        bold: !!opts.bold,
        size: opts.size || 22,
        color: opts.color || '1a1523',
        font: 'Times New Roman',
        italics: !!opts.italic,
      })]
    });

    // Helper Word table dari baris pipe
    const mkTable = (rows) => {
      const data = rows.filter(r => !/^[\s\-|]+$/.test(r.trim()));
      if (data.length < 2) return null;
      const allCols = data.map(r => {
        let parts = r.split('|').map(c => c.trim());
        if (parts[0] === '') parts = parts.slice(1);
        if (parts.length && parts[parts.length-1] === '') parts = parts.slice(0,-1);
        return parts;
      });
      const maxCols = Math.max(...allCols.map(r => r.length));
      if (maxCols < 2) return null;
      const headers = allCols[0];
      const bodyRows = allCols.slice(1);
      const colPct = Math.floor(100 / maxCols);

      const hRow = new TableRow({ tableHeader: true, children: headers.map(h =>
        new TableCell({
          width: { size: colPct, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.SOLID, color: '7c3aed' },
          children: [new Paragraph({ children: [new TextRun({
            text: h, bold: true, size: 18, color: 'ffffff', font: 'Times New Roman'
          })]})]
        })
      )});

      const dRows = bodyRows.map((cols, ri) => new TableRow({ children:
        Array.from({ length: maxCols }, (_, ci) => {
          const val = cols[ci] !== undefined ? cols[ci] : '';
          const isEven = ri % 2 === 1;
          return new TableCell({
            width: { size: colPct, type: WidthType.PERCENTAGE },
            shading: isEven ? { type: ShadingType.SOLID, color: 'f8fafc' } : undefined,
            children: [new Paragraph({ children: [new TextRun({
              text: val, size: 18, font: 'Times New Roman',
              bold: ci === 0,
            })]})]
          });
        })
      }));

      return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [hRow, ...dRows] });
    };

    // Helper TTD box
    const mkTTD = () => {
      const kota   = el?.dataset.kota   || '[Kota]';
      const sekolah= el?.dataset.sekolah|| 'Sekolah';
      const kepsek = el?.dataset.kepsek || '______________________________';
      const nipKep = el?.dataset.nipKepsek || '-';
      const guru   = el?.dataset.guru   || '______________________________';
      const nipGuru= el?.dataset.nipGuru || '-';
      const mapel  = el?.dataset.mapel  || 'Mata Pelajaran';

      const mkCell = (lines) => new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        children: lines.map((l, i) => new Paragraph({
          spacing: { before: i === 0 ? 0 : 40, after: 40 },
          children: [new TextRun({ text: l.text||l, bold: !!(l.bold), size: l.size||20, font: 'Times New Roman', color: l.color||'1a1523' })]
        }))
      });

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [
          mkCell([
            'Mengetahui,',
            `Kepala ${sekolah}`,
            '', '', '', '',
            { text: kepsek, bold: true, size: 22 },
            { text: `NIP. ${nipKep}`, size: 18, color: '4a4458' },
          ]),
          mkCell([
            `${kota}, ${today}`,
            'Guru',
            '', '', '', '',
            { text: guru, bold: true, size: 22 },
            { text: `NIP. ${nipGuru}`, size: 18, color: '4a4458' },
          ]),
        ]})]
      });
    };

    // === Proses baris ===
    const children = [];
    const lines = raw.split('\n');
    let tableLines = [];

    const isTableLine = (l) => (l.match(/\|/g)||[]).length >= 2;

    const flushTable = () => {
      if (!tableLines.length) return;
      const tbl = mkTable(tableLines);
      if (tbl) { children.push(tbl); children.push(mkPara('', {after: 120})); }
      tableLines = [];
    };

    const IDENTITAS_RE = /^(Nama Penyusun|Nama Sekolah|Kepala Sekolah|Tahun Pelajaran|Fase\/Kelas|Fase|Semester|Mata Pelajaran|Materi Ajar|Waktu Pelaksanaan|Alokasi Waktu|Referensi|Pendekatan|Model|Metode)\s*:/i;

    // HEADER dokumen
    children.push(mkPara('MODUL AJAR', { bold:true, size:34, color:'7c3aed', center:true, before:0, after:60 }));
    children.push(mkPara('Asisten Guru by Mas Gema', { size:20, color:'5b21b6', center:true, italic:true, after:400 }));

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();

      if (isTableLine(line)) {
        tableLines.push(t);
        continue;
      }
      flushTable();

      if (!t) { children.push(mkPara('', {after:80})); continue; }

      // Skip "MODUL AJAR" di konten karena sudah di header
      if (t === 'MODUL AJAR') continue;

      // Garis
      if (/^={4,}/.test(t)) { children.push(new Paragraph({ border:{ bottom:{ style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{before:80,after:80}})); continue; }
      if (/^-{4,}$/.test(t)) { children.push(new Paragraph({ border:{ bottom:{ style:BorderStyle.SINGLE,size:4,color:'e8e4f0',space:1}},spacing:{before:60,after:60}})); continue; }

      // Lembar pengesahan
      if (/^LEMBAR_PENGESAHAN$/.test(t)) {
        children.push(mkPara('LEMBAR PENGESAHAN', {bold:true, size:24, color:'7c3aed', before:400, after:200}));
        children.push(mkTTD());
        continue;
      }

      // Bagian A–L
      if (/^[A-L]\.\s+\S/.test(t)) {
        children.push(mkPara(clean(t), {bold:true, size:24, color:'7c3aed', before:320, after:120}));
        continue;
      }

      // Sub-bagian J.1 dst
      if (/^[A-Z]\.\d+/.test(t)) {
        children.push(mkPara(clean(t), {bold:true, size:22, color:'1e40af', before:200, after:80}));
        continue;
      }

      // Sintak
      if (/^Sintak\s+\d+/i.test(t)) {
        children.push(mkPara(clean(t), {bold:true, size:22, color:'059669', before:180, after:60}));
        continue;
      }

      // Kegiatan
      if (/^Kegiatan (Awal|Inti|Penutup)/i.test(t)) {
        children.push(mkPara(clean(t), {bold:true, size:22, color:'1e40af', before:200, after:80}));
        continue;
      }

      // Heading KAPITAL
      if (t === t.toUpperCase() && t.length > 5 && /[A-Z]{3,}/.test(t) && !/^\d/.test(t) && !/^[A-D][\.|]/.test(t) && !t.includes('|')) {
        children.push(mkPara(clean(t), {bold:true, size:20, color:'1e40af', before:160, after:60}));
        continue;
      }

      // Identitas
      if (IDENTITAS_RE.test(t)) {
        const colonIdx = t.indexOf(':');
        const key = t.slice(0, colonIdx).trim();
        const val = t.slice(colonIdx+1).trim();
        children.push(new Paragraph({
          spacing: {before:40, after:40},
          children: [
            new TextRun({text: key.padEnd(22), bold:true, size:20, font:'Times New Roman', color:'1a1523'}),
            new TextRun({text: ': ' + val, size:20, font:'Times New Roman', color:'1a1523'}),
          ]
        }));
        continue;
      }

      // Baris normal
      children.push(mkPara(clean(t), {size:20, before:40, after:40}));
    }
    flushTable();

    // Footer
    children.push(mkPara('', {before:480}));
    children.push(mkPara('— Dibuat dengan Asisten Guru by Mas Gema —', {italic:true, size:18, color:'9333ea', center:true}));

    const doc = new Document({
      styles: { default: { document: { run: { font:'Times New Roman', size:20 }}}},
      sections: [{ properties: { page: { size:{ width:11906, height:16838 }, margin:{ top:1440, right:1440, bottom:1440, left:1800 }}}, children }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ModulAjar_AsistenGuru_' + Date.now() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  } catch(e) { alert('Gagal download Word: ' + e.message); console.error(e); }
}

// ═══════════════════════════════════════════
//  SISTEM HISTORI GENERATE
// ═══════════════════════════════════════════
const HISTORY_MAX = 30;

const HISTORY_META = {
  'res-rpp':       { icon:'📘', label:'Modul Ajar',          color:'#7c3aed', bg:'#ede9fe' },
  'res-soal':      { icon:'✅', label:'Generator Soal',      color:'#059669', bg:'#d1fae5' },
  'res-admin':     { icon:'📋', label:'Dokumen Admin',       color:'#1e40af', bg:'#dbeafe' },
  'res-pkb':       { icon:'⭐', label:'Laporan PKB',         color:'#92400e', bg:'#fef3c7' },
  'res-medsos':    { icon:'📱', label:'Konten Medsos',       color:'#b45309', bg:'#fef3c7' },
  'res-kisi':      { icon:'📊', label:'Kisi-Kisi Soal',      color:'#065f46', bg:'#d1fae5' },
  'res-soal-kisi': { icon:'✅', label:'Soal dari Kisi-Kisi', color:'#065f46', bg:'#d1fae5' },
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
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && l.length > 5);
  let judul = lines.find(l => l.length > 10 && l.length < 80) || meta.label;
  judul = judul.replace(/^[A-K]\.\s+/, '').replace(/[#*=|]/g, '').trim().slice(0, 70);
  const preview = lines.slice(0, 3).join(' ').replace(/[#*=|]/g, '').slice(0, 120) + '...';
  const item = {
    id: Date.now(), resId,
    icon: meta.icon, label: meta.label, color: meta.color, bg: meta.bg,
    judul, preview,
    tanggal: new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}),
    jam: new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}),
    content: text,
    mapel: document.getElementById('rpp-mapel')?.value || document.getElementById('kisi-mapel')?.value || document.getElementById('soal-mapel')?.value || '',
    kelas: document.getElementById('rpp-kelas')?.value || document.getElementById('kisi-kelas')?.value || document.getElementById('soal-kelas')?.value || '',
  };
  try {
    const history = JSON.parse(localStorage.getItem(key) || '[]');
    history.unshift(item);
    if (history.length > HISTORY_MAX) history.pop();
    localStorage.setItem(key, JSON.stringify(history));
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
  if (!confirm('Hapus semua histori? Tidak bisa dibatalkan.')) return;
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
  const modal = document.getElementById('modal-history-view');
  const title = document.getElementById('modal-history-title');
  const body  = document.getElementById('modal-history-body');
  const dlBtn = document.getElementById('modal-history-dl');
  const copyBtn = document.getElementById('modal-history-copy');
  if (!modal) return;
  title.textContent = item.icon + ' ' + item.judul;
  body.innerHTML = `<div style="font-size:12px;line-height:1.85;color:#1a1523;white-space:pre-wrap;">${item.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;
  dlBtn.onclick = () => {
    const tempEl = document.createElement('div');
    tempEl.id = '__temp_hist_' + id;
    tempEl.dataset.raw = item.content;
    tempEl.style.display = 'none';
    document.body.appendChild(tempEl);
    downloadWord('__temp_hist_' + id).then(() => {
      setTimeout(() => { if (tempEl.parentNode) tempEl.remove(); }, 2000);
    }).catch(() => {
      setTimeout(() => { if (tempEl.parentNode) tempEl.remove(); }, 2000);
    });
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
    container.innerHTML = `<div style="text-align:center;padding:3rem;color:#9ca3af;">
      <div style="font-size:40px;margin-bottom:1rem;">📂</div>
      <div style="font-size:15px;font-weight:600;color:#4a4458;margin-bottom:6px;">Belum ada histori</div>
      <div style="font-size:13px;">Setiap hasil generate otomatis tersimpan di sini</div>
    </div>`;
    return;
  }
  const groups = {};
  history.forEach(h => { if (!groups[h.tanggal]) groups[h.tanggal] = []; groups[h.tanggal].push(h); });
  let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
    <div style="font-size:13px;color:#7c7490;">${history.length} hasil tersimpan (maks. ${HISTORY_MAX})</div>
    <button onclick="clearAllHistory()" style="padding:6px 14px;background:#fee2e2;color:#dc2626;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;">🗑️ Hapus Semua</button>
  </div>`;
  Object.entries(groups).forEach(([tanggal, items]) => {
    html += `<div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin:1rem 0 .5rem;">${tanggal}</div>`;
    items.forEach(h => {
      html += `<div style="background:#fff;border:1px solid #e8e4f0;border-radius:12px;padding:1rem 1.25rem;margin-bottom:.75rem;display:flex;align-items:flex-start;gap:1rem;">
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
          <button onclick="viewHistoryItem(${h.id})" style="padding:6px 12px;background:#ede9fe;color:#7c3aed;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;">👁️ Lihat</button>
          <button onclick="deleteHistory(${h.id})" style="padding:6px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:7px;font-size:11px;font-weight:600;cursor:pointer;">🗑️</button>
        </div>
      </div>`;
    });
  });
  container.innerHTML = html;
}

function downloadPDF(resId) {
  const el = document.getElementById(resId);
  if (!el) return;
  const raw = el.dataset.raw || '';
  if (!raw) { alert('Tidak ada konten.'); return; }

  // Ambil meta
  const meta = {
    sekolah  : el.dataset.sekolah   || '',
    guru     : el.dataset.guru      || '',
    nipGuru  : el.dataset.nipGuru   || '-',
    kepsek   : el.dataset.kepsek    || '',
    nipKepsek: el.dataset.nipKepsek || '-',
    mapel    : el.dataset.mapel     || '',
    kota     : el.dataset.kota      || '',
    tanggal  : new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})
  };

  // Render HTML sama seperti di layar
  const rendered = renderModulAjar(raw, meta);

  const w = window.open('', '_blank');
  if (!w) { alert('Izinkan popup browser untuk download PDF.'); return; }

  w.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Modul Ajar — ${meta.mapel||'Asisten Guru'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Plus Jakarta Sans',sans-serif;font-size:12pt;color:#1a1523;background:#fff;padding:0;margin:0;}
  .wrap{max-width:900px;margin:0 auto;padding:2cm;}
  .doc-header{text-align:center;margin-bottom:24px;padding-bottom:12px;border-bottom:2px solid #7c3aed;}
  .doc-title{font-size:20pt;font-weight:700;color:#7c3aed;letter-spacing:.04em;}
  .doc-sub{font-size:10pt;color:#5b21b6;margin-top:4px;}

  /* Bagian A-L */
  .ma-sec{font-size:12pt;font-weight:700;color:#7c3aed;margin:18px 0 8px;padding:6px 12px;background:#ede9fe;border-radius:4px;border-left:4px solid #7c3aed;}
  .ma-subsec{font-size:11pt;font-weight:700;color:#1e40af;margin:14px 0 6px;padding:4px 10px;background:#eff6ff;border-radius:4px;border-left:3px solid #1e40af;}
  /* Sintak */
  .ma-sintak{font-size:11pt;font-weight:700;color:#059669;margin:12px 0 5px;padding:4px 10px;background:#ecfdf5;border-radius:4px;border-left:3px solid #059669;}
  /* Kegiatan */
  .ma-keg{font-size:11pt;font-weight:700;color:#1e40af;margin:12px 0 5px;padding:5px 10px;background:#eff6ff;border-radius:4px;}
  /* Identitas */
  .ma-id{display:flex;font-size:11pt;padding:2px 0;line-height:1.8;}
  .ma-id strong{min-width:200px;color:#1a1523;}
  /* Teks biasa */
  .ma-p{font-size:11pt;line-height:1.85;color:#1a1523;padding:2px 0;}
  hr.ma-div{border:none;border-top:2px solid #7c3aed;margin:14px 0;}
  hr.ma-thin{border:none;border-top:1px solid #e8e4f0;margin:8px 0;}
  /* Tabel */
  table{width:100%;border-collapse:collapse;margin:10px 0;font-size:10pt;}
  th{background:#7c3aed;color:#fff;padding:7px 10px;text-align:left;border:1px solid #5b21b6;font-weight:700;}
  td{padding:6px 10px;border:1px solid #cbd5e1;vertical-align:top;line-height:1.5;}
  tr:nth-child(even) td{background:#f8fafc;}
  /* TTD */
  .ttd-wrap{border:1.5px solid #cbd5e1;border-radius:6px;overflow:hidden;margin:20px 0;}
  .ttd-header{background:#7c3aed;color:#fff;padding:8px 14px;font-size:12pt;font-weight:700;}
  .ttd-body{display:grid;grid-template-columns:1fr 1fr;}
  .ttd-col{padding:18px;line-height:2;font-size:11pt;}
  .ttd-col:first-child{border-right:1.5px solid #e2e8f0;}
  .ttd-name{font-weight:700;font-size:12pt;border-top:1.5px solid #1a1523;padding-top:4px;margin-top:56px;}
  .ttd-nip{font-size:10pt;color:#4a4458;}
  /* Badge */
  .badge{display:inline-block;padding:1px 7px;border-radius:8px;font-size:9pt;font-weight:700;margin-left:4px;}
  .badge-m{background:#dbeafe;color:#1e40af;}
  .badge-mn{background:#d1fae5;color:#065f46;}
  .badge-j{background:#fef3c7;color:#92400e;}

  @media print {
    @page { margin:1.5cm; size: A4; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display:none; }
  }
</style>
</head>
<body>
<div class="wrap">
  <div class="doc-header">
    <div class="doc-title">MODUL AJAR</div>
    <div class="doc-sub">Asisten Guru by Mas Gema — Kurikulum Merdeka</div>
  </div>
  <div id="content">${rendered}</div>
</div>
<div class="no-print" style="position:fixed;top:0;left:0;right:0;background:#7c3aed;color:#fff;padding:10px;text-align:center;font-family:sans-serif;font-size:13px;z-index:999;">
  Tekan <strong>Cmd+P</strong> (Mac) atau <strong>Ctrl+P</strong> (Windows) → Simpan sebagai PDF → Pilih "Simpan sebagai PDF"
  <button onclick="window.print()" style="margin-left:12px;background:#fff;color:#7c3aed;border:none;padding:6px 16px;border-radius:6px;font-weight:700;cursor:pointer;">🖨️ Print / Simpan PDF</button>
</div>
<script>
  // Bersihkan konten yang dihasilkan AI dari kata-kata yang tidak perlu
  document.querySelectorAll('.ma-p, div').forEach(el => {
    const t = el.textContent || '';
    if (t.includes('Modul Ajar ini telah diperiksa') ||
        t.includes('Koordinator Kurikulum') ||
        t.match(/SITI|AISYAH|NURJANAH/)) {
      el.style.display = 'none';
    }
  });
</script>
</body>
</html>`);
  w.document.close();
  setTimeout(() => w.print(), 800);
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
  // Init form kisi-kisi setelah app.js load
  setTimeout(() => {
    if (typeof onKisiBentukChange === 'function') onKisiBentukChange();
  }, 100);
})();
