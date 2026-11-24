/**
 * @bidirekt rest consumes payments_api POST /refunds
 * @bidirekt request NewRefund
 * @bidirekt response 201 Refund
 *
 * @bidirekt schema NewRefund
 * @bidirekt field amount type=integer
 * @bidirekt field notes type=map<string> optional=true
 * @bidirekt field method union={card: CardMethod, pix: PixMethod} nullable=true
 *
 * @bidirekt schema Refund
 * @bidirekt field id type=string
 * @bidirekt field state type=RefundState
 *
 * @bidirekt schema RefundState
 * @bidirekt field code type=string
 *
 * @bidirekt schema CardMethod
 * @bidirekt field last4 type=string
 *
 * @bidirekt schema PixMethod
 * @bidirekt field key type=string
 */
export async function refund(body) {
  return body
}
