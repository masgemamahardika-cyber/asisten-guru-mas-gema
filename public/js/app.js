// ASISTEN GURU BY MAS GEMA — Format Modul Ajar PPG

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
  const email=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  const err=document.getElementById('l-err');
  if(!email||!pass){err.textContent='Email dan password wajib diisi.';return;}
  const user=getUsers().find(u=>u.email===email&&u.password===pass);
  if(!user){err.textContent='Email atau password salah.';return;}
  err.textContent=''; saveSession(user); enterApp(user);
}
function doRegister() {
  const name=document.getElementById('r-name').value.trim();
  const email=document.getElementById('r-email').value.trim();
  const jenjang=document.getElementById('r-jenjang').value;
  const pass=document.getElementById('r-pass').value;
  const err=document.getElementById('r-err');
  const ok=document.getElementById('r-ok');
  err.textContent=''; ok.textContent='';
  if(!name||!email||!pass){err.textContent='Semua field wajib diisi.';return;}
  if(pass.length<6){err.textContent='Password minimal 6 karakter.';return;}
  const users=getUsers();
  if(users.find(u=>u.email===email)){err.textContent='Email sudah terdaftar.';return;}
  const user={name,email,jenjang,password:pass,plan:'gratis',credits:5,totalGen:0};
  users.push(user); saveUsers(users);
  ok.textContent='✓ Berhasil daftar! Silakan masuk.';
  setTimeout(()=>authTab('login'),1500);
}
function enterApp(user) {
  currentUser=user;
  const av=user.name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  document.getElementById('sb-av').textContent=av;
  document.getElementById('sb-name').textContent=user.name;
  document.getElementById('sb-role').textContent='Guru '+(user.jenjang||'');
  document.getElementById('wb-greeting').textContent='Halo, '+user.name.split(' ')[0]+'! 👋';
  updatePlanUI();
  document.getElementById('auth-screen').style.display='none';
  document.getElementById('app-screen').style.display='flex';
  goPage('dashboard');
  const pd=document.getElementById('pay-date');
  if(pd) pd.value=new Date().toISOString().split('T')[0];
}
function doLogout() {
  clearSession(); currentUser=null;
  document.getElementById('app-screen').style.display='none';
  document.getElementById('auth-screen').style.display='block';
}
function updatePlanUI() {
  if(!currentUser) return;
  const isPrem=currentUser.plan==='premium'||currentUser.plan==='tahunan';
  const chip=document.getElementById('sb-plan');
  chip.textContent=isPrem?'Premium ⭐':'Gratis';
  chip.className='plan-chip'+(isPrem?' premium':'');
  document.getElementById('sb-credit').textContent=isPrem?'∞':(currentUser.credits??5);
}
function saveUserData() {
  if(!currentUser) return;
  const users=getUsers();
  const i=users.findIndex(u=>u.email===currentUser.email);
  if(i>-1){users[i]={...users[i],...currentUser};saveUsers(users);saveSession(users[i]);}
}
function useCredit() {
  if(!currentUser) return;
  const isPrem=currentUser.plan==='premium'||currentUser.plan==='tahunan';
  if(!isPrem) currentUser.credits=Math.max(0,(currentUser.credits??5)-1);
  currentUser.totalGen=(currentUser.totalGen||0)+1;
  saveUserData(); updatePlanUI();
}

const PAGE_INFO = {
  dashboard:{title:'Beranda',sub:'Selamat datang di Asisten Guru by Mas Gema'},
  rpp:{title:'📘 Generator Modul Ajar',sub:'Format PPG — Pembelajaran Mendalam (Mindful, Meaningful, Joyful)'},
  kisi:{title:'📊 Kisi-Kisi → Soal Otomatis',sub:'Tabel resmi Kemendikbud — kisi-kisi jadi, soal tersambung!'},
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
  const page=document.getElementById('page-'+id);
  if(page) page.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  [...document.querySelectorAll('.nav-item')].find(n=>n.getAttribute('onclick')===`goPage('${id}')`)?.classList.add('active');
  const info=PAGE_INFO[id]||{};
  document.getElementById('tb-title').textContent=info.title||id;
  document.getElementById('tb-sub').textContent=info.sub||'';
  if(id==='riwayat') loadRiwayat();
}
function canGenerate() {
  if(!currentUser) return false;
  if(currentUser.plan==='premium'||currentUser.plan==='tahunan') return true;
  return (currentUser.credits??5)>0;
}
async function callAI(prompt, system, maxTokens=4000) {
  const res=await fetch(API,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:maxTokens,system:system||'Kamu asisten AI guru Indonesia.',messages:[{role:'user',content:prompt}]})
  });
  const data=await res.json();
  if(!res.ok) throw new Error(data?.error?.message||data?.error||'API error '+res.status);
  const text=data?.content?.[0]?.text;
  if(!text) throw new Error('Tidak ada hasil dari AI');
  return text;
}
function setPlatform(p) {
  activePlatform=p;
  document.querySelectorAll('.ptab').forEach(t=>t.classList.remove('active'));
  const btn=document.getElementById('ptab-'+p);
  if(btn) btn.classList.add('active');
}
function submitPayment() {
  if(!currentUser) return;
  const [paket,price]=document.getElementById('pay-paket').value.split(':');
  const sender=document.getElementById('pay-sender').value.trim();
  const date=document.getElementById('pay-date').value;
  const ok=document.getElementById('pay-ok');
  const err=document.getElementById('pay-err');
  ok.textContent=''; err.textContent='';
  if(!sender){err.textContent='Nama pengirim wajib diisi.';return;}
  const txns=JSON.parse(localStorage.getItem('ag_txns_'+currentUser.email)||'[]');
  txns.unshift({paket,price,sender_name:sender,transfer_date:date,status:'pending',created_at:new Date().toISOString()});
  localStorage.setItem('ag_txns_'+currentUser.email,JSON.stringify(txns));
  ok.textContent='✓ Konfirmasi tersimpan! Hubungi Mas Gema untuk verifikasi.';
}
function loadRiwayat() {
  if(!currentUser) return;
  const el=document.getElementById('riwayat-list');
  const txns=JSON.parse(localStorage.getItem('ag_txns_'+currentUser.email)||'[]');
  if(!txns.length){el.textContent='Belum ada riwayat pembayaran.';return;}
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
function setBtnLoading(btnId,loading,label,msg) {
  const btn=document.getElementById(btnId);
  if(!btn) return;
  btn.disabled=loading;
  btn.innerHTML=loading?`<div class="loading-dots"><span></span><span></span><span></span></div> ${msg||'Generating...'}`:`▶ ${label}`;
}
function esc(t){return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ═══════════════════════════════════════
//  MODUL AJAR — FORMAT PPG MAS GEMA
// ═══════════════════════════════════════
function getFase(kelas) {
  if(kelas.includes('Kelas 1')||kelas.includes('Kelas 2')) return 'Fase A';
  if(kelas.includes('Kelas 3')||kelas.includes('Kelas 4')) return 'Fase B';
  if(kelas.includes('Kelas 5')||kelas.includes('Kelas 6')) return 'Fase C';
  if(kelas.includes('Kelas 7')||kelas.includes('Kelas 8')||kelas.includes('Kelas 9')) return 'Fase D';
  if(kelas.includes('Kelas 10')) return 'Fase E';
  return 'Fase F';
}
function getKelasRomawi(kelas) {
  const map={'Kelas 1 SD':'I','Kelas 2 SD':'II','Kelas 3 SD':'III','Kelas 4 SD':'IV','Kelas 5 SD':'V','Kelas 6 SD':'VI','Kelas 7 SMP':'VII','Kelas 8 SMP':'VIII','Kelas 9 SMP':'IX','Kelas 10 SMA':'X','Kelas 11 SMA':'XI','Kelas 12 SMA':'XII'};
  return map[kelas]||kelas;
}

const SYS_RPP = `Kamu pakar kurikulum dan penyusun Modul Ajar PPG Indonesia dari Asisten Guru by Mas Gema.
ATURAN WAJIB:
1. Jangan gunakan simbol Markdown (#, ##, **, *, ---)
2. Ikuti FORMAT PERSIS seperti instruksi
3. Setiap kegiatan pembelajaran WAJIB diberi label: (Mindful learning / Berkesadaran) atau (Meaningful Learning) atau (Joyful Learning)
4. Isi semua bagian dengan konten NYATA, SPESIFIK, dan LENGKAP sesuai topik
5. Tujuan pembelajaran menggunakan format: C4/C5/C6 = Dengan [media/metode] peserta didik dapat [kata kerja operasional] [objek] dengan [kriteria keberhasilan]
6. Sintak kegiatan inti WAJIB mengikuti model yang dipilih (PjBL/PBL/Discovery Learning)`;

async function generateRPP() {
  if(!canGenerate()){alert('Kredit habis! Upgrade ke Premium.');goPage('upgrade');return;}

  const sekolah=document.getElementById('rpp-sekolah').value||'[Nama Sekolah]';
  const tahun=document.getElementById('rpp-tahun').value||'2024/2025';
  const guru=document.getElementById('rpp-guru').value||'[Nama Guru]';
  const kepsek=document.getElementById('rpp-kepsek').value||'[Nama Kepala Sekolah]';
  const mapel=document.getElementById('rpp-mapel').value||'IPA';
  const kelas=document.getElementById('rpp-kelas').value;
  const waktu=document.getElementById('rpp-waktu').value;
  const semester=document.getElementById('rpp-semester').value;
  const topik=document.getElementById('rpp-topik').value||'Sistem Pencernaan Manusia';
  const catatan=document.getElementById('rpp-tujuan').value;
  const fase=getFase(kelas);
  const kelasRomawi=getKelasRomawi(kelas);
  const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const resEl=document.getElementById('res-rpp');

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Membuat Identitas, CP, Tujuan & Kegiatan Pembelajaran...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">30-45 detik</div></div>`;
  resEl.classList.add('show');
  setBtnLoading('btn-rpp',true,'Generate Modul Ajar Lengkap','Tahap 1/2: Membuat Modul Ajar...');

  // PROMPT TAHAP 1: Identitas s/d Kegiatan Pembelajaran
  const p1=`Buatkan MODUL AJAR PPG format resmi untuk:
Nama Penyusun   : ${guru}
Nama Sekolah    : ${sekolah}
Tahun Pelajaran : ${tahun}
Fase/Kelas      : ${fase}/${kelasRomawi}
Semester        : ${semester}
Mata Pelajaran  : ${mapel}
Materi Ajar     : ${topik}
Waktu Pelaksanaan: ${today}
Alokasi Waktu   : ${waktu}
${catatan?'Catatan khusus: '+catatan:''}

Ikuti FORMAT PERSIS berikut (tanpa simbol Markdown, tanpa bullet *, tanpa #):

MODUL AJAR PPG

Nama Penyusun     : ${guru}
Nama Sekolah      : ${sekolah}
Tahun Pelajaran   : ${tahun}
Fase/Kelas        : ${fase}/${kelasRomawi}
Semester          : ${semester}
Mata Pelajaran    : ${mapel}
Materi Ajar       : ${topik}
Waktu Pelaksanaan : ${today}
Alokasi Waktu     : ${waktu}

A. Capaian Pembelajaran
[Tulis narasi CP LENGKAP dan NYATA dari SK BSKAP 032/H/KR/2024 untuk ${mapel} ${fase}. Minimal 2 paragraf. Tebalkan bagian yang relevan dengan ${topik} menggunakan HURUF KAPITAL saja, bukan bold. Contoh format: "...fenomena gelombang bunyi dan CAHAYA DALAM KEHIDUPAN SEHARI-HARI; upaya..."]

B. Tujuan Pembelajaran

Ranah Pengetahuan
C4 = Dengan [media pembelajaran] peserta didik dapat menganalisis [aspek ${topik} yang dianalisis] dengan tepat.
C5 = Dengan [media pembelajaran] peserta didik dapat mengevaluasi [aspek ${topik} yang dievaluasi] dengan benar.
C6 = Dengan [metode] peserta didik dapat merancang [produk/karya terkait ${topik}].

Ranah Keterampilan Pemecahan Masalah
1. Peserta didik mampu mengidentifikasi permasalahan di lingkungan sekitar yang berkaitan dengan ${topik} secara optimal.
2. Peserta didik mampu merumuskan solusi kreatif atas permasalahan terkait ${topik} dengan tepat.

C. Indikator yang Disusun Berdasar Penggalan CP
1. [Indikator operasional 1 — menganalisis sesuai C4]
2. [Indikator operasional 2 — merancang sesuai C6]

D. Kompetensi Awal
1. [Pengetahuan prasyarat 1 yang sudah dimiliki siswa tentang ${topik}]
2. [Pengetahuan prasyarat 2]
3. [Pengetahuan prasyarat 3]

E. Profil Pelajar Pancasila

1. Mandiri:
[Deskripsi konkret implementasi mandiri dalam pembelajaran ${topik}]

2. Bernalar kritis:
[Deskripsi konkret implementasi bernalar kritis dalam pembelajaran ${topik}]

3. Kreatif:
[Deskripsi konkret implementasi kreatif dalam pembelajaran ${topik}]

F. Sarana dan Prasarana
Media    = [media pembelajaran yang spesifik dan relevan dengan ${topik}]
Alat     = [alat yang dibutuhkan]
Bahan    = [bahan yang dibutuhkan]

G. Model Pembelajaran
Pendekatan = Deep Learning
Model      = Project Based Learning (PjBL)
Metode     = Ceramah, diskusi, penugasan dan tanya jawab

H. Pemahaman Bermakna
Pemahaman bermakna ini dirancang agar:
1. [Poin 1: kesadaran siswa tentang manfaat nyata ${topik} dalam kehidupan]
2. [Poin 2: sikap tanggung jawab terkait ${topik}]
3. [Poin 3: relevansi pembelajaran dengan kehidupan nyata dan masa depan]

I. Kegiatan Pembelajaran

Kegiatan Pendahuluan (10 menit)
- Guru membuka pembelajaran dengan salam dan menanyakan kabar peserta didik. Guru menyampaikan bahwa hari ini mereka akan belajar tentang "${topik}". (Mindful learning / Berkesadaran)
- Guru menampilkan [media apersepsi spesifik terkait ${topik}] untuk membangun konteks. Setelah itu, guru mengajukan pertanyaan pemantik: "[Pertanyaan pemantik 1 berbasis pengalaman nyata siswa tentang ${topik}]?" dan "[Pertanyaan pemantik 2 tentang dampak/masalah terkait ${topik}]?" (Pembangunan Persepsi/Apersepsi)
- Guru mengajak peserta didik secara berpasangan untuk berdiskusi: "[Pertanyaan refleksi awal 1 tentang pengalaman siswa dengan ${topik}]?" dan "[Pertanyaan refleksi awal 2 tentang ide solusi siswa]?" Beberapa siswa diminta menyampaikan hasil diskusi secara lisan. (Refleksi Awal dan Diskusi Singkat)
- Guru menyampaikan tujuan pembelajaran dan menghubungkannya dengan peran peserta didik sebagai pelajar Pancasila yang mandiri, kritis, dan kreatif. (Penguatan Tujuan Pembelajaran)

Kegiatan Inti

Sintak 1 Penentuan Pertanyaan Mendasar (Driving Question)
- Guru mengajukan pertanyaan mendasar: "[Pertanyaan driving question yang relevan dengan ${topik} dan kehidupan nyata siswa]?"
- Diskusi kelas dibuka untuk menggali ide dari siswa.
- Guru membimbing siswa agar memahami bahwa ${topik} bukan sekadar teori, tetapi memiliki dampak nyata bagi kehidupan dan lingkungan sekitar. (Meaningful Learning)

Sintak 2 Mendesain Perencanaan Proyek
- Siswa dibagi dalam kelompok (3-5 orang per kelompok).
- Guru menjelaskan bahwa setiap kelompok akan membuat proyek [nama proyek spesifik terkait ${topik}] bertema: "[Tema proyek yang relevan dengan ${topik}]". Setiap kelompok menyusun rencana: apa bentuk proyeknya, siapa targetnya, apa pesannya, media apa yang digunakan. (Joyful Learning)

Sintak 3 Menyusun Jadwal Pelaksanaan Proyek
- Guru memandu siswa menyusun jadwal kerja proyek: kapan membuat konsep, kapan mengerjakan, kapan menyusun pesan, kapan presentasi.
- Siswa diarahkan membagi tugas sesuai kemampuan dan tanggung jawab masing-masing.

Sintak 4 Memonitoring Kegiatan dan Progres
- Guru berkeliling dari satu kelompok ke kelompok lain untuk melihat perkembangan, memberikan pertanyaan pemandu, dan mendorong kolaborasi.
- Siswa melanjutkan penyusunan dan pembuatan proyek secara aktif.

Sintak 5 Menguji Hasil Proyek
- Setiap kelompok mempresentasikan proyek mereka di depan kelas.
- Kelompok lain memberikan apresiasi dan pertanyaan.
- Guru memberi umpan balik konstruktif berdasarkan rubrik.
- Aspek rubrik: relevansi pesan, orisinalitas, dampak yang ingin dicapai, kerja sama tim.

Sintak 6 Evaluasi Proyek dan Refleksi Pengalaman
- Guru mengajak siswa menulis refleksi singkat: apa yang dipelajari, tantangan yang dihadapi, dampak dari proyek terhadap diri dan orang lain.
- Diskusi reflektif secara terbuka untuk berbagi pengalaman antar kelompok.

Kegiatan Penutup

Refleksi Tertulis Individu
Guru membagikan lembar refleksi berisi pertanyaan pemandu:
- Apa hal paling bermakna yang kamu pelajari dari kegiatan hari ini?
- Apa tantangan yang kamu alami selama membuat proyek?
- Bagaimana kamu akan menerapkan pengetahuan tentang ${topik} dalam kehidupan sehari-hari?
- Bagaimana peranmu dalam kelompok dan apa yang bisa kamu tingkatkan?

Refleksi Kelompok
Guru mengajak siswa berdiskusi kembali dalam kelompok:
- Apakah kalian saling membantu dan membagi peran dengan adil?
- Apa kekuatan kelompok kalian dan apa yang masih bisa diperbaiki?

Koneksi Pembelajaran dengan Kehidupan Nyata
Guru memandu diskusi terbuka dengan pertanyaan:
- [Pertanyaan koneksi 1 terkait pentingnya ${topik} dalam kehidupan]?
- [Pertanyaan koneksi 2 tentang dampak jika tidak memahami ${topik}]?
- Bagaimana pembelajaran ini membantu kita menjadi warga yang lebih baik?

Apresiasi dan Penguatan Nilai Positif
- Guru memberikan apresiasi kepada semua kelompok atas proses, semangat, dan ide kreatif mereka.
- Guru menyampaikan penguatan nilai: "[Kutipan atau pesan inspiratif yang relevan dengan ${topik}]."
- Guru menekankan bahwa setiap tindakan kecil yang sadar dan bijak dapat berdampak besar di masa depan.

Perencanaan Tindak Lanjut
Guru menugaskan siswa secara bermakna:
"Selama satu minggu ke depan, coba kamu amati dan catat: [tugas observasi konkret terkait ${topik} dalam kehidupan sehari-hari]."
Tugas ini akan menjadi bahan sharing minggu depan.

J. Asesmen

Penilaian Sikap
- Teknik penilaian  : Observasi selama kegiatan
- Instrumen Penilaian: Rubrik Penilaian

Penilaian Pengetahuan
- Teknik penilaian  : Tes Tertulis
- Instrumen Penilaian: Lembar Asesmen

Penilaian Keterampilan
- Teknik penilaian  : Penampilan saat presentasi hasil produk
- Instrumen Penilaian: Rubrik Penilaian

K. Pengayaan dan Remedial

Kegiatan Pengayaan
Sasaran: Peserta didik yang telah mencapai tujuan pembelajaran dengan cepat dan menunjukkan pemahaman tinggi.
Tujuan : Memberikan kesempatan kepada siswa untuk berpikir lebih kritis dan kreatif, serta mengembangkan kompetensi lebih lanjut.
Durasi : Fleksibel (bisa dalam jam pelajaran atau sebagai tugas mandiri/literasi)

Kegiatan Remedial
Sasaran: Peserta didik yang belum mencapai Kriteria Ketuntasan Tujuan Pembelajaran (KKTP).
Tujuan : Membantu siswa memahami kembali konsep dasar secara bertahap dan kontekstual.
Durasi : Bisa dalam jam pelajaran tambahan, jam kelas, atau bimbingan kecil.`;

  let part1='';
  try { part1=await callAI(p1,SYS_RPP,4000); }
  catch(err){
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;
    setBtnLoading('btn-rpp',false,'Generate Modul Ajar Lengkap','');
    return;
  }

  resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:24px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Membuat Kisi-Kisi, Soal, Rubrik & TTD...</div><div style="font-size:11px;color:#7c7490;margin-top:4px;">30-45 detik lagi...</div></div>`;
  setBtnLoading('btn-rpp',true,'Generate Modul Ajar Lengkap','Tahap 2/2: Membuat Asesmen & Rubrik...');

  // PROMPT TAHAP 2: TTD + Kisi-kisi + Soal + Rubrik Sikap + Rubrik Psikomotorik
  const p2=`Lanjutkan Modul Ajar ${mapel} ${fase}/${kelasRomawi} topik ${topik}.
Ikuti FORMAT PERSIS berikut, tanpa simbol Markdown, tanpa bullet *, tanpa #:

[Kota asal sekolah ${sekolah}], ${today}

Mengetahui,
Kepala ${sekolah}                                              Guru ${mapel}




${kepsek}                                                      ${guru}
NIP.                                                           NIP.

============================================================

KISI-KISI PENILAIAN KOGNITIF

No. | Indikator | Level Kognitif | Bentuk Soal | Nomor Soal
1 | [Indikator C4 — menganalisis aspek ${topik}] | C4 (Analisis) | Essay | 1,2
2 | [Indikator C4 — membandingkan aspek ${topik}] | C4 (Analisis) | Essay | 3
3 | [Indikator C5 — mengevaluasi pentingnya aspek ${topik}] | C5 (Evaluasi) | Essay | 4,5
4 | [Indikator C5 — menilai cara/perilaku terkait ${topik}] | C5 (Evaluasi) | Essay | 6,7
5 | [Indikator C6 — merancang ide/solusi terkait ${topik}] | C6 (Mencipta) | Essay | 8,9,10

Pedoman Penskoran Umum (per soal essay):
- Skor 10: Jawaban lengkap, jelas, sesuai konteks, dan bernalar tinggi.
- Skor 7-9: Jawaban cukup lengkap dan relevan, masih terdapat sedikit kekurangan.
- Skor 4-6: Jawaban sebagian benar, tetapi kurang logis atau tidak menjawab seluruh permintaan soal.
- Skor 1-3: Jawaban kurang relevan, hanya menyebut sebagian kecil konsep.
- Skor 0: Tidak menjawab / jawaban tidak sesuai sama sekali.

============================================================

SOAL ESSAY KOGNITIF

1. [Soal C4 — jelaskan perbedaan/ciri-ciri spesifik terkait ${topik}]
2. [Soal C4 — mengapa/bagaimana aspek tertentu ${topik} berfungsi]
3. [Soal C4 — bandingkan dua hal terkait ${topik} dalam konteks kehidupan nyata]
4. [Soal C5 — bagaimana peranan ${topik} dalam konteks kesehatan/keselamatan/produktivitas]
5. [Soal C5 — mengapa penggunaan/perilaku tertentu terkait ${topik} bisa berdampak negatif]
6. [Soal C5 — evaluasilah fenomena/perilaku nyata yang berkaitan dengan ${topik}]
7. [Soal C5 — berikan penilaian terhadap perilaku/kebiasaan masyarakat terkait ${topik}]
8. [Soal C6 — rancanglah satu ide/kampanye/solusi terkait ${topik}]
9. [Soal C6 — buatlah contoh solusi kreatif untuk masalah nyata terkait ${topik}]
10. [Soal C6 — jika kamu menjadi [peran tertentu], tindakan apa yang kamu lakukan terkait ${topik}]

============================================================

KUNCI JAWABAN DAN PEDOMAN PENSKORAN PENGETAHUAN

NO | Jawaban Ideal | Skor Maksimal
1 | [Jawaban ideal soal 1 — spesifik dan ilmiah sesuai ${topik}] | 10
2 | [Jawaban ideal soal 2] | 10
3 | [Jawaban ideal soal 3] | 10
4 | [Jawaban ideal soal 4] | 10
5 | [Jawaban ideal soal 5] | 10
6 | [Jawaban ideal soal 6] | 10
7 | [Jawaban ideal soal 7] | 10
8 | [Jawaban ideal soal 8] | 10
9 | [Jawaban ideal soal 9] | 10
10 | [Jawaban ideal soal 10] | 10

============================================================

ASPEK PENILAIAN SIKAP

No. | Aspek Sikap | Deskripsi
1 | Tanggung jawab | Menunjukkan komitmen menyelesaikan tugas proyek, termasuk pembagian peran dan waktu.
2 | Kerja sama | Aktif terlibat dalam diskusi dan menghargai peran teman kelompok.
3 | Percaya diri | Berani menyampaikan ide dalam kelompok maupun saat presentasi.
4 | [Aspek sikap 4 relevan dengan ${topik}] | [Deskripsi sikap 4]
5 | Ketekunan | Tidak mudah menyerah dan menyelesaikan tugas hingga tuntas meski mengalami kesulitan.

Teknik Penilaian
- Observasi langsung selama proses pembelajaran dan pengerjaan proyek.
- Instrumen: Lembar Observasi Penilaian Sikap
- Waktu Penilaian: Selama kegiatan inti (terutama saat kerja kelompok dan presentasi)

============================================================

RUBRIK PENILAIAN SIKAP

Aspek Sikap | Skor 4 (Sangat Baik) | Skor 3 (Baik) | Skor 2 (Cukup) | Skor 1 (Perlu Bimbingan)
Tanggung jawab | Selalu menyelesaikan tugas tepat waktu dan sesuai peran tanpa diingatkan | Menyelesaikan tugas dengan sedikit pengingat | Kadang mengabaikan tugas atau peran | Tidak menyelesaikan tugas tanpa bimbingan intensif
Kerja sama | Aktif berkontribusi, menghargai dan mendukung teman | Terlibat dalam kerja kelompok secara umum | Kurang aktif atau pasif dalam kelompok | Tidak kooperatif atau mendominasi
Percaya diri | Selalu berani menyampaikan ide di kelompok/kelas | Sesekali menyampaikan ide dengan percaya diri | Perlu dorongan agar mau berbicara | Menolak berbicara atau tampak ragu
[Aspek 4] | [Skor 4 — deskripsi terkait ${topik}] | [Skor 3] | [Skor 2] | [Skor 1]
Ketekunan | Sabar, konsisten, dan gigih dalam menyelesaikan proyek | Umumnya tekun meski kadang teralihkan | Sering tidak fokus dan mudah menyerah | Tidak menyelesaikan proyek jika tidak dibimbing

============================================================

FORMAT LEMBAR OBSERVASI PENILAIAN SIKAP

Nama Siswa | Tanggung jawab | Kerja sama | Percaya diri | [Aspek 4] | Ketekunan
.......... |                |            |              |           |
.......... |                |            |              |           |
.......... |                |            |              |           |
.......... |                |            |              |           |
.......... |                |            |              |           |

============================================================

ASPEK PENILAIAN RANAH PSIKOMOTORIK

NO | Aspek Keterampilan | Indikator
1 | Perencanaan Proyek | Siswa mampu merancang [produk proyek] yang relevan dan terstruktur terkait ${topik}.
2 | Kreativitas Karya | Proyek menunjukkan gagasan orisinal dan inovatif dalam menyampaikan [pesan terkait ${topik}].
3 | Ketepatan Informasi | Informasi yang disajikan sesuai dengan fakta dan topik pembelajaran ${topik}.
4 | Kolaborasi dan Kerja Tim | Siswa aktif berkontribusi dan bekerja sama dengan kelompoknya.
5 | Penyajian Proyek | Siswa mampu mempresentasikan proyek dengan percaya diri dan bahasa yang baik.

Teknik dan Bentuk Penilaian
- Teknik: Penilaian Kinerja (Performance Assessment)
- Bentuk Penilaian: Unjuk kerja (proses) dan hasil karya proyek (produk)

Kriteria Predikat (Konversi Nilai Keterampilan)
Rentang Nilai | Predikat
91-100        | Sangat Baik (SB)
76-90         | Baik (B)
61-75         | Cukup (C)
Kurang dari 61 | Perlu Bimbingan (PB)

============================================================

RUBRIK PENILAIAN PSIKOMOTORIK

NO | Aspek yang Dinilai | Skor 4 (Sangat Baik) | Skor 3 (Baik) | Skor 2 (Cukup) | Skor 1 (Perlu Bimbingan)
1 | Perencanaan Proyek | Perencanaan lengkap, runtut, dan jelas | Perencanaan cukup jelas dan runtut | Perencanaan kurang lengkap | Tidak menunjukkan perencanaan yang jelas
2 | Kreativitas Karya | Karya sangat kreatif dan orisinal | Karya cukup kreatif | Karya kurang variatif | Tidak menunjukkan kreativitas
3 | Ketepatan Informasi | Semua informasi tepat dan relevan | Sebagian besar tepat dan relevan | Ada informasi kurang sesuai | Banyak informasi tidak relevan
4 | Kerja Sama | Selalu aktif dan mendukung kerja kelompok | Cukup aktif bekerja sama | Kurang aktif dalam kelompok | Tidak bekerja sama
5 | Penyajian Proyek | Menyampaikan dengan lancar, percaya diri, dan menarik | Cukup lancar dan percaya diri | Kurang percaya diri atau kurang jelas | Tidak percaya diri dan tidak sistematis

============================================================

FORMAT LEMBAR PENILAIAN KETERAMPILAN

Judul Proyek   : [Nama proyek terkait ${topik}]
Nama Kelompok  : ____________________
Nama Siswa     : ____________________

NO | Aspek yang Dinilai | Skor 4 (Sangat Baik) | Skor 3 (Baik) | Skor 2 (Cukup) | Skor 1 (Perlu Bimbingan) | Skor
1 | Perencanaan Proyek | Perencanaan lengkap, runtut, dan jelas | Perencanaan cukup jelas dan runtut | Perencanaan kurang lengkap | Tidak menunjukkan perencanaan yang jelas |
2 | Kreativitas Karya | Karya sangat kreatif dan orisinal | Karya cukup kreatif | Karya kurang variatif | Tidak menunjukkan kreativitas |
3 | Ketepatan Informasi | Semua informasi tepat dan relevan | Sebagian besar tepat dan relevan | Ada informasi kurang sesuai | Banyak informasi tidak relevan |
4 | Kerja Sama | Selalu aktif dan mendukung kerja kelompok | Cukup aktif bekerja sama | Kurang aktif dalam kelompok | Tidak bekerja sama |
5 | Penyajian Proyek | Menyampaikan dengan lancar, percaya diri, dan menarik | Cukup lancar dan percaya diri | Kurang percaya diri atau kurang jelas | Tidak percaya diri dan tidak sistematis |

Catatan Observasi :
.....................................................................................
.....................................................................................`;

  let part2='';
  try { part2=await callAI(p2,SYS_RPP,4000); }
  catch(err){
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;
    setBtnLoading('btn-rpp',false,'Generate Modul Ajar Lengkap','');
    return;
  }

  showResult('res-rpp', part1+'\n\n'+part2);
  useCredit();
  setBtnLoading('btn-rpp',false,'Generate Modul Ajar Lengkap','');
}

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
  const lines=text.split('\n');
  const rows=[]; let rekap=''; let inRekap=false;
  for(const line of lines){
    if(/REKAPITULASI|REKAP/i.test(line)){inRekap=true;}
    if(inRekap){rekap+=line+'\n';continue;}
    const trimmed=line.trim();
    if(!trimmed||/^[-=]+$/.test(trimmed)) continue;
    if(trimmed.includes('|')){
      const cols=trimmed.split('|').map(c=>c.trim()).filter(c=>c);
      if(cols.length>=4){
        if(/^no$/i.test(cols[0])||/kompetensi/i.test(cols[1])||/^-+$/.test(cols[0])) continue;
        rows.push({no:cols[0]||'',kd:cols[1]||'',materi:cols[2]||'',indikator:cols[3]||'',level:cols[4]||'',bentuk:cols[5]||'',nomor:cols[6]||''});
      }
    }
  }
  return {rows,rekap};
}
function renderTabelHTML(rows, info) {
  if(!rows.length) return `<div style="color:#7c7490;padding:1rem;">Tabel sedang diproses. Teks kisi-kisi tersimpan untuk generate soal.</div>`;
  const lc={'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'};
  const getLC=(l)=>{for(const[k,v] of Object.entries(lc)){if(l.includes(k))return v;}return '#f5f3ff';};
  return `<style>.kt{width:100%;border-collapse:collapse;font-size:11px;min-width:700px;}.kt th{background:#7c3aed;color:#fff;padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;border:1px solid #5b21b6;}.kt td{padding:8px 10px;border:1px solid #e8e4f0;vertical-align:top;line-height:1.5;}.kt tr:nth-child(even) td{background:#fafaf9;}.kt tr:hover td{background:#f5f3ff;}.lb{display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;}</style>
  <div style="background:#7c3aed;color:#fff;padding:10px 14px;border-radius:8px 8px 0 0;font-size:12px;font-weight:700;">📊 Kisi-Kisi — ${info.jenis} ${info.mapel} ${info.kelas}</div>
  <div style="overflow-x:auto;"><table class="kt">
    <thead><tr><th style="width:4%">No</th><th style="width:22%">KD / CP</th><th style="width:16%">Materi Pokok</th><th style="width:30%">Indikator Soal</th><th style="width:12%">Level</th><th style="width:9%">Bentuk</th><th style="width:7%">No. Soal</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td style="text-align:center;font-weight:700;color:#7c3aed;">${r.no}</td><td>${r.kd}</td><td>${r.materi}</td><td>${r.indikator}</td><td style="text-align:center;"><span class="lb" style="background:${getLC(r.level)};color:#1a1523;">${r.level}</span></td><td style="text-align:center;font-weight:600;color:${/uraian|esai/i.test(r.bentuk)?'#065f46':'#1e40af'};">${r.bentuk||'PG'}</td><td style="text-align:center;font-weight:700;">${r.nomor}</td></tr>`).join('')}</tbody>
  </table></div>`;
}
async function generateKisiKisi() {
  if(!canGenerate()){alert('Kredit habis!');goPage('upgrade');return;}
  const mapel=document.getElementById('kisi-mapel').value||'IPA';
  const kelas=document.getElementById('kisi-kelas').value;
  const jenis=document.getElementById('kisi-jenis').value;
  const bentuk=document.getElementById('kisi-bentuk').value;
  const semester=document.getElementById('kisi-semester').value;
  const materi=document.getElementById('kisi-materi').value||'Sistem Pencernaan';
  const jmlPG=parseInt(document.getElementById('kisi-jml-pg').value)||0;
  const jmlUraian=parseInt(document.getElementById('kisi-jml-uraian').value)||0;
  const level=document.getElementById('kisi-level').value;
  savedKisiKisi={mapel,kelas,jenis,bentuk,materi,jmlPG,jmlUraian,level,teks:'',rows:[]};
  setBtnLoading('btn-kisi',true,'Generate Kisi-Kisi Tabel Resmi','Membuat kisi-kisi...');
  const resEl=document.getElementById('res-kisi');
  resEl.innerHTML=''; resEl.classList.remove('show');
  document.getElementById('soal-from-kisi-card').style.display='none';
  document.getElementById('download-gabungan-card').style.display='none';
  setAlurStep(2);
  const total=jmlPG+jmlUraian;
  const prompt=`Buatkan KISI-KISI SOAL format resmi Kemendikbud untuk:
Mata Pelajaran: ${mapel} | Kelas: ${kelas} | Semester: ${semester}
Jenis Penilaian: ${jenis} | Jenis Soal: ${bentuk}
Materi: ${materi} | Jumlah PG: ${jmlPG} | Jumlah Uraian: ${jmlUraian} | Total: ${total}
Distribusi Level: ${level}

WAJIB: Buat tabel dengan TEPAT 7 kolom dipisah |
Format: No | KD/CP | Materi Pokok | Indikator Soal | Level Kognitif | Bentuk Soal | No. Soal
Total baris = ${total}. Soal 1-${jmlPG} = PG. Soal ${jmlPG+1}-${total} = Uraian (jika ada).
Level: C1-Mengingat / C2-Memahami / C3-Mengaplikasikan / C4-Menganalisis / C5-Mengevaluasi / C6-Mencipta
Distribusi "${level}": Seimbang=10%C1,20%C2,30%C3,20%C4,10%C5,10%C6 | Mudah=30%C1,30%C2,20%C3,10%C4,5%C5,5%C6 | Sedang=10%C1,15%C2,35%C3,25%C4,10%C5,5%C6 | HOTs=5%C1,10%C2,20%C3,30%C4,20%C5,15%C6
Setelah tabel tulis: REKAPITULASI\nTotal PG: ${jmlPG} | Total Uraian: ${jmlUraian} | Total: ${total}`;
  try {
    const result=await callAI(prompt,'Kamu pengembang instrumen penilaian pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat kisi-kisi format resmi Kemendikbud. Setiap baris 7 kolom dengan pemisah |. Tidak ada Markdown.');
    savedKisiKisi.teks=result;
    const {rows,rekap}=parseKisiKisi(result);
    savedKisiKisi.rows=rows;
    resEl.dataset.raw=result;
    resEl.classList.add('show');
    const tabelHTML=renderTabelHTML(rows,{mapel,kelas,jenis,bentuk,jmlPG,jmlUraian});
    const rekapHTML=rekap?`<div style="margin-top:1rem;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:10px;padding:1rem;"><div style="font-size:11px;font-weight:700;color:#7c3aed;margin-bottom:6px;">REKAPITULASI SOAL</div><div style="font-size:12px;color:#1a1523;white-space:pre-wrap;line-height:1.7;">${esc(rekap.replace(/REKAPITULASI\n?/i,'').trim())}</div></div>`:'';
    resEl.innerHTML=`<div class="result-label">📊 Kisi-Kisi — ${jenis} ${mapel} ${kelas}</div>${tabelHTML}${rekapHTML}
      <div class="result-actions" style="margin-top:1rem;">
        <button class="btn-copy" onclick="copyResult('res-kisi',this)">📋 Salin</button>
        <button class="btn-dl btn-dl-print" onclick="printKisiKisi()">🖨️ Print</button>
        <button class="btn-dl btn-dl-word" onclick="downloadWordKisiKisi()">⬇ Word</button>
      </div>`;
    document.getElementById('soal-from-kisi-card').style.display='block';
    setAlurStep(3); useCredit();
  } catch(err) {
    resEl.classList.add('show');
    resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;
    setAlurStep(1);
  }
  setBtnLoading('btn-kisi',false,'Generate Kisi-Kisi Tabel Resmi','');
}

async function generateSoalDariKisi() {
  if(!canGenerate()){alert('Kredit habis!');goPage('upgrade');return;}
  const {mapel,kelas,jenis,jmlPG,jmlUraian,teks}=savedKisiKisi;
  if(!teks){alert('Generate kisi-kisi dulu!');return;}
  const btn=document.getElementById('btn-gen-soal-kisi');
  const resEl=document.getElementById('res-soal-kisi');
  btn.disabled=true;
  document.getElementById('download-gabungan-card').style.display='none';
  resEl.innerHTML=''; resEl.classList.remove('show');
  const total=jmlPG+jmlUraian;
  const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const sysP=`Kamu ahli penyusunan soal evaluasi pendidikan Indonesia dari Asisten Guru by Mas Gema. Buat soal persis sesuai kisi-kisi, valid, berkualitas. Tidak ada simbol Markdown.`;
  const mkP=(mulai,akhir,isFirst)=>`${isFirst?`Kisi-kisi:\n${teks}\n\nInstruksi:`:`Lanjutan. Kisi-kisi sama.\nInstruksi:`}
Mapel: ${mapel} | Kelas: ${kelas} | Penilaian: ${jenis} | Tanggal: ${today}
Buat soal NOMOR ${mulai} sampai ${akhir}. Level kognitif PERSIS sesuai kisi-kisi.
${mulai<=jmlPG?`Nomor ${mulai}-${Math.min(akhir,jmlPG)} PG dengan 4 opsi (A,B,C,D).`:''}
${akhir>jmlPG&&jmlUraian>0?`Nomor ${Math.max(mulai,jmlPG+1)}-${akhir} Uraian.`:''}

Format:
${mulai<=jmlPG?'SOAL PILIHAN GANDA':'SOAL URAIAN'}
${mulai}. [soal sesuai kisi-kisi]
${mulai<=jmlPG?'A. [...] B. [...] C. [...] D. [...]':''}
[lanjut sampai nomor ${akhir}]
${akhir>jmlPG&&mulai<=jmlPG?`\nSOAL URAIAN\n${jmlPG+1}. [soal uraian]\n[lanjut sampai nomor ${akhir}]`:''}

KUNCI JAWABAN DAN PEMBAHASAN SOAL ${mulai}-${akhir}
${mulai<=jmlPG?`PG:\n${mulai}. Jawaban: [huruf] | Pembahasan: [penjelasan]`:''}
${akhir>jmlPG?`URAIAN:\n${Math.max(mulai,jmlPG+1)}. Kunci: [jawaban ideal]\nPembahasan: [detail]\nRubrik: [kriteria skor]`:''}
[lanjut semua soal ${mulai}-${akhir}]`;

  let fullResult='';
  if(total<=10){
    btn.innerHTML='<div class="loading-dots"><span></span><span></span><span></span></div> Generating soal... (30-60 detik)';
    try { fullResult=await callAI(mkP(1,total,true),sysP,4000); useCredit(); }
    catch(err){resEl.classList.add('show');resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error: ${err.message}</div>`;btn.disabled=false;btn.textContent='✨ Generate Soal + Kunci + Pembahasan';return;}
  } else {
    const tengah=Math.ceil(total/2);
    btn.innerHTML=`<div class="loading-dots"><span></span><span></span><span></span></div> Tahap 1/2: Soal 1-${tengah}...`;
    resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:20px;">⏳</div><div style="font-weight:600;margin-top:.5rem;">Tahap 1/2: Generating soal 1-${tengah}...</div></div>`;
    resEl.classList.add('show');
    let p1='';
    try { p1=await callAI(mkP(1,tengah,true),sysP,4000); }
    catch(err){resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 1: ${err.message}</div>`;btn.disabled=false;btn.textContent='✨ Generate Soal + Kunci + Pembahasan';return;}
    btn.innerHTML=`<div class="loading-dots"><span></span><span></span><span></span></div> Tahap 2/2: Soal ${tengah+1}-${total}...`;
    resEl.innerHTML=`<div style="padding:1.5rem;text-align:center;color:#7c3aed;"><div style="font-size:20px;">📝</div><div style="font-weight:600;margin-top:.5rem;">Tahap 2/2: Generating soal ${tengah+1}-${total}...</div></div>`;
    let p2='';
    try { p2=await callAI(mkP(tengah+1,total,false),sysP,4000); }
    catch(err){resEl.innerHTML=`<div style="color:#dc2626;padding:1rem;">⚠️ Error tahap 2: ${err.message}</div>`;btn.disabled=false;btn.textContent='✨ Generate Soal + Kunci + Pembahasan';return;}
    fullResult=p1+'\n\n'+'='.repeat(50)+'\n\n'+p2;
    useCredit();
  }
  resEl.dataset.raw=fullResult;
  resEl.classList.add('show');
  resEl.innerHTML=`<div class="result-label">✅ Soal + Kunci + Pembahasan (${total} soal lengkap)</div>
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

function printKisiKisi() {
  const {rows,mapel,kelas,jenis,jmlPG,jmlUraian}=savedKisiKisi;
  if(!rows.length){printResult('res-kisi');return;}
  const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const w=window.open('','_blank');
  if(!w){alert('Izinkan popup.');return;}
  const lc={'C1':'#dbeafe','C2':'#e0f2fe','C3':'#d1fae5','C4':'#fef3c7','C5':'#fce7f3','C6':'#f3e8ff'};
  const getLC=(l)=>{for(const[k,v] of Object.entries(lc)){if(l.includes(k))return v;}return '#f5f3ff';};
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Kisi-Kisi</title>
    <style>body{font-family:'Times New Roman',serif;font-size:10pt;padding:1cm 1.5cm;}
    h2,h3{text-align:center;margin:4px 0;}h2{font-size:13pt;color:#7c3aed;}h3{font-size:11pt;}
    table{width:100%;border-collapse:collapse;margin:10px 0;}
    th{background:#7c3aed;color:#fff;padding:6px 8px;border:1px solid #5b21b6;font-size:9pt;font-weight:700;}
    td{padding:5px 8px;border:1px solid #999;font-size:9pt;vertical-align:top;line-height:1.3;}
    tr:nth-child(even) td{background:#f9f9f9;}
    @media print{@page{margin:1cm;size:A4 landscape;}}</style></head><body>
    <h2>KISI-KISI SOAL</h2><h3>${jenis} — ${mapel} — ${kelas}</h3>
    <p style="text-align:center;font-size:9pt;">2024/2025 | ${jmlPG} PG + ${jmlUraian} Uraian = ${jmlPG+jmlUraian} soal | ${today}</p>
    <table><thead><tr>
      <th style="width:4%">No</th><th style="width:22%">KD / CP</th><th style="width:16%">Materi Pokok</th>
      <th style="width:30%">Indikator Soal</th><th style="width:12%">Level</th><th style="width:9%">Bentuk</th><th style="width:7%">No. Soal</th>
    </tr></thead>
    <tbody>${rows.map(r=>`<tr>
      <td style="text-align:center;font-weight:700;">${r.no}</td>
      <td>${r.kd}</td><td>${r.materi}</td><td>${r.indikator}</td>
      <td style="text-align:center;background:${getLC(r.level)};font-weight:700;">${r.level}</td>
      <td style="text-align:center;font-weight:700;">${r.bentuk||'PG'}</td>
      <td style="text-align:center;font-weight:700;">${r.nomor}</td>
    </tr>`).join('')}</tbody></table>
    <p style="font-size:9pt;background:#f5f5f5;padding:6px;">Rekapitulasi: PG ${jmlPG} | Uraian ${jmlUraian} | Total ${jmlPG+jmlUraian}</p>
    <p style="font-size:8pt;text-align:center;color:#666;margin-top:8px;">Asisten Guru by Mas Gema</p>
    </body></html>`);
  w.document.close();
  setTimeout(()=>w.print(),500);
}

async function downloadWordKisiKisi() {
  if(!savedKisiKisi.rows.length){alert('Generate kisi-kisi dulu!');return;}
  if(!docxReady||typeof docx==='undefined'){alert('Library Word dimuat, tunggu 3 detik.');return;}
  const {rows,mapel,kelas,jenis,jmlPG,jmlUraian}=savedKisiKisi;
  try {
    const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell,AlignmentType,BorderStyle,WidthType,ShadingType}=docx;
    const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
    const children=[];
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'KISI-KISI SOAL',bold:true,size:32,color:'7c3aed',font:'Times New Roman'})],spacing:{after:60}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:`${jenis} — ${mapel} — ${kelas} | 2024/2025`,bold:true,size:24,font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:240}}));
    const lc={'C1':'dbeafe','C2':'e0f2fe','C3':'d1fae5','C4':'fef3c7','C5':'fce7f3','C6':'f3e8ff'};
    const getLC=(l)=>{for(const[k,v] of Object.entries(lc)){if(l.includes(k))return v;}return 'f5f3ff';};
    const mkC=(text,opts={})=>new TableCell({
      width:opts.w?{size:opts.w,type:WidthType.PERCENTAGE}:undefined,
      shading:{type:ShadingType.SOLID,color:opts.bg||'ffffff'},
      children:[new Paragraph({alignment:opts.center?AlignmentType.CENTER:AlignmentType.LEFT,
        children:[new TextRun({text:String(text),bold:!!opts.bold,size:opts.size||18,color:opts.color||'1a1523',font:'Times New Roman'})]})]
    });
    const hRow=new TableRow({tableHeader:true,children:[
      mkC('No',{w:4,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
      mkC('KD / CP',{w:22,bg:'7c3aed',bold:true,size:18,color:'ffffff'}),
      mkC('Materi Pokok',{w:16,bg:'7c3aed',bold:true,size:18,color:'ffffff'}),
      mkC('Indikator Soal',{w:30,bg:'7c3aed',bold:true,size:18,color:'ffffff'}),
      mkC('Level Kognitif',{w:12,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
      mkC('Bentuk',{w:9,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
      mkC('No. Soal',{w:7,bg:'7c3aed',bold:true,size:18,color:'ffffff',center:true}),
    ]});
    const dRows=rows.map((r,i)=>{
      const bg=i%2===1?'fafaf9':'ffffff';
      return new TableRow({children:[
        mkC(r.no,{bg,bold:true,color:'7c3aed',center:true}),
        mkC(r.kd,{bg}),mkC(r.materi,{bg}),mkC(r.indikator,{bg}),
        mkC(r.level,{bg:getLC(r.level),bold:true,size:16,center:true}),
        mkC(r.bentuk||'PG',{bg,bold:true,color:r.bentuk&&r.bentuk.toLowerCase().includes('ur')?'065f46':'1e40af',center:true}),
        mkC(r.nomor,{bg,bold:true,center:true}),
      ]});
    });
    children.push(new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[hRow,...dRows]}));
    children.push(new Paragraph({spacing:{before:200},children:[new TextRun({text:`Rekapitulasi: PG ${jmlPG} soal | Uraian ${jmlUraian} soal | Total ${jmlPG+jmlUraian} soal`,size:20,font:'Times New Roman'})]}));
    children.push(new Paragraph({spacing:{before:400},alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Asisten Guru by Mas Gema —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));
    const doc=new Document({styles:{default:{document:{run:{font:'Times New Roman',size:20}}}},sections:[{properties:{page:{size:{width:16838,height:11906},margin:{top:1200,right:1200,bottom:1200,left:1200}}},children}]});
    const blob=await Packer.toBlob(doc);
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=`KisiKisi_${mapel}_${Date.now()}.docx`;
    document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(url);document.body.removeChild(a);},1000);
  } catch(e){alert('Gagal download Word: '+e.message);}
}

async function downloadWordGabungan() {
  const soalTeks=document.getElementById('res-soal-kisi')?.dataset.raw||'';
  if(!soalTeks){alert('Generate soal dulu!');return;}
  await downloadWordFromText(`KISI-KISI SOAL\n${'='.repeat(60)}\n\n${savedKisiKisi.teks}\n\n${'='.repeat(60)}\nSOAL + KUNCI JAWABAN + PEMBAHASAN\n${'='.repeat(60)}\n\n${soalTeks}`,'KisiKisi_Soal_');
}
function copyGabungan(btn) {
  const k=savedKisiKisi.teks||'';
  const s=document.getElementById('res-soal-kisi')?.dataset.raw||'';
  navigator.clipboard.writeText('KISI-KISI\n\n'+k+'\n\nSOAL\n\n'+s).catch(()=>{});
  btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent='📋 Salin Semua';},2000);
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
        return `Buatkan Laporan PKB formal: Nama ${nama}, Mapel ${mapel}, Kegiatan ${kegiatan}, Refleksi ${refleksi}. Bagian: Pendahuluan, Pelaksanaan, Hasil & Manfaat, Refleksi & RTL, Penutup. Tidak ada simbol Markdown.`;
      },
      system:'Kamu asisten penulisan laporan dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown.'
    }
  };
  const cfg=cfgs[type];
  if(!cfg) return;
  setBtnLoading(cfg.btnId,true,cfg.label,'Generating...');
  const resEl=document.getElementById(cfg.resId);
  resEl.innerHTML=''; resEl.classList.remove('show');
  try{
    const result=await callAI(cfg.getPrompt(),cfg.system);
    showResult(cfg.resId,result); useCredit();
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
  const prompt=`Buat konten ${pn}: Platform: ${pn} | Jenis: ${jenis} | Topik: ${topik} | Mapel: ${mapel} | Tone: ${tm[tone]||tone} | Target: ${audiens||'guru Indonesia'}. Konten langsung bisa dicopy-paste. Sertakan: konten utama, tips posting, 3 ide lanjutan, cara monetize. Tidak ada simbol Markdown berlebihan.`;
  try{
    const result=await callAI(prompt,'Kamu content strategist media sosial edukasi terbaik Indonesia dari Asisten Guru by Mas Gema. Tidak ada simbol Markdown berlebihan.');
    showResult('res-medsos',result); useCredit();
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
    .replace(/\(Mindful learning \/ Berkesadaran\)/g,'<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Mindful)</span>')
    .replace(/\(Mindful\)/g,'<span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Mindful)</span>')
    .replace(/\(Meaningful Learning\)/g,'<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Meaningful)</span>')
    .replace(/\(Meaningful\)/g,'<span style="background:#d1fae5;color:#065f46;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Meaningful)</span>')
    .replace(/\(Joyful Learning\)/g,'<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Joyful)</span>')
    .replace(/\(Joyful\)/g,'<span style="background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Joyful)</span>')
    .replace(/\(Pembangunan Persepsi\/Apersepsi\)/g,'<span style="background:#f3e8ff;color:#7c3aed;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Apersepsi)</span>')
    .replace(/\(Penguatan Tujuan Pembelajaran\)/g,'<span style="background:#ede9fe;color:#5b21b6;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Penguatan Tujuan)</span>')
    .replace(/\(Refleksi Awal dan Diskusi Singkat\)/g,'<span style="background:#ecfdf5;color:#047857;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;margin-left:4px;">(Refleksi Awal)</span>')
    .replace(/^={4,}.*/gm,'<hr style="border:none;border-top:2px solid #7c3aed;margin:12px 0;">')
    .replace(/^[A-K]\. .+$/gm,s=>`<div style="font-size:14px;font-weight:700;color:#7c3aed;margin:16px 0 8px;padding-bottom:4px;border-bottom:2px solid #ede9fe;">${s}</div>`)
    .replace(/^Sintak \d+.+$/gm,s=>`<div style="font-size:13px;font-weight:700;color:#059669;margin:12px 0 6px;">${s}</div>`)
    .replace(/^Kegiatan (Pendahuluan|Inti|Penutup).*/gm,s=>`<div style="font-size:13px;font-weight:700;color:#1e40af;margin:14px 0 6px;background:#eff6ff;padding:6px 10px;border-radius:6px;">${s}</div>`)
    .replace(/\n/g,'<br>');
}

function showResult(resId,text){
  const el=document.getElementById(resId);
  el.classList.add('show'); el.dataset.raw=text;
  el.innerHTML=`<div class="result-label">Hasil</div>
    <div style="font-size:13px;line-height:1.9;color:#1a1523;">${renderDisplay(text)}</div>
    <div class="result-actions">
      <button class="btn-copy" onclick="copyResult('${resId}',this)">📋 Salin teks</button>
      <button class="btn-dl btn-dl-print" onclick="printResult('${resId}')">🖨️ Print</button>
      <button class="btn-dl btn-dl-word" onclick="downloadWord('${resId}','ModulAjar')">⬇ Download Word</button>
    </div>`;
}
function copyResult(resId,btn){
  const raw=document.getElementById(resId)?.dataset.raw||'';
  navigator.clipboard.writeText(raw).catch(()=>{});
  const prev=btn.textContent; btn.textContent='✓ Tersalin!';
  setTimeout(()=>{btn.textContent=prev;},2000);
}
function printText(text){
  const today=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});
  const w=window.open('','_blank');
  if(!w){alert('Izinkan popup browser.');return;}
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Modul Ajar</title>
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;padding:2.5cm;line-height:1.85;}
    .hd{text-align:center;border-bottom:3pt solid #7c3aed;padding-bottom:10pt;margin-bottom:20pt;}
    .ht{font-size:14pt;font-weight:700;color:#7c3aed;}.hs{font-size:10pt;color:#555;margin-top:4pt;}
    pre{white-space:pre-wrap;font-family:'Times New Roman',serif;font-size:11pt;line-height:1.85;}
    @media print{@page{margin:2.5cm;}}</style></head><body>
    <div class="hd"><div class="ht">MODUL AJAR — ASISTEN GURU BY MAS GEMA</div>
    <div class="hs">Pembelajaran Mendalam | SK BSKAP No. 032/H/KR/2024</div></div>
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
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'Pembelajaran Mendalam | SK BSKAP No. 032/H/KR/2024 | '+today,size:18,color:'555555',font:'Times New Roman'})],border:{bottom:{style:BorderStyle.SINGLE,size:8,color:'7c3aed',space:1}},spacing:{after:400}}));
    text.split('\n').forEach(line=>{
      if(!line.trim()){children.push(new Paragraph({spacing:{after:120}}));return;}
      if(/^[=\-]{4,}$/.test(line.trim())){children.push(new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:'ddd6fe',space:1}},spacing:{before:100,after:100}}));return;}
      const clean=line.trim();
      const isSintak=/^Sintak \d+/.test(clean);
      const isKeg=/^Kegiatan (Pendahuluan|Inti|Penutup)/.test(clean);
      const isSec=/^[A-K]\. /.test(clean);
      const isH=clean===clean.toUpperCase()&&clean.length>4&&/[A-Z]/.test(clean)&&!/^\d/.test(clean)&&!/^[A-D][\.|]/.test(clean)&&!/^(NIP|No\.)/.test(clean);
      const clr=isSec?'7c3aed':isSintak?'059669':isKeg?'1e40af':isH?'3b0764':'1a1523';
      const sz=isSec||isKeg?24:isSintak?22:isH?23:22;
      children.push(new Paragraph({children:[new TextRun({text:clean,bold:isSec||isSintak||isKeg||isH,size:sz,font:'Times New Roman',color:clr})],spacing:{before:(isSec||isKeg)?240:isSintak?180:isH?200:60,after:60}}));
    });
    children.push(new Paragraph({spacing:{before:480}}));
    children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'— Dibuat dengan Asisten Guru by Mas Gema —',italics:true,size:18,color:'9333ea',font:'Times New Roman'})]}));
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
