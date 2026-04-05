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
      const { name, email, password, jenjang } = req.body;
      // Cek email sudah ada
      const existing = await sb(`users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar.' });
      const result = await sb('users', 'POST', { name, email, password, jenjang, plan: 'gratis', credits: 5, total_gen: 0 });
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
      const { user_id, user_name, user_email, paket, price, credits_added, sender_name, transfer_date } = req.body;
      const result = await sb('transactions', 'POST', {
        user_id, user_name, user_email, paket, price, credits_added,
        sender_name, transfer_date, status: 'pending'
      });
      return res.status(200).json({ success: true, transaction: result[0] });
    }

    if (action === 'get_user_transactions') {
      const { user_email } = req.body;
      const txns = await sb(`transactions?user_email=eq.${encodeURIComponent(user_email)}&order=created_at.desc`);
      return res.status(200).json({ success: true, transactions: txns });
    }

    if (action === 'admin_get_transactions') {
      const txns = await sb('transactions?order=created_at.desc');
      return res.status(200).json({ success: true, transactions: txns });
    }

    if (action === 'admin_verify_transaction') {
      const { txn_id, user_id, user_email, paket, credits_added, admin_name, status } = req.body;
      await sb(`transactions?id=eq.${txn_id}`, 'PATCH', {
        status, verified_by: admin_name, verified_at: new Date().toISOString()
      });
      if (status === 'verified') {
        const planMap = { basic: 'basic', premium: 'premium', tahunan: 'tahunan' };
        await sb(`users?id=eq.${user_id}`, 'PATCH', {
          plan: planMap[paket] || 'premium',
          credits: credits_added === -1 ? 99999 : credits_added
        });
      }
      await sb('activity_logs', 'POST', {
        admin_name, action: `${status === 'verified' ? 'Verifikasi' : 'Tolak'} pembayaran ${paket}`,
        target_email: user_email
      }).catch(() => {});
      return res.status(200).json({ success: true });
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
      // Upsert: update jika sudah ada, insert jika belum
      const existing = await sb(`users?email=eq.${encodeURIComponent(user.email)}&select=id`);
      if (existing.length > 0) {
        await sb(`users?email=eq.${encodeURIComponent(user.email)}`, 'PATCH', {
          name: user.name, jenjang: user.jenjang,
          plan: user.plan || 'gratis',
          credits: user.credits ?? 5,
          total_gen: user.total_gen || user.totalGen || 0
        });
      } else {
        await sb('users', 'POST', {
          name: user.name, email: user.email, jenjang: user.jenjang,
          password: user.password || '', plan: user.plan || 'gratis',
          credits: user.credits ?? 5, total_gen: user.total_gen || user.totalGen || 0
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
      const patch = {};
      if (plan !== undefined) patch.plan = plan;
      if (credits !== undefined) patch.credits = credits;
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
      // Update status transaksi
      await sb(`transactions?id=eq.${id}`, 'PATCH', { status: 'verified', verified_at: new Date().toISOString() });
      // Upgrade plan user
      if (email && paket) {
        const plan = paket.includes('tahunan') ? 'tahunan' : 'premium';
        await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { plan, credits: -1 });
      }
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: `Verifikasi pembayaran ${paket||''}`, target_email: email||'' }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_reject_transaction') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'ID transaksi wajib' });
      await sb(`transactions?id=eq.${id}`, 'PATCH', { status: 'rejected' });
      await sb('activity_logs', 'POST', { admin_name: 'Admin', action: 'Tolak transaksi ID: ' + id, target_email: '' }).catch(() => {});
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action tidak dikenal: ' + action });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
