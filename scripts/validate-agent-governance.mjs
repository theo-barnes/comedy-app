import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'AGENTS.md',
  '.github/copilot-instructions.md',
  '.github/pull_request_template.md',
  'docs/engineering-playbook.md',
  'docs/agent-workflow.md',
  'docs/decisions/README.md',
  'docs/plans/active/README.md',
  'docs/plans/completed/README.md',
];
const requiredInstructionFiles = [
  'backend.instructions.md',
  'contracts-and-data.instructions.md',
  'frontend.instructions.md',
  'testing-and-documentation.instructions.md',
];

async function requireFile(relativePath) {
  try {
    await access(path.join(root, relativePath));
  } catch {
    throw new Error(`Missing required governance file: ${relativePath}`);
  }
}

for (const requiredFile of requiredFiles) {
  await requireFile(requiredFile);
}

const instructionsDirectory = path.join(root, '.github/instructions');
const instructionFiles = (await readdir(instructionsDirectory)).filter((file) =>
  file.endsWith('.instructions.md'),
);

for (const requiredInstructionFile of requiredInstructionFiles) {
  if (!instructionFiles.includes(requiredInstructionFile)) {
    throw new Error(`Missing required scoped instruction: ${requiredInstructionFile}`);
  }
}

for (const instructionFile of instructionFiles) {
  const content = await readFile(path.join(instructionsDirectory, instructionFile), 'utf8');
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatter) {
    throw new Error(`${instructionFile} is missing YAML frontmatter`);
  }
  if (
    !/^description:\s*\S.*$/m.test(frontmatter[1]) ||
    !/^applyTo:\s*\S.*$/m.test(frontmatter[1])
  ) {
    throw new Error(
      `${instructionFile} frontmatter must contain non-empty description and applyTo fields`,
    );
  }
}

console.log(
  `Validated ${requiredFiles.length} governance files and ${instructionFiles.length} scoped instructions.`,
);
