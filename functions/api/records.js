// Cloudflare Pages Function - /api/records
export async function onRequest(context) {
    const { request, env } = context;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    const KV_KEY = 'all_records';

    // GET - 获取所有记录
    if (request.method === 'GET') {
        const raw = await env.BIZ_DATA.get(KV_KEY);
        const records = raw ? JSON.parse(raw) : [];
        return new Response(JSON.stringify(records), { headers });
    }

    // POST - 新增记录
    if (request.method === 'POST') {
        try {
            const record = await request.json();
            const raw = await env.BIZ_DATA.get(KV_KEY);
            const records = raw ? JSON.parse(raw) : [];

            record.id = record.id || ('C' + Date.now().toString(36).toUpperCase());
            record.createdAt = record.createdAt || new Date().toISOString();
            records.push(record);
            records.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

            await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
            return new Response(JSON.stringify({ ok: true, id: record.id }), { headers });
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers });
        }
    }

    // PUT - 批量替换（全量同步）
    if (request.method === 'PUT') {
        try {
            const records = await request.json();
            if (!Array.isArray(records)) throw new Error('数据格式错误');
            await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
            return new Response(JSON.stringify({ ok: true, count: records.length }), { headers });
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers });
        }
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}
