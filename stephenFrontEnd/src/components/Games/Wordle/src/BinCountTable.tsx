import React from 'react';
import { RankedGuess } from '../context/types';

type Props = {
    topRanked: RankedGuess[];
    currentWord?: string;
    currentAccuracies?: number[];
};

const SQUARE_SIZE = 12;
const SQUARE_RADIUS = 3;
const SQUARE_GAP = 2;

const COLOR = ['#d3d6da', '#c9b458', '#6aaa64'] as const;

function decodeBin(bin: number): number[] {
    return [
        Math.floor(bin / 81) % 3,
        Math.floor(bin / 27) % 3,
        Math.floor(bin / 9) % 3,
        Math.floor(bin / 3) % 3,
        bin % 3,
    ];
}

function encodeBin(pattern: number[]): number {
    return pattern[0] * 81 + pattern[1] * 27 + pattern[2] * 9 + pattern[3] * 3 + pattern[4];
}

export default function BinCountTable({ topRanked, currentWord, currentAccuracies }: Props) {
    const ranked = topRanked?.find(r => r.word === currentWord) ?? topRanked?.[0];
    if (!ranked?.binCounts) return null;

    const activeBin = currentAccuracies?.length === 5 ? encodeBin(currentAccuracies) : -1;

    const bins = ranked.binCounts
        .map((count, idx) => ({ count, pattern: decodeBin(idx), binIdx: idx }))
        .filter(b => b.count > 0)
        .sort((a, b) => b.count - a.count);

    const showingWord = ranked.word;
    const label = currentWord && currentWord === showingWord
        ? currentWord
        : `${showingWord} (top-ranked)`;

    return (
        <div style={{ margin: '12px 0 0 0', border: '1px solid #dee2e6', borderRadius: 6, backgroundColor: '#fff', padding: '12px' }}>
            <h5 style={{ marginBottom: '8px' }}>
                Bin Distribution — <span style={{ fontWeight: 400 }}>{label}</span>
                <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '10px' }}>
                    {bins.length} non-zero bins of 243
                </span>
            </h5>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px' }}>
                {bins.map(({ count, pattern, binIdx }, i) => {
                    const isActive = binIdx === activeBin;
                    return (
                        <div
                            key={i}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: isActive ? '2px solid #333' : '2px solid transparent',
                                borderRadius: 5,
                                padding: '2px 4px',
                                backgroundColor: isActive ? '#f0f0f0' : 'transparent',
                            }}
                        >
                            <div style={{ display: 'flex', gap: `${SQUARE_GAP}px` }}>
                                {pattern.map((acc, j) => (
                                    <div
                                        key={j}
                                        style={{
                                            width: SQUARE_SIZE,
                                            height: SQUARE_SIZE,
                                            borderRadius: SQUARE_RADIUS,
                                            backgroundColor: COLOR[acc],
                                            flexShrink: 0,
                                        }}
                                    />
                                ))}
                            </div>
                            <span style={{ fontSize: '0.78rem', minWidth: '20px', color: '#333' }}>
                                {count}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
