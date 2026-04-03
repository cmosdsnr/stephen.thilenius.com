
import { useData } from '../contexts/DataContext'
import { useMutation } from "react-query"

export default function useLogin() {
    async function login({ email, password }: any) {
        const { login } = useData();
        await login(email, password);
    }
    return useMutation(login)
}

