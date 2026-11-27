const { BidirektConsumer } = require('@bidirekt/typescript-sdk')

class ClinicsClient {
  @BidirektConsumer({ provider: 'petstore_api', method: 'GET', path: '/pets', responses: { 200: null } })
  pets() {}
}

module.exports = { ClinicsClient }
