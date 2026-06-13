import React from 'react';
import { RankedGuess } from '../context/types';

type Props = {
    topRanked: RankedGuess[];
    currentWord?: string;
};

export default function BinProbTable({ topRanked, currentWord }: Props) {
    const ranked = topRanked?.find(r => r.word === currentWord) ?? topRanked?.[0];
    if (!ranked?.binCounts) return null;

    const nonZero = ranked.binCounts.filter(c => c > 0);
    const total = nonZero.reduce((s, c) => s + c, 0);
    if (total === 0) return null;

    // Group bins by their count value.
    // prob(landing in a bin of size N) = (N × numberOfBinsWithSizeN) / total
    const map = new Map<number, number>(); // binSize → number of bins with that size
    for (const c of nonZero) {
        map.set(c, (map.get(c) ?? 0) + 1);
    }

    const rows = Array.from(map.entries())
        .map(([binSize, numBins]) => ({
            binSize,
            numBins,
            prob: (binSize * numBins) / total,
        }))
        .sort((a, b) => b.binSize - a.binSize);

    const tdL: React.CSSProperties = { padding: '3px 8px', textAlign: 'left' };
    const tdR: React.CSSProperties = { padding: '3px 8px', textAlign: 'right' };
    const thL: React.CSSProperties = { ...tdL, borderBottom: '1px solid #dee2e6', fontWeight: 600 };
    const thR: React.CSSProperties = { ...tdR, borderBottom: '1px solid #dee2e6', fontWeight: 600 };

    return (
        <div style={{ margin: '12px 0 0 0', border: '1px solid #dee2e6', borderRadius: 6, backgroundColor: '#fff', padding: '12px', maxWidth: 400 }}>
            <h5 style={{ marginBottom: '8px' }}>
                Outcome Probabilities
                <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '10px' }}>
                    {total} candidates · {rows.length} distinct bin sizes
                </span>
            </h5>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                    <tr>
                        <th style={thL}>Bin size</th>
                        <th style={thR}># bins</th>
                        <th style={thR}>Probability</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(({ binSize, numBins, prob }) => (
                        <tr key={binSize} style={{ borderTop: '1px solid #f0f0f0' }}>
                            <td style={tdL}>{binSize}</td>
                            <td style={tdR}>{numBins}</td>
                            <td style={tdR}>{(prob * 100).toFixed(1)}%</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
