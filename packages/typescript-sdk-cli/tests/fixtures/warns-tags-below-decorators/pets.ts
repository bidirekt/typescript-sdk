function Entity() {
  return (target: object): void => {}
}

function IsString() {
  return (target: object, key: string): void => {}
}

/** @bidirekt schema */
@Entity()
export class Pet {
  /** @bidirekt field */
  @IsString()
  name: string

  @IsString()
  /** @bidirekt field */
  breed: string
}

@Entity()
/** @bidirekt schema */
export class Owner {
  /** @bidirekt field */
  name: string
}
