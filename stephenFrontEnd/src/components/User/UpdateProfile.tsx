import React, { useRef, useState, useEffect } from 'react'
import { Form, Button, Card, Alert } from 'react-bootstrap'
import { useForm } from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from "yup"

import { useData } from '../../contexts/DataContext'
import { Link, useNavigate } from 'react-router-dom'
import '../../modals/modals.css'

export default function UpdateProfile() {
    const { pb } = useData();

    if (!pb.authStore.isValid) {
        return <div>Not logged in</div>
    }

    const validationSchema = yup.object().shape({
        name: yup.string().matches(/[A-z]* [A-z]*/, "Enter first and last name").required(),
        email: yup.string().email().required(),
        other: yup.string(),
        password: yup.string().min(8)
            .required('Password is required'),
        passwordConfirm: yup.string()
            .required('Confirm Password is required')
            .oneOf([yup.ref('password'), null] as any[], 'Passwords does not match'),
    });

    const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: yupResolver(validationSchema) })


    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const roles = ['Member', 'Administrator', 'Borrower']


    useEffect(() => {
        console.log(errors)
    })

    function onUpdateSubmit(data: any) {
        console.log('onUpdateSubmit', data)
        return;
    }

    return (
        <div className='w-100 mx-auto pt-4' style={{ maxWidth: "800px" }}>
            <Card>
                <Card.Body>
                    <h2 className="text-center mb-4">Update Profile</h2>

                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form className="FormErrors" onSubmit={handleSubmit(onUpdateSubmit)}>
                        <Form.Group id="name">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control type="text" {...register('name')} />
                            {errors.name && <p>{errors.name.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="other">
                            <Form.Label>Other/Info</Form.Label>
                            <Form.Control
                                className={errors.other && 'warn'}
                                type="text"
                                {...register('other')}

                                defaultValue={pb.authStore.model?.other} />
                        </Form.Group>
                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" {...register('email')} />
                            {errors.email && <p>{errors.email.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control type="password" {...register('password')} />
                            {errors.password && <p>{errors.password.message as string}</p>}
                        </Form.Group>
                        <Form.Group id="password-confirm">
                            <Form.Label>password-confirm</Form.Label>
                            <Form.Control type="password" {...register('passwordConfirm')} />
                            {errors.passwordConfirm && <p>XXX{errors.passwordConfirm.message as string}</p>}
                        </Form.Group>


                        <Form.Group id="email">
                            <Form.Label>Email</Form.Label>
                            <Form.Control
                                className={errors.email && 'warn'}
                                type="email"
                                {...register('email', { required: true, pattern: /^\S+@\S+$/i })}
                                required
                                defaultValue={pb.authStore.model?.email} />
                        </Form.Group>
                        <Form.Group id="password">
                            <Form.Label>password</Form.Label>
                            <Form.Control
                                className={errors.password && 'warn'}
                                type="password"
                                {...register('password', { required: false, pattern: /^.{8,}$/i })}
                                placeholder='leave blank to keep the same' />
                        </Form.Group>
                        <Form.Group id="password-confirm">
                            <Form.Label>password-confirm</Form.Label>
                            <Form.Control
                                type="password"
                                {...register('passwordConfirm', { required: false, pattern: /^.{8,}$/i })}
                                placeholder='leave blank to keep the same' />
                        </Form.Group>

                        <Form.Group id="role">
                            <Form.Label>permissions:</Form.Label>
                            <Form.Control type="text" readOnly defaultValue={pb.authStore.model?.role} />
                            {/* {currentUser.role === "Administrator" ? roles.map((r, i) => {
                                return (
                                    <Form.Check
                                        checked={role === i}
                                        onChange={() => { handleCheck(i) }}
                                        type={'checkbox'}
                                        label={roles[i]}
                                        id={`member-checkbox-$i`}
                                    />
                                )
                            }) :
                                <Form.Control type="text" readOnly defaultValue={currentUser.role} />} */}

                        </Form.Group>

                        <Button disabled={loading} className="w-100" type="submit" style={{ marginTop: '20px' }}>Update</Button>
                    </Form>
                </Card.Body>
            </Card>
            <div className="w-100 text-center mt-2">
                <Link to='/'>Cancel</Link>
            </div>
        </div>
    )
}
