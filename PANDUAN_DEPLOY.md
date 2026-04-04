# 🚀 Panduan Deploy Asisten Guru by Mas Gema ke Vercel

## Yang Dibutuhkan
- Akun GitHub (gratis) → github.com
- Akun Vercel (gratis) → vercel.com
- API Key Anthropic → console.anthropic.com

---

## LANGKAH 1 — Upload ke GitHub

1. Buka github.com → Login → klik tombol **"+"** → **"New repository"**
2. Nama repo: `asisten-guru-mas-gema`
3. Pilih **Public** → klik **"Create repository"**
4. Di halaman repo baru, klik **"uploading an existing file"**
5. Upload semua file & folder dari zip ini:
   ```
   asisten-guru/
   ├── api/
   │   └── chat.js
   ├── public/
   │   ├── index.html
   │   ├── css/style.css
   │   └── js/app.js
   └── vercel.json
   ```
6. Klik **"Commit changes"**

---

## LANGKAH 2 — Deploy ke Vercel

1. Buka vercel.com → Login dengan akun GitHub
2. Klik **"Add New Project"**
3. Pilih repo `asisten-guru-mas-gema` → klik **"Import"**
4. Di bagian **"Configure Project"**:
   - Framework Preset: **Other**
   - Root Directory: biarkan kosong (default)
5. Klik **"Deploy"** — tunggu 1-2 menit
6. ✅ Selesai! Kamu dapat link seperti: `asisten-guru-mas-gema.vercel.app`

---

## LANGKAH 3 — Tambahkan API Key Anthropic (WAJIB)

Tanpa ini, AI tidak akan jalan!

1. Di dashboard Vercel → klik project kamu
2. Klik tab **"Settings"** → klik **"Environment Variables"**
3. Klik **"Add New"**:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste API key kamu dari console.anthropic.com
   - **Environment:** centang semua (Production, Preview, Development)
4. Klik **"Save"**
5. Kembali ke tab **"Deployments"** → klik **"Redeploy"** (pilih yang terbaru)
6. ✅ Platform sudah live dan terhubung ke AI!

---

## LANGKAH 4 — Custom Domain (Opsional)

Supaya guru bisa akses via `asistenguru.id` atau domain kamu sendiri:

1. Di Vercel → Settings → **"Domains"**
2. Ketik domain kamu → klik **"Add"**
3. Ikuti instruksi DNS yang muncul (biasanya ubah nameserver di Niagahoster/Dewaweb)

---

## LANGKAH 5 — Share ke Guru!

Setelah deploy berhasil, kamu bisa langsung share link ke grup WhatsApp:

```
Halo Bapak/Ibu Guru! 👋

Saya dengan bangga memperkenalkan:
✅ ASISTEN GURU by Mas Gema

Platform AI khusus untuk guru Indonesia!

🔗 Link: https://asisten-guru-mas-gema.vercel.app

Fitur gratis:
📄 Generator RPP otomatis
✅ Generator Soal + Kunci Jawaban
📋 Dokumen Administrasi
⭐ Laporan PKB
📥 Export Word & Print

Daftar gratis sekarang dan dapatkan 5 kredit/bulan!
Upgrade Premium hanya Rp 49.000/bulan untuk unlimited.

Hubungi saya untuk info upgrade. 🙏
```

---

## Cara Upgrade User ke Premium (via Admin)

Saat ini upgrade dilakukan manual:
1. User transfer ke rekening kamu
2. Kamu buka panel admin di platform
3. Cari user berdasarkan email
4. Klik "Upgrade ke Premium"

---

## Estimasi Biaya

| Layanan | Biaya |
|---------|-------|
| Vercel hosting | **Gratis** (hingga 100GB bandwidth) |
| Domain .com | Rp 150.000/tahun |
| API Anthropic | ~$0.003 per generate |
| **Total awal** | **Hampir gratis!** |

Dengan 100 user Premium @ Rp 49.000 = **Rp 4.900.000/bulan** 🎯

---

## Troubleshooting

**Q: Muncul "Failed to fetch" atau "API Error"**
A: Pastikan ANTHROPIC_API_KEY sudah diset di Vercel Environment Variables dan sudah Redeploy.

**Q: Halaman blank / tidak terbuka**
A: Cek Vercel Deployments → lihat log error di bagian Functions.

**Q: User tidak bisa daftar**
A: Data user tersimpan di localStorage browser masing-masing. Untuk database terpusat, perlu upgrade ke Supabase (langkah selanjutnya).

---

Dibuat oleh Claude untuk Mas Gema 🚀
