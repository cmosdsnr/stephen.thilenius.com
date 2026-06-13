import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom'
import { Nav, Navbar, NavDropdown } from "react-bootstrap"
import { MyFontAwesomeIcon } from './MyFontAwesomeIcon'
import {
    faSpa, faHome, faImages, faTree, faTty, faAtom,
    faSignInAlt, faSignOutAlt, faUserPlus, faBook, faFileLines, faFileCode
} from '@fortawesome/free-solid-svg-icons'
import { useData } from '../../contexts/DataContext'
import {
    IconSolar, IconPowerMeter, IconESP32, IconSprinkler,
    IconDavis, IconUltimeter, IconLoan, IconFutures
} from '../Administrator/AdminIcons'
import "../../css/style.css"
import './ThNavbar.css'
import crest from "../../images/crest_hi_res_small.gif?as=gif&width=40"
import { useModal, ModalType } from '../../modals/Modals'

export default function ThNavbar() {
    const { pb, logoutEvent } = useData()
    const { openModal } = useModal()
    const location = useLocation()

    const isActive = (href: string) =>
        location.pathname === href || location.pathname.startsWith(href + '/')

    useEffect(() => {
        console.log("redraw at ThNavbar: I am " + (pb.authStore.isValid ? "" : "not ") + "logged in")
    })

    useEffect(() => {
        console.log("valid is ", pb.authStore.isValid)
    }, [logoutEvent])

    return (
        <Navbar
            expand={pb.authStore.isValid ? "md" : "sm"}
            className="th-navbar"
        >
            <Navbar.Brand as={Link} to="/">
                <img alt='' src={crest} width="34" style={{ marginLeft: '4px' }} />
                <span className="th-brand-text d-none d-sm-inline">Thilenius</span>
            </Navbar.Brand>

            <Navbar.Toggle aria-controls="th-navbar-nav" />

            <Navbar.Collapse id="th-navbar-nav">
                <Nav className="mr-auto">

                    <Nav.Link href="/home" className={isActive('/home') || location.pathname === '/' ? 'th-active' : ''}>
                        <MyFontAwesomeIcon inverse icon={faHome} />
                        <span className="navText">Home</span>
                    </Nav.Link>

                    {pb.authStore.model?.verified &&
                        <Nav.Link href="/photos/albums" className={isActive('/photos') ? 'th-active' : ''}>
                            <MyFontAwesomeIcon inverse icon={faImages} />
                            <span className="navText">Gallery</span>
                        </Nav.Link>
                    }

                    <NavDropdown title="Family" id="family-nav">
                        <NavDropdown.Item href="/tree">
                            <MyFontAwesomeIcon icon={faTree} /> Web Family Trees
                        </NavDropdown.Item>
                        {pb.authStore.isValid &&
                            <NavDropdown.Item href="/recordings">
                                <MyFontAwesomeIcon icon={faSpa} /> Recordings
                            </NavDropdown.Item>
                        }
                    </NavDropdown>

                    <NavDropdown title="Games" id="games-nav">
                        <NavDropdown.Item href="/games/wordle">Wordle</NavDropdown.Item>
                        <NavDropdown.Item href="/games/Blossom">Blossom</NavDropdown.Item>
                        <NavDropdown.Item href="/games/Primes">Primes</NavDropdown.Item>
                        <NavDropdown.Item href="/games/Sudoku">Sudoku</NavDropdown.Item>
                    </NavDropdown>

                    {pb.authStore.isValid ?
                        <Nav.Link href="/logout">
                            <MyFontAwesomeIcon inverse icon={faSignOutAlt} />
                            <span className="navText">Logout</span>
                        </Nav.Link>
                        :
                        <>
                            <div className="th-nav-action" onClick={() => openModal(ModalType.Login)}>
                                <MyFontAwesomeIcon inverse icon={faSignInAlt} />
                                <span>Login</span>
                            </div>
                            <div className="th-nav-action" onClick={() => openModal(ModalType.SignUp)}>
                                <MyFontAwesomeIcon inverse icon={faUserPlus} />
                                <span>Sign Up</span>
                            </div>
                        </>
                    }

                    {pb.authStore.isValid && pb.authStore.model?.verified &&
                        <>
                            <Nav.Link href="/dashboard" className={isActive('/dashboard') ? 'th-active' : ''}>
                                <MyFontAwesomeIcon inverse icon={faAtom} />
                                <span className="navText">Dashboard</span>
                            </Nav.Link>

                            <Nav.Link href="/comments" className={isActive('/comments') ? 'th-active' : ''}>
                                <MyFontAwesomeIcon inverse icon={faTty} />
                                <span className="navText">Comments</span>
                            </Nav.Link>

                            <NavDropdown title="Docs" id="docs-nav">
                                <NavDropdown.Item href="/docs/frontend/index.html" target="_blank" rel="noopener noreferrer">
                                    <MyFontAwesomeIcon icon={faFileLines} /><span style={{ paddingLeft: "10px" }}>Front End</span>
                                </NavDropdown.Item>
                                <NavDropdown.Item href="/docs/backend/index.html" target="_blank" rel="noopener noreferrer">
                                    <MyFontAwesomeIcon icon={faFileCode} /><span style={{ paddingLeft: "10px" }}>Back End</span>
                                </NavDropdown.Item>
                                <NavDropdown.Item href="/docs/esp32/index.html" target="_blank" rel="noopener noreferrer">
                                    <MyFontAwesomeIcon icon={faBook} /><span style={{ paddingLeft: "10px" }}>Firmware</span>
                                </NavDropdown.Item>
                                <NavDropdown.Item href="/docs/espServer/index.html" target="_blank" rel="noopener noreferrer">
                                    <MyFontAwesomeIcon icon={faBook} /><span style={{ paddingLeft: "10px" }}>ESP Server</span>
                                </NavDropdown.Item>
                                <NavDropdown.Item href="/docs/sprinklerApp/index.html" target="_blank" rel="noopener noreferrer">
                                    <MyFontAwesomeIcon icon={faBook} /><span style={{ paddingLeft: "10px" }}>Sprinkler App</span>
                                </NavDropdown.Item>
                                <NavDropdown.Divider />
                                <li className="dropdown-submenu">
                                    <a className="dropdown-item dropdown-toggle">
                                        <MyFontAwesomeIcon icon={faBook} /><span style={{ paddingLeft: "10px" }}>Gliderport</span>
                                    </a>
                                    <ul className="dropdown-menu">
                                        <li><a className="dropdown-item" href="https://gliderport.thilenius.com/docs/backend" target="_blank" rel="noopener noreferrer">
                                            <MyFontAwesomeIcon icon={faFileCode} /><span style={{ paddingLeft: "10px" }}>Backend</span>
                                        </a></li>
                                        <li><a className="dropdown-item" href="https://gliderport.thilenius.com/docs/frontend" target="_blank" rel="noopener noreferrer">
                                            <MyFontAwesomeIcon icon={faFileLines} /><span style={{ paddingLeft: "10px" }}>Frontend</span>
                                        </a></li>
                                        <li><a className="dropdown-item" href="https://gliderport.thilenius.com/docs/pi3_server" target="_blank" rel="noopener noreferrer">
                                            <MyFontAwesomeIcon icon={faBook} /><span style={{ paddingLeft: "10px" }}>Pi3 Server</span>
                                        </a></li>
                                        <li><a className="dropdown-item" href="https://gliderport.thilenius.com/docs/gliderportApp" target="_blank" rel="noopener noreferrer">
                                            <MyFontAwesomeIcon icon={faBook} /><span style={{ paddingLeft: "10px" }}>Mobile App</span>
                                        </a></li>
                                    </ul>
                                </li>
                            </NavDropdown>

                            {pb.authStore.model?.role === 'Administrator' &&
                                <NavDropdown title="Admin" id="admin-nav" align="end">
                                    <NavDropdown.Item href="/admin/solar">
                                        <IconSolar size={16} /> Solar
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/admin/powermeter">
                                        <IconPowerMeter size={16} /> Power Meter
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/admin/espTable">
                                        <IconESP32 size={16} /> ESP List
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/admin/sprinkler">
                                        <IconSprinkler size={16} /> Sprinklers
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/admin/davis">
                                        <IconDavis size={16} /> Davis
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/admin/ultimeter">
                                        <IconUltimeter size={16} /> Ultimeter
                                    </NavDropdown.Item>
                                    <NavDropdown.Divider />
                                    <NavDropdown.Item href="/admin/sophiesLoan">
                                        <IconLoan size={16} /> Sophie's Loan
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href="/admin/futures">
                                        <IconFutures size={16} /> Futures
                                    </NavDropdown.Item>
                                </NavDropdown>
                            }
                        </>
                    }
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    )
}
