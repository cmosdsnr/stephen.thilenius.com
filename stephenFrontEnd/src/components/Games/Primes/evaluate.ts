// Sieve primes are passed as a plain Uint32Array of prime values (no periods needed).
// Results are returned as an interleaved Uint32Array: [prime0, period0, prime1, period1, …]
// Using typed arrays lets the main thread transfer results zero-copy and avoids
// allocating millions of [prime, period] JS objects.

function isPrime(sieve: Uint32Array, sieveLen: number, n: number): boolean {
  for (let i = 0; i < sieveLen; i++) {
    const p = sieve[i];
    if (n % p === 0) return false;
    if (p * p > n) break;
  }
  return true;
}

function nextPrime(sieve: Uint32Array, sieveLen: number, start: number): number {
  let n = 0;
  if (start % 6 === 5) n = start + 2;
  else if (start % 6 === 1) {
    n = start + 6;
    if (isPrime(sieve, sieveLen, start + 4)) return start + 4;
  } else {
    if (start % 6 === 0) n = start + 1;
    else {
      n = start + (5 - (start % 6));
      if (isPrime(sieve, sieveLen, n)) return n;
      n += 2;
    }
  }
  while (true) {
    if (isPrime(sieve, sieveLen, n)) return n;
    if (isPrime(sieve, sieveLen, n + 4)) return n + 4;
    n += 6;
  }
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}

function getDivisors(n: number): number[] {
  const divisors: number[] = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      divisors.push(i);
      if (i !== n / i) divisors.push(n / i);
    }
  }
  return divisors.sort((a, b) => a - b);
}

function periodOf10Optimized(p: number): number {
  const mod = BigInt(p);
  const divisors = getDivisors(p - 1);
  for (const d of divisors) {
    if (modPow(10n, BigInt(d), mod) === 1n) return d;
  }
  return 0;
}

/**
 * Scan [from, to) for primes, computing the decimal period of 1/p for each.
 * @param sieve   Uint32Array of prime values (not pairs) up to √to
 * @param sieveLen number of valid entries in sieve
 * @param from    range start (inclusive)
 * @param to      range end (exclusive)
 * @returns interleaved Uint32Array [prime0, period0, prime1, period1, …]
 */
export function scanRange(
  sieve: Uint32Array,
  sieveLen: number,
  from: number,
  to: number
): { data: Uint32Array; duration: number } {
  const startTime = Date.now();
  const buf: number[] = [];

  let n = nextPrime(sieve, sieveLen, from);
  while (n < to) {
    buf.push(n, periodOf10Optimized(n));
    n = nextPrime(sieve, sieveLen, n);
  }

  return { data: new Uint32Array(buf), duration: Date.now() - startTime };
}
