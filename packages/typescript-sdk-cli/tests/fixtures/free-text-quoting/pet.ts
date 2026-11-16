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

  @BidirektField({ description: '~' })
  looksLikeTildeNull: string

  @BidirektField({ description: '' })
  empty: string

  @BidirektField({ description: '123' })
  looksLikeInteger: string

  @BidirektField({ description: '1.5' })
  looksLikeFloat: string

  @BidirektField({ description: '0x1F' })
  looksLikeHexadecimal: string

  @BidirektField({ description: '.inf' })
  looksLikeInfinity: string

  @BidirektField({ description: '2001-12-14' })
  looksLikeDate: string

  @BidirektField({ description: 'a: b' })
  colonAndSpace: string

  @BidirektField({ description: 'a:b' })
  colonWithoutSpace: string

  @BidirektField({ description: 'a #b' })
  spaceAndHash: string

  @BidirektField({ description: 'a#b' })
  hashWithoutSpace: string

  @BidirektField({ description: '#x' })
  startsWithHash: string

  @BidirektField({ description: '*x' })
  startsWithAsterisk: string

  @BidirektField({ description: '&x' })
  startsWithAmpersand: string

  @BidirektField({ description: '!x' })
  startsWithExclamationMark: string

  @BidirektField({ description: '|x' })
  startsWithPipe: string

  @BidirektField({ description: '>x' })
  startsWithGreaterThan: string

  @BidirektField({ description: "'x" })
  startsWithSingleQuote: string

  @BidirektField({ description: '"x' })
  startsWithDoubleQuote: string

  @BidirektField({ description: '%x' })
  startsWithPercent: string

  @BidirektField({ description: '@x' })
  startsWithAt: string

  @BidirektField({ description: '`x' })
  startsWithBacktick: string

  @BidirektField({ description: '- x' })
  startsWithDashAndSpace: string

  @BidirektField({ description: '? x' })
  startsWithQuestionMarkAndSpace: string

  @BidirektField({ description: '[x' })
  startsWithOpeningBracket: string

  @BidirektField({ description: ']x' })
  startsWithClosingBracket: string

  @BidirektField({ description: '{x' })
  startsWithOpeningBrace: string

  @BidirektField({ description: '}x' })
  startsWithClosingBrace: string

  @BidirektField({ description: ',x' })
  startsWithComma: string

  @BidirektField({ description: '-x' })
  startsWithDash: string

  @BidirektField({ description: '?x' })
  startsWithQuestionMark: string

  @BidirektField({ description: ':x' })
  startsWithColon: string

  @BidirektField({ description: ' x' })
  leadingSpace: string

  @BidirektField({ description: 'x ' })
  trailingSpace: string

  @BidirektField({ description: "it's" })
  apostrophe: string

  @BidirektField({ description: 'say "hi"' })
  doubleQuotesInside: string

  @BidirektField({ description: 'a\nb' })
  lineBreak: string

  @BidirektField({ description: 'a\\b' })
  backslash: string

  @BidirektField({ description: 'a\tb' })
  tab: string
}
