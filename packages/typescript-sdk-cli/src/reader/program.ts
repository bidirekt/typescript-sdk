import { dirname } from 'node:path'
import ts from 'typescript'
import type { SourceLocation } from '../model/contract.ts'
import type { Diagnostic } from '../model/diagnostic.ts'

export type Project = { configFile: string } | { directory: string }

export type ProjectProgram = {
  program: ts.Program
  sdkEntry: string
}

const sdkPackage = '@bidirekt/typescript-sdk'

const forcedOptions = {
  noEmit: true,
  strictNullChecks: true,
}

const unreadableExtendsCodes = new Set([5083, 6053])

const optionsWithoutConfig = {
  allowJs: true,
}

const extensionsWithoutConfig = [
  'ts',
  'mts',
  'cts',
  'tsx',
  'js',
  'mjs',
  'cjs',
  'jsx',
]

const excludedWithoutConfig = [
  'node_modules',
  'bower_components',
  'jspm_packages',
  '**/dist',
  '**/build',
  '**/out',
  '**/coverage',
]

function sdkResolutionFromCli(): ts.ResolvedModuleWithFailedLookupLocations {
  return ts.resolveModuleName(
    sdkPackage,
    import.meta.filename,
    {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
    ts.sys,
    undefined,
    undefined,
    ts.ModuleKind.ESNext,
  )
}

export function projectToProgram(
  project: Project,
): ProjectProgram | Diagnostic {
  const parsed = projectToParsedConfig(project)
  if ('message' in parsed) {
    return parsed
  }
  const sdkResolution = sdkResolutionFromCli()
  if (sdkResolution.resolvedModule === undefined) {
    return {
      message: `cannot find "${sdkPackage}", which @bidirekt/typescript-sdk-cli depends on: install @bidirekt/typescript-sdk-cli again`,
    }
  }
  const host = ts.createCompilerHost(parsed.options)
  host.resolveModuleNameLiterals = sdkResolvingModuleNameLiterals(
    host,
    parsed.options,
    sdkResolution,
  )
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
    host,
  })
  return { program, sdkEntry: sdkResolution.resolvedModule.resolvedFileName }
}

export function programToUserFiles({
  program,
}: ProjectProgram): Array<ts.SourceFile> {
  return program
    .getSourceFiles()
    .filter((file) => !file.isDeclarationFile && !isInstalledFile(file))
}

export function isInstalledFile(file: ts.SourceFile): boolean {
  const path = ts.sys.realpath?.(file.fileName) ?? file.fileName
  return path.split(/[\\/]/).includes('node_modules')
}

export function programToSyntaxErrors(
  projectProgram: ProjectProgram,
): Array<Diagnostic> {
  return programToUserFiles(projectProgram).flatMap((file) =>
    projectProgram.program
      .getSyntacticDiagnostics(file)
      .map(tsDiagnosticToDiagnostic)
      .map((diagnostic) => ({
        ...diagnostic,
        message: `syntax error: ${syntaxMessageToText(diagnostic.message)}: fix the code so TypeScript can parse it`,
      })),
  )
}

function syntaxMessageToText(message: string): string {
  const text = message.replace(/\.$/, '')
  return text.charAt(0).toLowerCase() + text.slice(1)
}

function projectToParsedConfig(
  project: Project,
): ts.ParsedCommandLine | Diagnostic {
  if ('directory' in project) {
    return ts.parseJsonConfigFileContent(
      {
        compilerOptions: { ...optionsWithoutConfig, ...forcedOptions },
        include: extensionsWithoutConfig.map(
          (extension) => `**/*.${extension}`,
        ),
        exclude: excludedWithoutConfig,
      },
      ts.sys,
      project.directory,
    )
  }
  const read = ts.readConfigFile(project.configFile, ts.sys.readFile)
  if (read.error) {
    return tsDiagnosticToDiagnostic(read.error)
  }
  const config = {
    ...read.config,
    compilerOptions: { ...read.config.compilerOptions, ...forcedOptions },
  }
  const parsed = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    dirname(project.configFile),
    undefined,
    project.configFile,
  )
  const unreadableExtends = parsed.errors.some((error) =>
    unreadableExtendsCodes.has(error.code),
  )
  if (unreadableExtends) {
    return {
      message:
        'cannot read the config that "extends" names: fix the path or install the package that provides it',
      location: configPropertyToLocation(project.configFile, 'extends'),
    }
  }
  const references = parsed.projectReferences ?? []
  if (parsed.fileNames.length === 0 && references.length > 0) {
    const names = references
      .map((reference) => `"${reference.originalPath ?? reference.path}"`)
      .join(', ')
    return {
      message: `the project has no files, only project references: run generate with --project and one of ${names}`,
      location: configPropertyToLocation(project.configFile, 'references'),
    }
  }
  return parsed
}

function configPropertyToLocation(
  configFile: string,
  name: string,
): SourceLocation {
  const source = ts.parseJsonText(configFile, ts.sys.readFile(configFile) ?? '')
  const root = source.statements.at(0)?.expression
  let property: ts.Node | undefined
  if (root !== undefined && ts.isObjectLiteralExpression(root)) {
    property = root.properties.find(
      (each) =>
        each.name !== undefined &&
        ts.isStringLiteral(each.name) &&
        each.name.text === name,
    )
  }
  if (property === undefined) {
    return { file: configFile, line: 1 }
  }
  const { line } = source.getLineAndCharacterOfPosition(
    property.getStart(source),
  )
  return { file: configFile, line: line + 1 }
}

function tsDiagnosticToDiagnostic(diagnostic: ts.Diagnostic): Diagnostic {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  if (diagnostic.file === undefined || diagnostic.start === undefined) {
    return { message }
  }
  const { line } = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start,
  )
  return {
    message,
    location: { file: diagnostic.file.fileName, line: line + 1 },
  }
}

function sdkResolvingModuleNameLiterals(
  host: ts.CompilerHost,
  options: ts.CompilerOptions,
  sdkResolution: ts.ResolvedModuleWithFailedLookupLocations,
): NonNullable<ts.CompilerHost['resolveModuleNameLiterals']> {
  const cache = ts.createModuleResolutionCache(
    host.getCurrentDirectory(),
    (fileName) => host.getCanonicalFileName(fileName),
    options,
  )
  return (
    literals,
    containingFile,
    redirectedReference,
    _options,
    containingSourceFile,
  ) =>
    literals.map((literal) => {
      if (literal.text === sdkPackage) {
        return sdkResolution
      }
      return ts.resolveModuleName(
        literal.text,
        containingFile,
        options,
        host,
        cache,
        redirectedReference,
        ts.getModeForUsageLocation(containingSourceFile, literal, options),
      )
    })
}
