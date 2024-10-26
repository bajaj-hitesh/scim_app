// utils.js
//const db = require('./db');
const uuid = require('uuid');
const basicAuth = require('basic-auth');

const parseJsonField = (field) => (field ? JSON.parse(field) : []);
const stringifyJsonField = (field) => JSON.stringify(field || []);

function createUser(userData) {
   const id = uuid.v4();
   if(userData && userData.emails)
    var emails = stringifyJsonField(userData.emails);
//    db.run(`INSERT INTO Users (id, userName, name, emails) VALUES (?, ?, ?, ?)`,
//       [id, userData.userName, userData.name, emails]
//    );
   return { id, ...userData };
}

function getUser(id, callback) {
   db.get(`SELECT * FROM Users WHERE id = ?`, [id], (err, row) => {
      if (row) {
         row.emails = parseJsonField(row.emails);
      }
      callback(err, row);
   });
}

function updateUser(id, userData) {
   const emails = stringifyJsonField(userData.emails);
   db.run(`UPDATE Users SET userName = ?, name = ?, emails = ? WHERE id = ?`,
      [userData.userName, userData.name, emails, id]
   );
}

function deleteUser(id) {
   db.run(`DELETE FROM Users WHERE id = ?`, id);
}

function auth(req, res, next) {
    const user = basicAuth(req);
    const username = process.env.username || 'admin'; // Replace with your username
    const password = process.env.password || 'Passw0rd'; // Replace with your password
    let headers = req.headers;
    const bearerToken = process.env.bearerToken || "abc";

    if (user && user.name === username && user.pass === password) {
        return next(); // Authorized
    } else if(headers && headers.authorization && headers.authorization === `Bearer ${bearerToken}`){      
      return next();
    } else {
        res.set('WWW-Authenticate', 'Basic realm="example"');
        
        // SCIM v2.0 error response format
        return res.status(401).json({
            schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
            detail: "Authentication required.",
            status: 401
        });
    }
}

module.exports = { createUser, getUser, updateUser, deleteUser, auth };
