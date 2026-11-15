import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { after, describe, it } from 'node:test'
import ts from 'typescript'
import {
  programToUserFiles,
  projectToProgram,
} from '../../src/reader/program.ts'
import type { ProjectProgram } from '../../src/reader/program.ts'

const root = mkdtempSync(join(tmpdir(), 'reader-program-'))

after(() => rmSync(root, { recursive: true, force: true }))

function writeProject(name: string, files: Record<string, string>): string {
  const directory = join(root, name)
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), content)
  }
  return directory
}

function programOf(
  result: ReturnType<typeof projectToProgram>,
): ProjectProgram {
  if ('message' in result) {
    assert.fail(`unexpected diagnostic: ${result.message}`)
  }
  return result
}

function userFileNames(projectProgram: ProjectProgram, directory: string) {
  return programToUserFiles(projectProgram)
    .map((file) => file.fileName.slice(directory.length + 1))
    .sort()
}

function propertyTypeText(projectProgram: ProjectProgram, file: string) {
  const { program } = projectProgram
  const source = program.getSourceFile(file)
  assert.ok(source, `${file} is in the program`)
  const declaration = source.statements.find(ts.isClassDeclaration)
  const property = declaration?.members.find(ts.isPropertyDeclaration)
  assert.ok(property, 'the class has a property')
  const checker = program.getTypeChecker()
  return checker.typeToString(checker.getTypeAtLocation(property))
}

describe('projectToProgram', () => {
  it('reads only the .ts files of a tsconfig that does not allow JS', () => {
    const directory = writeProject('ts-only', {
      'tsconfig.json': JSON.stringify({ include: ['src'] }),
      'src/pet.ts': 'export class Pet {}\n',
      'src/owner.js': 'export class Owner {}\n',
    })

    const projectProgram = programOf(
      projectToProgram({ configFile: join(directory, 'tsconfig.json') }),
    )

    assert.deepEqual(userFileNames(projectProgram, directory), ['src/pet.ts'])
  })

  it('reads the .ts and .js files of a tsconfig that allows JS', () => {
    const directory = writeProject('ts-and-js', {
      'tsconfig.json': JSON.stringify({
        compilerOptions: { allowJs: true },
        include: ['src'],
      }),
      'src/pet.ts': 'export class Pet {}\n',
      'src/owner.js': 'export class Owner {}\n',
    })

    const projectProgram = programOf(
      projectToProgram({ configFile: join(directory, 'tsconfig.json') }),
    )

    assert.deepEqual(userFileNames(projectProgram, directory), [
      'src/owner.js',
      'src/pet.ts',
    ])
  })

  it('keeps null in a union when the tsconfig is not strict', () => {
    const directory = writeProject('not-strict', {
      'tsconfig.json': JSON.stringify({
        compilerOptions: { strict: false, strictNullChecks: false },
      }),
      'pet.ts': 'export class Pet {\n  birthDate: string | null\n}\n',
    })

    const projectProgram = programOf(
      projectToProgram({ configFile: join(directory, 'tsconfig.json') }),
    )

    assert.equal(
      propertyTypeText(projectProgram, join(directory, 'pet.ts')),
      'string | null',
    )
  })

  it('reads a jsconfig.json project', () => {
    const directory = writeProject('jsconfig', {
      'jsconfig.json': JSON.stringify({ compilerOptions: {} }),
      'pet.js': 'export class Pet {}\n',
    })

    const projectProgram = programOf(
      projectToProgram({ configFile: join(directory, 'jsconfig.json') }),
    )

    assert.deepEqual(userFileNames(projectProgram, directory), ['pet.js'])
  })

  it('reads the TypeScript and JavaScript files under a directory without config', () => {
    const directory = writeProject('no-config', {
      'pet.ts': 'export class Pet {}\n',
      'lib/owner.js': 'export class Owner {}\n',
      'lib/shelter.mts': 'export class Shelter {}\n',
      'lib/kennel.cts': 'export class Kennel {}\n',
      'lib/toy.tsx': 'export class Toy {}\n',
      'lib/vet.mjs': 'export class Vet {}\n',
      'lib/walker.cjs': 'exports.Walker = class Walker {}\n',
      'lib/groomer.jsx': 'export class Groomer {}\n',
      'notes.md': '# notes\n',
      'node_modules/dependency/index.js': 'export const value = 1\n',
      'node_modules/dependency/index.mjs': 'export const value = 1\n',
      '.cache/cached.js': 'export const value = 1\n',
      '.cache/cached.mts': 'export const value = 1\n',
    })

    const projectProgram = programOf(projectToProgram({ directory }))

    assert.deepEqual(userFileNames(projectProgram, directory), [
      'lib/groomer.jsx',
      'lib/kennel.cts',
      'lib/owner.js',
      'lib/shelter.mts',
      'lib/toy.tsx',
      'lib/vet.mjs',
      'lib/walker.cjs',
      'pet.ts',
    ])
  })

  it('resolves the SDK without it being installed and leaves its files out of the user files', () => {
    const directory = writeProject('sdk-not-installed', {
      'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true } }),
      'pet.ts': [
        "import { BidirektSchema } from '@bidirekt/typescript-sdk'",
        '',
        '@BidirektSchema()',
        'export class Pet {}',
        '',
      ].join('\n'),
    })

    const projectProgram = programOf(
      projectToProgram({ configFile: join(directory, 'tsconfig.json') }),
    )

    assert.ok(
      projectProgram.program.getSourceFile(projectProgram.sdkEntry),
      'the SDK entry is in the program',
    )
    assert.deepEqual(userFileNames(projectProgram, directory), ['pet.ts'])
  })

  it('reports a tsconfig that cannot be read', () => {
    const configFile = join(root, 'missing', 'tsconfig.json')

    const result = projectToProgram({ configFile })

    assert.ok('message' in result, 'a diagnostic is returned')
  })
})
