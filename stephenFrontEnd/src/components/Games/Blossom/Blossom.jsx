import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Table, Button } from 'react-bootstrap'
import { serverURL } from '../../../constants'

export default function Blossom(props) {
    const { } = props

    const [must, setMust] = useState(null)
    const [available, setAvailable] = useState(null)
    const [list, setList] = useState([])
    const [usesAll, setUsesAll] = useState([])
    const [definitions, setDefinitions] = useState([])


    const getDefinitions = async () => {
        let def = []
        for (let k = 0; k < list.length; k++) {
            let used = false;
            def.forEach((d, i) => {
                if (d.word == list[k][0].word) used = true
            })
            if (!used) {
                if (list[k][0].definition == "(from other list)") {
                    const response = await fetch("https://www.dictionaryapi.com/api/v3/references/collegiate/json/" + list[k][0].word + "?key=0ce14dcd-438f-4860-b517-bc3ef48ac7b7")
                    const data = await response.json();
                    if (data[0]?.shortdef) {
                        data[0].shortdef.unshift("(from other list)")
                        def.push({ word: list[k][0].word, defs: data[0].shortdef })
                    } else
                        def.push({ word: list[k][0].word, defs: ["(from other list)", "no definition"] })
                }
                else
                    def.push({ word: list[k][0].word, defs: [list[k][0].definition] })
            }
        }
        setDefinitions(def)

    }

    useEffect(() => {
        if (available && available.length == 6 && must != null) {
            const requestOptions = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ must, available })
            };
            const url = new URL('/api/getWordList', serverURL);
            fetch(url.toString(), requestOptions)
                .then(response => response.json())
                .then(data => {
                    setUsesAll(data.pop())
                    setList(data)
                });
        }
    }, [must, available])

    useEffect(() => {
        getDefinitions()
    }, [list])

    let cnt = 0;

    const remove = (word) => {
        let h = [...list]
        h.forEach((l, i) => {
            l.forEach((item, j) => {
                if (item.word == word) {
                    h[i].splice(j, 1)
                    return
                }
            })
        })
        setList(h)
    }

    const keyDown = (e) => {
        if (e.key === 'Enter') {
            submit()
        }
    }

    const submit = () => {
        const avl = document.getElementById("avl").value.toLowerCase().split("")
        if (avl.length != 6) return;
        setMust(document.getElementById("must").value.toLowerCase())
        setAvailable(avl)
    }

    const newGame = () => {
        setMust(null)
        setAvailable(null)
    }

    return (
        <>
            {/* <Button className="btn btn-sm" onClick={analyzeData}>analyze</Button> <br /> */}
            {available?.length > 0 ?
                <div>
                    must: {must.toUpperCase()}<br />
                    available count: {available ? available.length : 0}<br />

                    {available && available.map((letter, index) => {
                        return (<span key={index} style={{ fontWeight: "bold" }}> {letter.toUpperCase()}{index != available.length - 1 ? "," : <br />}</span>)
                    })}
                    <div style={{ fontSize: "23px" }}>
                        {list.map((item, index) => {
                            return (
                                <span key={index}><span style={{ fontWeight: "bold" }}>highlight: {available[index]}  ::</span>
                                    {item.map((w, j) => {
                                        if (j > 4) return (null)
                                        else return (
                                            < span key={j} onClick={() => remove(w.word)}> {w.word}({w.score}){j != 4 ? "," : null}</span>
                                        )
                                    })}
                                    <br />
                                </span>
                            )
                        })}
                        <span style={{ fontWeight: "bold" }}>all letters: </span>
                        {usesAll.map((w, j) => {
                            return (
                                < span key={j}> {w.word}({w.score}){j != (usesAll.length - 1) ? "," : null}</span>
                            )
                        })}
                        <br />
                        <Button className="btn btn-sm" onClick={newGame}>new</Button> <br />
                    </div>
                    <Row>
                        <Col>
                            {definitions.map((w, j) => {
                                return (
                                    <span key={j}>{w.word} : <br />
                                        {Array.isArray(w.defs) ? w.defs.map((m, i) => { return (<span key={i} style={{ marginLeft: "20px" }}>{m}<br /></span>) }) : <></>}
                                    </span>
                                )
                            })}
                        </Col>
                    </Row>
                </div> :
                <div>
                    <Table striped bordered hover size="sm" style={{ width: '200px' }}>
                        <tbody>
                            <tr>
                                <td>must:      </td><td><input type="text" id="must" name="must" /></td>
                            </tr>
                            <tr>
                                <td>available: </td><td><input onKeyDown={keyDown} type="text" id="avl" name="avl" /></td>
                            </tr>
                        </tbody>
                    </Table>
                    <Button className="btn btn-sm" onClick={submit}>submit</Button> <br />
                </div>
            }
        </>
    )
}