function isPrime(primes: number[][], n: number): boolean {
  for (let i = 0; i < primes.length - 1; i++) {
    if (n % primes[i][0] === 0) return false;
    if (primes[i][0] * primes[i][0] > n) break;
  }
  return true;
}

function nextPrime(primes: number[][], start: number): number {
  let n = 0;
  if (start % 6 === 5) n = start + 2;
  else if (start % 6 === 1) {
    n = start + 6;
    if (isPrime(primes, start + 4)) return start + 4;
  } else {
    // console.log("starting with non-prime: ", start);
    if (start % 6 === 0) n = start + 1;
    else {
      n = start + (5 - (start % 6));
      if (isPrime(primes, n)) return n;
      n += 2;
    }
  }
  // now aligned to 6k+1
  while (1) {
    if (isPrime(primes, n)) return n;
    if (isPrime(primes, n + 4)) return n + 4;
    n += 6;
  }
  return n;
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
    if (modPow(10n, BigInt(d), mod) === 1n) {
      return d;
    }
  }
  return 0; // shouldn't happen for prime p
}

export function scanRange(primes: number[][], from: number, to: number): { primes: number[][]; duration: number } {
  //   console.log("scanning range: ", from, to);
  let n = from;
  const startTime = Date.now();
  let period = 0;
  const newPrimes: number[][] = [];

  n = nextPrime(primes, n);
  while (n < to) {
    // period = getRepeatingPeriod(n);
    period = periodOf10Optimized(n);
    newPrimes.push([n, period]);
    n = nextPrime(primes, n);
  }
  return { primes: newPrimes, duration: Date.now() - startTime };
}

// console.log(
//     `There were ${cnt} primes between ${from} and ${to}`,
//     `\nMax (n-1)/period: ${maxPeriod}`,
//     `\nFor prime: ${prime}`,
//     `\nPeriod: ${(prime - 1n) / maxPeriod}`,
//     `\nTime: ${Date.now() - startTime}ms`
// );
