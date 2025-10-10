const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

// Define db and databases at module level
const dbPath = path.join(__dirname, 'scim.db');
const db = new sqlite3.Database(dbPath);
const databases = {};

// First, unzip any zip files in the directory
const baseFolder = './';        // folder containing your zip files
const outputBase = './';    // where to extract contents

// Ensure output folder exists
if (!fs.existsSync(outputBase)) {
  fs.mkdirSync(outputBase, { recursive: true });
}

// Function to unzip files and continue with database initialization
const unzipAndInitialize = () => {
  fs.readdir(baseFolder, (err, files) => {
    if (err) {
      console.error('Error reading folder:', err);
      return;
    }

    // Filter only .zip files
    const zipFiles = files.filter(file => file.endsWith('.zip'));
    
    if (zipFiles.length === 0) {
      console.log('No zip files found, continuing with database initialization');
      initializeDatabases();
      return;
    }

    let extractedCount = 0;
    
    zipFiles.forEach(file => {
      const filePath = path.join(baseFolder, file);
      const outputFolder = outputBase;

      // Ensure output folder exists for this zip
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      console.log(`Extracting ${file} → ${outputFolder}`);

      fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: outputFolder }))
        .on('close', () => {
          console.log(`✅ Finished extracting ${file}`);

          // Delete the zip file after successful extraction
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error(`❌ Error deleting ${file}:`, err);
            } else {
              console.log(`🗑️ Deleted ${file}`);
            }
          });
          
          extractedCount++;
          
          // If all zip files have been processed, wait and then initialize databases
          if (extractedCount === zipFiles.length) {
            console.log('All zip files extracted, waiting 10 seconds before initializing databases...');
            setTimeout(() => {
              console.log('Continuing with database initialization after waiting');
              initializeDatabases();
            }, 10000); // 10 seconds
          }
        });
    });
  });
};

// Function to initialize databases
const initializeDatabases = () => {
  const dbDir = __dirname; // or specify a subdirectory
  const files = fs.readdirSync(dbDir);

  files.forEach(file => {
    console.log(`filename: ${file}`);
    if (file.endsWith('.db')) {
        const dbName = path.basename(file, '.db');
        const dbPath = path.join(dbDir, file);
        databases[dbName] = new sqlite3.Database(dbPath);
    }
});

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

};

// Start the unzipping process, which will then initialize databases
unzipAndInitialize();

module.exports = { db, databases };
