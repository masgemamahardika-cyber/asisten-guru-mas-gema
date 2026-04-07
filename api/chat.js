// ASISTEN GURU BY MAS GEMA — api/chat.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

async function sb(path, method = 'GET', body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
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

    if (action === 'ai' || !action) {
      const { model, max_tokens, system, messages } = req.body;
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({ model: model || 'claude-sonnet-4-20250514', max_tokens: max_tokens || 4000, system, messages })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'API Error' });
      return res.status(200).json(data);
    }

    if (action === 'user_register') {
      const { name, email, password, jenjang, wa, device_id } = req.body;
      const existing = await sb(`users?email=eq.${encodeURIComponent(email)}&select=id`);
      if (existing.length > 0) return res.status(400).json({ error: 'Email sudah terdaftar.' });
      const result = await sb('users', 'POST', {
        name, email, password, jenjang,
        wa: wa || '', device_id: device_id || '',
        plan: 'gratis', credits: 3, total_gen: 0,
        credit_date: new Date().toISOString().slice(0, 10)
      });
      return res.status(200).json({ success: true, user: result[0] });
    }

    if (action === 'user_login') {
      const { email, password } = req.body;
      const users = await sb(`users?email=eq.${encodeURIComponent(email)}&password=eq.${encodeURIComponent(password)}&select=*`);
      if (!users.length) return res.status(401).json({ error: 'Email atau password salah.' });
      return res.status(200).json({ success: true, user: users[0] });
    }

    if (action === 'user_get') {
      const { email } = req.body;
      const users = await sb(`users?email=eq.${encodeURIComponent(email)}&select=*`);
      if (!users.length) return res.status(404).json({ error: 'User tidak ditemukan.' });
      return res.status(200).json({ success: true, user: users[0] });
    }

    if (action === 'user_sync') {
      const { user } = req.body;
      if (!user || !user.email) return res.status(400).json({ error: 'Email wajib' });
      const existing = await sb(`users?email=eq.${encodeURIComponent(user.email)}&select=id`);
      if (existing.length > 0) {
        await sb(`users?email=eq.${encodeURIComponent(user.email)}`, 'PATCH', {
          name: user.name, jenjang: user.jenjang,
          wa: user.wa || '', device_id: user.deviceId || user.device_id || '',
          credits: user.credits ?? 3,
          total_gen: user.total_gen || user.totalGen || 0,
          credit_date: user.creditDate || new Date().toISOString().slice(0, 10)
        });
      } else {
        await sb('users', 'POST', {
          name: user.name, email: user.email, jenjang: user.jenjang,
          password: user.password || '', wa: user.wa || '',
          device_id: user.deviceId || '', plan: user.plan || 'gratis',
          credits: user.credits ?? 3, total_gen: user.totalGen || 0,
          credit_date: user.creditDate || new Date().toISOString().slice(0, 10)
        }).catch(() => {});
      }
      return res.status(200).json({ success: true });
    }

    if (action === 'create_transaction') {
      const { user_id, user_name, user_email, paket, price, credits_added, sender_name, transfer_date, wa_user } = req.body;
      const result = await sb('transactions', 'POST', {
        user_id, user_name, user_email, paket, price, credits_added,
        sender_name, transfer_date, wa_user, status: 'pending'
      });
      return res.status(200).json({ success: true, transaction: result[0] });
    }

    if (action === 'get_user_transactions') {
      const emailParam = req.body.email || req.body.user_email;
      if (!emailParam) return res.status(400).json({ error: 'Email wajib' });
      try {
        const txns = await sb(`transactions?user_email=eq.${encodeURIComponent(emailParam)}&order=created_at.desc`);
        return res.status(200).json({ success: true, transactions: txns || [] });
      } catch(e) {
        return res.status(200).json({ success: true, transactions: [] });
      }
    }

    if (action === 'get_all_users' || action === 'admin_get_users') {
      const users = await sb('users?select=*&order=created_at.desc');
      return res.status(200).json({ success: true, users });
    }

    if (action === 'get_all_transactions' || action === 'admin_get_transactions') {
      const transactions = await sb('transactions?order=created_at.desc');
      return res.status(200).json({ success: true, transactions });
    }

    if (action === 'admin_get_logs') {
      const logs = await sb('activity_logs?order=created_at.desc&limit=50');
      return res.status(200).json({ success: true, logs });
    }

    if (action === 'admin_update_user') {
      const { email, plan, credits } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib' });
      const DAILY = { gratis:3, reguler_bulanan:10, premium_bulanan:30, reguler_tahunan:10, premium_tahunan:30 };
      const patch = {};
      if (plan !== undefined) { patch.plan = plan; patch.credits = credits !== undefined ? credits : (DAILY[plan] || 3); }
      if (credits !== undefined) patch.credits = credits;
      patch.credit_date = req.body.credit_date || new Date().toISOString().slice(0, 10);
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', patch);
      await sb('activity_logs', 'POST', { admin_name:'Admin', action:`Update ${email}`, target_email: email }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_verify_transaction') {
      const { id, email, paket } = req.body;
      if (!id) return res.status(400).json({ error: 'ID transaksi wajib' });
      const planMap = { premium:'premium_bulanan', premium_bulanan:'premium_bulanan', reguler:'reguler_bulanan', reguler_bulanan:'reguler_bulanan', tahunan:'premium_tahunan', premium_tahunan:'premium_tahunan', reguler_tahunan:'reguler_tahunan' };
      const DAILY = { gratis:3, reguler_bulanan:10, premium_bulanan:30, reguler_tahunan:10, premium_tahunan:30 };
      const raw = (paket||'').toLowerCase().replace(/\s+/g,'_').replace(/[^a-z_]/g,'');
      const plan = planMap[raw] || 'premium_bulanan';
      const dailyCredits = DAILY[plan] || 30;
      const now = new Date().toISOString();
      try {
        await sb(`transactions?id=eq.${id}`, 'PATCH', { status: 'verified', verified_at: now });
      } catch(e) {
        if (email) await sb(`transactions?user_email=eq.${encodeURIComponent(email)}&status=eq.pending`, 'PATCH', { status: 'verified', verified_at: now });
      }
      if (email) await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { plan, credits: dailyCredits, credit_date: now.slice(0,10) });
      await sb('activity_logs', 'POST', { admin_name:'Admin', action:`Verifikasi ${paket}`, target_email: email||'' }).catch(()=>{});
      return res.status(200).json({ success: true, plan, dailyCredits });
    }

    if (action === 'admin_reject_transaction') {
      const { id, email } = req.body;
      if (!id) return res.status(400).json({ error: 'ID wajib' });
      await sb(`transactions?id=eq.${id}`, 'PATCH', { status: 'rejected', verified_at: new Date().toISOString() });
      await sb('activity_logs', 'POST', { admin_name:'Admin', action:'Tolak transaksi', target_email: email||'' }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_reset_password') {
      const { email, new_password } = req.body;
      if (!email || !new_password) return res.status(400).json({ error: 'Email dan password wajib' });
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { password: new_password });
      await sb('activity_logs', 'POST', { admin_name:'Admin', action:'Reset password', target_email: email }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'admin_delete_user') {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email wajib' });
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'DELETE');
      await sb('activity_logs', 'POST', { admin_name:'Admin', action:'Hapus user', target_email: email }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'save_referral_code') {
      const { email, code } = req.body;
      await sb(`users?email=eq.${encodeURIComponent(email)}`, 'PATCH', { referral_code: code }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    if (action === 'get_referral_stats') {
      try {
        const refs = await sb(`referrals?referrer_code=eq.${encodeURIComponent(req.body.code||'')}&order=created_at.desc`);
        return res.status(200).json({ success: true, referrals: refs });
      } catch(e) {
        return res.status(200).json({ success: true, referrals: [] });
      }
    }

    if (action === 'admin_get_referrals') {
      try {
        const refs = await sb('referrals?order=created_at.desc');
        return res.status(200).json({ success: true, referrals: refs });
      } catch(e) {
        return res.status(200).json({ success: true, referrals: [] });
      }
    }

    if (action === 'admin_mark_referral_paid') {
      const { id } = req.body;
      await sb(`referrals?id=eq.${id}`, 'PATCH', { paid: true, paid_at: new Date().toISOString() }).catch(()=>{});
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Action tidak dikenal: ' + action });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
