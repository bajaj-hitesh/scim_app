var express = require('express');
var uuid = require('uuid')
const applicationRouter = require('./routes');
const { auth } = require('./utils');
var {db} = require('./db');
var group = require('./group')

const groupNames = [
    "Developer",
    "Product Manager",
    "HR",
    "Sales",
    "Marketing",
    "Project Manager",
    "Release Manager",
    "Compliance Officer",
    "SRE Admin",
    "SRE Manager"
  ];

  
 groupNames.forEach(element => {
    group.create(element);
 }); 


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


