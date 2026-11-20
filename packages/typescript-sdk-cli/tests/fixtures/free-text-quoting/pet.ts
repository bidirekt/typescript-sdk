import { BidirektField, BidirektSchema } from '@bidirekt/typescript-sdk'

@BidirektSchema()
export class Pet {
  @BidirektField({ description: 'plain text' })
  plainText: string

  @BidirektField({ description: 'yes' })
  looksLikeYes: string

  @BidirektField({ description: 'on' })
  looksLikeOn: string

  @BidirektField({ description: 'true' })
  looksLikeTrue: string

  @BidirektField({ description: 'null' })
  looksLikeNull: string

  @BidirektField({ name: '~' })
  looksLikeTildeNull: string

  @BidirektField({ description: '123' })
  looksLikeInteger: string

  @BidirektField({ description: '0x1F' })
  looksLikeHexadecimal: string

  @BidirektField({ name: '2001-12-14' })
  looksLikeDate: string

  @BidirektField({ name: 'a: b' })
  colonAndSpace: string

  @BidirektField({ name: 'a:b' })
  colonWithoutSpace: string

  @BidirektField({ name: 'a #b' })
  spaceAndHash: string

  @BidirektField({ name: 'a#b' })
  hashWithoutSpace: string

  @BidirektField({ name: '#x' })
  startsWithHash: string

  @BidirektField({ name: '*x' })
  startsWithAsterisk: string

  @BidirektField({ name: '&x' })
  startsWithAmpersand: string

  @BidirektField({ name: '!x' })
  startsWithExclamationMark: string

  @BidirektField({ name: '|x' })
  startsWithPipe: string

  @BidirektField({ name: '>x' })
  startsWithGreaterThan: string

  @BidirektField({ name: "'x" })
  startsWithSingleQuote: string

  @BidirektField({ name: '"x' })
  startsWithDoubleQuote: string

  @BidirektField({ name: '%x' })
  startsWithPercent: string

  @BidirektField({ name: '@x' })
  startsWithAt: string

  @BidirektField({ name: '`x' })
  startsWithBacktick: string

  @BidirektField({ name: '- x' })
  startsWithDashAndSpace: string

  @BidirektField({ name: '? x' })
  startsWithQuestionMarkAndSpace: string

  @BidirektField({ name: ',x' })
  startsWithComma: string

  @BidirektField({ name: '-x' })
  startsWithDash: string

  @BidirektField({ name: '?x' })
  startsWithQuestionMark: string

  @BidirektField({ name: ':x' })
  startsWithColon: string

  @BidirektField({ name: ' x' })
  leadingSpace: string

  @BidirektField({ name: 'x ' })
  trailingSpace: string

  @BidirektField({ name: "it's" })
  apostrophe: string

  @BidirektField({ name: 'say "hi"' })
  doubleQuotesInside: string

  @BidirektField({ name: 'a\\b' })
  backslash: string
}
