// ═══════════════════════════════════════
//  ASISTEN GURU BY MAS GEMA
//  api/chat.js — Anthropic + Supabase
// ═══════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

// Helper: fetch ke Supabase
async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : 'return=representation'
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Supabase error ${res.status}`);
  }
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body || {};

  try {
    // ── ANTHROPIC AI ──
    if (action === 'ai' || !action) {
      const { model, max_tokens, system, messages } = req.body;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model: model || 'claude-sonnet-4-20250514', max_tokens: max_tokens || 2000, system, messages })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'API Error' });
      return res.status(200).json(data);
    }

    // ══════════════════════
    //  USER AUTH
    // ══════════════════════
    if (action === 'user_register') {
      const { name, email, password, jenjang, wa, device_id, referral_code, referred_by } = req.body;
      // Cek email sudah ada
      const existing = await sb(`users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar.' });
      // Cek WA sudah dipakai
      if (wa) {
        const waExist = await sb(`users?wa=eq.${encodeURIComponent(wa)}&select=id`);
        if (waExist.length > 0) return res.status(400).json({ error: 'Nomor WhatsApp sudah terdaftar di akun lain.' });
      }
      // Cek device_id sudah dipakai (anti-abuse)
      if (device_id) {
        const devExist = await sb(`users?device_id=eq.${encodeURIComponent(device_id)}&select=email`);
        if (devExist.length > 0) return res.status(400).json({ error: `Perangkat ini sudah memiliki akun (${devExist[0].email}). Hubungi admin jika ini kesalahan.` });
      }
      const result = await sb('users', 'POST', {
        name, email, password, jenjang, wa: wa||'', device_id: device_id||'',
        plan: 'gratis', credits: 5, total_gen: 0
      });
      return res.status(200).json({ success: true, user: result[0] });
    }

    if (action === 'user_login') {
      const { email, password } = req.body;
      const users = await sb(`users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`);
      if (!users.length) return res.status(401).json({ error: 'Email atau password salah.' });
      return res.status(200).json({ success: true, user: users[0] });
    }

    if (action === 'user_update') {
      const { id, credits, total_gen, plan } = req.body;
      const updated = await sb(`users?id=eq.${id}`, 'PATCH', { credits, total_gen, plan });
      return res.status(200).json({ success: true, user: updated[0] });
    }

    if (action === 'user_get') {
      const { email } = req.body;
      const users = await sb(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (!users.length) return res.status(404).json({ error: 'User tidak ditemukan.' });
      return res.status(200).json({ success: true, user: users[0] });
    }

    // ══════════════════════
    //  ADMIN AUTH
    // ══════════════════════
    if (action === 'admin_register') {
      const { name, email, password, code } = req.body;
      if (code !== 'MASGEMA2024') return res.status(403).json({ error: 'Kode akses salah.' });
      const existing = await sb(`admins?email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar.' });
      const result = await sb('admins', 'POST', { name, email, password });
      // Log activity
      await sb('activity_logs', 'POST', { admin_name: name, action: 'Register admin baru', detail: email }).catch(() => {});
      return res.status(200).json({ success: true, admin: result[0] });
    }

    if (action === 'admin_login') {
      const { email, password } = req.body;
      const admins = await sb(`admins?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`);
      if (!admins.length) return res.status(401).json({ error: 'Email atau password salah.' });
      return res.status(200).json({ success: true, admin: admins[0] });
    }

    // ══════════════════════
    //  ADMIN DASHBOARD DATA
    // ══════════════════════
    if (action === 'admin_get_users') {
      const users = await sb('users?select=*&order=created_at.desc');
      return res.status(200).json({ success: true, users });
    }

    if (action === 'admin_upgrade_user') {
      const { user_id, user_email, plan, credits, admin_name } = req.body;
      await sb(`users?id=eq.${user_id}`, 'PATCH', { plan, credits });
      await sb('activity_logs', 'POST', { admin_name, action: `Upgrade ke ${plan}`, target_email: user_email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_reset_credits') {
      const { user_id, user_email, admin_name } = req.body;
      await sb(`users?id=eq.${user_id}`, 'PATCH', { credits: 5, plan: 'gratis' });
      await sb('activity_logs', 'POST', { admin_name, action: 'Reset kredit ke 5', target_email: user_email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_delete_user') {
      const { user_id, user_email, admin_name } = req.body;
      await sb(`users?id=eq.${user_id}`, 'DELETE');
      await sb('activity_logs', 'POST', { admin_name, action: 'Hapus user', target_email: user_email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    // ══════════════════════
    //  TRANSACTIONS
    // ══════════════════════
    if (action === 'create_transaction') {
      const { user_id, user_name, user_email, paket, price, credits_added, sender_name, transfer_date, referral_code } = req.body;
      const result = await sb('transactions', 'POST', {
        user_id, user_name, user_email, paket, price, credits_added,
        sender_name, transfer_date, status: 'pending',
        referral_code: referral_code || null
      });
      return res.status(200).json({ success: true, transaction: result[0] });
    }
    }

    if (action === 'get_user_transactions') {
      const emailParam = req.body.email || req.body.user_email;
      if (!emailParam) return res.status(400).json({ error: 'Email wajib' });
      try {
        const txns = await sb(`transactions?user_email=eq.${encodeURIComponent(emailParam)}&order=created_at.desc`);
        return res.status(200).json({ success: true, transactions: txns || [] });
      } catch(e) {
        // Jika tabel belum ada atau error lain, kembalikan array kosong
        return res.status(200).json({ success: true, transactions: [], error: e.message });
      }
    }

    // ══════════════════════
    //  REFERRAL SYSTEM
    // ══════════════════════
    if (action === 'save_referral_code') {
      const { email, code } = req.body;
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { referral_code: code }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'get_referral_stats') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Kode wajib' });
      const refs = await sb(`referrals?referrer_code=eq.${encodeURIComponent(code)}&order=created_at.desc`).catch(()=>[]);
      return res.status(200).json({ success: true, referrals: refs });
    }

    if (action === 'admin_get_referrals') {
      const refs = await sb('referrals?order=created_at.desc').catch(()=>[]);
      return res.status(200).json({ success: true, referrals: refs });
    }

    if (action === 'admin_mark_referral_paid') {
      const { id } = req.body;
      await sb(`referrals?id=eq.${id}`, 'PATCH', { paid: true, paid_at: new Date().toISOString() });
      await sb('activity_logs', 'POST', { admin_name:'Admin', action:'Cairkan komisi referral ID: '+id, target_email:'' }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_get_transactions') {
      const txns = await sb('transactions?order=created_at.desc');
      return res.status(200).json({ success: true, transactions: txns });
    }

    if (action === 'admin_get_logs') {
      const logs = await sb('activity_logs?order=created_at.desc&limit=50');
      return res.status(200).json({ success: true, logs });
    }

    // ══════════════════════
    //  USER SYNC (dari localStorage ke Supabase)
    // ══════════════════════
    if (action === 'user_sync') {
      const { user } = req.body;
      if (!user || !user.email) return res.status(400).json({ error: 'Email wajib' });
      const existing = await sb(`users?email=eq.${encodeURIComponent(user.email)}&select=id`);
      if (existing.length > 0) {
        // Saat sync, JANGAN timpa plan dari localStorage kalau Supabase sudah premium
        // — hanya update fields yang aman di-override oleh client
        await sb(`users?email=eq.${encodeURIComponent(user.email)}`, 'PATCH', {
          name: user.name, jenjang: user.jenjang,
          wa: user.wa || '',
          device_id: user.deviceId || user.device_id || '',
          credits: user.credits ?? 5,
          total_gen: user.total_gen || user.totalGen || 0,
          credit_date: user.creditDate || new Date().toISOString().slice(0,10)
          // NOTE: plan TIDAK di-sync dari client → hanya admin yang bisa ubah plan
        });
      } else {
        await sb('users', 'POST', {
          name: user.name, email: user.email, jenjang: user.jenjang,
          password: user.password || '',
          wa: user.wa || '',
          device_id: user.deviceId || user.device_id || '',
          plan: user.plan || 'gratis',
          credits: user.credits ?? 5,
          total_gen: user.total_gen || user.totalGen || 0
        }).catch(() => {});
      }
      return res.status(200).json({ success: true });
    }

    // ══════════════════════
    //  ADMIN — GET ALL (alias baru)
    // ══════════════════════
    if (action === 'get_all_users') {
      const users = await sb('users?select=*&order=created_at.desc');
      return res.status(200).json({ success: true, users });
    }

    if (action === 'get_all_transactions') {
      const transactions = await sb('transactions?order=created_at.desc');
      return res.status(200).json({ success: true, transactions });
    }

    // ══════════════════════
    //  ADMIN — UPDATE USER (by email)
    // ══════════════════════
    if (action === 'admin_update_user') {
      const { email, plan, credits } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib' });
      const DAILY_CREDITS = {
        gratis:5, reguler_bulanan:20, premium_bulanan:70,
        reguler_tahunan:25, premium_tahunan:70,
        premium:70, tahunan:70
      };
      const patch = {};
      if (plan !== undefined) {
        patch.plan = plan;
        // Set kredit harian sesuai paket jika tidak di-override
        if (credits === undefined) patch.credits = DAILY_CREDITS[plan] || 5;
      }
      if (credits !== undefined) patch.credits = credits;
      // Selalu set credit_date agar reset harian berjalan benar
      const today = new Date().toISOString().slice(0,10);
      patch.credit_date = req.body.credit_date || today;
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', patch);
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: `Update user ${email}: plan=${plan||'-'}, credits=${credits||'-'}`, target_email: email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    // ══════════════════════
    //  ADMIN — RESET PASSWORD (by email)
    // ══════════════════════
    if (action === 'admin_reset_password') {
      const { email, new_password } = req.body;
      if (!email || !new_password) return res.status(400).json({ error: 'Email dan password baru wajib' });
      if (new_password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });
      const existing = await sb(`users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (!existing.length) return res.status(404).json({ error: 'User tidak ditemukan' });
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { password: new_password });
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: 'Reset password', target_email: email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    // ══════════════════════
    //  ADMIN — DELETE USER (by email)
    // ══════════════════════
    if (action === 'admin_delete_user') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib' });
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'DELETE');
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: 'Hapus user', target_email: email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    // ══════════════════════
    //  ADMIN — VERIFY / REJECT TRANSACTION (by id)
    // ══════════════════════
    if (action === 'admin_verify_transaction') {
      const { id, email, paket } = req.body;
      if (!id) return res.status(400).json({ error: 'ID transaksi wajib' });

      const planMap = {
        'premium': 'premium_bulanan', 'premium_bulanan': 'premium_bulanan',
        'reguler': 'reguler_bulanan', 'reguler_bulanan': 'reguler_bulanan',
        'tahunan': 'premium_tahunan', 'premium_tahunan': 'premium_tahunan',
        'reguler_tahunan': 'reguler_tahunan',
      };
      // Kredit harian skema baru
      const dailyCreditsMap = {
        'gratis': 3, 'reguler_bulanan': 10, 'premium_bulanan': 30,
        'reguler_tahunan': 10, 'premium_tahunan': 30,
      };
      const rawPaket = (paket||'').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z_]/g,'');
      const plan = planMap[rawPaket] || (rawPaket.includes('tahunan') ? 'premium_tahunan' : 'premium_bulanan');
      const dailyCredits = dailyCreditsMap[plan] || 30;
      const now   = new Date().toISOString();
      const today = now.slice(0,10);

      // Update status transaksi
      try {
        await sb(`transactions?id=eq.${id}`, 'PATCH', {
          status: 'verified', verified_at: now
        });
      } catch(e) {
        if (email) {
          await sb(`transactions?user_email=eq.${encodeURIComponent(email)}&status=eq.pending`, 'PATCH',
            { status: 'verified', verified_at: now });
        }
      }

      // Upgrade plan + kredit user
      if (email) {
        await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', {
          plan, credits: dailyCredits, credit_date: today
        });
      }

      // Proses komisi referral jika ada
      if (email) {
        try {
          const userArr = await sb(`users?email=eq.${encodeURIComponent(email)}&select=referred_by,name`);
          const referredBy = userArr?.[0]?.referred_by;
          const userName   = userArr?.[0]?.name || email;
          if (referredBy) {
            // Cek referrer ada
            const referrerArr = await sb(`users?referral_code=eq.${encodeURIComponent(referredBy)}&select=email,name`);
            if (referrerArr?.length) {
              const hargaVal = parseInt(req.body.price || 0);
              const komisi = Math.round(hargaVal * 0.20);
              // Insert ke tabel referrals
              await sb('referrals', 'POST', {
                referrer_code: referredBy,
                referrer_email: referrerArr[0].email,
                referred_email: email,
                referred_name: userName,
                paket: plan,
                harga: hargaVal,
                komisi,
                converted: true,
                paid: false,
                created_at: new Date().toISOString()
              }).catch(()=>{});
            }
          }
        } catch(e) { /* referral process non-critical */ }
      }

      // Hitung dan simpan komisi referral (20%)
      const KOMISI_PCT = 0.20;
      try {
        const txnRow = await sb(`transactions?id=eq.${id}&select=referral_code,price,amount`);
        const refCode = txnRow[0]?.referral_code;
        const harga   = parseInt(txnRow[0]?.price || txnRow[0]?.amount || 0);
        if (refCode && harga > 0) {
          const komisi = Math.round(harga * KOMISI_PCT);
          await sb(`transactions?id=eq.${id}`, 'PATCH', { komisi, komisi_status: 'pending' });
        }
      } catch(e) {}

      await sb('activity_logs', 'POST', {
        admin_name: 'Admin',
        action: `✓ Verifikasi ${paket||''} → ${plan} (${dailyCredits} kredit/hari)`,
        target_email: email||''
      }).catch(() => {});
      return res.status(200).json({ success: true, plan, dailyCredits });
    }

    if (action === 'admin_reject_transaction') {
      const { id, email } = req.body;
      if (!id) return res.status(400).json({ error: 'ID transaksi wajib' });
      await sb(`transactions?id=eq.${id}`, 'PATCH', { status: 'rejected', verified_at: new Date().toISOString() });
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: '✕ Tolak transaksi', target_email: email||'' }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    // ══════════════════════════════
    //  REFERRAL SYSTEM
    // ══════════════════════════════

    if (action === 'generate_referral_code') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib' });
      // Cek apakah sudah punya kode
      const existing = await sb(`users?email=eq.${encodeURIComponent(email)}&select=referral_code`);
      if (existing[0]?.referral_code) {
        return res.status(200).json({ success: true, code: existing[0].referral_code });
      }
      // Generate kode unik: GURU-XXXX
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = 'GURU-';
      for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
      // Pastikan unik
      const check = await sb(`users?referral_code=eq.${code}&select=id`);
      if (check.length) code += Math.floor(Math.random()*9);
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { referral_code: code });
      return res.status(200).json({ success: true, code });
    }

    if (action === 'check_referral_code') {
      const { code } = req.body;
      if (!code) return res.status(400).json({ error: 'Kode wajib' });
      const users = await sb(`users?referral_code=eq.${encodeURIComponent(code.toUpperCase())}&select=id,name,email`);
      if (!users.length) return res.status(404).json({ error: 'Kode referral tidak ditemukan' });
      return res.status(200).json({ success: true, referrer: users[0] });
    }

    if (action === 'get_referral_stats') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib' });
      // Ambil kode referral user
      const userRow = await sb(`users?email=eq.${encodeURIComponent(email)}&select=referral_code`);
      const code = userRow[0]?.referral_code || null;
      if (!code) return res.status(200).json({ success: true, code: null, referrals: [], total_komisi: 0 });
      // Ambil semua transaksi yang pakai kode ini
      const refs = await sb(`transactions?referral_code=eq.${encodeURIComponent(code)}&order=created_at.desc`);
      const totalKomisi = refs.reduce((sum, r) => sum + (r.komisi || 0), 0);
      const sudahCair   = refs.filter(r => r.komisi_status === 'paid').reduce((sum, r) => sum + (r.komisi || 0), 0);
      return res.status(200).json({ success: true, code, referrals: refs, total_komisi: totalKomisi, sudah_cair: sudahCair });
    }

    if (action === 'admin_get_referrals') {
      // Semua transaksi yang punya referral_code
      const refs = await sb('transactions?referral_code=not.is.null&order=created_at.desc');
      return res.status(200).json({ success: true, referrals: refs });
    }

    if (action === 'admin_mark_komisi_paid') {
      const { txn_id, referrer_email } = req.body;
      if (!txn_id) return res.status(400).json({ error: 'ID transaksi wajib' });
      await sb(`transactions?id=eq.${txn_id}`, 'PATCH', { komisi_status: 'paid', komisi_paid_at: new Date().toISOString() });
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: 'Komisi dibayar ke ' + referrer_email, target_email: referrer_email }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action tidak dikenal: ' + action });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
