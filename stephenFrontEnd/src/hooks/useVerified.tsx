import React from 'react'
import { useData } from '../contexts/DataContext'

export const useVerified = () => {
    const { pb } = useData();
    if (pb.authStore.isValid && pb.authStore.model)
        return pb.authStore.model.verified;
    else return false;
}
