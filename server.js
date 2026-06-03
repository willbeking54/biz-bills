/**
 * 经营账单管理系统 - 服务器
 * 启动方式：node server.js
 * 然后通过 http://你的IP:3000 访问
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const ROOT_DIR = __dirname;

// MIME types
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
};

// ===== 数据读写 =====
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch (e) {
        console.error('读取数据文件失败:', e.message);
    }
    return [];
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
        return true;
    } catch (e) {
        console.error('写入数据文件失败:', e.message);
        return false;
    }
}

// 初始化：如果数据文件不存在，从 preload_data.js 中提取数据
function initData() {
    if (fs.existsSync(DATA_FILE)) {
        console.log('📂 已加载现有数据文件');
        return;
    }
    // 尝试从 preload_data.js 提取预载数据
    const preloadPath = path.join(__dirname, 'preload_data.js');
    if (fs.existsSync(preloadPath)) {
        try {
            const content = fs.readFileSync(preloadPath, 'utf-8');
            const match = content.match(/const PRELOAD_RECORDS\s*=\s*(\[[\s\S]*?\]);/);
            if (match) {
                const records = JSON.parse(match[1]);
                writeData(records);
                console.log('📥 已从 preload_data.js 导入 ' + records.length + ' 条记录');
                return;
            }
        } catch (e) {
            console.error('导入预载数据失败:', e.message);
        }
    }
    writeData([]);
    console.log('📂 已创建空白数据文件');
}

// ===== HTTP 服务器 =====
const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // ===== API 路由 =====
    if (pathname === '/api/records') {
        // GET - 获取所有记录
        if (req.method === 'GET') {
            const records = readData();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(records));
            return;
        }

        // POST - 新增记录
        if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const record = JSON.parse(body);
                    const records = readData();
                    record.id = record.id || ('S' + Date.now().toString(36).toUpperCase());
                    record.createdAt = record.createdAt || new Date().toISOString();
                    records.push(record);
                    records.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
                    if (writeData(records)) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: true, id: record.id }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: false, error: '保存失败' }));
                    }
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
            return;
        }

        // PUT - 批量更新(替换全部数据，用于同步)
        if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const records = JSON.parse(body);
                    if (!Array.isArray(records)) throw new Error('数据格式错误');
                    if (writeData(records)) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: true, count: records.length }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: false, error: '保存失败' }));
                    }
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
            return;
        }
    }

    // /api/records/:id - 单条记录操作
    const idMatch = pathname.match(/^\/api\/records\/(.+)$/);
    if (idMatch) {
        const recordId = decodeURIComponent(idMatch[1]);

        // PUT - 更新单条记录
        if (req.method === 'PUT') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const updated = JSON.parse(body);
                    const records = readData();
                    const idx = records.findIndex(r => r.id === recordId);
                    if (idx === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: false, error: '记录不存在' }));
                        return;
                    }
                    records[idx] = { ...records[idx], ...updated, id: recordId };
                    if (writeData(records)) {
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: true }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ ok: false, error: '保存失败' }));
                    }
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ ok: false, error: e.message }));
                }
            });
            return;
        }

        // DELETE - 删除单条记录
        if (req.method === 'DELETE') {
            const records = readData();
            const idx = records.findIndex(r => r.id === recordId);
            if (idx === -1) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: '记录不存在' }));
                return;
            }
            records.splice(idx, 1);
            if (writeData(records)) {
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: true }));
            } else {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ ok: false, error: '删除失败' }));
            }
            return;
        }
    }

    // ===== 静态文件服务 =====
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(ROOT_DIR, filePath);

    // 安全检查：防止路径遍历
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(filePath);
    const mimeType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error');
            }
            return;
        }
        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(data);
    });
});

// ===== 启动 =====
initData();

server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    console.log('');
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   📒 经营账单管理系统 - 服务器已启动  ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('  本机访问：');
    console.log('  👉 http://localhost:' + PORT);
    console.log('');
    console.log('  局域网访问（手机/其他电脑）：');
    Object.values(interfaces).forEach(iface => {
        iface.forEach(addr => {
            if (addr.family === 'IPv4' && !addr.internal) {
                console.log('  👉 http://' + addr.address + ':' + PORT);
            }
        });
    });
    console.log('');
    console.log('  数据文件：' + DATA_FILE);
    console.log('  按 Ctrl+C 停止服务器');
    console.log('');
});
