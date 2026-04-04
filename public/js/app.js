// ═══════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  app.js — Logic utama
// ═══════════════════════════════

const UK = 'ag_users_v1';
const SK = 'ag_session_v1';

// Endpoint API — otomatis pakai /api/chat di Vercel
const API_URL = '/api/chat';

let currentUser = null;

// ── STORAGE HELPERS ──
const getUsers = () => { try { return JSON.parse(localStorage.getItem(UK) || '[]'); } catch { return []; } };
const saveUsers = u => localStorage.setItem(UK, JSON.stringify(u));
const getSession = () => { try { return JSON.parse(localStorage.getItem(SK) || 'null'); } catch { return null; } };
const saveSession = s => localStorage.setItem(SK, JSON.stringify(s));
const clearSession = () => localStorage.removeItem(SK);

// ── AUTH ──
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
  document.getElementById('sb-role').textContent = 'Guru ' + user.jenjang;
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

// ── NAVIGATION ──
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

// ── AI GENERATE ──
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

async function callAPI(prompt, systemMsg) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemMsg || 'Kamu asisten AI guru Indonesia dari Asisten Guru by Mas Gema. Buat konten pendidikan sesuai standar Kemendikbud. Langsung ke isi tanpa perkenalan.',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'HTTP ' + res.status);
  return data?.content?.[0]?.text || '';
}

function setButtonLoading(btnId, loading, label) {
  const btn = document.getElementById(btnId);
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

  const configs = {
    rpp: {
      btnId: 'btn-rpp',
      label: 'Generate RPP',
      resId: 'res-rpp',
      getPrompt: () => {
        const mapel = document.getElementById('rpp-mapel').value || 'Matematika';
        const kelas = document.getElementById('rpp-kelas').value;
        const kur = document.getElementById('rpp-kur').value;
        const waktu = document.getElementById('rpp-waktu').value;
        const topik = document.getElementById('rpp-topik').value || 'Bilangan Bulat';
        const tujuan = document.getElementById('rpp-tujuan').value;
        return `Buatkan RPP ${kur} lengkap untuk:\n- Mata Pelajaran: ${mapel}\n- Kelas: ${kelas}\n- Topik: ${topik}\n- Alokasi Waktu: ${waktu}\n${tujuan ? '- Tujuan: ' + tujuan : ''}\nSertakan: Tujuan Pembelajaran, Profil Pelajar Pancasila, Kegiatan Pembuka-Inti-Penutup, dan Asesmen.`;
      }
    },
    soal: {
      btnId: 'btn-soal',
      label: 'Generate Soal + Kunci Jawaban',
      resId: 'res-soal',
      getPrompt: () => {
        const mapel = document.getElementById('soal-mapel').value || 'IPA';
        const kelas = document.getElementById('soal-kelas').value;
        const jenis = document.getElementById('soal-jenis').value;
        const jumlah = document.getElementById('soal-jumlah').value;
        const topik = document.getElementById('soal-topik').value || 'Sistem Pencernaan';
        const level = document.getElementById('soal-level').value;
        return `Buatkan ${jumlah} soal ${jenis} untuk:\n- Mata Pelajaran: ${mapel}\n- Kelas: ${kelas}\n- Topik: ${topik}\n- Tingkat kesulitan: ${level}\n\nSertakan kunci jawaban dan pembahasan singkat di akhir.`;
      }
    },
    admin: {
      btnId: 'btn-admin',
      label: 'Buat Dokumen',
      resId: 'res-admin',
      getPrompt: () => {
        const jenis = document.getElementById('admin-jenis').value;
        const konteks = document.getElementById('admin-konteks').value;
        return `Buatkan ${jenis} untuk guru Indonesia.\nKonteks: ${konteks || '(isi data yang relevan)'}\nBuat format rapi, formal, dan siap digunakan.`;
      }
    },
    pkb: {
      btnId: 'btn-pkb',
      label: 'Generate Laporan PKB',
      resId: 'res-pkb',
      getPrompt: () => {
        const nama = document.getElementById('pkb-nama').value || 'Guru';
        const mapel = document.getElementById('pkb-mapel').value || 'Umum';
        const kegiatan = document.getElementById('pkb-kegiatan').value || 'Pelatihan';
        const refleksi = document.getElementById('pkb-refleksi').value || 'Bermanfaat';
        return `Buatkan laporan PKB formal untuk:\n- Nama: ${nama}\n- Mapel: ${mapel}\n- Kegiatan: ${kegiatan}\n- Refleksi: ${refleksi}\nBuat narasi formal 3-4 paragraf siap dilaporkan ke sekolah.`;
      }
    }
  };

  const cfg = configs[type];
  if (!cfg) return;

  setButtonLoading(cfg.btnId, true, cfg.label);
  const resEl = document.getElementById(cfg.resId);
  resEl.innerHTML = '';
  resEl.classList.remove('show');

  try {
    const result = await callAPI(cfg.getPrompt());
    showResult(cfg.resId, result);
    useCredit();
  } catch (err) {
    resEl.innerHTML = `<div style="color:#dc2626;font-size:12px;">⚠️ Error: ${err.message}</div>`;
    resEl.classList.add('show');
  }

  setButtonLoading(cfg.btnId, false, cfg.label);
}

function showResult(resId, text) {
  const el = document.getElementById(resId);
  el.classList.add('show');
  el.innerHTML = `
    <div class="result-label">Hasil</div>
    <div class="result-text" id="${resId}-text">${text}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyText('${resId}-text', this)">📋 Salin teks</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('${resId}-text')">🖨️ Print</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}-text')">⬇ Download Word</button>
    </div>`;
}

function copyText(id, btn) {
  const text = document.getElementById(id)?.textContent || '';
  navigator.clipboard.writeText(text).catch(() => {});
  btn.textContent = '✓ Tersalin!';
  setTimeout(() => { btn.textContent = '📋 Salin teks'; }, 2000);
}

function printResult(id) {
  const text = document.getElementById(id)?.textContent || '';
  const user = currentUser;
  const printContent = `
    <html><head><title>Print — Asisten Guru</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2cm;color:#000;}
    .header{text-align:center;border-bottom:2pt solid #7c3aed;padding-bottom:10pt;margin-bottom:20pt;}
    .title{font-size:14pt;font-weight:700;}.sub{font-size:10pt;color:#666;margin-top:4pt;}
    .credit{font-size:8pt;color:#9333ea;margin-top:4pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.8;}
    @media print{@page{margin:2cm;}}</style></head>
    <body>
    <div class="header">
      <div class="title">Asisten Guru by Mas Gema</div>
      <div class="sub">${user ? user.name + ' | ' + new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : ''}</div>
      <div class="credit">Dibuat dengan Asisten Guru by Mas Gema</div>
    </div>
    <pre>${text}</pre>
    </body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(printContent);
    w.document.close();
    setTimeout(() => w.print(), 500);
  } else {
    // Fallback jika popup diblokir
    const d = document.createElement('div');
    d.id = 'print-only';
    d.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:9999;padding:2rem;font-family:serif;white-space:pre-wrap;overflow:auto;';
    d.innerHTML = `<button onclick="document.getElementById('print-only').remove()" style="margin-bottom:1rem;padding:6px 12px;cursor:pointer;">✕ Tutup</button><br>${text}`;
    document.body.appendChild(d);
    setTimeout(() => window.print(), 300);
    window.addEventListener('afterprint', () => document.getElementById('print-only')?.remove(), { once: true });
  }
}

async function downloadWord(id) {
  const text = document.getElementById(id)?.textContent || '';
  if (!text) return;
  try {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const children = [];

    // Header
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Asisten Guru by Mas Gema', bold: true, size: 28, color: '7c3aed', font: 'Times New Roman' })],
      spacing: { after: 60 }
    }));
    if (currentUser) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: currentUser.name + ' | ' + today, size: 20, color: '666666', font: 'Times New Roman' })],
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '7c3aed', space: 1 } },
        spacing: { after: 280 }
      }));
    }

    // Konten
    text.split('\n').forEach(line => {
      if (!line.trim()) { children.push(new Paragraph({ spacing: { before: 0, after: 80 } })); return; }
      const isBold = !!line.match(/^[A-Z\s]{4,}:|TUJUAN|KEGIATAN|ASESMEN|MATERI|SOAL \d+|KUNCI|JAWABAN|PEMBAHASAN/);
      children.push(new Paragraph({
        children: [new TextRun({ text: line, bold: isBold, size: 22, font: 'Times New Roman', color: isBold ? '7c3aed' : '1a1523' })],
        spacing: { before: isBold ? 160 : 40, after: 60 }
      }));
    });

    // Footer
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '— Dibuat dengan Asisten Guru by Mas Gema —', italics: true, size: 18, color: '9333ea', font: 'Times New Roman' })],
      spacing: { before: 480 }
    }));

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Times New Roman', size: 22 } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } },
        children
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Asisten_Guru_' + new Date().getTime() + '.docx';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
  } catch (e) {
    alert('Gagal download Word: ' + e.message);
  }
}

function hubungiAdmin() {
  alert('Hubungi Mas Gema untuk upgrade Premium!\n\nWhatsApp: (isi nomor WA kamu)\nInstagram: @(isi username kamu)');
}

// ── DOCX LIBRARY (load async) ──
const script = document.createElement('script');
script.src = 'https://unpkg.com/docx@8.5.0/build/index.js';
document.head.appendChild(script);

// ── AUTO LOGIN ──
(function init() {
  const session = getSession();
  if (session) {
    // Refresh data user dari storage
    const users = getUsers();
    const fresh = users.find(u => u.email === session.email);
    enterApp(fresh || session);
  }
})();
