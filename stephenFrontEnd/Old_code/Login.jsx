
import React, { useRef, useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { Link, useNavigate } from "react-router-dom";
import pb from "../lib/pocketBase"
import Modal from "react-modal"


const Login = () => {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
    const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
    const { login } = useAuth()
    const [error, setError] = useState('')
    const navigate = useNavigate()

    // const openLoginModal = () => {
    //     setIsLoginModalOpen(true);
    // };

    const closeLoginModal = async (email, password) => {
        if (email.length > 0 && password.length > 0) {
            try {
                setError('');
                setIsLoginModalOpen(false);
                await login(email, password);
                console.log('Navigation to dashboard');
                navigate("/dashboard");
            } catch {
                setError('Failed to log in')
            }
        } else {
            setIsLoginModalOpen(false);
        }
    }


    const SignUp = () => {
        setIsLoginModalOpen(false);
        setIsSignUpModalOpen(true);
        // openSignUpModal();
    }
    return (
        <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} error={error} signUp={SignUp} />
    )
}


Modal.setAppElement('#root')

function LoginModal({ isOpen, onClose, error, signUp }) {
    const emailRef = useRef()
    const passwordRef = useRef()
    console.log(isOpen)
    if (!isOpen) return null;

    return (
        <Modal
            className='login-modal'
            isOpen={isOpen}
            style={
                {
                    overlay: {
                        backgroundColor: 'rgba(0, 0, 0, 0.4)'
                    }
                }
            }
        >
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Login</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={() => onClose(emailRef.current.value, passwordRef.current.value)}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" ref={emailRef} required />
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control type="password" ref={passwordRef} required />
                        </Form.Group>
                        <Button className="w-100" type="submit" style={{ marginTop: '20px' }}>Login</Button>
                    </Form>
                    <div className="w-100 text-center mt-3">
                        <Link onClick={() => onClose("", "")} to="/forgot-password">Forgot Password?</Link>
                    </div>
                    <div className="w-100 text-center mt-2">
                        Need an Account? <div onClick={signUp} style={{ color: '#0000EE', cursor: 'pointer' }}><u>Sign Up</u></div>
                    </div>
                </Card.Body>
            </Card>
        </Modal>
    )
}

export default Login;