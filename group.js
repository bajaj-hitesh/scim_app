

var {db} = require('./db');
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

    // Parse pagination parameters with defaults for SCIM compliance
    const startIndex = parseInt(req.query.startIndex) || 1; // SCIM 1-based index
    const count = parseInt(req.query.count) || 100;          // Default to 10 users per page

    // Calculate the offset for SQL (SQLite uses 0-based index)
    const offset = startIndex - 1;

    db.all(`SELECT * FROM groups LIMIT ? OFFSET ?`, [count, offset], (err, rows) => {
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
        db.get(`SELECT COUNT(*) AS totalResults FROM groups`, (err, countResult) => {
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

    // Retrieve the group from the database
    db.get('SELECT * FROM groups WHERE id = ?', [groupId], (err, group) => {
        if (err) return res.status(500).json({ error: 'Internal server error' });
        if (!group) return res.status(404).json({ error: 'Group not found' });

         // Parse members as JSON if it's stored as a string
         group.members = group.members ? JSON.parse(group.members) : [];

                 // Apply each operation in the request body
        Operations.forEach((operation) => {
            const { op, path, value } = operation;

            switch (op) {
                case 'add':
                    if (path === 'members') {
                        group.members = [...group.members, ...value];
                    }
                    break;
                case 'remove':
                    if (path === 'members') {
                        // Remove specified members
                        group.members = group.members.filter(member => !value.includes(member.value));
                    }
                    break;
                default:
                    res.status(400).json({ error: 'Unsupported operation' });
                    return;
            }
        });


        console.log(group);
        res.status(204).json(group);

    });

}


