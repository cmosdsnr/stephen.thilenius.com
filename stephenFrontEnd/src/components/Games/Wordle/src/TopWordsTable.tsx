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
};

export default function TopWordsTable({ topRanked, current, replaceWord }: Props) {
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
                                        <th>Std Dev</th>
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
                                            >
                                                <td>{n.word}</td>
                                                <td>{(Math.round(n.std * 10) / 10).toFixed(1)}</td>
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
                                    <th>Possible</th><td>{current?.combinedList.length}</td>
                                </tr>
                                <tr className="table-success">
                                    <th>Best Std</th>
                                    <td>{topRanked?.[0]?.std !== undefined ? (Math.round(topRanked[0].std * 100) / 100).toFixed(2) : '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}
