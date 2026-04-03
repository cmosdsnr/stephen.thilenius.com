import React from 'react'
import { Navigate } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'

export function PrivateRoute({ children }) {
    const { pb } = useData();
    return pb.authStore.isValid ? children : <Navigate to="/home" />;
}

export function PrivateVerifiedRoute({ children }) {
    const { pb } = useData();
    return (pb.authStore.model.verified) ? children : pb.authStore.isValid ? <Navigate to="/verify" /> : <Navigate to="/" />;
}

export function PrivateBorrowerRoute({ children }) {
    const { pb } = useData();
    return ((pb.authStore.model.role === 'Administrator' || pb.authStore.model.role === 'Borrower') && pb.authStore.model.verified) ? children : pb.authStore.isValid ? <Navigate to="/verify" /> : <Navigate to="/" />;
}

export function PrivateAdminRoute({ children }) {
    const { pb } = useData();
    return (pb.authStore.isValid && (pb.authStore.model.role === 'Administrator') && pb.authStore.model.verified) ? children : pb.authStore.isValid ? <Navigate to="/verify" /> : <Navigate to="/" />;
}
