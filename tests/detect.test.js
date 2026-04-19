import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/exec', () => ({
  getExecOutput: jest.fn(),
}));

const { analyzeCommit } = await import('../src/core/detect.js');
const { getExecOutput } = await import('@actions/exec');

describe('analyzeCommit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect AI tools from git commit trailers', async () => {
    getExecOutput.mockImplementation(async (cmd, args) => {
      if (args.includes('--is-shallow-repository')) return { exitCode: 0, stdout: "false\n" };
      if (args.includes('--format=%B')) {
        return {
          exitCode: 0,
          stdout: "Add some feature\n\nAI-generated-by: Copilot\n"
        };
      }
      if (args.includes('--numstat')) {
        return {
          exitCode: 0,
          stdout: "10\t5\tsrc/index.js\n2\t0\tpackage.json\n"
        };
      }
      return { exitCode: 0, stdout: "" };
    });

    const result = await analyzeCommit('/fake/repo', 'HEAD');

    expect(result).toEqual({
      sha: 'HEAD',
      aiTool: 'Copilot',
      confidence: 100,
      files: 2,
      linesAdded: 12,
      linesRemoved: 5,
      methods: ['trailer']
    });
  });

  it('should fallback to heuristic detection and parse diffs correctly when trailer is missing', async () => {
    getExecOutput.mockImplementation(async (cmd, args) => {
      if (args.includes('--is-shallow-repository')) return { exitCode: 0, stdout: "false\n" };
      if (args.includes('--format=%B')) {
        return { exitCode: 0, stdout: "Update logic\n" };
      }
      if (args.includes('--numstat')) {
        return { exitCode: 0, stdout: "100\t0\tnew-file.js\n" };
      }
      if (args.length === 2 && args[0] === 'show' && args[1] === 'HEAD') {
        return {
          exitCode: 0,
          stdout: "diff --git a/new-file.js b/new-file.js\n+// AI generated code below\n"
        };
      }
      return { exitCode: 0, stdout: "" };
    });

    const result = await analyzeCommit('/fake/repo', 'HEAD');

    expect(result).toEqual({
      sha: 'HEAD',
      aiTool: 'Unknown AI',
      confidence: 85,
      files: 1,
      linesAdded: 100,
      linesRemoved: 0,
      methods: ['heuristic-explicit']
    });
  });

  it('should return empty detection if no AI footprint is found', async () => {
    getExecOutput.mockImplementation(async (cmd, args) => {
      if (args.includes('--is-shallow-repository')) return { exitCode: 0, stdout: "false\n" };
      if (args.includes('--format=%B')) {
        return { exitCode: 0, stdout: "Fix bug\n" };
      }
      if (args.includes('--numstat')) {
        return { exitCode: 0, stdout: "1\t1\tbug.js\n-\t-\tbinary.bin\n" };
      }
      if (args.length === 2 && args[0] === 'show' && args[1] === 'HEAD') {
        return {
          exitCode: 0,
          stdout: "diff --git a/bug.js b/bug.js\n+ const x = 1;\n- const x = 0;\n"
        };
      }
      return { exitCode: 0, stdout: "" };
    });

    const result = await analyzeCommit('/fake/repo', 'HEAD');

    expect(result).toEqual({
      sha: 'HEAD',
      aiTool: null,
      confidence: 0,
      files: 2,  // bug.js and binary.bin
      linesAdded: 1, // Only numeric updates
      linesRemoved: 1,
      methods: []
    });
  });

  it('should throw an error if checkout is shallow', async () => {
    getExecOutput.mockImplementation(async (cmd, args) => {
      if (args.includes('--is-shallow-repository')) {
        return { exitCode: 0, stdout: "true\n" };
      }
      return { exitCode: 0, stdout: "" };
    });

    await expect(analyzeCommit('/fake/repo', 'HEAD')).rejects.toThrow('Shallow repository checkout detected. Please set fetch-depth: 0 in your checkout step.');
  });
});
