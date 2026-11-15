#!/usr/bin/env node
import { runCommand } from './command.ts'

const result = runCommand(process.argv.slice(2), process.cwd())
process.stderr.write(result.stderr)
process.exitCode = result.exitCode
