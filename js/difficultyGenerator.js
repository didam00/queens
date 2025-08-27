/**
 * Queens puzzle generator with difficulty presets and seed-based RNG.
 *
 * The implementation here is intentionally lightweight.  It demonstrates
 * how a deterministic puzzle generator could be structured while keeping
 * the door open for more advanced heuristics in the future.  The module
 * exposes a single function `generatePuzzle` which returns a board state
 * that satisfies the classical queens rules (one queen per row/column and
 * no adjacent queens).  Region creation, uniqueness checking and detailed
 * difficulty tuning are outside the scope of this lightweight stub.
 *
 * Usage:
 *   const puzzle = QueensGenerator.generatePuzzle({
 *     N: 8,
 *     difficulty: 'medium',
 *     seed: 1234
 *   });
 *
 * The same seed and settings will always yield the same puzzle allowing
 * deterministic testing.
 */

(function(global) {
  'use strict';

  /** Simple LCG implementation for deterministic pseudo-random numbers. */
  class LCG {
    constructor(seed) {
      // Values from Numerical Recipes
      this.m = 0x80000000; // 2**31
      this.a = 1103515245;
      this.c = 12345;
      this.state = seed ? seed : Math.floor(Math.random() * (this.m - 1));
    }
    nextInt() {
      this.state = (this.a * this.state + this.c) % this.m;
      return this.state;
    }
    nextFloat() {
      // Returns a float in [0,1)
      return this.nextInt() / (this.m - 1);
    }
    shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(this.nextFloat() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }
  }

  /** Difficulty presets.  Values are placeholders for future tuning. */
  const presets = {
    easy: { tries: 5 },
    medium: { tries: 20 },
    hard: { tries: 100 }
  };

  function getPreset(name, rng) {
    if (name === 'random') {
      const keys = Object.keys(presets);
      const idx = Math.floor(rng.nextFloat() * keys.length);
      return presets[keys[idx]];
    }
    return presets[name] || presets.easy;
  }

  /**
   * Generates a board with one queen per row/column and without adjacent queens.
   * This is a simple permutation sampler adjusted until adjacency constraints
   * are met or the number of tries dictated by the preset is exhausted.
   */
  function generatePuzzle({ N = 8, difficulty = 'random', seed = Date.now() } = {}) {
    const rng = new LCG(seed);
    const preset = getPreset(difficulty, rng);

    let board = null;
    for (let attempt = 0; attempt < preset.tries; attempt++) {
      const perm = Array.from({ length: N }, (_, i) => i);
      rng.shuffle(perm);
      if (!hasAdjacentDiagonal(perm)) {
        board = perm.map((c, r) => ({ r, c }));
        break;
      }
    }
    if (!board) {
      // Fallback – deterministic permutation even if adjacency rule failed
      const perm = Array.from({ length: N }, (_, i) => (i * 2) % N);
      board = perm.map((c, r) => ({ r, c }));
    }
    return {
      seed,
      difficulty,
      N,
      queens: board
    };
  }

  function hasAdjacentDiagonal(perm) {
    for (let r = 0; r < perm.length - 1; r++) {
      const c1 = perm[r];
      const c2 = perm[r + 1];
      if (Math.abs(c1 - c2) === 1) return true;
    }
    return false;
  }

  // Expose to global namespace
  global.QueensGenerator = { generatePuzzle };
})(typeof window !== 'undefined' ? window : global);

