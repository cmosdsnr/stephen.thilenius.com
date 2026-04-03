import express from "express";

const makeInvalid = (body: any) => {
  if (body.word === undefined) {
    return { error: "no letter given" };
  }
  // add the word to the frontend file, space separate
};

/**
 * Creates an Express router for handling Blossom word game operations.
 *
 * Provides the following routes:
 * - POST /getWordList - Generate word lists based on letter constraints
 *
 * @returns An Express Router with Blossom game endpoints
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api/wordle', wordleRoutes());
 * ```
 */
export const wordleRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * POST /getWordList
   * Generate valid words for Blossom puzzle based on required and available letters.
   */
  router.post("/makeInvalid", (req, res) => res.json(makeInvalid(req.body)));
  return router;
};
