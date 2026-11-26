const sdk = require('@bidirekt/typescript-sdk')

class LabsClient {
  @sdk.BidirektConsumer({ provider: 'petstore_api', method: 'GET', path: '/labs', responses: { 200: null } })
  results() {}
}

module.exports = { LabsClient }
