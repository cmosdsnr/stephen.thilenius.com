
import { useData } from '../contexts/DataContext'
import { useMutation } from "react-query"


export default function useChangeEmail() {
    async function changeEmail(newEmail: string) {
        const { changeEmail } = useData() as any;
        const res = changeEmail(newEmail)
        if (!res) alert('Email change request sent to ' + newEmail + '! Check your inbox.')
        else alert('Error changing Email: ' + res)
        //https://pocketbase.io/docs/api-records/#requestemailchange

    }
    return useMutation(changeEmail)
}



