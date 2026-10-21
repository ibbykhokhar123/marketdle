const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const changes = require('../data/mobile/approved-ui-changes.json')
function beforeMobile(file, source) {
  const approved = changes[file]
  if (!approved) return source
  assert.equal(createHash('sha256').update(source).digest('hex'), approved.approvedHash, `${file}: unreviewed change outside the mobile update`)
  return approved.before
}
module.exports = { beforeMobile }
