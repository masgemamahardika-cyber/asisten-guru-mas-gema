// ASISTEN GURU BY MAS GEMA — Kisi-Kisi Tabel Rapi

const API = '/api/chat';
let currentUser = null;
let docxReady = false;
let activePlatform = 'instagram';
let savedKisiKisi = { mapel:'', kelas:'', jenis:'', materi:'', jmlPG:0, jmlUraian:0, level:'', teks:'', rows:[] };

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

const UK = 'ag_users_v2';
const SK = 'ag_session_v2';
const getUsers = () => { try { return JSON.parse(localStorage.getItem(UK)||'[]'); } catch { return []; } };
const saveUsers = u => localStorage.setItem(UK, JSON.stringify(u));
const getSession = () => { try { return JSON.parse(localStorage.getItem(SK)||'null'); } catch { return null; } };
const saveSession = s => localStorage.setItem(SK, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(SK);

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
  err.textContent='';
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
  const user = {name,email,jenjang,password:pass,plan:'gratis',credits:5,totalGen:0};
  users.push(user);
  saveUsers(users);
  ok.textContent='✓ Berhasil daftar! Silakan masuk.';
  setTimeout(()=>authTab('login'),1500);
}

function enterApp(user) {
  currentUser = user;
  const av = user.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  document.getElementById('sb-av').textContent = av;
  document.getElementById('sb-name').textContent = user.name;
  document.getElementById('sb-role').textContent = 'Guru '+(user.jenjang||'');
  document.getElementById('wb-greeting').textContent = 'Halo, '+user.name.split(' ')[0]+'! 👋';
  updatePlanUI();
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app-screen').style.display='flex';
  goPage('dashboard');
  const pd = document.getElementById('pay-date');
  if (pd) pd.value = new Date().toISOString().split('T')[0];
}

function doLogout() {
  clearSession(); currentUser=null;
  document.getElementById('app-screen').style.display='none';
  document.getElementById('auth-screen').style.display='block';
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
  saveUserData(); updatePlanUI();
}

const PAGE_INFO = {
  dashboard:{title:'Beranda',sub:'Selamat datang di Asisten Guru by Mas Gema'},
  rpp:{title:'Generator RPP',sub:'Modul Ajar Kurikulum Merdeka + CP + Asesmen 3 Ranah'},
  kisi:{title:'📊 Kisi-Kisi → Soal Otomatis',sub:'Format tabel resmi Kemendikbud — tersambung ke generate soal!'},
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
  if (id==='riwayat') loadRiwayat();
}

function canGenerate() {
  if (!currentUser) return false;
  if (currentUser.plan==='premium'||currentUser.plan==='tahunan') return true;
  return (currentUser.credits??5)>0;
}

async function callAI(prompt, system, maxTokens=4000) {
  const res = await fetch(API, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'claude-sonnet-4-20250514',
      max_tokens:maxTokens,
      system:system||'Kamu asisten AI guru Indonesia. Buat konten pendidikan berkualitas.',
      messages:[{role:'user',content:prompt}]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message||data?.error||'API error '+res.status);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Tidak ada hasil dari AI');
  return text;
}

function setPlatform(platform) {
  activePlatform = platform;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  const btn = document.getElementById('ptab-'+platform);
  if (btn) btn.classList.add('active');
}

function submitPayment() {
  if (!currentUser) return;
  const paketRaw = document.getElementById('pay-paket').value;
  const [paket,price] = paketRaw.split(':');
  const sender = document.getElementById('pay-sender').value.trim();
  const date = document.getElementById('pay-date').value;
  const ok = document.getElementById('pay-ok');
  const err = document.getElementById('pay-err');
  ok.textContent=''; err.textContent='';
  if (!sender) { err.textContent='Nama pengirim wajib diisi.'; return; }
  const txns = JSON.parse(localStorage.getItem('ag_txns_'+currentUser.email)||'[]');
  txns.unshift({paket,price,sender_name:sender,transfer_date:date,status:'pending',created_at:new Date().toISOString()});
  localStorage.setItem('ag_txns_'+currentUser.email, JSON.stringify(txns));
  ok.textContent='✓ Konfirmasi tersimpan! Hubungi Mas Gema untuk verifikasi.';
}

function loadRiwayat() {
  if (!currentUser) return;
  const el = document.getElementById('riwayat-list');
  const txns = JSON.parse(localStorage.getItem('ag_txns_'+currentUser.email)||'[]');
  if (!txns.length) { el.textContent='Belum ada riwayat pembayaran.'; return; }
  const sc={pending:'#d97706',verified:'#16a34a',rejected:'#dc2626'};
  const sl={pending:'⏳ Menunggu Verifikasi',verified:'✓ Terverifikasi',rejected:'✕ Ditolak'};
  el.innerHTML=txns.map(t=>`
    <div style="border:1px solid #e8e4f0;border-radius:10px;padding:.875rem;margin-bottom:.75rem;background:#fff;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;font-weight:600;">Paket ${t.paket} — Rp ${parseInt(t.price).toLocaleString('id-ID')}</span>
        <span style="font-size:11px;font-weight:600;color:${sc[t.status]||'#666'}">${sl[t.status]||t.status}</span>
      </div>
      <div style="font-size:11px;color:#7c7490;">Pengirim: ${t.sender_name} | Transfer: ${t.transfer_date}</div>
    </div>`).join('');
}

function setBtnLoading(btnId, loading, label, msg) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<div class="loading-dots"><span></span><span></span><span></span></div> ${msg||'Generating...'}`
    : `▶ ${label}`;
}

// ════════════════════════════════════════════
//  PARSE KISI-KISI → RENDER TABEL HTML
// ════════════════════════════════════════════

// Parse teks AI jadi array rows [{no, kd, materi, indikator, level, bentuk, nomor}]
function parseKisiKisi(text) {
  const lines = text.split('\n');
  const rows = [];
  let rekapiTeks = '';
  let inRekap = false;

  for (const line of lines) {
    if (/REKAPITULASI|REKAP/i.test(line)) { inRekap=true; }
    if (inRekap) { rekapiTeks += line+'\n'; continue; }

    const trimmed = line.trim();
    if (!trimmed || /^[-=]+$/.test(trimmed)) continue;

    // Deteksi baris tabel dengan pemisah |
    if (trimmed.includes('|')) {
      const cols = trimmed.split('|').map(c=>c.trim()).filter(c=>c);
      if (cols.length >= 4) {
        // Skip header rows
        if (/^no$/i.test(cols[0]) || /kompetensi/i.test(cols[1]) || /^-+$/.test(cols[0])) continue;
        rows.push({
          no: cols[0]||'',
          kd: cols[1]||'',
          materi: cols[2]||'',
          indikator: cols[3]||'',
          level: cols[4]||'',
          bentuk: cols[5]||'',
          nomor: cols[6]||''
        });
      }
    }
  }
  return { rows, rekap: rekapiTeks };
}

// Render tabel HTML yang rapi dari rows
function renderTabelHTML(rows, info) {
  if (!rows.length) return '<p style="color:#7c7490;">Tabel belum tersedia.</p>';

  const levelColor = {
    'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'
  };
  const getLevelColor = (level) => {
    for (const [key,val] of Object.entries(levelColor)) {
      if (level.includes(key)) return val;
    }
    return '#f5f3ff';
  };

  return `
    <style>
      .kisi-wrap{overflow-x:auto;margin:1rem 0;}
      .kisi-tbl{width:100%;border-collapse:collapse;font-size:11px;min-width:700px;}
      .kisi-tbl th{background:#7c3aed;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border:1px solid #5b21b6;white-space:nowrap;}
      .kisi-tbl td{padding:8px 10px;border:1px solid #e8e4f0;vertical-align:top;line-height:1.5;}
      .kisi-tbl tr:nth-child(even) td{background:#fafaf9;}
      .kisi-tbl tr:hover td{background:#f5f3ff;}
      .kisi-tbl .td-no{text-align:center;font-weight:700;color:#7c3aed;width:36px;}
      .kisi-tbl .td-nomor{text-align:center;font-weight:700;width:50px;}
      .level-badge{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;}
      .bentuk-pg{background:#dbeafe;color:#1e40af;display:inline-block;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:600;}
      .bentuk-ur{background:#d1fae5;color:#065f46;display:inline-block;padding:2px 7px;border-radius:6px;font-size:10px;font-weight:600;}
    </style>
    <div class="kisi-wrap">
      <div style="background:#7c3aed;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;">
        📊 Kisi-Kisi Soal — ${info.jenis} ${info.mapel} ${info.kelas} | ${info.jmlPG} PG + ${info.jmlUraian} Uraian
      </div>
      <table class="kisi-tbl">
        <thead>
          <tr>
            <th>No</th>
            <th>Kompetensi Dasar / CP</th>
            <th>Materi Pokok</th>
            <th>Indikator Soal</th>
            <th>Level Kognitif</th>
            <th>Bentuk</th>
            <th>No. Soal</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r=>`
            <tr>
              <td class="td-no">${r.no}</td>
              <td>${r.kd}</td>
              <td>${r.materi}</td>
              <td>${r.indikator}</td>
              <td><span class="level-badge" style="background:${getLevelColor(r.level)};color:#1a1523;">${r.level}</span></td>
              <td>${/uraian|esai|essay/i.test(r.bentuk) ? `<span class="bentuk-ur">${r.bentuk}</span>` : `<span class="bentuk-pg">${r.bentuk||'PG'}</span>`}</td>
              <td class="td-nomor">${r.nomor}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

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

  savedKisiKisi = {mapel,kelas,jenis,materi,jmlPG,jmlUraian,level,teks:'',rows:[]};

  setBtnLoading('btn-kisi',true,'Generate Kisi-Kisi Resmi','Membuat kisi-kisi dalam tabel resmi...');
  const resEl = document.getElementById('res-kisi');
  resEl.innerHTML=''; resEl.classList.remove('show');
  document.getElementById('soal-from-kisi-card').style.display='none';
  document.getElementById('download-gabungan-card').style.display='none';
  setAlurStep(2);

  // Prompt yang meminta output PERSIS format tabel dengan |
  const prompt = `Buatkan KISI-KISI SOAL format resmi Kemendikbud yang RAPI untuk:
Satuan Pendidikan : [Nama Sekolah]
Mata Pelajaran    : ${mapel}
Kelas / Semester  : ${kelas} / ${semester}
Jenis Penilaian   : ${jenis}
Tahun Pelajaran   : 2024/2025
Materi            : ${materi}
Jumlah Soal PG    : ${jmlPG} soal
Jumlah Soal Uraian: ${jmlUraian} soal
Distribusi Level  : ${level}

PENTING: Buat kisi-kisi dalam format tabel dengan TEPAT 7 kolom dipisahkan tanda |
Format setiap baris: No | KD/CP | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal

Contoh format yang benar:
1 | Peserta didik dapat memahami sistem pencernaan | Sistem Pencernaan | Siswa dapat mengidentifikasi organ pencernaan manusia | C1-Mengingat | PG | 1
2 | Peserta didik dapat menganalisis fungsi organ | Fungsi Organ | Siswa dapat menjelaskan fungsi lambung dalam proses pencernaan | C2-Memahami | PG | 2

Ketentuan:
- Total baris = ${jmlPG+jmlUraian} (sesuai total soal)
- Soal nomor 1 sampai ${jmlPG} = Pilihan Ganda (PG)
- Soal nomor ${jmlPG+1} sampai ${jmlPG+jmlUraian} = Uraian
- Level kognitif format: C1-Mengingat / C2-Memahami / C3-Mengaplikasikan / C4-Menganalisis / C5-Mengevaluasi / C6-Mencipta
- Indikator soal harus operasional dan spesifik
- KD/CP harus sesuai ${mapel} ${kelas} Kurikulum Merdeka

Distribusi level untuk "${level}":
- Seimbang: C1(10%) C2(20%) C3(30%) C4(20%) C5(10%) C6(10%)
- Mudah dominan: C1(30%) C2(30%) C3(20%) C4(10%) C5(5%) C6(5%)
- Sedang dominan: C1(10%) C2(15%) C3(35%) C4(25%) C5(10%) C6(5%)
- HOTs dominan: C1(5%) C2(10%) C3(20%) C4(30%) C5(20%) C6(15%)

Setelah tabel, tambahkan:
REKAPITULASI
Total soal PG: ${jmlPG}
Total soal Uraian: ${jmlUraian}
Total seluruh soal: ${jmlPG+jmlUraian}
Distribusi level: [rinci per level berapa soal dan persentasenya]

Jangan tambahkan teks lain selain tabel dan rekapitulasi.`;

  const system = `Kamu pengembang instrumen penilaian pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat kisi-kisi format resmi dengan tabel yang KONSISTEN menggunakan pemisah | (garis tegak) untuk SETIAP baris. Setiap baris harus punya tepat 7 kolom. Tidak ada format Markdown lain.`;

  try {
    const result = await callAI(prompt, system);
    savedKisiKisi.teks = result;

    // Parse teks jadi rows
    const {rows, rekap} = parseKisiKisi(result);
    savedKisiKisi.rows = rows;

    resEl.dataset.raw = result;
    resEl.classList.add('show');

    // Render tabel HTML yang rapi
    const tabelHTML = renderTabelHTML(rows, {mapel, kelas, jenis, jmlPG, jmlUraian});

    // Parse rekap
    const rekapHTML = rekap ? `
      <div style="margin-top:1rem;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:1rem;">
        <div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:6px;">REKAPITULASI SOAL</div>
        <div style="font-size:12px;color:#1a1523;white-space:pre-wrap;line-height:1.7;">${esc(rekap.replace(/REKAPITULASI\n?/i,'').trim())}</div>
      </div>` : '';

    resEl.innerHTML = `
      <div class="result-label">📊 Kisi-Kisi Soal Resmi — ${jenis} ${mapel} ${kelas}</div>
      ${tabelHTML}
      ${rekapHTML}
      <div class="result-actions" style="margin-top:1rem;">
        <button class="btn-copy" onclick="copyResult('res-kisi',this)">📋 Salin Teks</button>
        <button class="btn-dl btn-dl-print" onclick="printKisiKisi()">🖨️ Print Tabel</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWordKisiKisi()">⬇ Word Tabel</button>
      </div>`;

    document.getElementById('soal-from-kisi-card').style.display='block';
    setAlurStep(3);
    useCredit();
  } catch(err) {
    resEl.classList.add('show');
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    setAlurStep(1);
  }
  setBtnLoading('btn-kisi',false,'Generate Kisi-Kisi Resmi','');
}

// Print kisi-kisi dengan tabel rapi
function printKisiKisi() {
  const {rows, mapel, kelas, jenis, jmlPG, jmlUraian} = savedKisiKisi;
  if (!rows.length) { alert('Generate kisi-kisi dulu!'); return; }
  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const w = window.open('','_blank');
  if (!w) { alert('Izinkan popup browser.'); return; }

  const levelColor = {'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'};
  const getLC = (l) => { for (const [k,v] of Object.entries(levelColor)) { if(l.includes(k)) return v; } return '#f5f3ff'; };

  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kisi-Kisi Soal</title>
    <style>
      body{font-family:'Times New Roman',serif;font-size:11pt;padding:1.5cm;color:#000;}
      h2{font-size:14pt;font-weight:700;text-align:center;margin-bottom:4px;}
      h3{font-size:12pt;font-weight:600;text-align:center;margin-bottom:16px;}
      table{width:100%;border-collapse:collapse;margin:12px 0;}
      th{background:#7c3aed;color:#fff;padding:7px 8px;font-size:9pt;font-weight:700;border:1px solid #5b21b6;text-align:center;}
      td{padding:6px 8px;border:1px solid #999;font-size:9pt;vertical-align:top;line-height:1.4;}
      tr:nth-child(even) td{background:#f9f9f9;}
      .no{text-align:center;font-weight:700;}.nomor{text-align:center;}
      .rekap{background:#f5f5f5;padding:10px;margin-top:12px;border:1px solid #ccc;border-radius:4px;}
      @media print{@page{margin:1.5cm;size:A4 landscape;}}
    </style></head><body>
    <h2>KISI-KISI SOAL</h2>
    <h3>${jenis} — ${mapel} — ${kelas}</h3>
    <p><strong>Tahun Pelajaran:</strong> 2024/2025 &nbsp;|&nbsp; <strong>Jumlah Soal:</strong> ${jmlPG} PG + ${jmlUraian} Uraian = ${jmlPG+jmlUraian} soal &nbsp;|&nbsp; <strong>Tanggal:</strong> ${today}</p>
    <table>
      <thead><tr>
        <th style="width:4%">No</th>
        <th style="width:22%">Kompetensi Dasar / CP</th>
        <th style="width:16%">Materi Pokok</th>
        <th style="width:30%">Indikator Soal</th>
        <th style="width:12%">Level Kognitif</th>
        <th style="width:8%">Bentuk Soal</th>
        <th style="width:8%">No. Soal</th>
      </tr></thead>
      <tbody>
        ${rows.map(r=>`<tr>
          <td class="no">${r.no}</td>
          <td>${r.kd}</td>
          <td>${r.materi}</td>
          <td>${r.indikator}</td>
          <td style="text-align:center;background:${getLC(r.level)};font-weight:600;">${r.level}</td>
          <td style="text-align:center;font-weight:600;">${r.bentuk||'PG'}</td>
          <td class="nomor">${r.nomor}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="rekap">
      <strong>Rekapitulasi:</strong> Total PG: ${jmlPG} soal | Total Uraian: ${jmlUraian} soal | Total: ${jmlPG+jmlUraian} soal
    </div>
    <br>
    <p style="font-size:9pt;text-align:center;color:#666;">Dibuat dengan Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024</p>
    </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

// Download Word dengan tabel rapi
async function downloadWordKisiKisi() {
  const {rows, mapel, kelas, jenis, semester, jmlPG, jmlUraian, teks} = savedKisiKisi;
  if (!rows.length) { alert('Generate kisi-kisi dulu!'); return; }
  if (!docxReady||typeof docx==='undefined') { alert('Library Word dimuat, tunggu 3 detik.'); return; }

  try {
    const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,BorderStyle,WidthType,ShadingType} = docx;
    const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

    const children = [];

    // Header
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'KISI-KISI SOAL',bold:true,size:32,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`${jenis} — ${mapel} — ${kelas}`,bold:true,size:26,font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`Tahun Pelajaran 2024/2025  |  ${jmlPG} PG + ${jmlUraian} Uraian  |  ${today}`,size:20,color:'555555',font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:300}}));

    // Info sekolah
    children.push(new Paragraph({children:[new TextRun({text:'Satuan Pendidikan : ___________________________   Mata Pelajaran : '+mapel,size:20,font:'Times New Roman'})],spacing:{before:100,after:80}}));
    children.push(new Paragraph({children:[new TextRun({text:'Kelas / Semester  : '+kelas+' / '+semester+'   Jumlah Soal     : '+jmlPG+' PG + '+jmlUraian+' Uraian = '+(jmlPG+jmlUraian)+' Soal',size:20,font:'Times New Roman'})],spacing:{after:200}}));

    // Buat tabel Word
    const headerRow = new TableRow({
      tableHeader:true,
      children:[
        new TableCell({width:{size:5,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'No',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
        new TableCell({width:{size:22,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({children:[new TextRun({text:'Kompetensi Dasar / CP',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
        new TableCell({width:{size:16,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({children:[new TextRun({text:'Materi Pokok',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
        new TableCell({width:{size:30,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({children:[new TextRun({text:'Indikator Soal',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
        new TableCell({width:{size:12,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Level Kognitif',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
        new TableCell({width:{size:8,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Bentuk',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
        new TableCell({width:{size:7,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'No. Soal',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})]}),
      ]
    });

    const levelColors = {'C1':'dbeafe','C2':'e0f2fe','C3':'d1fae5','C4':'fef3c7','C5':'fce7f3','C6':'f3e8ff'};
    const getLvlColor = (l) => { for (const [k,v] of Object.entries(levelColors)) { if(l.includes(k)) return v; } return 'f5f3ff'; };

    const dataRows = rows.map((r,i) => {
      const isEven = i%2===1;
      const bg = isEven ? 'fafaf9' : 'ffffff';
      const lvlBg = getLvlColor(r.level);
      return new TableRow({
        children:[
          new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.no,bold:true,size:18,color:'7c3aed',font:'Times New Roman'})]})]}),
          new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({children:[new TextRun({text:r.kd,size:18,font:'Times New Roman'})]})]}),
          new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({children:[new TextRun({text:r.materi,size:18,font:'Times New Roman'})]})]}),
          new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({children:[new TextRun({text:r.indikator,size:18,font:'Times New Roman'})]})]}),
          new TableCell({shading:{type:ShadingType.SOLID,color:lvlBg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.level,bold:true,size:16,font:'Times New Roman',color:'1a1523'})]})]}),
          new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.bentuk||'PG',bold:true,size:18,font:'Times New Roman',color:r.bentuk&&r.bentuk.toLowerCase().includes('ur')?'065f46':'1e40af'})]})]}),
          new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.nomor,bold:true,size:18,font:'Times New Roman'})]})]}),
        ]
      });
    });

    const table = new Table({
      width:{size:100,type:WidthType.PERCENTAGE},
      rows:[headerRow,...dataRows]
    });

    children.push(table);

    // Rekap
    children.push(new Paragraph({spacing:{before:300,after:100},children:[new TextRun({text:'Rekapitulasi Soal:',bold:true,size:20,font:'Times New Roman'})]}));
    children.push(new Paragraph({children:[new TextRun({text:`Total Soal PG: ${jmlPG} soal  |  Total Soal Uraian: ${jmlUraian} soal  |  Total Seluruh: ${jmlPG+jmlUraian} soal`,size:20,font:'Times New Roman'})],spacing:{after:200}}));

    // Tanda tangan
    children.push(new Paragraph({spacing:{before:300}}));
    children.push(new Paragraph({children:[new TextRun({text:'Mengetahui,                                              [Kota], '+today,size:20,font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({children:[new TextRun({text:'Kepala Sekolah,                                          Guru '+mapel+',',size:20,font:'Times New Roman'})],spacing:{after:300}}));
    children.push(new Paragraph({children:[new TextRun({text:'_______________________________                          _______________________________',size:20,font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({children:[new TextRun({text:'NIP. ___________________________                         NIP. ___________________________',size:20,font:'Times New Roman'})]}));

    children.push(new Paragraph({spacing:{before:400}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Dibuat dengan Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024 —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));

    const doc = new Document({
      styles:{default:{document:{run:{font:'Times New Roman',size:20}}}},
      sections:[{
        properties:{page:{
          size:{width:16838,height:11906}, // A4 landscape
          margin:{top:1440,right:1440,bottom:1440,left:1440}
        }},
        children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`KisiKisi_${mapel}_${kelas}_${Date.now()}.docx`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);

  } catch(e) { alert('Gagal download Word: '+e.message); console.error(e); }
}

// GENERATE SOAL DARI KISI-KISI
async function generateSoalDariKisi() {
  if (!canGenerate()) { alert('Kredit habis!'); goPage('upgrade'); return; }
  const {mapel,kelas,jenis,jmlPG,jmlUraian,teks} = savedKisiKisi;
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

Buat TEPAT ${jmlPG} soal Pilihan Ganda dan ${jmlUraian} soal Uraian sesuai kisi-kisi di atas.
Level kognitif setiap soal harus PERSIS sesuai kisi-kisi.
Setiap soal PG harus punya 4 opsi (A,B,C,D) dengan pengecoh masuk akal.

FORMAT OUTPUT:

SOAL PILIHAN GANDA

1. [soal sesuai indikator kisi-kisi] (Level: C1/C2/dst)
A. [opsi] B. [opsi] C. [opsi] D. [opsi]

[lanjut sampai soal ${jmlPG}]

SOAL URAIAN

${jmlPG+1}. [soal uraian sesuai kisi-kisi] (Level: C4/dst)
[lanjut sampai soal ${jmlPG+jmlUraian}]

KUNCI JAWABAN DAN PEMBAHASAN

PILIHAN GANDA:
1. Jawaban: [huruf] | Pembahasan: [penjelasan mengapa benar, mengapa opsi lain salah]
[dst]

URAIAN:
${jmlPG+1}. Kunci Jawaban: [jawaban lengkap ideal]
Pembahasan: [penjelasan detail]
Rubrik penilaian: Skor penuh jika..., Skor setengah jika..., Skor 0 jika...

PEDOMAN PENILAIAN:
PG: ${jmlPG} soal x [skor per soal] = [total]
Uraian: [rincian per soal]
Total maksimal: 100

Tidak ada simbol Markdown.`;

  const system = `Kamu ahli penyusunan soal evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal persis sesuai kisi-kisi, valid, berkualitas tinggi. Pembahasan mendidik. Tidak ada simbol Markdown.`;

  try {
    const result = await callAI(prompt, system, 4000);
    resEl.dataset.raw = result;
    resEl.classList.add('show');
    resEl.innerHTML = `
      <div class="result-label">✅ Soal + Kunci + Pembahasan (sesuai Kisi-Kisi)</div>
      <div style="font-size:13px;line-height:1.85;color:#1a1523;white-space:pre-wrap;">${esc(result)}</div>
      <div class="result-actions">
        <button class="btn-copy" onclick="copyResult('res-soal-kisi',this)">📋 Salin</button>
        <button class="btn-dl btn-dl-print" onclick="printResult('res-soal-kisi')">🖨️ Print Soal</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWord('res-soal-kisi','Soal')">⬇ Word Soal</button>
      </div>`;
    document.getElementById('download-gabungan-card').style.display='block';
    setAlurStep(4);
    useCredit();
  } catch(err) {
    resEl.classList.add('show');
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
  }
  btn.disabled=false;
  btn.textContent='✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
}

async function downloadWordGabungan() {
  const soalTeks = document.getElementById('res-soal-kisi')?.dataset.raw||'';
  await downloadKisiKisiDanSoal(soalTeks);
}

async function downloadKisiKisiDanSoal(soalTeks) {
  const {rows,mapel,kelas,jenis,jmlPG,jmlUraian} = savedKisiKisi;
  if (!docxReady||typeof docx==='undefined') { alert('Library Word dimuat, tunggu 3 detik.'); return; }

  try {
    const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,BorderStyle,WidthType,ShadingType} = docx;
    const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const children = [];

    // === HALAMAN KISI-KISI ===
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'KISI-KISI SOAL',bold:true,size:32,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`${jenis} — ${mapel} — ${kelas}  |  2024/2025`,bold:true,size:24,font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:240}}));

    // Tabel kisi-kisi
    const levelColors={'C1':'dbeafe','C2':'e0f2fe','C3':'d1fae5','C4':'fef3c7','C5':'fce7f3','C6':'f3e8ff'};
    const getLC=(l)=>{ for(const[k,v] of Object.entries(levelColors)){if(l.includes(k))return v;} return 'f5f3ff';};

    const headerRow = new TableRow({tableHeader:true,children:[
      new TableCell({width:{size:5,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'No',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
      new TableCell({width:{size:23,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({children:[new TextRun({text:'KD / CP',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
      new TableCell({width:{size:15,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({children:[new TextRun({text:'Materi Pokok',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
      new TableCell({width:{size:30,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({children:[new TextRun({text:'Indikator Soal',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
      new TableCell({width:{size:12,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Level',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
      new TableCell({width:{size:8,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Bentuk',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
      new TableCell({width:{size:7,type:WidthType.PERCENTAGE},shading:{type:ShadingType.SOLID,color:'7c3aed'},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'No',bold:true,size:18,color:'ffffff',font:'Times New Roman'})]})] }),
    ]});

    const dataRows = rows.map((r,i)=>{
      const bg=i%2===1?'fafaf9':'ffffff';
      return new TableRow({children:[
        new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.no,bold:true,size:18,color:'7c3aed',font:'Times New Roman'})]})] }),
        new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({children:[new TextRun({text:r.kd,size:18,font:'Times New Roman'})]})] }),
        new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({children:[new TextRun({text:r.materi,size:18,font:'Times New Roman'})]})] }),
        new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({children:[new TextRun({text:r.indikator,size:18,font:'Times New Roman'})]})] }),
        new TableCell({shading:{type:ShadingType.SOLID,color:getLC(r.level)},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.level,bold:true,size:16,font:'Times New Roman'})]})] }),
        new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.bentuk||'PG',bold:true,size:18,font:'Times New Roman'})]})] }),
        new TableCell({shading:{type:ShadingType.SOLID,color:bg},children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:r.nomor,bold:true,size:18,font:'Times New Roman'})]})] }),
      ]});
    });

    children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[headerRow,...dataRows]}));
    children.push(new Paragraph({spacing:{before:200}}));
    children.push(new Paragraph({children:[new TextRun({text:`Rekapitulasi: PG ${jmlPG} soal  |  Uraian ${jmlUraian} soal  |  Total ${jmlPG+jmlUraian} soal`,size:20,font:'Times New Roman'})],spacing:{after:100}}));

    // Pemisah halaman
    children.push(new Paragraph({pageBreakBefore:true}));

    // === HALAMAN SOAL ===
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'SOAL, KUNCI JAWABAN, DAN PEMBAHASAN',bold:true,size:28,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`${jenis} — ${mapel} — ${kelas}  |  ${today}`,size:22,font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:300}}));

    // Isi soal
    soalTeks.split('\n').forEach(line=>{
      if(!line.trim()){children.push(new Paragraph({spacing:{after:100}}));return;}
      const clean=line.trim();
      const isH=clean===clean.toUpperCase()&&clean.length>4&&/[A-Z]/.test(clean)&&!/^\d/.test(clean)&&!/^[A-D]\./.test(clean);
      children.push(new Paragraph({
        children:[new TextRun({text:clean,bold:isH,size:isH?24:22,font:'Times New Roman',color:isH?'3b0764':'1a1523'})],
        spacing:{before:isH?200:60,after:60}
      }));
    });

    children.push(new Paragraph({spacing:{before:400}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Dibuat dengan Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024 —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));

    const doc = new Document({
      styles:{default:{document:{run:{font:'Times New Roman',size:20}}}},
      sections:[{
        properties:{page:{size:{width:16838,height:11906},margin:{top:1440,right:1440,bottom:1440,left:1440}}},
        children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`KisiKisi_Soal_${mapel}_${Date.now()}.docx`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);

  } catch(e) { alert('Gagal download: '+e.message); console.error(e); }
}

function printGabungan() {
  printKisiKisi();
}

function copyGabungan(btn) {
  const k=savedKisiKisi.teks||'';
  const s=document.getElementById('res-soal-kisi')?.dataset.raw||'';
  navigator.clipboard.writeText(`KISI-KISI\n\n${k}\n\nSOAL\n\n${s}`).catch(()=>{});
  btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent='📋 Salin Semua';},2000);
}

// RPP
function getFase(kelas) {
  if(kelas.includes('Kelas 1')||kelas.includes('Kelas 2'))return'Fase A';
  if(kelas.includes('Kelas 3')||kelas.includes('Kelas 4'))return'Fase B';
  if(kelas.includes('Kelas 5')||kelas.includes('Kelas 6'))return'Fase C';
  if(kelas.includes('Kelas 7')||kelas.includes('Kelas 8')||kelas.includes('Kelas 9'))return'Fase D';
  if(kelas.includes('Kelas 10'))return'Fase E';
  return'Fase F';
}

const SYS_RPP=`Kamu pakar kurikulum Indonesia dari Asisten Guru by Mas Gema. ATURAN: Jangan gunakan simbol Markdown. Gunakan HURUF KAPITAL untuk judul bagian. Isi semua bagian dengan konten NYATA dan LENGKAP.
CP SK BSKAP 032/H/KR/2024:
Fase A(1-2 SD): BI: berkomunikasi dan bernalar. MTK: operasi bilangan cacah sampai 999. IPAS: kondisi lingkungan rumah dan sekolah.
Fase B(3-4 SD): BI: memahami dan menyampaikan pesan beragam media. MTK: bilangan cacah, pecahan, keliling luas. IPAS: perubahan wujud zat, keanekaragaman makhluk hidup.
Fase C(5-6 SD): BI: memahami dan mengolah berbagai tipe teks. MTK: bilangan desimal, negatif, pecahan, volume. IPA: sistem organ manusia, gaya energi. IPS: keragaman budaya Indonesia.
Fase D(7-9 SMP): BI: memahami dan mengevaluasi teks multimodal. MTK: relasi, fungsi, persamaan linear, SPLDV. IPA: sifat zat, sistem organ, homeostasis. IPS: kondisi geografis sosial-budaya Indonesia.
Fase E(10 SMA): BI: mengevaluasi dan mengkreasi informasi. MTK: eksponen, trigonometri, geometri, statistika. Fisika: vektor, kinematika. Kimia: fenomena kimia. Biologi: sains dalam kehidupan.
Fase F(11-12 SMA): BI: mengkreasi berbagai teks. MTK: limit, turunan, integral.`;

async function generateRPP() {
  if(!canGenerate()){alert('Kredit habis!');goPage('upgrade');return;}
  const mapel=document.getElementById('rpp-mapel').value||'IPA';
  const kelas=document.getElementById('rpp-kelas').value;
  const waktu=document.getElementById('rpp-waktu').value;
  const topik=document.getElementById('rpp-topik').value||'Sistem Pencernaan';
  const catatan=document.getElementById('rpp-tujuan').value;
  const fase=getFase(kelas);
  const resEl=document.getElementById('res-rpp');
  const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Membuat RPP & Kegiatan...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">30-40 detik</div></div>`;
  resEl.classList.add('show');
  setBtnLoading('btn-rpp',true,'Generate RPP Lengkap','Tahap 1/2: Membuat RPP...');

  const p1=`Buatkan MODUL AJAR Kurikulum Merdeka bagian INFORMASI UMUM dan KEGIATAN untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Fase: ${fase} | Topik: ${topik} | Waktu: ${waktu}
${catatan?'Catatan: '+catatan:''}

IDENTITAS MODUL
Nama Penyusun: (nama guru) | Institusi: (nama sekolah) | Tahun: 2024/2025
Mata Pelajaran: ${mapel} | Fase/Kelas: ${fase}/${kelas} | Topik: ${topik} | Waktu: ${waktu}
Referensi CP: SK BSKAP No. 032/H/KR/2024

CAPAIAN PEMBELAJARAN (CP) BERDASARKAN SK BSKAP 032/H/KR/2024
[Tulis narasi CP LENGKAP untuk ${mapel} ${fase} - minimal 3 paragraf NYATA sesuai kurikulum]

ELEMEN CP RELEVAN DENGAN TOPIK ${topik.toUpperCase()}: [tulis spesifik]
ALUR TUJUAN PEMBELAJARAN: [3-4 ATP urutan logis]
KOMPETENSI AWAL: [3 prasyarat]

PROFIL PELAJAR PANCASILA:
1. [Dimensi]: [implementasi konkret dalam pembelajaran ${topik}]
2. [Dimensi]: [implementasi] 3. [Dimensi]: [implementasi]

SARANA DAN PRASARANA: [lengkap]
MODEL DAN METODE: Model: [PBL/Discovery/Inquiry] | Metode: [...] | Pendekatan: Saintifik

TUJUAN PEMBELAJARAN:
1.(C1)[...] 2.(C2)[...] 3.(C3)[...] 4.(C4)[...]

PEMAHAMAN BERMAKNA: [manfaat nyata ${topik}]
PERTANYAAN PEMANTIK: 1.[...] 2.[...] 3.[...]

KEGIATAN PEMBUKA (15 menit) [detail apersepsi dialog, motivasi, tujuan]
KEGIATAN INTI (sesuai ${waktu})
Langkah 1-5: [Guru: [...] | Siswa: [...] untuk setiap langkah]
DIFERENSIASI: Sudah paham: [...] | Belum paham: [...]
KEGIATAN PENUTUP (15 menit) [refleksi 3 pertanyaan, exit ticket 2 soal+jawaban, tindak lanjut]`;

  let part1='';
  try { part1=await callAI(p1,SYS_RPP); }
  catch(err){ resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`; setBtnLoading('btn-rpp',false,'Generate RPP Lengkap',''); return; }

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Membuat Asesmen & Tanda Tangan...</div></div>`;
  setBtnLoading('btn-rpp',true,'Generate RPP Lengkap','Tahap 2/2: Membuat Asesmen...');

  const p2=`Buatkan BAGIAN ASESMEN LENGKAP untuk Modul Ajar ${mapel} ${kelas} ${fase} topik ${topik}. Isi NYATA dan LENGKAP. Tidak ada simbol Markdown.

ASESMEN
A. ASESMEN DIAGNOSTIK
Soal 1: [...] | Jawaban: [...] | Jika benar: [...] | Jika salah: [...]
Soal 2: [...] | Jawaban: [...] | Interpretasi: [...]

B. ASESMEN KOGNITIF - 5 SOAL URAIAN
SOAL 1 (C1) 15 poin: Soal:[...] | Kunci:[...] | Pembahasan:[...] | Rubrik:15/10/5/0
SOAL 2 (C2) 15 poin: Soal:[...] | Kunci:[...] | Pembahasan:[...] | Rubrik:15/10/5/0
SOAL 3 (C3) 20 poin: Soal:[...] | Kunci:[...] | Pembahasan:[...] | Rubrik:20/15/10/5/0
SOAL 4 (C4-HOTs) 25 poin: Soal:[berbasis kasus] | Kunci:[...] | Pembahasan:[...] | Rubrik:25/20/15/10/0
SOAL 5 (C5-HOTs) 25 poin: Soal:[evaluasi/solusi] | Kunci:[...] | Pembahasan:[...] | Rubrik:25/20/15/10/0

C. ASESMEN AFEKTIF - RUBRIK OBSERVASI SIKAP (Skala 1-4)
[5 aspek sesuai PPP dengan indikator dan deskripsi skor 4,3,2,1]
Rumus: (Total/20)x100 | Tabel rekapitulasi

D. ASESMEN PSIKOMOTORIK - RUBRIK KETERAMPILAN (Skala 1-4)
[5 aspek keterampilan dengan deskripsi skor 4,3,2,1]
Rumus: (Total/20)x100 | Tabel rekapitulasi

REKAPITULASI: NA=(Kognitif x 40%)+(Afektif x 30%)+(Psikomotorik x 30%) | KKM:75

E. REMEDIAL: 3 soal mudah dengan kunci dan pembahasan sederhana
F. PENGAYAAN: 1 soal HOTs C6 dengan panduan

G. REFLEKSI GURU: 4 pertanyaan refleksi

LEMBAR PENGESAHAN
Mengetahui,                              [Kota], ${today}
Kepala Sekolah,                          Guru ${mapel},


_______________________________          _______________________________
[Nama Kepala Sekolah]                    [Nama Guru]
NIP. ___________________________         NIP. ___________________________

Dibuat dengan: Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024`;

  let part2='';
  try { part2=await callAI(p2,SYS_RPP); }
  catch(err){ resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`; setBtnLoading('btn-rpp',false,'Generate RPP Lengkap',''); return; }

  showResult('res-rpp',part1+'\n\n'+part2);
  useCredit();
  setBtnLoading('btn-rpp',false,'Generate RPP Lengkap','');
}

async function generateAI(type) {
  if(!canGenerate()){alert('Kredit habis!');goPage('upgrade');return;}
  if(type==='rpp'){await generateRPP();return;}
  if(type==='medsos'){await generateMedsos();return;}

  const cfgs={
    soal:{btnId:'btn-soal',label:'Generate Soal + Kunci Jawaban',resId:'res-soal',
      getPrompt:()=>{
        const mapel=document.getElementById('soal-mapel').value||'IPA';
        const kelas=document.getElementById('soal-kelas').value;
        const jenis=document.getElementById('soal-jenis').value;
        const jumlah=document.getElementById('soal-jumlah').value;
        const topik=document.getElementById('soal-topik').value||'Sistem Pencernaan';
        const level=document.getElementById('soal-level').value;
        return `Buatkan ${jumlah} soal ${jenis} berkualitas untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB ada jawaban lengkap dan pembahasan. PG sertakan 4 opsi. Akhiri dengan KUNCI JAWABAN. Tidak ada simbol Markdown.`;
      },
      system:'Kamu ahli evaluasi pendidikan dari Asisten Guru by Mas Gema. Soal berkualitas, pembahasan mendidik. Tidak ada simbol Markdown.'
    },
    admin:{btnId:'btn-admin',label:'Buat Dokumen',resId:'res-admin',
      getPrompt:()=>`Buatkan ${document.getElementById('admin-jenis').value} profesional. Konteks: ${document.getElementById('admin-konteks').value||'umum'}. Format rapi, formal, siap digunakan. Tidak ada simbol Markdown.`,
      system:'Kamu asisten administrasi sekolah dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    },
    pkb:{btnId:'btn-pkb',label:'Generate Laporan PKB',resId:'res-pkb',
      getPrompt:()=>{
        const nama=document.getElementById('pkb-nama').value||'Guru';
        const mapel=document.getElementById('pkb-mapel').value||'Umum';
        const kegiatan=document.getElementById('pkb-kegiatan').value||'Pelatihan';
        const refleksi=document.getElementById('pkb-refleksi').value||'Bermanfaat';
        return `Buatkan Laporan PKB formal: Nama ${nama}, Mapel ${mapel}, Kegiatan ${kegiatan}, Refleksi ${refleksi}. Bagian: Pendahuluan, Pelaksanaan, Hasil & Manfaat, Refleksi & RTL, Penutup. Formal siap dilaporkan. Tidak ada simbol Markdown.`;
      },
      system:'Kamu asisten penulisan laporan dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    }
  };

  const cfg=cfgs[type];
  if(!cfg)return;
  setBtnLoading(cfg.btnId,true,cfg.label,'Generating...');
  const resEl=document.getElementById(cfg.resId);
  resEl.innerHTML=''; resEl.classList.remove('show');
  try{
    const result=await callAI(cfg.getPrompt(),cfg.system);
    showResult(cfg.resId,result);
    useCredit();
  }catch(err){
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }
  setBtnLoading(cfg.btnId,false,cfg.label,'');
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
  const prompt=`Buat konten ${platNama} untuk guru Indonesia:
Platform: ${platNama} | Jenis: ${jenis} | Topik: ${topik} | Mapel: ${mapel}
Tone: ${toneMap[tone]||tone} | Target: ${audiens||'guru Indonesia'}
Buat konten langsung bisa dicopy-paste. Sertakan: konten utama, tips posting optimal, 3 ide konten lanjutan, cara monetize. Tidak ada simbol Markdown berlebihan.`;
  try{
    const result=await callAI(prompt,'Kamu content strategist media sosial edukasi terbaik Indonesia dari Asisten Guru by Mas Gema. Konten viral, bermanfaat, siap pakai. Tidak ada simbol Markdown berlebihan.');
    showResult('res-medsos',result);
    useCredit();
  }catch(err){
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }
  btn.disabled=false;
  btn.innerHTML='✨ Generate Konten Medsos';
}

function esc(text){return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function renderDisplay(text){
  return esc(text)
    .replace(/^#{1,2}\s+(.+)$/gm,'<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid #ede9fe;padding-bottom:5px;">$1</div>')
    .replace(/^#{3,6}\s+(.+)$/gm,'<div style="font-size:13px;font-weight:600;color:#4a4458;margin:10px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^[-*]\s+(.+)$/gm,'<div style="margin:3px 0 3px 16px;">•&nbsp;$1</div>')
    .replace(/^-{3,}$/gm,'<hr style="border:none;border-top:1px solid #e8e4f0;margin:10px 0;">')
    .replace(/\n/g,'<br>');
}

function showResult(resId,text){
  const el=document.getElementById(resId);
  el.classList.add('show');
  el.dataset.raw=text;
  el.innerHTML=`
    <div class="result-label">Hasil</div>
    <div style="font-size:13px;line-height:1.85;color:#1a1523;">${renderDisplay(text)}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyResult('${resId}',this)">📋 Salin teks</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('${resId}')">🖨️ Print</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}','Dokumen')">⬇ Download Word</button>
    </div>`;
}

function copyResult(resId,btn){
  const raw=document.getElementById(resId)?.dataset.raw||'';
  navigator.clipboard.writeText(raw).catch(()=>{});
  const prev=btn.textContent;
  btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent=prev;},2000);
}

function printText(text){
  const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const w=window.open('','_blank');
  if(!w){alert('Izinkan popup browser.');return;}
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

function printResult(resId){printText(document.getElementById(resId)?.dataset.raw||'');}

async function downloadWordFromText(text,prefix='AsistenGuru_'){
  if(!docxReady||typeof docx==='undefined'){alert('Library Word dimuat, tunggu 3 detik.');return;}
  try{
    const{Document,Packer,Paragraph,TextRun,AlignmentType,BorderStyle}=docx;
    const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const children=[];
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'ASISTEN GURU BY MAS GEMA',bold:true,size:28,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:(currentUser?currentUser.name+'  |  ':'')+today,size:20,color:'555555',font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:400}}));
    text.split('\n').forEach(line=>{
      if(!line.trim()){children.push(new Paragraph({spacing:{after:120}}));return;}
      if(/^[=\-]{4,}$/.test(line.trim())){children.push(new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'e8e4f0',space:1}},spacing:{before:100,after:100}}));return;}
      const clean=line.trim();
      const isH=clean===clean.toUpperCase()&&clean.length>4&&/[A-Z]/.test(clean)&&!/^\d/.test(clean)&&!/^[A-D][\.|]/.test(clean)&&!/^(NIP|No\.)/.test(clean);
      children.push(new Paragraph({children:[new TextRun({text:clean,bold:isH,size:isH?24:22,font:'Times New Roman',color:isH?'3b0764':'1a1523'})],spacing:{before:isH?240:60,after:60}}));
    });
    children.push(new Paragraph({spacing:{before:480}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Asisten Guru by Mas Gema —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));
    const doc=new Document({styles:{default:{document:{run:{font:'Times New Roman',size:22}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:1440,right:1440,bottom:1440,left:1800}}},children}]});
    const blob=await Packer.toBlob(doc);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=prefix+Date.now()+'.docx';
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  }catch(e){alert('Gagal download Word: '+e.message);}
}

async function downloadWord(resId,label){
  const raw=document.getElementById(resId)?.dataset.raw||'';
  if(!raw){alert('Tidak ada konten.');return;}
  await downloadWordFromText(raw,label+'_AsistenGuru_');
}

(function init(){
  const session=getSession();
  if(session){const users=getUsers();const fresh=users.find(u=>u.email===session.email);enterApp(fresh||session);}
  const pd=document.getElementById('pay-date');
  if(pd) pd.value=new Date().toISOString().split('T')[0];
})();
