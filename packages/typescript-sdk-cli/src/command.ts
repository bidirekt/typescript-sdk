import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { compareLocations } from './model/contract.ts'
import type { SourceLocation } from './model/contract.ts'
import { contractToProtocolBlocks } from './model/declarations-to-contract.ts'
import type { Diagnostic } from './model/diagnostic.ts'
import { defaultProtocols } from './protocols.ts'
import type { Contract, ProtocolModule } from './protocols.ts'
import { pathToShown } from './reader/location.ts'
import { projectToContract } from './reader/project-to-contract.ts'
import type { Project } from './reader/project-to-contract.ts'
import { contractToYaml } from './writer/contract-to-yaml.ts'

export type CommandResult = {
  exitCode: 0 | 1
  stderr: string
}

const usage =
  'Usage: typescript-sdk generate [--check] [--project <tsconfig>] [--out <file>]\n'

const defaultOutput = join('contracts', 'generated.yaml')

const noLocation: SourceLocation = { file: '', line: 0 }

type GenerateOptions = {
  check: boolean
  project?: string
  out?: string
}

export function runCommand(
  args: Array<string>,
  cwd: string,
  protocols: ReadonlyArray<ProtocolModule> = defaultProtocols,
): CommandResult {
  const options = argsToGenerateOptions(args)
  if (options === undefined) {
    return { exitCode: 1, stderr: usage }
  }
  return generate(options, cwd, protocols)
}

function argsToGenerateOptions(
  args: Array<string>,
): GenerateOptions | undefined {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      options: {
        check: { type: 'boolean', default: false },
        project: { type: 'string' },
        out: { type: 'string' },
      },
    })
    if (positionals.length !== 1 || positionals[0] !== 'generate') {
      return undefined
    }
    return values
  } catch {
    return undefined
  }
}

function generate(
  options: GenerateOptions,
  cwd: string,
  protocols: ReadonlyArray<ProtocolModule>,
): CommandResult {
  const located = locateProject(options, cwd)
  if ('message' in located) {
    return { exitCode: 1, stderr: `${located.message}\n` }
  }
  const { project, source, directory } = located
  const output = resolve(cwd, options.out ?? join(directory, defaultOutput))
  const read = projectToContract(project, cwd, protocols)
  const diagnostics = [
    ...read.errors.map((error) => ({ ...error, prefix: '' })),
    ...read.warnings.map((warning) => ({ ...warning, prefix: 'warning: ' })),
  ]
    .sort(compareDiagnostics)
    .map((diagnostic) => diagnosticToLine(diagnostic, cwd))
    .join('')
  if (read.errors.length > 0) {
    return failure(diagnostics)
  }
  if (isEmpty(read.contract, protocols)) {
    return failure(
      `${diagnostics}no @bidirekt/typescript-sdk annotation found in "${source}": nothing to generate\n`,
    )
  }
  const yaml = contractToYaml(read.contract, protocols)
  const shownOutput = pathToShown(output, cwd)
  if (options.check) {
    if (!existsSync(output)) {
      return failure(
        `${diagnostics}"${shownOutput}" does not exist: run generate without --check\n`,
      )
    }
    let written: string
    try {
      written = readFileSync(output, 'utf8')
    } catch (error) {
      return failure(
        `${diagnostics}cannot read "${shownOutput}": ${errorToReason(error)}\n`,
      )
    }
    if (written.replaceAll('\r\n', '\n') !== yaml) {
      return failure(
        `${diagnostics}"${shownOutput}" is out of date: run generate without --check\n`,
      )
    }
    return { exitCode: 0, stderr: diagnostics }
  }
  try {
    mkdirSync(dirname(output), { recursive: true })
    writeFileSync(output, yaml)
  } catch (error) {
    return failure(
      `${diagnostics}cannot write "${shownOutput}": ${errorToReason(error)}\n`,
    )
  }
  return { exitCode: 0, stderr: diagnostics }
}

type LocatedProject = {
  project: Project
  source: string
  directory: string
}

function locateProject(
  options: GenerateOptions,
  cwd: string,
): LocatedProject | Diagnostic {
  if (options.project !== undefined) {
    const configFile = resolve(cwd, options.project)
    if (!existsSync(configFile)) {
      return { message: `project "${options.project}" not found` }
    }
    return configFileToLocatedProject(configFile, cwd)
  }
  for (const name of ['tsconfig.json', 'jsconfig.json']) {
    const configFile = join(cwd, name)
    if (existsSync(configFile)) {
      return configFileToLocatedProject(configFile, cwd)
    }
  }
  return { project: { directory: cwd }, source: '.', directory: cwd }
}

function configFileToLocatedProject(
  configFile: string,
  cwd: string,
): LocatedProject {
  return {
    project: { configFile },
    source: pathToShown(configFile, cwd),
    directory: dirname(configFile),
  }
}

function isEmpty(
  contract: Contract,
  protocols: ReadonlyArray<ProtocolModule>,
): boolean {
  return (
    contract.schemas.length === 0 &&
    contractToProtocolBlocks(contract, protocols).every(({ protocol, block }) =>
      protocol.isEmpty(block),
    )
  )
}

function failure(stderr: string): CommandResult {
  return { exitCode: 1, stderr }
}

function errorToReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  return compareLocations(a.location ?? noLocation, b.location ?? noLocation)
}

function diagnosticToLine(
  { location, prefix, message }: Diagnostic & { prefix: string },
  cwd: string,
): string {
  if (location === undefined) {
    return `${prefix}${message}\n`
  }
  return `${pathToShown(location.file, cwd)}:${location.line} ${prefix}${message}\n`
}
