

const { db, databases } = require('./db');
var uuid = require('uuid')

exports.create = async (groupName) => {
 
    db.all(`SELECT * FROM groups where displayName = '${groupName}'`, (err, rows) => {
        
        if(rows.length != 0){
            console.log(`Group already exists: ${groupName}`)
            return
        }

        const id = uuid.v4();

        console.log(`Group Object being saved: ${groupName}`)

        db.run(`INSERT INTO groups (id, displayName) VALUES (?, ?)`,
            [id, groupName],
            function (err) {
                if (err) {
                    console.log(`Group creation failed: ${groupName}`)
                }
            }
        );
    });

    
}

exports.getPaginatedGroups = async (req, res, next) => {
 
    database = db
     if(req.params.customdb){
        databaseName = req.params.customdb
        database = databases[databaseName]
     }
    
    // Parse pagination parameters with defaults for SCIM compliance
    const startIndex = parseInt(req.query.startIndex) || 1; // SCIM 1-based index
    const count = parseInt(req.query.count) || 100;          // Default to 10 users per page

    // Calculate the offset for SQL (SQLite uses 0-based index)
    const offset = startIndex - 1;

    database.all(`SELECT * FROM groups LIMIT ? OFFSET ?`, [count, offset], (err, rows) => {
        if (err) {
            return res.status(500).json({ detail: "Error retrieving groups", status: 500 });
        }

        // Format the response in SCIM v2.0 pagination structure
        const resources = rows.map(group => (
            {
                id: group.id,
                displayName: group.displayName
            }));

        // Query the total number of users to include in response
        database.get(`SELECT COUNT(*) AS totalResults FROM groups`, (err, countResult) => {
            if (err) {
                return res.status(500).json({ detail: "Error counting groups", status: 500 });
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


exports.patchGroupMembership = async (req, res, next) => {
    const groupId = req.params.id;
    const { Operations } = req.body;

    try {
        // First, verify the group exists
        const group = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Process each operation
        for (const operation of Operations) {
            const { op, path, value } = operation;

            if (path !== 'members') {
                continue; // Skip non-member operations
            }

            switch (op) {
                case 'add':
                    // Add members to group_memberships table
                    if (Array.isArray(value)) {
                        for (const member of value) {
                            const userId = member.value || member;
                            try {
                                await new Promise((resolve, reject) => {
                                    db.run(
                                        'INSERT OR IGNORE INTO group_memberships (groupId, userId) VALUES (?, ?)',
                                        [groupId, userId],
                                        function(err) {
                                            if (err) reject(err);
                                            else resolve(this);
                                        }
                                    );
                                });
                                console.log(`Added member ${userId} to group ${groupId}`);
                            } catch (err) {
                                console.error(`Error adding member ${userId}:`, err);
                            }
                        }
                    }
                    break;

                case 'remove':
                    // Remove members from group_memberships table
                    if (Array.isArray(value)) {
                        for (const member of value) {
                            const userId = member.value || member;
                            try {
                                await new Promise((resolve, reject) => {
                                    db.run(
                                        'DELETE FROM group_memberships WHERE groupId = ? AND userId = ?',
                                        [groupId, userId],
                                        function(err) {
                                            if (err) reject(err);
                                            else resolve(this);
                                        }
                                    );
                                });
                                console.log(`Removed member ${userId} from group ${groupId}`);
                            } catch (err) {
                                console.error(`Error removing member ${userId}:`, err);
                            }
                        }
                    }
                    break;

                default:
                    return res.status(400).json({ error: `Unsupported operation: ${op}` });
            }
        }

        // Retrieve updated group with members for response
        const members = await new Promise((resolve, reject) => {
            db.all(
                'SELECT userId FROM group_memberships WHERE groupId = ?',
                [groupId],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => ({ value: row.userId })));
                }
            );
        });

        const updatedGroup = {
            id: group.id,
            displayName: group.displayName,
            members: members
        };

        console.log('Updated group:', updatedGroup);
        
        // SCIM PATCH should return 204 No Content on success
        res.status(204).send();

    } catch (err) {
        console.error('Error in patchGroupMembership:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
}


