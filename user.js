
var { db, databases} = require('./db');
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

     let totalResults = 0
 
     // Calculate the offset for SQL (SQLite uses 0-based index)
     const offset = startIndex - 1;
 
     database = db
     if(req.params.customdb){
        databaseName = req.params.customdb
        database = databases[databaseName]
     }
        

     database.all(`SELECT users.*, COALESCE(STRING_AGG(members.groupId, ','), '') AS groups  FROM users  LEFT JOIN group_memberships members ON users.id = members.userId WHERE users.id IN (SELECT id FROM users ORDER BY id LIMIT ? OFFSET ?) GROUP BY users.id, users.userName ORDER BY users.id; `, [count, offset], (err, rows) => {
         if (err) {
             return res.status(500).json({ detail: "Error retrieving users", status: 500 });
         }

        
         // Format the response in SCIM v2.0 pagination structure
         const resources = rows.map(user => {
            let userBody = JSON.parse(user.json_body)
            if(user.groups){
                const groupsArray = user.groups.split(',').map(id => ({ value: id }));
                console.log(groupsArray);
                userBody.groups = groupsArray;
            }
            return userBody
         });

 
         // Query the total number of users to include in response
         database.get(`SELECT COUNT(*) AS totalResults FROM users`, (err, countResult) => {
             if (err) {
                 return res.status(500).json({ detail: "Error counting users", status: 500 });
             }
 
             totalResults = countResult.totalResults;
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
