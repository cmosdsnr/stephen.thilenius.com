import React, { useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import Modal from "react-modal"
import OnClickLink from "./OnClickLink"
import { useForm } from "react-hook-form"
import { useData } from '../contexts/DataContext'
import { useNavigate } from 'react-router-dom'
import { useModal, ModalType } from "./Modals"
import mySvg from '../images/314px-Google__G__Logo.svg_-294x300.png'

const warnClass = "mb-5 border border-[rgb(191,22,80)] [border-left-width:10px] [border-left-color:rgb(236,89,144)] bg-[rgb(251,236,242)]"
const errorClass = "text-red-600 text-[11px] -mt-[15px] -mb-[5px] pb-0"

const LoginModal = () => {
    const [isError, setIsError] = useState(false);
    const { register, handleSubmit, formState: { errors } } = useForm()
    const navigate = useNavigate();
    const { googleLogin, login, pb } = useData();
    const { openModal, closeModal } = useModal();

    const onLogin = async (data: any) => {
        setIsError(false);
        await login(data.email, data.password);
        console.log("onLogin: isLoggedIn:", pb.authStore.isValid, "verified:", pb.authStore.model?.verified);
        if (pb.authStore.isValid) {
            closeModal();
            if (pb.authStore.model?.verified)
                navigate("/dashboard");
            else
                navigate("/verify");

        } else {
            setIsError(true);
        }
    }

    const handleGoogleLogin = async () => {
        setIsError(false);
        await googleLogin();
        console.log("handleGoogleLogin: isLoggedIn:", pb.authStore.isValid, "verified:", pb.authStore.model?.verified);
        if (pb.authStore.isValid) {
            closeModal();
            if (pb.authStore.model?.verified)
                navigate("/dashboard");
            else
                navigate("/verify");

        } else {
            setIsError(true);
        }
    }

    return (
        <Modal
            onRequestClose={() => closeModal()}
            style={{ overlay: { backgroundColor: 'rgba(255, 255, 255, 0.5)' } }}
            className="login-modal-overlay"
            isOpen={true}
        >
            <Card className="bg-blue-100">
                <Card.Body>
                    <h2 className="text-center mb-4">Login</h2>

                    {isError && <Alert variant="danger">Invalid Email or Password</Alert>}
                    <Form onSubmit={handleSubmit(onLogin)}>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                className={errors.email ? warnClass : undefined}
                                type="email"
                                {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                                required
                            />
                            {errors.email && <p className={errorClass}>Must be a valid Email address</p>}
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control
                                className={errors.password ? warnClass : undefined}
                                type="password"
                                {...register('password', { required: true, pattern: /^.{8,}$/i })}
                                required
                            />
                            {errors.password && <p className={errorClass}>Password must be 8 or more characters</p>}
                        </Form.Group>
                        <Button className="w-100 mt-5" type="submit">Login</Button>
                    </Form>
                    <div className="w-100 text-center mt-3">
                        <OnClickLink fn={() => openModal(ModalType.ResetPassword)}>Forgot Password?</OnClickLink>
                    </div>
                    <div className="w-100 text-center mt-2">
                        Need an Account? <OnClickLink fn={() => openModal(ModalType.SignUp)}>Sign Up</OnClickLink>
                    </div>
                    <div className="w-100 text-center mt-3"><b>OR</b></div>
                    <Button className="w-100" onClick={async () => handleGoogleLogin()}><img src={mySvg} className="w-[30px] mr-5" alt="Google Logo" /> Sign in with Google</Button>

                </Card.Body>
            </Card>
        </Modal>
    )
}

export default LoginModal;
