// primes_summarize.cpp
//
// Usage:  primes_summarize <input.json> <output_summary.json> [limit]
// Builds: cl /O2 /EHsc primes_summarize.cpp /Fe:primes_summarize.exe
//
// Streams through a full primes JSON file ([[prime,period],...])
// and extracts a small summary file loadable by the browser page:
//   - total count + maxPrime
//   - top 100 by highest (p-1)/period ratio
//   - top 100 by shortest period
//   - full-reptend prime count (period == p-1)
//   - first 40,000 primes

#include <cstdio>
#include <cstdlib>
#include <cstdint>
#include <cstring>
#include <vector>
#include <algorithm>
#include <chrono>

static double now_ms()
{
    using namespace std::chrono;
    return duration<double, std::milli>(
               steady_clock::now().time_since_epoch()).count();
}

struct Entry     { uint64_t prime, period; };
struct RatioItem { uint64_t prime, period; double ratio; };

// ── in-place O(1) min/max tracking for top-100 heaps ────
static size_t findMin(const std::vector<RatioItem>& v) {
    size_t m = 0;
    for (size_t i = 1; i < v.size(); i++) if (v[i].ratio < v[m].ratio) m = i;
    return m;
}
static size_t findMaxPeriod(const std::vector<RatioItem>& v) {
    size_t m = 0;
    for (size_t i = 1; i < v.size(); i++) if (v[i].period > v[m].period) m = i;
    return m;
}

int main(int argc, char* argv[])
{
    if (argc < 3) {
        fprintf(stderr,
            "Usage: %s <input.json> <output_summary.json> [limit]\n"
            "Example: %s primes_20b.json primes_20b_summary.json 20000000000\n",
            argv[0], argv[0]);
        return 1;
    }

    const char* inPath  = argv[1];
    const char* outPath = argv[2];
    uint64_t    limit   = argc >= 4 ? strtoull(argv[3], nullptr, 10) : 0;

    FILE* f = fopen(inPath, "rb");
    if (!f) { perror("fopen input"); return 1; }

    printf("Streaming %s...\n", inPath);
    double t0 = now_ms();

    // ── Top-100 accumulators ─────────────────────────────
    std::vector<RatioItem> byRatio;   byRatio.reserve(101);
    std::vector<RatioItem> byPeriod;  byPeriod.reserve(101);
    double   minRatio      = 0.0;
    uint64_t maxPeriodInTop = UINT64_MAX;

    // First 40k primes
    std::vector<Entry> first40k;
    first40k.reserve(40001);

    uint64_t totalCount   = 0;
    uint64_t maxPrime     = 0;
    uint64_t fullReptend  = 0;

    // ── Streaming parser (state machine) ─────────────────
    // Format: [[p0,d0],[p1,d1],...]  all on one line
    // State: SEEK_OPEN → READ_P → READ_D → back to SEEK_OPEN
    const size_t BUF = 64 * 1024 * 1024; // 64 MB read buffer
    std::vector<char> buf(BUF);
    char     tok[32];
    int      tokLen = 0;
    uint64_t curP   = 0, curD = 0;
    int      state  = 0; // 0=SEEK_OPEN  1=READ_P  2=READ_D

    size_t rd;
    while ((rd = fread(buf.data(), 1, BUF, f)) > 0)
    {
        for (size_t bi = 0; bi < rd; bi++)
        {
            char c = buf[bi];
            switch (state) {
            case 0: // SEEK_OPEN
                if (c == '[') { tokLen = 0; state = 1; }
                break;

            case 1: // READ_P
                if (c >= '0' && c <= '9') {
                    tok[tokLen++] = c;
                } else if (c == ',') {
                    tok[tokLen] = '\0';
                    curP = strtoull(tok, nullptr, 10);
                    tokLen = 0; state = 2;
                } else if (c == '[') {
                    // second '[' of opening '[[', reset
                    tokLen = 0;
                } else if (c == ']') {
                    tokLen = 0; state = 0;
                }
                break;

            case 2: // READ_D
                if (c >= '0' && c <= '9') {
                    tok[tokLen++] = c;
                } else if (c == ']') {
                    tok[tokLen] = '\0';
                    curD = strtoull(tok, nullptr, 10);
                    tokLen = 0; state = 0;

                    // ── process pair (curP, curD) ──────
                    totalCount++;
                    if (curP > maxPrime) maxPrime = curP;

                    if (first40k.size() < 40000)
                        first40k.push_back({curP, curD});

                    if (curD > 0 && curP > 5) {
                        double ratio = (double)(curP - 1) / (double)curD;

                        // byRatio: keep top-100 highest
                        if (byRatio.size() < 100) {
                            byRatio.push_back({curP, curD, ratio});
                            if (byRatio.size() == 100) {
                                minRatio = byRatio[findMin(byRatio)].ratio;
                            }
                        } else if (ratio > minRatio) {
                            byRatio[findMin(byRatio)] = {curP, curD, ratio};
                            minRatio = byRatio[findMin(byRatio)].ratio;
                        }

                        // byPeriod: keep top-100 shortest
                        if (byPeriod.size() < 100) {
                            byPeriod.push_back({curP, curD, ratio});
                            if (byPeriod.size() == 100) {
                                maxPeriodInTop = byPeriod[findMaxPeriod(byPeriod)].period;
                            }
                        } else if (curD < maxPeriodInTop) {
                            byPeriod[findMaxPeriod(byPeriod)] = {curP, curD, ratio};
                            maxPeriodInTop = byPeriod[findMaxPeriod(byPeriod)].period;
                        }
                    }

                    // full-reptend: period == p-1
                    if (curP > 2 && curD == curP - 1) fullReptend++;
                }
                break;
            }
        }

        if (totalCount % 50000000 == 0 && totalCount > 0) {
            printf("  %llu M primes processed...\r",
                   (unsigned long long)(totalCount / 1000000));
            fflush(stdout);
        }
    }
    fclose(f);

    printf("\n  Done: %llu primes, maxPrime=%llu, fullReptend=%llu  (%.0f ms)\n",
           (unsigned long long)totalCount,
           (unsigned long long)maxPrime,
           (unsigned long long)fullReptend,
           now_ms() - t0);

    if (limit == 0) limit = maxPrime;

    // Sort for output
    std::sort(byRatio.begin(),  byRatio.end(),
        [](const RatioItem& a, const RatioItem& b){ return a.ratio > b.ratio; });
    std::sort(byPeriod.begin(), byPeriod.end(),
        [](const RatioItem& a, const RatioItem& b){ return a.period < b.period; });

    // ── Write summary JSON ────────────────────────────────
    printf("Writing %s...\n", outPath);

    FILE* out = fopen(outPath, "wb");
    if (!out) { perror("fopen output"); return 1; }

    const size_t WBUF = 4 * 1024 * 1024;
    std::vector<char> wbuf(WBUF);
    size_t wpos = 0;

    auto flush = [&](){ fwrite(wbuf.data(), 1, wpos, out); wpos = 0; };
    auto emit  = [&](const char* s, size_t len){
        if (wpos + len > WBUF) flush();
        memcpy(wbuf.data() + wpos, s, len); wpos += len;
    };

    char tmp[128];
    int  n;

    n = snprintf(tmp, sizeof(tmp),
        "{\"summary\":true,\"limit\":%llu,\"count\":%llu,"
        "\"maxPrime\":%llu,\"fullReptend\":%llu,",
        (unsigned long long)limit,
        (unsigned long long)totalCount,
        (unsigned long long)maxPrime,
        (unsigned long long)fullReptend);
    emit(tmp, n);

    auto writeArray = [&](const char* key, auto& arr, bool last){
        size_t klen = strlen(key);
        emit("\"", 1); emit(key, klen); emit("\":[", 3);
        for (size_t i = 0; i < arr.size(); i++) {
            n = snprintf(tmp, sizeof(tmp), "%s[%llu,%llu]",
                i ? "," : "",
                (unsigned long long)arr[i].prime,
                (unsigned long long)arr[i].period);
            emit(tmp, n);
        }
        emit(last ? "]}" : "],", last ? 2 : 2);
    };

    writeArray("byRatio",  byRatio,  false);
    writeArray("byPeriod", byPeriod, false);

    // first40k
    emit("\"first40k\":[", 12);
    for (size_t i = 0; i < first40k.size(); i++) {
        n = snprintf(tmp, sizeof(tmp), "%s[%llu,%llu]",
            i ? "," : "",
            (unsigned long long)first40k[i].prime,
            (unsigned long long)first40k[i].period);
        emit(tmp, n);
    }
    emit("]}", 2);

    flush();
    fclose(out);

    printf("Done -> %s\n", outPath);
    return 0;
}
