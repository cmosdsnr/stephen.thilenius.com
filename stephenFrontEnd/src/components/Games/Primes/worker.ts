import { scanRange } from './evaluate';

// Message in:  [sieve: Uint32Array, sieveLen: number, from: number, to: number]
// Message out: { type: 'complete', results: { data: Uint32Array, duration: number } }
// The Uint32Array buffer is transferred (zero-copy) back to the main thread.

self.addEventListener('message', (e) => {
  const [sieve, sieveLen, from, to]: [Uint32Array, number, number, number] = e.data;
  const results = scanRange(sieve, sieveLen, from, to);
  self.postMessage({ type: 'complete', results }, [results.data.buffer]);
  self.close();
});
