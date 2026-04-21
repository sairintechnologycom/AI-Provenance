import { analyzeCommit } from './src/core/detect.js';

async function test() {
  try {
    console.log('Starting test...');
    // We don't care if git fails, we want to see if analyzeCommitData is defined
    await analyzeCommit('.', 'HEAD');
    console.log('Test finished successfully (logic reached)');
  } catch (err) {
    console.error('Caught error:', err.message);
    if (err.message.includes('analyzeCommitData is not defined')) {
      console.error('REPRODUCED: analyzeCommitData is not defined!');
    }
  }
}

test();
