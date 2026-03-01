
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

exports.lookupUser = async(req, res, next) => {

     database = db
     if(req.params.customdb){
        databaseName = req.params.customdb
        database = databases[databaseName]
     }


    const start = Date.now();
    const userId = req.params.id;

    console.log(`lookup user: ${userId}`);

    database.get(`SELECT id, json_body FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            return res.status(500).json({ detail: "Error checking user", status: 500 });
        }

        if (!row) {
            console.log(`User not found with ID: ${userId}`);
            return res.status(404).json({ detail: "User not found", status: 404 });
        }


        const end = Date.now();
        console.log(`User lookup successfully. Time taken: ${end - start} ms`);
        return res.status(200).json(JSON.parse(row.json_body)); 
        
    });

}

exports.delete = async (req, res, next) => {

    database = db
     if(req.params.customdb){
        databaseName = req.params.customdb
        database = databases[databaseName]
     }


    const start = Date.now();
    const userId = req.params.id;

    console.log(`Delete user: ${userId}`);

    database.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            return res.status(500).json({ detail: "Error checking user", status: 500 });
        }

        if (!row) {
            console.log(`User not found with ID: ${userId}`);
            return res.status(404).json({ detail: "User not found", status: 404 });
        }

        database.run(`DELETE FROM users WHERE id = ?`, [userId], function (err) {
            if (err) {
                console.error('Error deleting user:', err.message);
                return res.status(500).json({ detail: "Error deleting user", status: 500 });
            }

            const end = Date.now();
            console.log(`User deleted successfully. Time taken: ${end - start} ms`);
            return res.status(204).send(); // No Content
        });
    });
}

exports.modify = async (req, res, next) => {

    database = db
     if(req.params.customdb){
        databaseName = req.params.customdb
        database = databases[databaseName]
     }


    const start = Date.now();
    const userId = req.params.id;

    console.log(`Modify user: ${userId}`);

    database.get(`SELECT id FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) {
            console.error('Error fetching user:', err.message);
            return res.status(500).json({ detail: "Error checking user", status: 500 });
        }

        if (!row) {
            console.log(`User not found with ID: ${userId}`);
            return res.status(404).json({ detail: "User not found", status: 404 });
        }

    
       // Simulate a delay between 50ms and 300ms
        const delay = Math.floor(Math.random() * 251);

            setTimeout(() => {
                const end = Date.now();
                console.log(`User modified successfully. Time taken: ${end - start} ms (delay: ${delay} ms)`);
                res.status(204).send(); // Response is sent after the delay
            }, delay);
    
    });
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

// Helper function to set nested property using dot notation or direct path
// Handles SCIM schema URNs specially (e.g., "urn:...:2.0:User.costCenter")
function setNestedProperty(obj, path, value) {
    // Check if this is a SCIM schema URN path
    // Pattern: urn:...:X.Y:Something.nestedProperty
    const scimSchemaMatch = path.match(/^(urn:[^.]+\.\d+:[^.]+)\.(.+)$/);
    
    if (scimSchemaMatch) {
        // Split into schema key and nested property
        const schemaKey = scimSchemaMatch[1]; // e.g., "urn:example:params:scim:schemas:extension:custom:2.0:User"
        const nestedPath = scimSchemaMatch[2]; // e.g., "costCenter" or "nested.property"
        
        // Ensure the schema object exists
        if (!obj[schemaKey] || typeof obj[schemaKey] !== 'object') {
            obj[schemaKey] = {};
        }
        
        // If there's further nesting in the property path
        if (nestedPath.includes('.')) {
            const nestedKeys = nestedPath.split('.');
            let current = obj[schemaKey];
            
            for (let i = 0; i < nestedKeys.length - 1; i++) {
                const key = nestedKeys[i];
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            current[nestedKeys[nestedKeys.length - 1]] = value;
        } else {
            // Direct property under schema
            obj[schemaKey][nestedPath] = value;
        }
        return;
    }
    
    // Handle direct property (no dots)
    if (!path.includes('.')) {
        obj[path] = value;
        return;
    }

    // Handle regular nested property with dot notation
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        // Create nested object if it doesn't exist
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    // Set the final value
    current[keys[keys.length - 1]] = value;
}

// Helper function to remove nested property using dot notation
function removeNestedProperty(obj, path) {
    // Check if this is a SCIM schema URN path
    const scimSchemaMatch = path.match(/^(urn:[^.]+\.\d+:[^.]+)\.(.+)$/);
    
    if (scimSchemaMatch) {
        const schemaKey = scimSchemaMatch[1];
        const nestedPath = scimSchemaMatch[2];
        
        if (!obj[schemaKey]) return;
        
        if (nestedPath.includes('.')) {
            const nestedKeys = nestedPath.split('.');
            let current = obj[schemaKey];
            
            for (let i = 0; i < nestedKeys.length - 1; i++) {
                if (!current[nestedKeys[i]]) return;
                current = current[nestedKeys[i]];
            }
            delete current[nestedKeys[nestedKeys.length - 1]];
        } else {
            delete obj[schemaKey][nestedPath];
        }
        return;
    }
    
    // Handle direct property
    if (!path.includes('.')) {
        delete obj[path];
        return;
    }

    // Handle regular nested property
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) return;
        current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
}

exports.    bulkUpdateAttribute = async (req, res, next) => {
    const start = Date.now();
    const { Operations } = req.body;

    // Support custom database
    let database = db;
    if (req.params.customdb) {
        const databaseName = req.params.customdb;
        database = databases[databaseName];
    }

    if (!Operations || !Array.isArray(Operations) || Operations.length === 0) {
        return res.status(400).json({
            detail: "Operations array is required",
            status: 400
        });
    }

    // Get user count limit from header (optional)
    const userCountLimit = req.headers['x-user-count'] ? parseInt(req.headers['x-user-count']) : null;
    
    if (userCountLimit !== null && (isNaN(userCountLimit) || userCountLimit <= 0)) {
        return res.status(400).json({
            detail: "x-user-count header must be a positive integer",
            status: 400
        });
    }

    const limitClause = userCountLimit ? `LIMIT ${userCountLimit}` : '';
    console.log(`Bulk update: Processing ${Operations.length} operation(s) for ${userCountLimit ? userCountLimit : 'all'} users`);

    // Fetch users (all or limited by count)
    database.all(`SELECT id, json_body FROM users ${limitClause}`, [], (err, rows) => {
        if (err) {
            console.error('Error fetching users:', err.message);
            return res.status(500).json({
                detail: "Error fetching users",
                status: 500
            });
        }

        if (rows.length === 0) {
            return res.status(200).json({
                message: "No users found to update",
                updatedCount: 0
            });
        }

        let updatedCount = 0;
        let errorCount = 0;
        const totalUsers = rows.length;

        console.log(`updating users: ${totalUsers}`);

        // Process each user
        rows.forEach((row, index) => {
            try {
                // Parse the json_body
                const userObj = JSON.parse(row.json_body);
                
                // Apply each operation
                Operations.forEach((operation) => {
                    const { op, path, value } = operation;
                    
                    switch (op) {
                        case 'add':
                        case 'replace':
                            // Both add and replace set the value at the path
                            setNestedProperty(userObj, path, value);
                            break;
                        case 'remove':
                            // Remove the property at the path
                            removeNestedProperty(userObj, path);
                            break;
                        default:
                            console.warn(`Unsupported operation: ${op}`);
                    }
                });
                
                // Stringify back
                const updatedJsonBody = JSON.stringify(userObj);

                // Update in database
                database.run(
                    `UPDATE users SET json_body = ? WHERE id = ?`,
                    [updatedJsonBody, row.id],
                    function (updateErr) {
                        if (updateErr) {
                            console.error(`Error updating user ${row.id}:`, updateErr.message);
                            errorCount++;
                        } else {
                            updatedCount++;
                        }

                        // Check if this is the last user
                        if (index === totalUsers - 1) {
                            const end = Date.now();
                            console.log(`Bulk update completed. Updated: ${updatedCount}, Errors: ${errorCount}, Time: ${end - start} ms`);
                            
                            res.status(200).json({
                                message: "Bulk update completed",
                                totalUsers: totalUsers,
                                updatedCount: updatedCount,
                                errorCount: errorCount,
                                operationsApplied: Operations.length,
                                timeTaken: `${end - start} ms`
                            });
                        }
                    }
                );
            } catch (parseErr) {
                console.error(`Error parsing json_body for user ${row.id}:`, parseErr.message);
                errorCount++;
                
                if (index === totalUsers - 1) {
                    const end = Date.now();
                    res.status(200).json({
                        message: "Bulk update completed with errors",
                        totalUsers: totalUsers,
                        updatedCount: updatedCount,
                        errorCount: errorCount,
                        timeTaken: `${end - start} ms`
                    });
                }
            }
        });
    });
}
