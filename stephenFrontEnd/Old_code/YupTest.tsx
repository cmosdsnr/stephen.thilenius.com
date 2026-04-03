import React from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Form, Button, Card, Alert } from 'react-bootstrap'

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

// const YupTest = () => {
//     const { register, handleSubmit, formState: { errors }, reset } = useForm({
//         resolver: yupResolver(validationSchema),
//     });
//     const onSubmitHandler = (data: any) => {
//         console.log({ data });
//         reset();
//     };
//     return (
//         <Form className="FormErrors" onSubmit={handleSubmit(onUpdateSubmit)}>
//             <Form.Group id="name">
//                 <Form.Label>Name</Form.Label>
//                 <Form.Control
//                     className={errors.name && 'warn'}
//                     type="text"
//                     {...register('name', { required: true })}
//                     required
//                 />
//                 {errors.name && <p className='error'>Must be a valid Name</p>}
//             </Form.Group>
//             <Form.Group id="email">
//                 <Form.Label>Email</Form.Label>
//                 <Form.Control
//                     className={errors.email && 'warn'}
//                     type="email"
//                     {...register('email', { required: true })}
//                     required
//                 />
//                 {errors.email && <p className='error'>Must be a valid Email address</p>}
//             </Form.Group>
//             <Form.Group id="other">
//                 <Form.Label>Other</Form.Label>
//                 <Form.Control
//                     className={errors.other && 'warn'}
//                     type="text"
//                     {...register('other')}
//                 />
//                 {errors.other && <p className='error'>Must be a valid Other</p>}
//             </Form.Group>
//             <Form.Group id="password">
//                 <Form.Label>Password</Form.Label>
//                 <Form.Control
//                     className={errors.password && 'warn'}
//                     type="password"
//                     {...register('password', { required: true })}
//                     required
//                 />
//                 {errors.password && <p className='error'>Must be a valid Password</p>}
//             </Form.Group>
//             <Form.Group id="passwordConfirm">
//                 <Form.Label>Confirm Password</Form.Label>
//                 <Form.Control
//                     className={errors.passwordConfirm && 'warn'}
//                     type="password"
//                     {...register('passwordConfirm', { required: true })}
//                     required
//                 />
//                 {errors.passwordConfirm && <p className='error'>Must be a valid Password Confirm</p>}
//             </Form.Group>
//             <Button type="submit">Submit</Button>
//         </Form>

//     );
// };

// export default YupTest;