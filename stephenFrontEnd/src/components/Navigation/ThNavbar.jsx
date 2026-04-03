import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom'
import { Nav, Navbar, Row, NavDropdown } from "react-bootstrap"
import { MyFontAwesomeIcon } from './MyFontAwesomeIcon'
import { faSpa, faHome, faImages, faTree, faTty, faAtom, faSignInAlt, faSignOutAlt, faUserPlus, faBook, faFileLines, faFileCode } from '@fortawesome/free-solid-svg-icons'
import { useData } from '../../contexts/DataContext'
import "../../css/style.css"
import crest from "../../images/crest_hi_res_small.gif?as=gif&width=40"
import { useModal, ModalType } from '../../modals/Modals'

/**
 * ThNavbar - Main navigation component for the application
 * 
 * Renders a responsive Bootstrap navbar with authentication-aware navigation links.
 * Displays different menu items based on user login status, verification status, and permissions.
 * Includes dropdowns for family-related features, games, and documents.
 * 
 * Features:
 * - Responsive design that adapts based on authentication state
 * - Role-based navigation visibility
 * - Login/logout functionality with modal integration
 * - Gallery access for verified users only
 * - Admin dashboard and comments for authenticated verified users
 * - Family tree and recording access controls
 * - Games section with multiple game options
 * - Documentation links for authenticated users
 * 
 * @returns {JSX.Element} Bootstrap navbar component with dynamic navigation items
 * 
 * @example
 * ```jsx
 * // Used in main layout component
 * <ThNavbar />
 * ```
 * 
 * @see {@link useData} - For authentication state management
 * @see {@link useModal} - For login/signup modal controls
 * @see {@link MyFontAwesomeIcon} - For consistent icon rendering
 */
export default function ThNavbar() {
    /** Authentication and data context providing user state and logout functionality */
    const { pb, logoutEvent } = useData();

    /** Modal management functions for opening login/signup dialogs */
    const { openModal } = useModal();


    /**
     * Debug effect to log authentication state changes
     * Runs on every render to track login status for debugging purposes
     */
    useEffect(() => {
        console.log("redraw at ThNavbar: I am " + (pb.authStore.isValid ? "" : "not ") + "logged in")
    })

    /**
     * Debug effect to log authentication validity changes
     * Specifically tracks logout events and authentication state transitions
     */
    useEffect(() => {
        console.log("valid is ", pb.authStore.isValid)
    }, [logoutEvent])

    return (
        <Row >
            <Navbar
                expand={pb.authStore.isValid ? "md" : "sm"}
                style={{ backgroundColor: '#003366' }}
            >
                {/* Brand logo linking to home page */}
                <Navbar.Brand as={Link} to="/">
                    <img alt='' src={crest} width="40" style={{ marginLeft: '10px' }} />
                </Navbar.Brand>

                {/* Mobile menu toggle button */}
                <Navbar.Toggle aria-controls="basic-navbar-nav" style={{ backgroundColor: '#336699', marginRight: '20px' }} />

                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="mr-auto">
                        {/* Home link - always visible */}
                        <Nav.Link href="/home">
                            <MyFontAwesomeIcon inverse icon={faHome} />
                            <span className="navText">Home</span>
                        </Nav.Link>

                        {/* Gallery link - only for verified users */}
                        {pb.authStore.model?.verified &&
                            <Nav.Link href="/photos/albums">
                                <MyFontAwesomeIcon inverse icon={faImages} />
                                <span className="navText">Gallery</span>
                            </Nav.Link>
                        }

                        {/* Family dropdown menu */}
                        <NavDropdown title="Family" id="mynav">
                            <NavDropdown.Item href="/tree">
                                <MyFontAwesomeIcon icon={faTree} /> Web Family Trees
                            </NavDropdown.Item>
                            {/* Recording link - only for authenticated users */}
                            {pb.authStore.isValid &&
                                <NavDropdown.Item href="/recordings">
                                    <MyFontAwesomeIcon icon={faSpa} /> Recording
                                </NavDropdown.Item>
                            }
                        </NavDropdown>

                        {/* Games dropdown menu */}
                        <NavDropdown title="Games" id="mynav">
                            <NavDropdown.Item href="/games/wordle">
                                <MyFontAwesomeIcon icon={faTree} />new
                            </NavDropdown.Item>
                            <NavDropdown.Item href="/games/oldWordle">
                                <MyFontAwesomeIcon icon={faSpa} />old
                            </NavDropdown.Item>
                        </NavDropdown>

                        {/* Authentication section - shows login/signup or logout based on auth state */}
                        {pb.authStore.isValid ?
                            <Nav.Link href="/logout">
                                <MyFontAwesomeIcon inverse icon={faSignOutAlt} />
                                <span className="navText">Logout</span>
                            </Nav.Link> :
                            <>
                                {/* Login button - opens modal instead of navigation */}
                                <div style={{ paddingTop: "8px", paddingRight: "25px" }} onClick={() => openModal(ModalType.Login)}>
                                    <MyFontAwesomeIcon inverse icon={faSignInAlt} />
                                    <span className="navText">Login</span>
                                </div>
                                {/* Sign-up button - opens modal instead of navigation */}
                                <div style={{ paddingTop: "8px", paddingRight: "25px" }} onClick={() => openModal(ModalType.SignUp)}>
                                    <MyFontAwesomeIcon inverse icon={faUserPlus} />
                                    <span className="navText">Sign-up</span>
                                </div>
                            </>
                        }

                        {/* Admin/verified user section - dashboard, comments, and documentation */}
                        {pb.authStore.isValid && pb.authStore.model?.verified &&
                            <>
                                {/* Dashboard link for system monitoring and administration */}
                                <Nav.Link href="/dashboard">
                                    <MyFontAwesomeIcon inverse icon={faAtom} />
                                    <span className="navText">Dashboard</span>
                                </Nav.Link>

                                {/* Comments management link */}
                                <Nav.Link href="/comments">
                                    <MyFontAwesomeIcon inverse icon={faTty} />
                                    <span className="navText">Comments</span>
                                </Nav.Link>

                                {/* Documentation dropdown menu */}
                                <NavDropdown title="Documents" id="mynav">
                                    <NavDropdown.Item href={"/documentation/frontend"}>
                                        <MyFontAwesomeIcon icon={faFileLines} /><span style={{ paddingLeft: "12px" }} >FrontEnd </span>
                                    </NavDropdown.Item>
                                    <NavDropdown.Item href={"/documentation/backend"}>
                                        <MyFontAwesomeIcon icon={faFileCode} /><span style={{ paddingLeft: "12px" }} >BackEnd</span>
                                    </NavDropdown.Item>
                                </NavDropdown>

                                {pb.authStore.model?.role == "Administrator" &&
                                    <NavDropdown title="Admin" id="mynav">
                                        <NavDropdown.Item href="/admin/solar">
                                            <MyFontAwesomeIcon icon={faTree} /><span style={{ paddingLeft: "12px" }} >Solar</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/powermeter">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >Power Meter</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/espTable">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >ESP List</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/sprinkler">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >Sprinklers</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/davis">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >Davis</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/ultimeter">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >Ultimeter</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/sophiesLoan">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >Sophies Loan</span>
                                        </NavDropdown.Item>
                                        <NavDropdown.Item href="/admin/futures">
                                            <MyFontAwesomeIcon icon={faSpa} /><span style={{ paddingLeft: "12px" }} >Futures</span>
                                        </NavDropdown.Item>
                                    </NavDropdown>
                                }
                            </>
                        }
                    </Nav>
                </Navbar.Collapse>
            </Navbar>
        </Row>
    )
}

