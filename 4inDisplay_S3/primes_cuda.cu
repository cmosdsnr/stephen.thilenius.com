
// primes_cuda.cu
//
// Usage:  primes_cuda <limit> [output.json]
// Builds: nvcc -O3 -o primes_cuda primes_cuda.cu
//
// Finds all primes up to <limit>, computes the decimal period
// of 1/p for each, and writes [[prime,period],...] JSON.

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

// ── Device: modular exponentiation ──────────────────────
__device__ __forceinline__
    uint64_t
    modpow(uint64_t base, uint64_t exp, uint64_t mod)
{
    uint64_t r = 1;
    base %= mod;
    while (exp)
    {
        if (exp & 1)
            r = r * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return r;
}

// ── Device: decimal period of 1/p ───────────────────────
//
// The period is the multiplicative order of 10 mod p.
// Algorithm: start with order = p−1, then for each prime
// factor q of p−1, repeatedly divide order by q as long
// as 10^(order/q) ≡ 1 (mod p).  No large local arrays —
// uses trial division up to √(p−1) ≈ 31 623 for p < 1B.
__device__ uint32_t decimalPeriod(uint32_t p)
{
    if (p == 2 || p == 5)
        return 0;

    uint64_t order = (uint64_t)p - 1;
    uint64_t mod = (uint64_t)p;
    uint64_t rem = order; // we'll factor this copy

    for (uint64_t q = 2; q * q <= rem; q++)
    {
        if (rem % q == 0)
        {
            while (order % q == 0 &&
                   modpow(10ULL, order / q, mod) == 1ULL)
                order /= q;
            while (rem % q == 0)
                rem /= q;
        }
    }
    if (rem > 1)
    { // remaining large prime factor
        while (order % rem == 0 &&
               modpow(10ULL, order / rem, mod) == 1ULL)
            order /= rem;
    }
    return (uint32_t)order;
}

// ── Kernel: one thread per prime ────────────────────────
__global__ void periodsKernel(const uint32_t *__restrict__ primes,
                              uint32_t *__restrict__ periods,
                              uint32_t count)
{
    uint32_t i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < count)
        periods[i] = decimalPeriod(primes[i]);
}

// ── CPU: segmented bit-packed Sieve of Eratosthenes ─────
//
// Represents only odd numbers; bit i → number 2i+1.
// Memory: ~62 MB for limit = 1 000 000 000.
std::vector<uint32_t> cpuSieve(uint64_t limit)
{
    printf("Sieving to %llu on CPU...\n", (unsigned long long)limit);
    double t0 = now_ms();

    uint64_t half = (limit + 1) / 2; // number of odd slots
    std::vector<uint8_t> bits((half + 7) / 8, 0xFF);
    // slot 0 = number 1, mark composite
    bits[0] &= ~(uint8_t)1;

    auto clrBit = [&](uint64_t i)
    {
        bits[i >> 3] &= ~(uint8_t)(1u << (i & 7));
    };
    auto getBit = [&](uint64_t i) -> bool
    {
        return (bits[i >> 3] >> (i & 7)) & 1;
    };

    // i is a slot index; number = 2i+1
    for (uint64_t i = 1; (2 * i + 1) * (2 * i + 1) <= limit; i++)
    {
        if (!getBit(i))
            continue;
        uint64_t p = 2 * i + 1;
        // first odd multiple of p that is ≥ p²
        uint64_t start = (p * p - 1) / 2;
        for (uint64_t j = start; j < half; j += p)
            clrBit(j);
    }

    std::vector<uint32_t> primes;
    primes.reserve((size_t)(limit / 14));
    if (limit >= 2)
        primes.push_back(2);
    for (uint64_t i = 1; i < half; i++)
        if (getBit(i))
            primes.push_back((uint32_t)(2 * i + 1));

    printf("  %zu primes in %.0f ms\n", primes.size(), now_ms() - t0);
    return primes;
}

// ── Write JSON ───────────────────────────────────────────
//
// Format: [[p0,d0],[p1,d1],...]  — identical to the browser save.
// Uses a 16 MB write buffer; ~1.2 GB file for 1B limit.
void writeJson(const char *path,
               const uint32_t *primes,
               const uint32_t *periods,
               size_t count)
{
    printf("Writing %s (%zu entries)...\n", path, count);
    double t0 = now_ms();

    FILE *f = fopen(path, "wb");
    if (!f)
    {
        perror("fopen");
        exit(1);
    }

    const size_t BUF_SZ = 16 * 1024 * 1024;
    std::vector<char> buf(BUF_SZ);
    size_t pos = 0;

    auto flush = [&]()
    {
        fwrite(buf.data(), 1, pos, f);
        pos = 0;
    };
    auto emit = [&](const char *s, size_t len)
    {
        if (pos + len > BUF_SZ)
            flush();
        memcpy(buf.data() + pos, s, len);
        pos += len;
    };

    emit("[", 1);
    char tmp[48];
    for (size_t i = 0; i < count; i++)
    {
        int n = snprintf(tmp, sizeof(tmp),
                         "%s[%u,%u]",
                         i ? "," : "",
                         primes[i], periods[i]);
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
                "  limit      — find all primes up to this number (max ~4 billion)\n"
                "  output     — defaults to primes.json\n"
                "Example: %s 1000000000 primes.json\n",
                argv[0], argv[0]);
        return 1;
    }

    uint64_t limit = strtoull(argv[1], nullptr, 10);
    const char *out = argc >= 3 ? argv[2] : "primes.json";

    if (limit > 0xFFFFFFFFULL)
    {
        fprintf(stderr, "Limit must be ≤ 4 294 967 295 (uint32 max)\n");
        return 1;
    }

    printf("=== Prime Decimal Periods to %llu ===\n\n",
           (unsigned long long)limit);

    // 1. CPU sieve
    std::vector<uint32_t> h_primes = cpuSieve(limit);
    uint32_t count = (uint32_t)h_primes.size();

    // 2. Allocate + copy to GPU
    printf("GPU: allocating %.0f MB...\n",
           2.0 * count * sizeof(uint32_t) / 1e6);
    uint32_t *d_primes, *d_periods;
    CK(cudaMalloc(&d_primes, (size_t)count * sizeof(uint32_t)));
    CK(cudaMalloc(&d_periods, (size_t)count * sizeof(uint32_t)));
    CK(cudaMemcpy(d_primes, h_primes.data(),
                  (size_t)count * sizeof(uint32_t),
                  cudaMemcpyHostToDevice));

    // 3. Launch kernel
    int threads = 256;
    int blocks = ((int)count + threads - 1) / threads;
    printf("GPU: %d blocks × %d threads (%u primes)...\n",
           blocks, threads, count);
    double t0 = now_ms();
    periodsKernel<<<blocks, threads>>>(d_primes, d_periods, count);
    CK(cudaGetLastError());
    CK(cudaDeviceSynchronize());
    printf("  GPU finished in %.0f ms\n", now_ms() - t0);

    // 4. Copy results back
    std::vector<uint32_t> h_periods(count);
    CK(cudaMemcpy(h_periods.data(), d_periods,
                  (size_t)count * sizeof(uint32_t),
                  cudaMemcpyDeviceToHost));
    CK(cudaFree(d_primes));
    CK(cudaFree(d_periods));

    // 5. Write JSON
    writeJson(out, h_primes.data(), h_periods.data(), count);

    printf("\nDone → %s\n", out);
    return 0;
}
