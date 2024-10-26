
var db = require('./db');
var uuid = require('uuid')


exports.create = async(req, res, next) => {
    const start = Date.now();
    
    let user = req.body;
    const { userName } = user;
    const id = uuid.v4();
    user.id = id;

    console.log(`User Object being saved: ${JSON.stringify(user)}`)
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

    const end = Date.now();
    console.log(`time taken for create user: ${end - start} ms`);
}

exports.getPaginatedUsers = async(req, res, next) => {

     // Parse pagination parameters with defaults for SCIM compliance
     const startIndex = parseInt(req.query.startIndex) || 1; // SCIM 1-based index
     const count = parseInt(req.query.count) || 100;          // Default to 10 users per page
 
     // Calculate the offset for SQL (SQLite uses 0-based index)
     const offset = startIndex - 1;
 
     db.all(`SELECT * FROM users LIMIT ? OFFSET ?`, [count, offset], (err, rows) => {
         if (err) {
             return res.status(500).json({ detail: "Error retrieving users", status: 500 });
         }
 
         // Format the response in SCIM v2.0 pagination structure
         const resources = rows.map(user => (JSON.parse(user.json_body)));
 
         // Query the total number of users to include in response
         db.get(`SELECT COUNT(*) AS totalResults FROM users`, (err, countResult) => {
             if (err) {
                 return res.status(500).json({ detail: "Error counting users", status: 500 });
             }
 
             const scimResponse = {
                 schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
                 totalResults: countResult.totalResults,
                 startIndex: startIndex,
                 itemsPerPage: count,
                 Resources: resources
             };
 
             res.json(scimResponse);
         });
     });


}
