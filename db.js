const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbDir = __dirname; // or specify a subdirectory
const files = fs.readdirSync(dbDir);

// Initialize tables for users, groups, and group memberships
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            userName TEXT NOT NULL,
            json_body text NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS groups (
            id TEXT PRIMARY KEY,
            displayName TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS group_memberships (
            groupId TEXT,
            userId TEXT,
            FOREIGN KEY(groupId) REFERENCES groups(id),
            FOREIGN KEY(userId) REFERENCES users(id),
            PRIMARY KEY (groupId, userId)
        )
    `);
});


files.forEach(file => {
    if (file.endsWith('.db')) {
        const dbName = path.basename(file, '.db');
        const dbPath = path.join(dbDir, file);
        databases[dbName] = new sqlite3.Database(dbPath);
    }
});

module.exports = { db, databases };
