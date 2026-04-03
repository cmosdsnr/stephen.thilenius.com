import React from 'react';
import { Row, Col } from 'react-bootstrap';

type RankedWord = {
    word: string;
    std: number;
    letterScore: number;
    rank: number;
};

type Distribution = {
    topRanked: RankedWord[];
    guess: number;
    dev?: number;
    maxY?: number;
    minX?: number;
    maxX?: number;
    worst?: string;
};

type CurrentGameState = {
    combinedList: string[];
};

type Props = {
    distribution: Distribution;
    current: CurrentGameState;
    replaceWord: (word: string) => void;
};

export default function TopWordsTable({ distribution, current, replaceWord }: Props) {
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
                                    {distribution?.topRanked?.slice(section * 10, section * 10 + 10)
                                        .map((n, j) => {
                                            const colorClass =
                                                n.rank === 1 ? "table-success" :
                                                    n.rank === 2 ? "table-primary" :
                                                        n.rank === 3 ? "table-secondary" :
                                                            n.rank === 4 ? "table-warning" : "";

                                            return (
                                                <tr
                                                    key={j + section * 10}
                                                    className={colorClass}
                                                    style={{ cursor: "pointer" }}
                                                    onClick={() => replaceWord(n.word)}
                                                >
                                                    <td>{n.word}</td>
                                                    <td>{(Math.round(n.std * 10) / 10).toFixed(1)}</td>
                                                    <td>{n.letterScore.toFixed(1)}</td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </Col>
                    ))}

                    <Col xs={12} md={3}>
                        <table className="table table-sm table-bordered table-striped">
                            <thead className="table-dark">
                                <tr>
                                    <th colSpan={2}>Guess Stats</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="table-info">
                                    <th>Guess</th><td>{distribution?.guess}</td>
                                </tr>
                                <tr className="table-warning">
                                    <th>Possible</th><td>{current?.combinedList.length}</td>
                                </tr>
                                <tr className="table-success">
                                    <th>Deviation</th>
                                    <td>{distribution?.dev !== undefined ? (Math.round(distribution.dev * 100) / 100).toFixed(2) : '-'}</td>
                                </tr>
                                <tr className="table-primary">
                                    <th>MaxY</th>
                                    <td>{distribution?.maxY !== undefined ? (Math.round(distribution.maxY * 100) / 100).toFixed(2) : '0'}</td>
                                </tr>
                                <tr className="table-secondary">
                                    <th>MinX</th>
                                    <td>{distribution?.minX !== undefined ? (Math.round(distribution.minX * 100) / 100).toFixed(2) : '0'}</td>
                                </tr>
                                <tr className="table-secondary">
                                    <th>MaxX</th>
                                    <td>{distribution?.maxX !== undefined ? (Math.round(distribution.maxX * 100) / 100).toFixed(2) : '0'}</td>
                                </tr>
                                <tr className="table-danger">
                                    <th>Worst</th><td>{distribution?.worst ?? '-'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </Col>
                </Row>
            </Col>
        </Row>
    );
}
