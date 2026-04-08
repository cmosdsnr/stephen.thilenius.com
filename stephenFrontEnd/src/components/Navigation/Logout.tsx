import React, { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useData } from '../../contexts/DataContext';

const Logout = () => {
    const { logout } = useData();
    useEffect(() => {
        logout();
    }, []);

    return (<Navigate to="/" />);
}

export default Logout;