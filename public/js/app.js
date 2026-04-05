// ASISTEN GURU BY MAS GEMA — Fixed & Complete Version

const API = '/api/chat';
let currentUser = null;
let docxReady = false;
let activePlatform = 'instagram';
let savedKisiKisi = { mapel:'', kelas:'', jenis:'', bentuk:'', materi:'', jmlPG:0, jmlUraian:0, level:'', teks:'', rows:[] };

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
  document.getElementById('form-login').style.display = t==='login'?'block':'none';
  document.getElementById('form-register').style.display = t==='register'?'block':'none';
  document.querySelectorAll('.atab').forEach((el,i) =>
    el.classList.toggle('active',(i===0&&t==='login')||(i===1&&t==='register'))
  );
}

function doLogin() {
  const email = document.getElementById('l-email').value.trim();
  const pass = document.getElementById('l-pass').value;
  const err = document.getElementById('l-err');
  if (!email||!pass) { err.textContent='Email dan password wajib diisi.'; return; }
  const user = getUsers().find(u=>u.email===email&&u.password===pass);
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
  chip.textContent = isPrem?'Premium ⭐':'Gratis';
  chip.className = 'plan-chip'+(isPrem?' premium':'');
  document.getElementById('sb-credit').textContent = isPrem?'∞':(currentUser.credits??5);
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
  rpp:{title:'📘 Generator Modul Ajar',sub:'Pembelajaran Mendalam — Mindful, Meaningful, Joyful + CP SK BSKAP 032/H/KR/2024'},
  kisi:{title:'📊 Kisi-Kisi → Soal Otomatis',sub:'Tabel resmi Kemendikbud — kisi-kisi jadi, soal tersambung otomatis!'},
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
      system:system||'Kamu asisten AI guru Indonesia dari Asisten Guru by Mas Gema.',
      messages:[{role:'user',content:prompt}]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message||data?.error||'API error '+res.status);
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error('Tidak ada hasil dari AI');
  return text;
}

function setPlatform(p) {
  activePlatform=p;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  const btn=document.getElementById('ptab-'+p);
  if(btn) btn.classList.add('active');
}

function submitPayment() {
  if (!currentUser) return;
  const [paket,price] = document.getElementById('pay-paket').value.split(':');
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
  const sl={pending:'⏳ Menunggu',verified:'✓ Terverifikasi',rejected:'✕ Ditolak'};
  el.innerHTML=txns.map(t=>`<div style="border:1px solid #e8e4f0;border-radius:10px;padding:.875rem;margin-bottom:.75rem;background:#fff;">
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

function esc(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ═══════════════════════════════════════
//  KISI-KISI GENERATOR
// ═══════════════════════════════════════
function setAlurStep(step) {
  for(let i=1;i<=4;i++){
    const el=document.getElementById('step-'+i);
    if(!el) continue;
    el.classList.remove('active','done');
    if(i<step) el.classList.add('done');
    else if(i===step) el.classList.add('active');
  }
}

function parseKisiKisi(text) {
  const lines = text.split('\n');
  const rows = [];
  let rekap = '';
  let inRekap = false;
  for (const line of lines) {
    if (/REKAPITULASI|REKAP/i.test(line)) { inRekap=true; }
    if (inRekap) { rekap+=line+'\n'; continue; }
    const trimmed = line.trim();
    if (!trimmed||/^[-=]+$/.test(trimmed)) continue;
    if (trimmed.includes('|')) {
      const cols = trimmed.split('|').map(c=>c.trim()).filter(c=>c);
      if (cols.length>=4) {
        if (/^no$/i.test(cols[0])||/kompetensi/i.test(cols[1])||/^-+$/.test(cols[0])) continue;
        rows.push({no:cols[0]||'',kd:cols[1]||'',materi:cols[2]||'',indikator:cols[3]||'',level:cols[4]||'',bentuk:cols[5]||'',nomor:cols[6]||''});
      }
    }
  }
  return {rows,rekap};
}

function renderTabelHTML(rows, info) {
  if (!rows.length) return `<div style="color:#7c7490;padding:1rem;">Tabel belum tersedia. Teks kisi-kisi tetap tersimpan untuk generate soal.</div>`;
  const lc={'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'};
  const getLC=(l)=>{ for(const[k,v] of Object.entries(lc)){if(l.includes(k))return v;} return '#f5f3ff';};
  return `<style>
    .kt{width:100%;border-collapse:collapse;font-size:11px;min-width:700px;}
    .kt th{background:#7c3aed;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;border:1px solid #5b21b6;}
    .kt td{padding:8px 10px;border:1px solid #e8e4f0;vertical-align:top;line-height:1.5;}
    .kt tr:nth-child(even) td{background:#fafaf9;}
    .kt tr:hover td{background:#f5f3ff;}
    .lb{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;}
  </style>
  <div style="background:#7c3aed;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;">
    📊 Kisi-Kisi — ${info.jenis} ${info.mapel} ${info.kelas} | ${info.jmlPG>0?info.jmlPG+' '+info.bentuk:''}${info.jmlUraian>0?' + '+info.jmlUraian+' Uraian':''}
  </div>
  <div style="overflow-x:auto;">
    <table class="kt">
      <thead><tr>
        <th style="width:4%">No</th>
        <th style="width:22%">KD / Capaian Pembelajaran</th>
        <th style="width:16%">Materi Pokok</th>
        <th style="width:30%">Indikator Soal</th>
        <th style="width:12%">Level Kognitif</th>
        <th style="width:9%">Bentuk Soal</th>
        <th style="width:7%">No. Soal</th>
      </tr></thead>
      <tbody>
        ${rows.map(r=>`<tr>
          <td style="text-align:center;font-weight:700;color:#7c3aed;">${r.no}</td>
          <td>${r.kd}</td><td>${r.materi}</td><td>${r.indikator}</td>
          <td style="text-align:center;"><span class="lb" style="background:${getLC(r.level)};color:#1a1523;">${r.level}</span></td>
          <td style="text-align:center;font-weight:600;color:${/uraian|esai/i.test(r.bentuk)?'#065f46':'#1e40af'};">${r.bentuk||'PG'}</td>
          <td style="text-align:center;font-weight:700;">${r.nomor}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

async function generateKisiKisi() {
  if (!canGenerate()) { alert('Kredit habis! Upgrade ke Premium.'); goPage('upgrade'); return; }

  const mapel = document.getElementById('kisi-mapel').value||'IPA';
  const kelas = document.getElementById('kisi-kelas').value;
  const jenis = document.getElementById('kisi-jenis').value;
  const bentuk = document.getElementById('kisi-bentuk').value;
  const semester = document.getElementById('kisi-semester').value;
  const materi = document.getElementById('kisi-materi').value||'Sistem Pencernaan';
  const jmlPG = parseInt(document.getElementById('kisi-jml-pg').value)||0;
  const jmlUraian = parseInt(document.getElementById('kisi-jml-uraian').value)||0;
  const level = document.getElementById('kisi-level').value;

  savedKisiKisi = {mapel,kelas,jenis,bentuk,materi,jmlPG,jmlUraian,level,teks:'',rows:[]};

  setBtnLoading('btn-kisi',true,'Generate Kisi-Kisi Tabel Resmi','Membuat kisi-kisi dalam tabel resmi...');
  const resEl = document.getElementById('res-kisi');
  resEl.innerHTML=''; resEl.classList.remove('show');
  document.getElementById('soal-from-kisi-card').style.display='none';
  document.getElementById('download-gabungan-card').style.display='none';
  setAlurStep(2);

  const total = jmlPG+jmlUraian;
  const prompt = `Buatkan KISI-KISI SOAL format resmi Kemendikbud untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Semester: ${semester}
Jenis Penilaian: ${jenis} | Jenis Soal: ${bentuk}
Materi: ${materi}
Jumlah PG: ${jmlPG} | Jumlah Uraian: ${jmlUraian} | Total: ${total}
Distribusi Level: ${level}

WAJIB: Buat dalam format tabel dengan TEPAT 7 kolom dipisah tanda |
Setiap baris data format: No | KD/CP | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal

Ketentuan:
- Total baris data = ${total} (1 baris per soal)
- Soal nomor 1-${jmlPG} = ${bentuk.includes('PG')||bentuk.includes('Pilihan')?'PG':bentuk}
- Soal nomor ${jmlPG+1}-${total} = Uraian (jika ada)
- Level: C1-Mengingat / C2-Memahami / C3-Mengaplikasikan / C4-Menganalisis / C5-Mengevaluasi / C6-Mencipta
- KD/CP harus sesuai ${mapel} ${kelas} Kurikulum Merdeka
- Indikator operasional: mulai kata kerja (mengidentifikasi/menjelaskan/menganalisis/dll)

Distribusi level "${level}":
Seimbang: 10%C1 20%C2 30%C3 20%C4 10%C5 10%C6
Mudah: 30%C1 30%C2 20%C3 10%C4 5%C5 5%C6
Sedang: 10%C1 15%C2 35%C3 25%C4 10%C5 5%C6
HOTs: 5%C1 10%C2 20%C3 30%C4 20%C5 15%C6

Setelah tabel tulis:
REKAPITULASI
Total PG: ${jmlPG} | Total Uraian: ${jmlUraian} | Total: ${total}
Distribusi level: [rinci per level]`;

  try {
    const result = await callAI(prompt, 'Kamu pengembang instrumen penilaian pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat kisi-kisi format resmi Kemendikbud. Setiap baris tabel harus konsisten 7 kolom dengan pemisah |. Tidak ada Markdown.');
    savedKisiKisi.teks = result;
    const {rows,rekap} = parseKisiKisi(result);
    savedKisiKisi.rows = rows;
    resEl.dataset.raw = result;
    resEl.classList.add('show');
    const tabelHTML = renderTabelHTML(rows, {mapel,kelas,jenis,bentuk,jmlPG,jmlUraian});
    const rekapHTML = rekap ? `<div style="margin-top:1rem;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:1rem;">
      <div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:6px;">REKAPITULASI SOAL</div>
      <div style="font-size:12px;color:#1a1523;white-space:pre-wrap;line-height:1.7;">${esc(rekap.replace(/REKAPITULASI\n?/i,'').trim())}</div>
    </div>` : '';
    resEl.innerHTML = `
      <div class="result-label">📊 Kisi-Kisi Soal — ${jenis} ${mapel} ${kelas}</div>
      ${tabelHTML}
      ${rekapHTML}
      <div class="result-actions" style="margin-top:1rem;">
        <button class="btn-copy" onclick="copyResult('res-kisi',this)">📋 Salin Teks</button>
        <button class="btn-dl btn-dl-print" onclick="printKisiKisi()">🖨️ Print Tabel</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWordKisiKisi()">⬇ Word Kisi-Kisi</button>
      </div>`;
    document.getElementById('soal-from-kisi-card').style.display='block';
    setAlurStep(3);
    useCredit();
  } catch(err) {
    resEl.classList.add('show');
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    setAlurStep(1);
  }
  setBtnLoading('btn-kisi',false,'Generate Kisi-Kisi Tabel Resmi','');
}

// ═══════════════════════════════════════
//  GENERATE SOAL DARI KISI-KISI
//  Dibagi 2 tahap jika total soal > 10
// ═══════════════════════════════════════
async function generateSoalDariKisi() {
  if (!canGenerate()) { alert('Kredit habis!'); goPage('upgrade'); return; }
  const {mapel,kelas,jenis,bentuk,jmlPG,jmlUraian,teks} = savedKisiKisi;
  if (!teks) { alert('Generate kisi-kisi dulu!'); return; }

  const btn = document.getElementById('btn-gen-soal-kisi');
  const resEl = document.getElementById('res-soal-kisi');
  btn.disabled=true;
  document.getElementById('download-gabungan-card').style.display='none';
  resEl.innerHTML=''; resEl.classList.remove('show');

  const total = jmlPG+jmlUraian;
  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const sysPrompt = `Kamu ahli penyusunan soal evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal persis sesuai kisi-kisi, valid, berkualitas. Pembahasan mendidik. Tidak ada simbol Markdown.`;

  const makePrompt = (soalMulai, soalAkhir, bagian, isFirst) => `
${isFirst ? `Kisi-kisi:\n${teks}\n\nInstruksi:` : `Lanjutan generate soal. Kisi-kisi sama.\nInstruksi:`}
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Penilaian: ${jenis} | Tanggal: ${today}

Buat soal NOMOR ${soalMulai} sampai ${soalAkhir} (total ${soalAkhir-soalMulai+1} soal).
Level kognitif setiap soal PERSIS sesuai kisi-kisi.
${soalMulai<=jmlPG ? `Nomor ${soalMulai}-${Math.min(soalAkhir,jmlPG)} adalah PG dengan 4 opsi (A,B,C,D).` : ''}
${soalAkhir>jmlPG && jmlUraian>0 ? `Nomor ${Math.max(soalMulai,jmlPG+1)}-${soalAkhir} adalah Uraian.` : ''}

Format output HARUS:

${soalMulai<=jmlPG && soalAkhir<=jmlPG ? 'SOAL PILIHAN GANDA' : soalMulai>jmlPG ? 'SOAL URAIAN' : 'SOAL PILIHAN GANDA'}

${soalMulai}. [soal sesuai kisi-kisi nomor ${soalMulai}]
${soalMulai<=jmlPG ? 'A. [opsi] B. [opsi] C. [opsi] D. [opsi]' : ''}
[lanjut sampai nomor ${soalAkhir}]

${soalAkhir>jmlPG && soalMulai<=jmlPG ? `\nSOAL URAIAN\n${jmlPG+1}. [soal uraian]\n[lanjut sampai nomor ${soalAkhir}]` : ''}

KUNCI JAWABAN DAN PEMBAHASAN SOAL ${soalMulai}-${soalAkhir}
${soalMulai<=jmlPG ? `PILIHAN GANDA:\n${soalMulai}. Jawaban: [huruf] | Pembahasan: [penjelasan]` : ''}
${soalAkhir>jmlPG ? `URAIAN:\n${Math.max(soalMulai,jmlPG+1)}. Kunci: [jawaban ideal]\nPembahasan: [detail]\nRubrik: [skor penuh jika..., skor sebagian jika...]` : ''}
[lanjut semua soal ${soalMulai}-${soalAkhir}]

Tidak ada simbol Markdown. Semua ${soalAkhir-soalMulai+1} soal HARUS ada kunci dan pembahasannya.`;

  let fullResult = '';

  if (total <= 10) {
    // Satu tahap
    btn.innerHTML='<div class="loading-dots"><span></span><span></span><span></span></div> Generating soal... (30-60 detik)';
    try {
      fullResult = await callAI(makePrompt(1, total, 'semua', true), sysPrompt, 4000);
      useCredit();
    } catch(err) {
      resEl.classList.add('show');
      resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
      btn.disabled=false;
      btn.textContent='✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
      return;
    }
  } else {
    // Dua tahap agar tidak terpotong
    const tengah = Math.ceil(total/2);

    // Tahap 1
    btn.innerHTML=`<div class="loading-dots"><span></span><span></span><span></span></div> Tahap 1/2: Membuat soal 1-${tengah}... (30-40 detik)`;
    resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:20px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Generating soal 1-${tengah}...</div></div>`;
    resEl.classList.add('show');

    let part1='';
    try {
      part1 = await callAI(makePrompt(1, tengah, 'bagian1', true), sysPrompt, 4000);
    } catch(err) {
      resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;
      btn.disabled=false;
      btn.textContent='✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
      return;
    }

    // Tahap 2
    btn.innerHTML=`<div class="loading-dots"><span></span><span></span><span></span></div> Tahap 2/2: Membuat soal ${tengah+1}-${total}... (30-40 detik)`;
    resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:20px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Generating soal ${tengah+1}-${total}...</div></div>`;

    let part2='';
    try {
      part2 = await callAI(makePrompt(tengah+1, total, 'bagian2', false), sysPrompt, 4000);
    } catch(err) {
      resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
      btn.disabled=false;
      btn.textContent='✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
      return;
    }

    fullResult = part1+'\n\n'+'='.repeat(50)+'\n\n'+part2;
    useCredit();
  }

  resEl.dataset.raw = fullResult;
  resEl.classList.add('show');
  resEl.innerHTML = `
    <div class="result-label">✅ Soal + Kunci + Pembahasan — Sesuai Kisi-Kisi (${total} soal lengkap)</div>
    <div style="font-size:13px;line-height:1.85;color:#1a1523;white-space:pre-wrap;">${esc(fullResult)}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyResult('res-soal-kisi',this)">📋 Salin</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('res-soal-kisi')">🖨️ Print Soal</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('res-soal-kisi','Soal')">⬇ Word Soal</button>
    </div>`;
  document.getElementById('download-gabungan-card').style.display='block';
  setAlurStep(4);

  btn.disabled=false;
  btn.textContent='✨ Generate Soal + Kunci + Pembahasan dari Kisi-Kisi Ini';
}

// Print kisi-kisi tabel
function printKisiKisi() {
  const {rows,mapel,kelas,jenis,jmlPG,jmlUraian} = savedKisiKisi;
  if (!rows.length) { printResult('res-kisi'); return; }
  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const w = window.open('','_blank');
  if (!w) { alert('Izinkan popup.'); return; }
  const lc={'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'};
  const getLC=(l)=>{ for(const[k,v] of Object.entries(lc)){if(l.includes(k))return v;} return '#f5f3ff';};
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kisi-Kisi Soal</title>
    <style>body{font-family:'Times New Roman',serif;font-size:10pt;padding:1cm 1.5cm;}
    h2,h3{text-align:center;margin:4px 0;}h2{font-size:13pt;color:#7c3aed;}h3{font-size:11pt;}
    table{width:100%;border-collapse:collapse;margin:10px 0;}
    th{background:#7c3aed;color:#fff;padding:6px 8px;border:1px solid #5b21b6;font-size:9pt;font-weight:700;}
    td{padding:5px 8px;border:1px solid #999;font-size:9pt;vertical-align:top;line-height:1.3;}
    tr:nth-child(even) td{background:#f9f9f9;}
    @media print{@page{margin:1cm;size:A4 landscape;}}</style></head><body>
    <h2>KISI-KISI SOAL</h2>
    <h3>${jenis} — ${mapel} — ${kelas}</h3>
    <p style="text-align:center;font-size:9pt;">Tahun 2024/2025 | ${jmlPG} PG + ${jmlUraian} Uraian = ${jmlPG+jmlUraian} soal | ${today}</p>
    <table>
      <thead><tr>
        <th style="width:4%">No</th><th style="width:22%">KD / Capaian Pembelajaran</th>
        <th style="width:16%">Materi Pokok</th><th style="width:30%">Indikator Soal</th>
        <th style="width:12%">Level Kognitif</th><th style="width:9%">Bentuk</th><th style="width:7%">No. Soal</th>
      </tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td style="text-align:center;font-weight:700;">${r.no}</td>
        <td>${r.kd}</td><td>${r.materi}</td><td>${r.indikator}</td>
        <td style="text-align:center;background:${getLC(r.level)};font-weight:700;">${r.level}</td>
        <td style="text-align:center;font-weight:700;">${r.bentuk||'PG'}</td>
        <td style="text-align:center;font-weight:700;">${r.nomor}</td>
      </tr>`).join('')}</tbody>
    </table>
    <p style="font-size:9pt;background:#f5f5f5;padding:6px;border:1px solid #ccc;">Rekapitulasi: PG ${jmlPG} soal | Uraian ${jmlUraian} soal | Total ${jmlPG+jmlUraian} soal</p>
    <p style="font-size:8pt;text-align:center;color:#666;margin-top:8px;">Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024</p>
    </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

async function downloadWordKisiKisi() {
  if (!savedKisiKisi.rows.length) { alert('Generate kisi-kisi dulu!'); return; }
  if (!docxReady||typeof docx==='undefined') { alert('Library Word dimuat, tunggu 3 detik.'); return; }
  const {rows,mapel,kelas,jenis,jmlPG,jmlUraian} = savedKisiKisi;
  try {
    const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,BorderStyle,WidthType,ShadingType} = docx;
    const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const children = [];
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'KISI-KISI SOAL',bold:true,size:32,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`${jenis} — ${mapel} — ${kelas} | 2024/2025 | ${jmlPG} PG + ${jmlUraian} Uraian`,bold:true,size:24,font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:240}}));

    const lc={'C1':'dbeafe','C2':'e0f2fe','C3':'d1fae5','C4':'fef3c7','C5':'fce7f3','C6':'f3e8ff'};
    const getLC=(l)=>{ for(const[k,v] of Object.entries(lc)){if(l.includes(k))return v;} return 'f5f3ff';};

    const mkCell=(text,opts={})=>new TableCell({
      width:opts.w?{size:opts.w,type:WidthType.PERCENTAGE}:undefined,
      shading:{type:ShadingType.SOLID,color:opts.bg||'ffffff'},
      children:[new Paragraph({alignment:opts.center?AlignmentType.CENTER:AlignmentType.LEFT,
        children:[new TextRun({text:String(text),bold:!!opts.bold,size:opts.size||18,color:opts.color||'1a1523',font:'Times New Roman'})]})]
    });

    const hRow = new TableRow({tableHeader:true,children:[
      mkCell('No',{w:4,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
      mkCell('KD / Capaian Pembelajaran',{w:22,bg:'7c3aed',bold:true,size:18,color:'ffffff'}),
      mkCell('Materi Pokok',{w:16,bg:'7c3aed',bold:true,size:18,color:'ffffff'}),
      mkCell('Indikator Soal',{w:30,bg:'7c3aed',bold:true,size:18,color:'ffffff'}),
      mkCell('Level Kognitif',{w:12,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
      mkCell('Bentuk',{w:9,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
      mkCell('No. Soal',{w:7,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
    ]});

    const dRows = rows.map((r,i)=>{
      const bg=i%2===1?'fafaf9':'ffffff';
      return new TableRow({children:[
        mkCell(r.no,{bg,bold:true,color:'7c3aed',center:true}),
        mkCell(r.kd,{bg}),
        mkCell(r.materi,{bg}),
        mkCell(r.indikator,{bg}),
        mkCell(r.level,{bg:getLC(r.level),bold:true,size:16,center:true}),
        mkCell(r.bentuk||'PG',{bg,bold:true,color:r.bentuk&&r.bentuk.toLowerCase().includes('ur')?'065f46':'1e40af',center:true}),
        mkCell(r.nomor,{bg,bold:true,center:true}),
      ]});
    });

    children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[hRow,...dRows]}));
    children.push(new Paragraph({spacing:{before:200},children:[new TextRun({text:`Rekapitulasi: PG ${jmlPG} soal | Uraian ${jmlUraian} soal | Total ${jmlPG+jmlUraian} soal`,size:20,font:'Times New Roman'})]}));
    children.push(new Paragraph({spacing:{before:300},children:[new TextRun({text:`Mengetahui,                                                        [Kota], ${today}`,size:20,font:'Times New Roman'})]}));
    children.push(new Paragraph({children:[new TextRun({text:'Kepala Sekolah,                                                    Guru '+mapel+',',size:20,font:'Times New Roman'})],spacing:{after:240}}));
    children.push(new Paragraph({children:[new TextRun({text:'_________________________________                                  _________________________________',size:20,font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({children:[new TextRun({text:'NIP. _____________________________                                 NIP. _____________________________',size:20,font:'Times New Roman'})]}));
    children.push(new Paragraph({spacing:{before:400},alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024 —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));

    const doc = new Document({styles:{default:{document:{run:{font:'Times New Roman',size:20}}}},sections:[{properties:{page:{size:{width:16838,height:11906},margin:{top:1200,right:1200,bottom:1200,left:1200}}},children}]});
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download=`KisiKisi_${mapel}_${Date.now()}.docx`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  } catch(e) { alert('Gagal download Word: '+e.message); console.error(e); }
}

async function downloadWordGabungan() {
  const soalTeks = document.getElementById('res-soal-kisi')?.dataset.raw||'';
  if (!soalTeks) { alert('Generate soal dulu!'); return; }
  await downloadWordFromText(
    `KISI-KISI SOAL\n${'='.repeat(60)}\n\n${savedKisiKisi.teks}\n\n${'='.repeat(60)}\nSOAL + KUNCI JAWABAN + PEMBAHASAN\n${'='.repeat(60)}\n\n${soalTeks}`,
    'KisiKisi_Soal_'
  );
}

function copyGabungan(btn) {
  const k=savedKisiKisi.teks||'';
  const s=document.getElementById('res-soal-kisi')?.dataset.raw||'';
  navigator.clipboard.writeText('KISI-KISI\n\n'+k+'\n\nSOAL\n\n'+s).catch(()=>{});
  btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent='📋 Salin Semua';},2000);
}

// ═══════════════════════════════════════
//  MODUL AJAR — PEMBELAJARAN MENDALAM
// ═══════════════════════════════════════
function getFase(kelas) {
  if(kelas.includes('Kelas 1')||kelas.includes('Kelas 2'))return'Fase A';
  if(kelas.includes('Kelas 3')||kelas.includes('Kelas 4'))return'Fase B';
  if(kelas.includes('Kelas 5')||kelas.includes('Kelas 6'))return'Fase C';
  if(kelas.includes('Kelas 7')||kelas.includes('Kelas 8')||kelas.includes('Kelas 9'))return'Fase D';
  if(kelas.includes('Kelas 10'))return'Fase E';
  return'Fase F';
}

const SYS_RPP=`Kamu pakar kurikulum Indonesia dari Asisten Guru by Mas Gema. ATURAN WAJIB: Jangan gunakan simbol Markdown (#,##,**,*,---). Gunakan HURUF KAPITAL untuk judul bagian. Isi semua bagian dengan konten NYATA dan LENGKAP.

KONSEP PEMBELAJARAN MENDALAM (Deep Learning):
- Mindful (Sadar): Pembelajaran yang penuh kesadaran, perhatian, dan refleksi. Siswa sadar apa yang dipelajari dan mengapa.
- Meaningful (Bermakna): Pembelajaran yang relevan dengan kehidupan nyata, bermakna, terhubung dengan pengalaman siswa.
- Joyful (Menyenangkan): Pembelajaran yang membangkitkan antusias, rasa ingin tahu, kreativitas, dan kegembiraan belajar.

Setiap kegiatan pembelajaran WAJIB diberi label dalam kurung: (Mindful), (Meaningful), atau (Joyful)

CP SK BSKAP 032/H/KR/2024:
Fase A(1-2 SD): BI: berkomunikasi dan bernalar tentang diri dan lingkungan. MTK: operasi bilangan cacah sampai 999. IPAS: mengidentifikasi kondisi lingkungan.
Fase B(3-4 SD): BI: memahami dan menyampaikan pesan beragam media. MTK: bilangan cacah, pecahan, keliling luas. IPAS: perubahan wujud zat, keanekaragaman makhluk hidup.
Fase C(5-6 SD): BI: memahami dan mengolah berbagai tipe teks. MTK: bilangan desimal, negatif, pecahan, volume. IPA: sistem organ manusia, gaya energi. IPS: keragaman budaya Indonesia.
Fase D(7-9 SMP): BI: memahami dan mengevaluasi teks multimodal. MTK: relasi, fungsi, persamaan linear, SPLDV. IPA: sifat zat, sistem organ, homeostasis. IPS: kondisi geografis dan sosial-budaya.
Fase E(10 SMA): BI: mengevaluasi dan mengkreasi informasi. MTK: eksponen, trigonometri, statistika. Fisika: vektor, kinematika. Kimia: fenomena kimia. Biologi: sains dalam kehidupan.
Fase F(11-12 SMA): BI: mengkreasi berbagai teks. MTK: limit, turunan, integral.`;

async function generateRPP() {
  if (!canGenerate()) { alert('Kredit habis! Upgrade ke Premium.'); goPage('upgrade'); return; }

  const sekolah = document.getElementById('rpp-sekolah').value||'[Nama Sekolah]';
  const tahun = document.getElementById('rpp-tahun').value||'2024/2025';
  const guru = document.getElementById('rpp-guru').value||'[Nama Guru]';
  const kepsek = document.getElementById('rpp-kepsek').value||'[Nama Kepala Sekolah]';
  const mapel = document.getElementById('rpp-mapel').value||'IPA';
  const kelas = document.getElementById('rpp-kelas').value;
  const waktu = document.getElementById('rpp-waktu').value;
  const semester = document.getElementById('rpp-semester').value;
  const topik = document.getElementById('rpp-topik').value||'Sistem Pencernaan Manusia';
  const catatan = document.getElementById('rpp-tujuan').value;
  const fase = getFase(kelas);
  const resEl = document.getElementById('res-rpp');
  const today = new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Membuat Modul Ajar & Kegiatan Pembelajaran...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">30-40 detik</div></div>`;
  resEl.classList.add('show');
  setBtnLoading('btn-rpp',true,'Generate Modul Ajar Lengkap','Tahap 1/2: Membuat Modul Ajar...');

  const p1=`Buatkan MODUL AJAR dengan PEMBELAJARAN MENDALAM (Deep Learning) untuk:
Sekolah      : ${sekolah}
Guru         : ${guru}
Kepala Sek.  : ${kepsek}
Tahun        : ${tahun}
Semester     : ${semester}
Mapel        : ${mapel}
Kelas/Fase   : ${kelas} / ${fase}
Topik        : ${topik}
Waktu        : ${waktu}
${catatan?'Catatan: '+catatan:''}

IDENTITAS MODUL AJAR
Satuan Pendidikan  : ${sekolah}
Mata Pelajaran     : ${mapel}
Fase / Kelas       : ${fase} / ${kelas}
Semester           : ${semester}
Tahun Pelajaran    : ${tahun}
Topik / Materi     : ${topik}
Alokasi Waktu      : ${waktu}
Nama Penyusun      : ${guru}
Referensi CP       : SK BSKAP No. 032/H/KR/2024

CAPAIAN PEMBELAJARAN (CP) BERDASARKAN SK BSKAP 032/H/KR/2024
[Tulis narasi CP LENGKAP dan SESUNGGUHNYA untuk ${mapel} ${fase} minimal 3 paragraf sesuai database CP]

ELEMEN CP RELEVAN DENGAN TOPIK ${topik.toUpperCase()}:
[Tulis elemen CP spesifik yang berkaitan langsung dengan ${topik}]

ALUR TUJUAN PEMBELAJARAN (ATP):
[Tulis 3-4 ATP urutan logis dari CP ke tujuan pembelajaran spesifik]

KOMPETENSI AWAL PESERTA DIDIK:
[Tulis 3 pengetahuan/keterampilan prasyarat]

PROFIL PELAJAR PANCASILA:
1. [Dimensi]: [implementasi konkret dalam pembelajaran ${topik} — tuliskan aktivitas spesifik]
2. [Dimensi]: [implementasi konkret]
3. [Dimensi]: [implementasi konkret]

SARANA DAN PRASARANA:
Ruangan   : [jenis ruangan]
Media     : [media pembelajaran]
Alat/Bahan: [daftar lengkap]
Sumber    : [buku, website, video]

MODEL DAN METODE PEMBELAJARAN:
Model       : [PBL/Discovery Learning/Inquiry/PjBL — pilih yang sesuai]
Metode      : [diskusi, demonstrasi, tanya jawab, dll]
Pendekatan  : Pembelajaran Mendalam (Mindful, Meaningful, Joyful) + Saintifik + Diferensiasi

TUJUAN PEMBELAJARAN:
Berdasarkan CP ${fase} ${mapel}, setelah mengikuti pembelajaran ini peserta didik mampu:
1. (C1) [...] dengan [...] melalui [...]
2. (C2) [...] dengan [...] melalui [...]
3. (C3) [...] dengan [...] melalui [...]
4. (C4) [...] dengan [...] melalui [...]

PEMAHAMAN BERMAKNA (Meaningful):
[2-3 kalimat: apa manfaat nyata ${topik} dalam kehidupan siswa sehari-hari — buat konkret dan relevan]

PERTANYAAN PEMANTIK:
1. [Pertanyaan berbasis pengalaman siswa terkait ${topik}] (Joyful)
2. [Pertanyaan berbasis fenomena nyata] (Mindful)
3. [Pertanyaan HOTs yang merangsang berpikir kritis] (Meaningful)

KEGIATAN PEMBELAJARAN

KEGIATAN PEMBUKA (15 menit)
1. Membuka kelas: salam, doa, dan presensi (Mindful)
2. Apersepsi: [cerita/pertanyaan konkret yang menghubungkan pengalaman siswa dengan ${topik}. Tulis dialog guru-siswa] (Meaningful)
3. Motivasi: [cara guru membangkitkan semangat belajar dengan menunjukkan manfaat nyata ${topik}] (Joyful)
4. Menyampaikan tujuan dan alur pembelajaran (Mindful)
5. Pertanyaan pemantik: [sampaikan pertanyaan pemantik dan respon yang diharapkan] (Mindful)

KEGIATAN INTI (sesuai ${waktu})
Tuliskan minimal 6 langkah pembelajaran DETAIL dengan label (Mindful), (Meaningful), atau (Joyful):

Langkah 1 - [Nama Tahap] (... menit) (Mindful/Meaningful/Joyful)
Kegiatan Guru : [detail kegiatan guru secara konkret]
Kegiatan Siswa: [detail kegiatan siswa secara konkret]
Pertanyaan    : [contoh pertanyaan yang dilontarkan guru]

Langkah 2 - [Nama Tahap] (... menit) (Mindful/Meaningful/Joyful)
[dst sampai langkah 6]

DIFERENSIASI PEMBELAJARAN:
Siswa sudah paham    : [kegiatan pengayaan saat inti — lebih menantang] (Meaningful)
Siswa belum paham    : [scaffolding dan pendampingan intensif] (Mindful)
Gaya belajar visual  : [adaptasi untuk visual learner] (Joyful)
Gaya belajar kinestetik: [adaptasi untuk kinestetik learner] (Joyful)

KEGIATAN PENUTUP (15 menit)
1. Refleksi bersama — siswa menjawab: (Mindful)
   a. Apa yang paling bermakna dari pembelajaran hari ini?
   b. Apa yang masih ingin kamu ketahui lebih lanjut?
   c. Bagaimana kamu akan menerapkan pengetahuan ini?
2. Penguatan dan klarifikasi konsep kunci oleh guru (Meaningful)
3. Exit ticket — 2 soal singkat beserta jawaban: (Mindful)
   Soal 1: [...] | Jawaban: [...]
   Soal 2: [...] | Jawaban: [...]
4. Tindak lanjut: [PR atau persiapan pertemuan berikutnya] (Meaningful)
5. Doa dan salam penutup (Mindful)`;

  let part1='';
  try { part1=await callAI(p1,SYS_RPP,4000); }
  catch(err){
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;
    setBtnLoading('btn-rpp',false,'Generate Modul Ajar Lengkap','');
    return;
  }

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Membuat Asesmen, Rubrik & Tanda Tangan...</div></div>`;
  setBtnLoading('btn-rpp',true,'Generate Modul Ajar Lengkap','Tahap 2/2: Membuat Asesmen...');

  const p2=`Buatkan BAGIAN ASESMEN LENGKAP untuk Modul Ajar ${mapel} ${kelas} ${fase} topik ${topik}. Isi NYATA, LENGKAP, tanpa simbol Markdown. Label setiap asesmen dengan (Mindful), (Meaningful), atau (Joyful).

ASESMEN

A. ASESMEN DIAGNOSTIK (Mindful — sebelum pembelajaran)
Tujuan: Memetakan kemampuan awal dan gaya belajar siswa
Soal 1: [pertanyaan pengetahuan dasar ${topik}]
Jawaban: [...] | Jika benar: [siswa siap, lanjut] | Jika salah: [perlu penguatan prasyarat]
Soal 2: [pertanyaan pengalaman sehari-hari terkait ${topik}]
Jawaban: [...] | Interpretasi: [cara menyesuaikan pembelajaran]
Soal 3: [pertanyaan minat/harapan siswa tentang ${topik}] (Joyful)
Interpretasi: [cara memanfaatkan hasil untuk desain pembelajaran]

B. ASESMEN FORMATIF — KOGNITIF (Meaningful — 5 Soal Uraian)
Teknik: Tes uraian | Waktu: 30 menit | Total: 100 poin

SOAL 1 (C1-Mengingat) — 15 poin
Soal: [soal uraian menguji hapalan konsep ${topik}]
Kunci Jawaban: [jawaban lengkap dan detail minimal 4 kalimat]
Pembahasan: [penjelasan konsep yang mudah dipahami]
Rubrik: 15 (lengkap tepat) | 10 (sebagian benar) | 5 (dasar) | 0 (salah)

SOAL 2 (C2-Memahami) — 15 poin
Soal: [soal menguji pemahaman — jelaskan dengan kata sendiri]
Kunci Jawaban: [jawaban lengkap]
Pembahasan: [penjelasan detail konsep]
Rubrik: 15 (jelas, contoh tepat) | 10 (cukup) | 5 (menghapal) | 0 (salah)

SOAL 3 (C3-Mengaplikasikan) — 20 poin
Soal: [soal berbasis situasi nyata — terapkan konsep ${topik}]
Kunci Jawaban: [jawaban langkah demi langkah]
Pembahasan: [cara penerapan konsep]
Rubrik: 20 (tepat, langkah benar) | 15 (tepat, sedikit kurang) | 10 (konsep benar) | 5 (ada upaya) | 0 (tidak menjawab)

SOAL 4 (C4-Menganalisis/HOTs) — 25 poin
Soal: [soal berbasis kasus/fenomena nyata kehidupan — analisis mendalam ${topik}]
Kunci Jawaban: [jawaban analitis dengan argumen logis]
Pembahasan: [proses berpikir analitis langkah demi langkah]
Rubrik: 25 (mendalam, semua aspek, berbasis fakta) | 20 (baik) | 15 (cukup) | 10 (deskriptif) | 0 (tidak ada upaya)

SOAL 5 (C5-Mengevaluasi/HOTs) — 25 poin
Soal: [evaluasi/keputusan/solusi masalah nyata terkait ${topik}]
Kunci Jawaban: [jawaban evaluatif dengan kriteria yang jelas]
Pembahasan: [kriteria evaluasi dan alasan solusi terbaik]
Rubrik: 25 (tepat, kriteria jelas, bukti, inovatif) | 20 (baik) | 15 (cukup) | 10 (tanpa kriteria) | 0 (tidak menjawab)

Pedoman Nilai Kognitif: A (91-100) B (81-90) C (71-80) D (61-70) E (<61/Remedial)

C. ASESMEN FORMATIF — AFEKTIF (Mindful — Rubrik Observasi Sikap)
Teknik: Observasi guru selama pembelajaran | Skala: 1-4

RUBRIK PENILAIAN SIKAP:

Aspek 1: [Dimensi PPP 1 relevan dengan ${topik}]
Indikator: [perilaku konkret yang diamati]
4 (Sangat Baik) : [selalu konsisten, jadi teladan — deskripsi spesifik]
3 (Baik)        : [sering muncul, sesekali perlu pengingat]
2 (Cukup)       : [kadang-kadang, perlu dorongan]
1 (Kurang)      : [jarang, perlu bimbingan intensif]

Aspek 2: [Dimensi PPP 2]
4: [...] | 3: [...] | 2: [...] | 1: [...]

Aspek 3: Gotong Royong — Kerjasama Kelompok (Joyful)
Indikator: Aktif berkontribusi dan menghargai pendapat teman dalam diskusi ${topik}
4: Selalu aktif memimpin diskusi, menghargai semua pendapat, mencari solusi bersama
3: Sering aktif, menghargai pendapat, sesekali perlu diingatkan
2: Ikut serta tapi belum konsisten, kadang mendominasi atau pasif
1: Pasif, tidak menghargai pendapat teman

Aspek 4: Mandiri — Kemandirian Belajar (Mindful)
4: Selalu berinisiatif, mengerjakan mandiri, membantu teman
3: Sering mandiri, bertanya hanya jika perlu
2: Masih sering bergantung, perlu dorongan
1: Selalu bergantung, tidak mau mencoba sendiri

Aspek 5: Bernalar Kritis (Meaningful)
4: Selalu mengajukan pertanyaan tajam, argumen berbasis bukti
3: Sering bernalar kritis, argumen cukup berdasar
2: Kadang bertanya, sebagian argumen berdasar pendapat
1: Jarang bertanya, menerima informasi apa adanya

Rumus: (Total Skor / 20) x 100
Kriteria: A-Sangat Baik (91-100) | B-Baik (81-90) | C-Cukup (71-80) | D-Kurang (<71)

Lembar Rekapitulasi Afektif:
No | Nama Siswa | Asp.1/4 | Asp.2/4 | Asp.3/4 | Asp.4/4 | Asp.5/4 | Total/20 | Nilai | Predikat
1  | .......... |         |         |         |         |         |          |       |
(dst)

D. ASESMEN FORMATIF — PSIKOMOTORIK (Joyful — Rubrik Keterampilan)
Teknik: Observasi unjuk kerja dan penilaian produk | Skala: 1-4

RUBRIK PENILAIAN KETERAMPILAN:

Aspek 1: [Keterampilan utama terkait ${topik}]
Indikator: [kinerja konkret yang diamati]
4 (Sangat Terampil): [akurat, efisien, kreatif, mandiri — deskripsi spesifik]
3 (Terampil)       : [sebagian besar benar, sedikit bantuan]
2 (Cukup Terampil) : [perlu beberapa koreksi, butuh bimbingan]
1 (Perlu Bimbingan): [banyak kesalahan, butuh pendampingan penuh]

Aspek 2: [Keterampilan teknis 2 terkait ${topik}]
4: [...] | 3: [...] | 2: [...] | 1: [...]

Aspek 3: Keterampilan Analisis dalam Praktik (Meaningful)
4: Mampu identifikasi masalah, analisis, dan buat solusi tepat secara mandiri
3: Mampu analisis dengan panduan minimal
2: Mampu ikuti langkah tapi perlu banyak bimbingan
1: Belum mampu analisis, hanya ikuti instruksi dasar

Aspek 4: Presentasi dan Komunikasi Hasil (Joyful)
4: Sangat jelas, sistematis, percaya diri, media efektif, mampu jawab pertanyaan
3: Jelas, sistematis, cukup percaya diri
2: Cukup jelas tapi kurang sistematis
1: Kurang jelas, tidak sistematis, tidak percaya diri

Aspek 5: Kreativitas dan Inovasi (Joyful)
4: Hasil kerja sangat kreatif, inovatif, melampaui ekspektasi
3: Ada unsur kreativitas, cukup baik
2: Cukup standar, sedikit variasi
1: Tidak ada kreativitas, sangat standar

Rumus: (Total Skor / 20) x 100
Kriteria: A-Sangat Terampil (91-100) | B-Terampil (81-90) | C-Cukup (71-80) | D-Perlu Bimbingan (<71)

Lembar Rekapitulasi Psikomotorik:
No | Nama Siswa | Asp.1/4 | Asp.2/4 | Asp.3/4 | Asp.4/4 | Asp.5/4 | Total/20 | Nilai | Predikat
1  | .......... |         |         |         |         |         |          |       |
(dst)

REKAPITULASI NILAI AKHIR:
Komponen          | Bobot | Nilai | Tertimbang
Kognitif (Uraian) | 40%   |  ...  |  ...
Afektif (Sikap)   | 30%   |  ...  |  ...
Psikomotorik      | 30%   |  ...  |  ...
NILAI AKHIR       | 100%  |       | = (Kog x 0,4) + (Afk x 0,3) + (Psi x 0,3)
KKM               : 75

E. PROGRAM REMEDIAL — Mindful (Nilai Akhir < 75)
Pendekatan: Pembelajaran ulang dengan metode dan media berbeda
Soal R1 (C1-mudah): [...] | Kunci: [...] | Pembahasan sederhana: [...]
Soal R2 (C2-mudah): [...] | Kunci: [...] | Pembahasan: [...]
Soal R3 (C3-mudah): [...] | Kunci: [...] | Pembahasan: [...]

F. PROGRAM PENGAYAAN — Meaningful (Nilai Akhir >= 80)
Soal P1 (C6-Kreasi): [Rancang/ciptakan sesuatu terkait ${topik}]
Panduan: [...] | Proses kreatif yang diharapkan: [...]
Referensi lanjutan: [buku/website/video untuk eksplorasi mandiri]

G. REFLEKSI GURU — Mindful
1. Apakah pendekatan Mindful, Meaningful, dan Joyful berjalan dengan baik? Buktinya?
2. Kegiatan pembelajaran mana yang paling membangkitkan antusias siswa?
3. Kendala apa yang muncul dan bagaimana solusinya ke depan?
4. Modifikasi apa yang akan dilakukan untuk pembelajaran berikutnya?
5. Siswa mana yang perlu perhatian khusus dan intervensi seperti apa?

LEMBAR PENGESAHAN

${today}

Mengetahui,                              ${today}
Kepala ${sekolah},                       Guru ${mapel},




_________________________________        _________________________________
${kepsek}                                ${guru}
NIP. ____________________________        NIP. ____________________________

Catatan Kepala Sekolah:
...........................................................................
...........................................................................

Dibuat dengan: Asisten Guru by Mas Gema
Berdasarkan  : SK BSKAP No. 032/H/KR/2024 — Kurikulum Merdeka ${tahun}`;

  let part2='';
  try { part2=await callAI(p2,SYS_RPP,4000); }
  catch(err){
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
    setBtnLoading('btn-rpp',false,'Generate Modul Ajar Lengkap','');
    return;
  }

  showResult('res-rpp',part1+'\n\n'+part2);
  useCredit();
  setBtnLoading('btn-rpp',false,'Generate Modul Ajar Lengkap','');
}

// GENERATE AI LAINNYA
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
        return `Buatkan ${jumlah} soal ${jenis} berkualitas untuk ${mapel} ${kelas} topik ${topik} tingkat ${level}. Setiap soal WAJIB ada jawaban lengkap dan pembahasan detail. PG sertakan 4 opsi pengecoh masuk akal. Tulis Soal 1, Soal 2 dst. Akhiri dengan KUNCI JAWABAN lengkap. Tidak ada simbol Markdown.`;
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
  const pn={instagram:'Instagram',tiktok:'TikTok',youtube:'YouTube',twitter:'Twitter/X',whatsapp:'WhatsApp'}[activePlatform]||'Instagram';
  const tm={'Santai & Friendly':'santai dan akrab','Inspiratif & Motivasi':'inspiratif dan memotivasi','Profesional & Edukatif':'profesional namun mudah dipahami','Lucu & Relatable':'humoris dan relatable','Storytelling':'bercerita yang mengalir'};
  const prompt=`Buat konten ${pn} untuk guru Indonesia:
Platform: ${pn} | Jenis: ${jenis} | Topik: ${topik} | Mapel: ${mapel}
Tone: ${tm[tone]||tone} | Target: ${audiens||'guru Indonesia'}
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

// DISPLAY & EXPORT
function renderDisplay(text){
  return esc(text)
    .replace(/^#{1,2}\s+(.+)$/gm,'<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 6px;text-transform:uppercase;border-bottom:2px solid #ede9fe;padding-bottom:5px;">$1</div>')
    .replace(/^#{3,6}\s+(.+)$/gm,'<div style="font-size:13px;font-weight:600;color:#4a4458;margin:10px 0 4px;">$1</div>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/\(Mindful\)/g,'<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:4px;">Mindful</span>')
    .replace(/\(Meaningful\)/g,'<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:4px;">Meaningful</span>')
    .replace(/\(Joyful\)/g,'<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:4px;">Joyful</span>')
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
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Modul Ajar</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:10pt;margin-bottom:20pt;}
    .ht{font-size:15pt;font-weight:700;color:#7c3aed;}.hs{font-size:10pt;color:#555;margin-top:4pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">MODUL AJAR — ASISTEN GURU BY MAS GEMA</div>
    <div class="hs">${today} | SK BSKAP No. 032/H/KR/2024 | Pembelajaran Mendalam</div></div>
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
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'MODUL AJAR — ASISTEN GURU BY MAS GEMA',bold:true,size:28,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Pembelajaran Mendalam (Mindful · Meaningful · Joyful)',size:22,color:'5b21b6',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:today+' | SK BSKAP No. 032/H/KR/2024 | Kurikulum Merdeka',size:18,color:'555555',font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:400}}));

    text.split('\n').forEach(line=>{
      if(!line.trim()){children.push(new Paragraph({spacing:{after:120}}));return;}
      if(/^[=\-]{4,}$/.test(line.trim())){children.push(new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'e8e4f0',space:1}},spacing:{before:100,after:100}}));return;}
      const clean=line.trim();
      const isMindful=clean.includes('(Mindful)');
      const isMeaningful=clean.includes('(Meaningful)');
      const isJoyful=clean.includes('(Joyful)');
      const cleanText=clean.replace(/\((Mindful|Meaningful|Joyful)\)/g,'[$1]');
      const isH=clean===clean.toUpperCase()&&clean.length>4&&/[A-Z]/.test(clean)&&!/^\d/.test(clean)&&!/^[A-D][\.|]/.test(clean)&&!/^(NIP|No\.)/.test(clean);
      const clr=isH?'3b0764':isMindful?'1e40af':isMeaningful?'065f46':isJoyful?'92400e':'1a1523';
      children.push(new Paragraph({children:[new TextRun({text:cleanText,bold:isH,size:isH?24:22,font:'Times New Roman',color:clr})],spacing:{before:isH?240:60,after:60}}));
    });

    children.push(new Paragraph({spacing:{before:480}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Dibuat dengan Asisten Guru by Mas Gema | SK BSKAP No. 032/H/KR/2024 —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));

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
