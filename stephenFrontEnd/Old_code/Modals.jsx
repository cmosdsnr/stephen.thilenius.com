import React, { useRef, useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { Link, useNavigate } from "react-router-dom";
import Modal from "react-modal"
import pb from "../lib/pocketBase"

Modal.setAppElement('#root')

const Modals = ({ children }) => {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(true);
    const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const { login, signup, resetPassword } = useAuth();
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const openLoginModal = () => setIsLoginModalOpen(true);
    const openSignUpModal = () => setIsSignUpModalOpen(true);
    const openPasswordModal = () => setIsPasswordModalOpen(true);

    const closeLoginModal = async (email, password) => {
        if (email.length > 0 && password.length > 0) {
            try {
                setError('');
                await login(email, password);
                setIsLoginModalOpen(false);
                navigate("/dashboard"); // 
            } catch {
                setError('Failed to log in');
            }
        } else {
            setIsLoginModalOpen(false);
        }
    }

    const closeSignUpModal = async (email, password, passwordConfirm) => {
        if (passwordConfirm !== password) {
            return setError('Passwords do not match')
        }
        try {
            setError('');
            await signup(email, password);
            setIsSignUpModalOpen(false);
            navigate("/dashboard");
        } catch {
            setError('Failed to create an Account');
        }
    }

    const closePasswordModal = async (password) => {
        try {
            setMessage('')
            setError('')
            setLoading(true)
            await resetPassword(password)
            setMessage('Check your inbox for password reset')
        } catch {
            setError('Failed to reset password')
        }

    }

    const signUp = () => {
        setIsLoginModalOpen(false);
        setIsSignUpModalOpen(true);
        openSignUpModal();
    }


    const x = () => {
        setIsLoginModalOpen(true);
        setIsSignUpModalOpen(false);
        openLoginModal();
    }

    // const childrenWithProps = React.Children.map(children, child => {
    //     if (React.isValidElement(child)) {
    //         return React.cloneElement(child, { openSignUpModal, openLoginModal });
    //     }
    //     return child;
    // });

    return (
        <>
            <LoginModal isOpen={isLoginModalOpen} onClose={closeLoginModal} error={error} signUp={signUp} />
            <SignUpModal isOpen={isSignUpModalOpen} onClose={closeSignUpModal} error={error} login={x} />
            <PasswordModal isOpen={isPasswordModalOpen} onSubmit={closePasswordModal} onClose={() => setIsPasswordModalOpen(false)} error={error} />
            {/* <div>{childrenWithProps}</div> */}
        </>
    )
}

const LoginModal = ({ isOpen, onClose, error, signUp }) => {
    const emailRef = useRef();
    const passwordRef = useRef();

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


const SignUpModal = ({ isOpen, onClose, error, login }) => {
    const emailRef = useRef();
    const passwordRef = useRef();
    const passwordConfirmRef = useRef();

    return (
        <div>
            <Modal
                className='login-modal'
                isOpen={isOpen}
                onRequestClose={() => onClose(emailRef.current.value, passwordRef.current.value, passwordConfirmRef.current.value)}
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
                        <h2 className="text-center mb-4">Sign Up</h2>

                        {error && <Alert variant="danger">{error}</Alert>}
                        <Form onSubmit={() => onClose(emailRef.current.value, passwordRef.current.value, passwordConfirmRef.current.value)}>
                            <Form.Group id="email">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" ref={emailRef} required />
                            </Form.Group>
                            <Form.Group id="password">
                                <Form.Label>password</Form.Label>
                                <Form.Control type="password" ref={passwordRef} required />
                            </Form.Group>
                            <Form.Group id="password-confirm">
                                <Form.Label>password-confirm</Form.Label>
                                <Form.Control type="password" ref={passwordConfirmRef} required />
                            </Form.Group>
                            <Button className="w-100" type="submit" style={{ marginTop: '20px' }}>Sign Up</Button>
                        </Form>
                    </Card.Body>

                    <div
                        className="w-100 text-center mt-3"
                        onClick={login}
                        style={{ color: '#0000EE', cursor: 'pointer' }}
                    >
                        Already have an account? <u>Login</u>
                    </div>
                </Card>

            </Modal>
        </div>
    )
}


export function PasswordModal({ isOpen, onSubmit, onClose, error }) {
    const [message, setMessage] = useState('')
    const emailRef = useRef();

    const submit = () => {
        onSubmit(emailRef.current.value);
        setMessage('Check your inbox for password reset');
    }

    if (!isOpen) return null;

    return (
        <Modal
            className='login-modal'
            isOpen={isOpen}
            onRequestClose={() => { }}
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
                    <h2 className="text-center mb-4">Password Reset</h2>
                    {!error && message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={submit}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" ref={emailRef} required />
                        </Form.Group>
                        {!message ? <>
                            <Button className="w-100" type="submit" style={{ marginTop: '20px' }}>Reset Password</Button>
                            <Button className="w-100" style={{ marginTop: '20px' }} onClick={onClose}>Cancel</Button>
                        </> :
                            <Button className="w-100" style={{ marginTop: '20px' }} onClick={onClose}>Ok</Button>
                        }
                    </Form>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                Need an Account? <span onClick={openSignUpModal} style={{ color: '#0000EE', cursor: 'pointer' }}><u>Sign Up</u></span>
            </div>
        </Modal>
    )
}

export default Modals;