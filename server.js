const express = require('express');
const initSqlJs = require('sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

let db;

// 初始化数据库
async function initDatabase() {
    const SQL = await initSqlJs();
    
    const dbFile = 'access_logs.db';
    if (fs.existsSync(dbFile)) {
        const fileBuffer = fs.readFileSync(dbFile);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    db.run(`CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        student_name TEXT,
        page TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT
    )`);
    
    saveDatabase();
    console.log('数据库连接成功');
}

function saveDatabase() {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync('access_logs.db', buffer);
}

app.use(express.json());
app.use(express.static('.'));

// 记录访问日志API
app.post('/api/log-access', (req, res) => {
    const { student_id, student_name, page, action } = req.body;
    const ip_address = req.ip;
    const user_agent = req.headers['user-agent'];
    
    db.run(
        'INSERT INTO access_logs (student_id, student_name, page, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [student_id, student_name, page, action, ip_address, user_agent]
    );
    saveDatabase();
    res.json({ success: true });
});

// 查询访问日志API
app.get('/api/access-logs', (req, res) => {
    const { page = 1, limit = 20, student_id } = req.query;
    const offset = (page - 1) * limit;
    
    let results, countResult;
    if (student_id) {
        results = db.exec(`SELECT * FROM access_logs WHERE student_id = '${student_id}' ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`);
        countResult = db.exec(`SELECT COUNT(*) as total FROM access_logs WHERE student_id = '${student_id}'`);
    } else {
        results = db.exec(`SELECT * FROM access_logs ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`);
        countResult = db.exec('SELECT COUNT(*) as total FROM access_logs');
    }
    
    const rows = results.length > 0 ? results[0].values.map(row => {
        const columns = results[0].columns;
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    }) : [];
    
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;
    
    res.json({
        data: rows,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit)
    });
});

// 统计数据API
app.get('/api/statistics', (req, res) => {
    const totalResult = db.exec('SELECT COUNT(*) as total FROM access_logs');
    const todayResult = db.exec("SELECT COUNT(*) as today FROM access_logs WHERE DATE(timestamp) = DATE('now')");
    const usersResult = db.exec('SELECT COUNT(DISTINCT student_id) as unique_users FROM access_logs');
    
    res.json({
        total_access: totalResult[0]?.values[0][0] || 0,
        today_access: todayResult[0]?.values[0][0] || 0,
        unique_users: usersResult[0]?.values[0][0] || 0
    });
});

// 先初始化数据库，再启动服务器
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`服务器运行在 http://localhost:${PORT}`);
        if (process.send) {
            process.send('server-ready');
        }
    });
});