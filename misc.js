
const path = require('path');

exports.download = async (req, res, next) => {

    const dbPath = path.join(__dirname, 'scim.db');
    console.log(`Going to download file...${dbPath}`)
    res.sendFile(dbPath)
    console.log(`file downloaded`)

}
