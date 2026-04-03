import React, { useState, useEffect } from "react"
import { Container, Row, Col, Button } from "react-bootstrap"

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { DataProvider } from "../contexts/DataContext";
import { WssProvider } from "../contexts/WssContext";
import Modals, { ModalProvider } from '../modals/Modals';
import ThNavbar from './Navigation/ThNavbar'
import { PrivateRoute, PrivateVerifiedRoute, PrivateBorrowerRoute, PrivateAdminRoute } from './Navigation/PrivateRoute'
import { useData } from "../contexts/DataContext";

import Dashboard from "./User/Dashboard"
import UpdateProfile from './User/UpdateProfile'
import PostDetail from './User/PostDetail'
import CreatePost from './User/CreatePost'
import Home from './Home'
import Tree from './Tree'
import Cv from './cv/Cv'
import MessageBoard from "./Messages/MessageBoard";

import Gallery from '../../Old_code/Gallery'
import { Albums, Album, Picture } from './Gallery/Albums'
import Recordings from './Recordings/Recordings'
import Transcription from './Recordings/Transcription'

// import { Administrator } from './Administrator/Administrator'
import ESPtable from './Administrator/EspTable'
import SolarEdge from './Administrator/SolarEdge'
import PowerMeter from './Administrator/PowerMeter'
import Davis from './Administrator/Davis'
import Ultimeter from './Administrator/Ultimeter'
import Sprinkler from './Administrator/Sprinklers/Sprinkler'
import SophiesLoan from './Administrator/SophiesLoan'
import Futures from './Administrator/Futures'
import Documentation from './Administrator/Documentation'
import FileShare from './User/FileShare'

import Wordle from "./Games/Wordle/src/Wordle"
import OldWordle from "./Games/OldWordle/OldWordle"
import Blossom from "./Games/Blossom/Blossom"
import Sandbox from "./Games/Wordle/src/Sandbox"
import { Primes } from "./Games/Primes/Primes"

import crest from "../images/crest_hi_res_small.gif"
import name from "../images/ThileniusFamily.png"

import Logout from "./Navigation/Logout"
import { useWindow } from "../hooks/useWindow";


function Verify() {
    const navigate = useNavigate();
    const { requestVerification, pb } = useData();

    useEffect(() => {
        if (pb.authStore.model?.verified) navigate("/dashboard");
    }, [pb.authStore.model?.verified])

    return (
        <center>
            <h4>Please Verify Email </h4>
            <Button onClick={() => requestVerification()}>  Resend Verification Email   </Button>
        </center>
    )
}

function Header() {
    return (
        <Row style={{ paddingBottom: "10px" }}>
            <Col sm={3} md={2} className="d-none d-sm-inline" style={{ paddingLeft: "40px" }}>
                <img className="headerCrestImage" src={crest} alt="Thilenius Family Crest" />
            </Col>
            <Col xs={12} sm={9} md={8} >
                <img className="headerScriptImage" src={name} alt="Thilenius Family Script" />
            </Col>
            <Col md={2} className="d-none d-md-inline" style={{ paddingRight: "40px" }}>
                <img className="headerCrestImage" src={crest} alt="Thilenius Family Crest" />
            </Col>
        </Row>

    )
}

function App() {
    const showGridSize = true;

    const width = useWindow();
    // setup google at https://console.cloud.google.com/apis/credentials?project=stephen-428521
    const { pb, logoutEvent } = useData();

    useEffect(() => {
        console.log("App: valid is ", pb?.authStore?.isValid)
    }, [logoutEvent])




    // done for folks who are logged in (no form needed)
    // const onChangePassword = async () => { resetPassword(email) }


    return (
        // <AuthProvider>
        <WssProvider>
            <DataProvider>
                <BrowserRouter>
                    {/* <Modals /> */}
                    <Container fluid className="px-0">
                        {showGridSize ?
                            <center>
                                <Row>
                                    <Col xs={12} className="d-sm-none" > Extra Small {width}</Col>
                                    <Col sm={12} className="d-none d-sm-block d-md-none">Small {width}</Col>
                                    <Col md={12} className="d-none d-md-block d-lg-none">Medium {width}</Col>
                                    <Col md={12} className="d-none d-lg-block d-xl-none">Large {width}</Col>
                                    <Col md={12} className="d-none d-xl-block">Extra Large {width}</Col>
                                </Row>
                            </center>
                            : null
                        }
                        <Header />
                        <ModalProvider>
                            <Modals />
                            <ThNavbar />
                        </ModalProvider>

                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/home" element={<Home />} />
                            <Route path="/sandbox" element={<Sandbox />} />
                            <Route path="/logout" element={<Logout />} />

                            {/* <Route path="/socket" element={<WebSocket />} /> */}
                            <Route path="/tree" element={<Tree />} />
                            <Route path="/cv" element={<Cv />} />
                            {/* <Route path="/comments" element={<Comments />} /> */}
                            <Route path="/comments" element={<MessageBoard />} />

                            <Route path="/games/wordle" element={<Wordle />} />
                            <Route path="/games/OldWordle" element={<OldWordle />} />
                            <Route path="/games/Blossom" element={<Blossom />} />
                            <Route path="/games/Primes" element={<Primes />} />

                            <Route path="/recordings" element={<PrivateRoute><Recordings /></PrivateRoute>} />
                            <Route path="/recordings/transcriptionEmmy" element={<PrivateRoute><Transcription who={"Emmy"} /></PrivateRoute>} />


                            <Route path="/photos" element={<PrivateRoute><Gallery /></PrivateRoute>} />
                            <Route path="/photos/albums" element={<PrivateRoute><Albums /></PrivateRoute>} />
                            <Route path="/photos/album/:name" element={<PrivateRoute><Album /></PrivateRoute>} />
                            <Route path="/photos/album/:name/:special" element={<PrivateRoute><Album /></PrivateRoute>} />
                            <Route path="/photos/picture/:album/:image" element={<PrivateRoute><Picture /></PrivateRoute>} />
                            <Route path="/photos/picture/:album/:image/:special" element={<PrivateRoute><Picture /></PrivateRoute>} />

                            <Route path="/admin/sophiesLoan" element={<PrivateBorrowerRoute><SophiesLoan /></PrivateBorrowerRoute>} />

                            <Route path="/admin" element={<PrivateRoute><PowerMeter /></PrivateRoute>} />
                            <Route path="/admin/powermeter" element={<PrivateRoute><PowerMeter /></PrivateRoute>} />
                            <Route path="/admin/sprinkler" element={<PrivateRoute><Sprinkler /></PrivateRoute>} />
                            <Route path="/admin/solar" element={<PrivateRoute><SolarEdge /></PrivateRoute>} />
                            <Route path="/admin/espTable" element={<PrivateRoute><ESPtable /></PrivateRoute>} />
                            <Route path="/user/fileShare" element={<PrivateRoute><FileShare /></PrivateRoute>} />
                            <Route path="/admin/davis" element={<PrivateRoute><Davis /></PrivateRoute>} />
                            <Route path="/admin/ultimeter" element={<PrivateRoute><Ultimeter /></PrivateRoute>} />
                            <Route path="/admin/futures" element={<PrivateRoute><Futures /></PrivateRoute>} />


                            <Route path="/verify" element={<PrivateRoute><Verify /></PrivateRoute>} />
                            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                            <Route path="/update-profile" element={<PrivateRoute><UpdateProfile /></PrivateRoute>} />

                            <Route path="/post/:id" element={
                                <PrivateVerifiedRoute>
                                    <PostDetail />
                                </PrivateVerifiedRoute>
                            } />
                            <Route path="/create-post" element={
                                <PrivateVerifiedRoute>
                                    <CreatePost />
                                </PrivateVerifiedRoute>
                            } />


                            <Route path="/documentation/:selector" element={<PrivateRoute><Documentation /></PrivateRoute>} />
                        </Routes>
                    </Container>
                </BrowserRouter>
            </DataProvider>
        </WssProvider>
        // </AuthProvider>
    )
}
export default App;
