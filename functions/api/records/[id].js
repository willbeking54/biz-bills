// Cloudflare Pages Function - /api/records/:id
export async function onRequest(context) {
    const { request, env, params } = context;
    const { id } = params;
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8'
    };

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
    }

    const KV_KEY = 'all_records';

    // PUT - 更新单条
    if (request.method === 'PUT') {
        try {
            const updated = await request.json();
            const raw = await env.BIZ_DATA.get(KV_KEY);
            const records = raw ? JSON.parse(raw) : [];
            const idx = records.findIndex(r => r.id === id);
            if (idx === -1) {
                return new Response(JSON.stringify({ ok: false, error: '记录不存在' }), { status: 404, headers });
            }
            records[idx] = { ...records[idx], ...updated, id };
            await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
            return new Response(JSON.stringify({ ok: true }), { headers });
        } catch (e) {
            return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers });
        }
    }

    // DELETE - 删除单条
    if (request.method === 'DELETE') {
        const raw = await env.BIZ_DATA.get(KV_KEY);
        const records = raw ? JSON.parse(raw) : [];
        const idx = records.findIndex(r => r.id === id);
        if (idx === -1) {
            return new Response(JSON.stringify({ ok: false, error: '记录不存在' }), { status: 404, headers });
        }
        records.splice(idx, 1);
        await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
        return new Response(JSON.stringify({ ok: true }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
}
