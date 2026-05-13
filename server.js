const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// 连接数据库
const db = new sqlite3.Database('access_logs.db', (err) => {
    if (err) console.error('数据库连接失败:', err.message);
    else console.log('✅ 数据库连接成功');
});

// 创建访问日志表
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

app.use(express.json());
app.use(express.static('.'));

// 记录访问日志API
app.post('/api/log-access', (req, res) => {
    const { student_id, student_name, page, action } = req.body;
    const ip_address = req.ip;
    const user_agent = req.headers['user-agent'];
    
    db.run(
        'INSERT INTO access_logs (student_id, student_name, page, action, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
        [student_id, student_name, page, action, ip_address, user_agent],
        (err) => {
            if (err) {
                console.error('插入失败:', err.message);
                res.status(500).json({ success: false });
            } else {
                res.json({ success: true });
            }
        }
    );
});

// 查询访问日志API
app.get('/api/access-logs', (req, res) => {
    const { page = 1, limit = 20, student_id } = req.query;
    let query = 'SELECT * FROM access_logs ORDER BY timestamp DESC';
    let params = [];
    
    if (student_id) {
        query = 'SELECT * FROM access_logs WHERE student_id = ? ORDER BY timestamp DESC';
        params.push(student_id);
    }
    
    const offset = (page - 1) * limit;
    db.all(query + ' LIMIT ? OFFSET ?', [...params, limit, offset], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            db.get('SELECT COUNT(*) as total FROM access_logs', (err, count) => {
                res.json({
                    data: rows,
                    total: count?.total || 0,
                    page: parseInt(page),
                    limit: parseInt(limit)
                });
            });
        }
    });
});

// 统计数据API
app.get('/api/statistics', (req, res) => {
    db.get('SELECT COUNT(*) as total FROM access_logs', (err, total) => {
        db.get("SELECT COUNT(*) as today FROM access_logs WHERE DATE(timestamp) = DATE('now')", (err, today) => {
            db.get('SELECT COUNT(DISTINCT student_id) as unique_users FROM access_logs', (err, users) => {
                res.json({
                    total_access: total?.total || 0,
                    today_access: today?.today || 0,
                    unique_users: users?.unique_users || 0
                });
            });
        });
    });
});

app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});