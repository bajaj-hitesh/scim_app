var express = require('express');
var uuid = require('uuid')
const { createUser, getUser, updateUser, deleteUser, auth } = require('./utils');
var db = require('./db');

var app = express();
app.use('/', auth);

app.use(express.json());



app.get('/', function (req, res) {
  res.send('Hello World!');
});

// SCIM endpoint for creating a user
app.post('/scim/v2/users', (req, res) => {

    let user = req.body;
    const { userName } = user;
    const id = uuid.v4();
    user.id = id;

    console.log(`User Object being saved: ${user}`)
    const profileStr = JSON.stringify(user);

    db.run(`INSERT INTO users (id, userName, json_body) VALUES (?, ?, ?)`,
        [id, userName, profileStr],
        function (err) {
            if (err) {
                return res.status(400).json({ detail: "User creation failed", status: 400 });
            }
            res.status(201).json(user);
        }
    );
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});


// SCIM endpoint for retrieving only the JSON field for all users
app.get('/scim/v2/users', (req, res) => {

    const startIndex = parseInt(req.query.startIndex) || 1; // SCIM 1-based index
    const count = parseInt(req.query.count) || 100;          // Default to 10 users per page

    // Calculate the offset for SQL (SQLite uses 0-based index)
    const offset = startIndex - 1;


    db.all(`SELECT id,json_body FROM users LIMIT ? OFFSET ?`,[count, offset], (err, rows) => {
        if (err) {
            return res.status(500).json({ detail: "Error retrieving users", status: 500 });
        }


        // Format response as per SCIM v2.0 list response with only the JSON field
        const scimResponse = {
            schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
            totalResults: rows.length,
            Resources: rows.map(user => (JSON.parse(user.json_body)))};

        res.json(scimResponse);
    });
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


