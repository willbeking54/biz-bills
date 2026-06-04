// Cloudflare Pages _worker.js - 处理 API + 静态文件
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS 头
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // === API 路由 ===
        if (path.startsWith('/api/records')) {
            const KV_KEY = 'all_records';
            const idMatch = path.match(/^\/api\/records\/(.+)$/);
            const id = idMatch ? decodeURIComponent(idMatch[1]) : null;

            // GET /api/records - 获取所有
            if (!id && request.method === 'GET') {
                const raw = await env.BIZ_DATA.get(KV_KEY);
                const data = raw ? JSON.parse(raw) : [];
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // POST /api/records - 新增
            if (!id && request.method === 'POST') {
                try {
                    const record = await request.json();
                    const raw = await env.BIZ_DATA.get(KV_KEY);
                    const records = raw ? JSON.parse(raw) : [];
                    record.id = record.id || ('C' + Date.now().toString(36).toUpperCase());
                    record.createdAt = record.createdAt || new Date().toISOString();
                    records.push(record);
                    records.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
                    await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
                    return new Response(JSON.stringify({ ok: true, id: record.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                } catch (e) {
                    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            }

            // PUT /api/records - 批量替换
            if (!id && request.method === 'PUT') {
                try {
                    const records = await request.json();
                    if (!Array.isArray(records)) throw new Error('数据格式错误');
                    await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
                    return new Response(JSON.stringify({ ok: true, count: records.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                } catch (e) {
                    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                }
            }

            // PUT /api/records/:id - 更新单条
            if (id && request.method === 'PUT') {
                const updated = await request.json();
                const raw = await env.BIZ_DATA.get(KV_KEY);
                const records = raw ? JSON.parse(raw) : [];
                const idx = records.findIndex(r => r.id === id);
                if (idx === -1) return new Response(JSON.stringify({ ok: false, error: '不存在' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                records[idx] = { ...records[idx], ...updated, id };
                await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
                return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            // DELETE /api/records/:id - 删除
            if (id && request.method === 'DELETE') {
                const raw = await env.BIZ_DATA.get(KV_KEY);
                const records = raw ? JSON.parse(raw) : [];
                const idx = records.findIndex(r => r.id === id);
                if (idx === -1) return new Response(JSON.stringify({ ok: false, error: '不存在' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
                records.splice(idx, 1);
                await env.BIZ_DATA.put(KV_KEY, JSON.stringify(records));
                return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // === 静态文件：交给 Pages 处理 ===
        return env.ASSETS.fetch(request);
    }
};
