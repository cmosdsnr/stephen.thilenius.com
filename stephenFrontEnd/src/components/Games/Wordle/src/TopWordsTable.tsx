import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { RankedGuess } from '../context/types';

type CurrentGameState = {
    combinedList: string[];
};

type Props = {
    topRanked: RankedGuess[];
    current: CurrentGameState;
    replaceWord: (word: string) => void;
    removeWord: (word: string) => void;
};

export default function TopWordsTable({ topRanked, current, replaceWord, removeWord }: Props) {
    const makeWordInvalid = (word: string) => {
        if (!window.confirm(`Are you sure you want to mark "${word}" as invalid? This will remove it from future suggestions.`)) return;
        const next = topRanked.filter(n => n.word !== word)[0];
        if (next) replaceWord(next.word);
        removeWord(word);
    };

    return (
        <Row>
            <Col xs={12} style={{ marginBottom: "20px" }}>
                <h5>Top 20 Words + Stats</h5>
                <Row>
                    {[0, 1].map((section) => (
                        <Col key={section} xs={12} md={3}>
                            <table className="table table-sm table-bordered table-striped">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Word</th>
                                        <th title="Expected number of candidates remaining after this guess resolves. Lower = better. 1.0 is perfect.">Exp. Remaining</th>
                                        <th>Letter Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topRanked?.slice(section * 10, section * 10 + 10)
                                        .map((n, j) => (
                                            <tr
                                                key={j + section * 10}
                                                style={{ cursor: "pointer" }}
                                                onClick={() => replaceWord(n.word)}
                                                onContextMenu={(e) => { e.preventDefault(); makeWordInvalid(n.word); }}
                                            >
                                                <td>{n.word}</td>
                                                <td>{(Math.round(n.score * 10) / 10).toFixed(1)}</td>
                                                <td>{n.letterScore?.toFixed(1) ?? '-'}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </Col>
                    ))}

                    <Col xs={12} md={3}>
                        <table className="table table-sm table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th colSpan={2}>Stats</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="table-warning">
                                    <th>Possible remaining words</th><td>{current?.combinedList.length}</td>
                                </tr>
                                <tr className="table-success">
                                    <th title="Expected remaining candidates for the best guess. 1.0 = perfect elimination.">Best Score</th>
                                    <td>{topRanked?.[0]?.score !== undefined ? (Math.round(topRanked[0].score * 100) / 100).toFixed(2) : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}
