const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'scim.db');
const db = new sqlite3.Database(dbPath);

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

module.exports = db;
