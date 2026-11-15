const { BidirektField, BidirektSchema } = require('@bidirekt/typescript-sdk')

@BidirektSchema()
class Pet {
  /** @type {string} */
  @BidirektField()
  name
}

module.exports = { Pet }
