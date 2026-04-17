// primes_cuda.cu
//
// Usage:  primes_cuda <limit> [output.json]
// Builds: nvcc -O3 -o primes_cuda primes_cuda.cu
//
// Finds all primes up to <limit>, computes the decimal period
// of 1/p for each, and writes [[prime,period],...] JSON.
// Supports limits up to tens of billions (GPU VRAM permitting).

#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <vector>
#include <chrono>
#include <cuda_runtime.h>

// ── CUDA error helper ────────────────────────────────────
#define CK(call)                                                \
    do                                                          \
    {                                                           \
        cudaError_t e = (call);                                 \
        if (e != cudaSuccess)                                   \
        {                                                       \
            fprintf(stderr, "CUDA error %s:%d — %s\n",          \
                    __FILE__, __LINE__, cudaGetErrorString(e)); \
            exit(1);                                            \
        }                                                       \
    } while (0)

static double now_ms()
{
    using namespace std::chrono;
    return duration<double, std::milli>(
               steady_clock::now().time_since_epoch())
        .count();
}

// ── Device: overflow-safe 64-bit modular multiply ────────
//
// Computes (a * b) % m without overflow for any a, b < m < 2^63.
// Uses __umul64hi to get the high 64 bits of the full 128-bit product.
// Fast path: if high word is zero (a,b both < 2^32) just use hardware divide.
__device__ __forceinline__ uint64_t mulmod64(uint64_t a, uint64_t b, uint64_t m)
{
    uint64_t hi = __umul64hi(a, b);
    uint64_t lo = a * b; // low 64 bits (wraps — correct per C semantics)
    if (!hi) return lo % m;
    // Shift the 128-bit value (hi:lo) into r one bit at a time, reducing mod m.
    // Safe because m < 2^63 guarantees r < m < 2^63 so r+r never overflows uint64.
    uint64_t r = hi % m;
    for (int i = 63; i >= 0; i--)
    {
        r += r;
        if (r >= m) r -= m;
        if ((lo >> i) & 1ULL) { ++r; if (r >= m) r -= m; }
    }
    return r;
}

// ── Device: modular exponentiation ──────────────────────
__device__ __forceinline__ uint64_t modpow(uint64_t base, uint64_t exp, uint64_t mod)
{
    uint64_t r = 1;
    base %= mod;
    while (exp)
    {
        if (exp & 1) r = mulmod64(r, base, mod);
        base = mulmod64(base, base, mod);
        exp >>= 1;
    }
    return r;
}

// ── Device: decimal period of 1/p ───────────────────────
//
// Period = multiplicative order of 10 mod p.
// Algorithm: start with order = p−1, then for each prime factor q
// of p−1, divide order by q as long as 10^(order/q) ≡ 1 (mod p).
__device__ uint64_t decimalPeriod(uint64_t p)
{
    if (p == 2 || p == 5) return 0;

    uint64_t order = p - 1;
    uint64_t rem   = order; // copy to factor

    for (uint64_t q = 2; q * q <= rem; q++)
    {
        if (rem % q == 0)
        {
            while (order % q == 0 && modpow(10ULL, order / q, p) == 1ULL)
                order /= q;
            while (rem % q == 0) rem /= q;
        }
    }
    if (rem > 1)
    {
        while (order % rem == 0 && modpow(10ULL, order / rem, p) == 1ULL)
            order /= rem;
    }
    return order;
}

// ── Kernel: one thread per prime ────────────────────────
__global__ void periodsKernel(const uint64_t *__restrict__ primes,
                               uint64_t       *__restrict__ periods,
                               uint64_t count)
{
    uint64_t i = (uint64_t)blockIdx.x * blockDim.x + threadIdx.x;
    if (i < count)
        periods[i] = decimalPeriod(primes[i]);
}

// ── CPU: segmented bit-packed Sieve of Eratosthenes ─────
//
// Represents only odd numbers; bit i → number 2i+1.
// Memory: ~62 MB for 1B, ~620 MB for 10B.
std::vector<uint64_t> cpuSieve(uint64_t limit)
{
    printf("Sieving to %llu on CPU...\n", (unsigned long long)limit);
    double t0 = now_ms();

    uint64_t half = (limit + 1) / 2;
    std::vector<uint8_t> bits((half + 7) / 8, 0xFF);
    bits[0] &= ~(uint8_t)1; // slot 0 = number 1, mark composite

    auto clrBit = [&](uint64_t i) { bits[i >> 3] &= ~(uint8_t)(1u << (i & 7)); };
    auto getBit = [&](uint64_t i) -> bool { return (bits[i >> 3] >> (i & 7)) & 1; };

    for (uint64_t i = 1; (2 * i + 1) * (2 * i + 1) <= limit; i++)
    {
        if (!getBit(i)) continue;
        uint64_t p     = 2 * i + 1;
        uint64_t start = (p * p - 1) / 2;
        for (uint64_t j = start; j < half; j += p)
            clrBit(j);
    }

    std::vector<uint64_t> primes;
    primes.reserve((size_t)(limit / 14));
    if (limit >= 2) primes.push_back(2);
    for (uint64_t i = 1; i < half; i++)
        if (getBit(i))
            primes.push_back(2 * i + 1);

    printf("  %zu primes in %.0f ms\n", primes.size(), now_ms() - t0);
    return primes;
}

// ── Write JSON ───────────────────────────────────────────
//
// Format: [[p0,d0],[p1,d1],...]  — identical to the browser save.
void writeJson(const char    *path,
               const uint64_t *primes,
               const uint64_t *periods,
               size_t          count)
{
    printf("Writing %s (%zu entries)...\n", path, count);
    double t0 = now_ms();

    FILE *f = fopen(path, "wb");
    if (!f) { perror("fopen"); exit(1); }

    const size_t BUF_SZ = 16 * 1024 * 1024;
    std::vector<char> buf(BUF_SZ);
    size_t pos = 0;

    auto flush = [&]() { fwrite(buf.data(), 1, pos, f); pos = 0; };
    auto emit  = [&](const char *s, size_t len)
    {
        if (pos + len > BUF_SZ) flush();
        memcpy(buf.data() + pos, s, len);
        pos += len;
    };

    emit("[", 1);
    char tmp[64];
    for (size_t i = 0; i < count; i++)
    {
        int n = snprintf(tmp, sizeof(tmp),
                         "%s[%llu,%llu]",
                         i ? "," : "",
                         (unsigned long long)primes[i],
                         (unsigned long long)periods[i]);
        emit(tmp, (size_t)n);
    }
    emit("]", 1);
    flush();
    fclose(f);

    printf("  Written in %.0f ms\n", now_ms() - t0);
}

// ── main ─────────────────────────────────────────────────
int main(int argc, char *argv[])
{
    if (argc < 2)
    {
        fprintf(stderr,
                "Usage: %s <limit> [output.json]\n"
                "  limit   — find all primes up to this number\n"
                "  output  — defaults to primes.json\n"
                "Example: %s 10000000000 primes_10b.json\n",
                argv[0], argv[0]);
        return 1;
    }

    uint64_t limit = strtoull(argv[1], nullptr, 10);
    const char *out = argc >= 3 ? argv[2] : "primes.json";

    printf("=== Prime Decimal Periods to %llu ===\n\n",
           (unsigned long long)limit);

    // 1. CPU sieve
    std::vector<uint64_t> h_primes = cpuSieve(limit);
    uint64_t count = (uint64_t)h_primes.size();

    if (count > (uint64_t)INT_MAX)
    {
        fprintf(stderr, "Too many primes (%llu) — exceeds 1D grid limit. "
                        "Reduce limit or extend to 2D grid.\n",
                (unsigned long long)count);
        return 1;
    }

    // 2. Allocate + copy to GPU
    double mem_mb = 2.0 * (double)count * sizeof(uint64_t) / 1e6;
    printf("GPU: allocating %.0f MB (%.0fM primes x 2 x 8 bytes)...\n",
           mem_mb, count / 1e6);
    uint64_t *d_primes, *d_periods;
    CK(cudaMalloc(&d_primes,  count * sizeof(uint64_t)));
    CK(cudaMalloc(&d_periods, count * sizeof(uint64_t)));
    CK(cudaMemcpy(d_primes, h_primes.data(),
                  count * sizeof(uint64_t),
                  cudaMemcpyHostToDevice));

    // 3. Launch kernel
    int threads = 256;
    int blocks  = (int)((count + threads - 1) / threads);
    printf("GPU: %d blocks x %d threads (%llu primes)...\n",
           blocks, threads, (unsigned long long)count);
    double t0 = now_ms();
    periodsKernel<<<blocks, threads>>>(d_primes, d_periods, count);
    CK(cudaGetLastError());
    CK(cudaDeviceSynchronize());
    printf("  GPU finished in %.0f ms\n", now_ms() - t0);

    // 4. Copy results back
    std::vector<uint64_t> h_periods(count);
    CK(cudaMemcpy(h_periods.data(), d_periods,
                  count * sizeof(uint64_t),
                  cudaMemcpyDeviceToHost));
    CK(cudaFree(d_primes));
    CK(cudaFree(d_periods));

    // 5. Write JSON
    writeJson(out, h_primes.data(), h_periods.data(), (size_t)count);

    printf("\nDone -> %s\n", out);
    return 0;
}
