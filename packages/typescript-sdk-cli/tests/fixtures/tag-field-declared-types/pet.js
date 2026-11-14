/** @bidirekt schema */
export class Pet {
  /** @bidirekt field type=integer[] */
  scores

  /** @bidirekt field type=map<float> */
  weights

  /** @bidirekt field type=string
   *  @type {Date} */
  bornAt

  /** @bidirekt field type=integer[][]
   *  @type {number[][] | null} */
  grid

  /** @bidirekt field type=map<float[]> optional=true */
  readings
}
