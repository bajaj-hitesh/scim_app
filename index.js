var express = require('express');
var uuid = require('uuid')
const applicationRouter = require('./routes');
const { auth } = require('./utils');
var group = require('./group')
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const baseFolder = './';        // folder containing your zip files
const outputBase = './';    // where to extract contents

// Ensure output folder exists
if (!fs.existsSync(outputBase)) {
  fs.mkdirSync(outputBase, { recursive: true });
}

fs.readdir(baseFolder, (err, files) => {
  if (err) {
    console.error('Error reading folder:', err);
    return;
  }

  // Filter only .zip files
  const zipFiles = files.filter(file => file.endsWith('.zip'));

  zipFiles.forEach(file => {
    const filePath = path.join(baseFolder, file);
    const outputFolder = outputBase

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
      });
  });
});

// Add a sleep of 10 seconds to make sure the files are unzipped completely
console.log('Waiting 10 seconds to ensure all files are properly unzipped...');
setTimeout(() => {
  console.log('Continuing with application startup after waiting');
  
  var {db} = require('./db');
}, 30000); // 30 seconds

// const groupNames = [
//     "Developer",
//     "Product Manager",
//     "HR",
//     "Sales",
//     "Marketing",
//     "Project Manager",
//     "Release Manager",
//     "Compliance Officer",
//     "SRE Admin",
//     "SRE Manager"
//   ];

  
//  groupNames.forEach(element => {
//     group.create(element);
//  }); 

//  for (let i = 1; i <= 500; i++) {
//   // padStart makes numbers like 1 → 001, 2 → 002
//   const groupName = `Grp${i.toString().padStart(3, '0')}`;
//   console.log(groupName);
//   group.create(groupName);
// }

var app = express();
app.use('/', auth);

app.use(express.json({
    type: ['application/json', 'application/scim+json']
}));

app.use('/', require('./routes'));


app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
  });

// SCIM endpoint for deleting a user by ID
app.delete('/scim/v2/Users/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
        if (err) {
            return res.status(500).json({ detail: "Error deleting user", status: 500 });
        }
        if (this.changes === 0) {
            // No user found with the given ID
            return res.status(404).json({ detail: "User not found", status: 404 });
        }
        // User deleted successfully
        res.status(204).send(); // SCIM-compliant success response with no content
    });
});


