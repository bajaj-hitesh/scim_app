const express = require('express');
const router = express.Router();

const { auth } = require('./utils');

let users = require('./user')
let groups = require('./group')

router.use('/services/scim/v2', auth);

router.route('/services/scim/v2/Users')
.post(users.create)
.get(users.getPaginatedUsers)

// router.route('/services/scim/v2/Users/:id')
// .get(users.getOne)
// .patch(users.update)
// .delete(users.deleteOne)

// router.route('/scim/v2/users')
// .get(profileOperations.getProfileForTemplate);

module.exports = router;