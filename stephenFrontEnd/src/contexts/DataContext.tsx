import React, { useState, useEffect, useContext, useRef } from 'react'
import PocketBase from "pocketbase";
import { pbURL } from '../constants'

export type DataContextType = {
    getLoan: (id: string) => void;
    updateLoan: (transaction: any) => void;
    sophiesLoan: (transaction: any) => void;
    alecsLoan: (transaction: any) => void;
    addLoan: (transaction: any) => void;
    deleteLoan: (transaction: any) => void;

    getDailySolarPower: () => void;

    saveMessage: (msg: any) => void;
    deleteMessage: (msg: any) => void;
    loadMessages: (msg: any) => void;
    messages: any[];
    messagesLoaded: boolean;

    pb: PocketBase;

    ChangePassword: (transaction: any) => void;
    login: (email: string, password: string) => any;
    googleLogin: () => void;
    logout: () => void;
    logoutEvent: boolean;
    signUp: (data: any) => void;
    sendVerification: (email: string) => void;
    requestVerification: () => void;
    resetPassword: (email: string) => void;
    ChangeEmail: (newEmail: string) => void;
    changeAvatar: (data: FormData) => void;

    avatar: string;
    // role: string;
    // token: string;
    // settings: any;
    // email: string;
    // name: string;
    // userId: string;
};

const DataContext = React.createContext({} as DataContextType)


export function useData() {
    return useContext(DataContext)
}

export interface DataProviderProps {
    children: React.ReactNode
}


export function DataProvider({ children }: DataProviderProps) {

    console.log("connecting to: " + pbURL)
    const pb = new PocketBase(pbURL);
    const defaultAvatar = window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/images/user.png"
    const [sophiesLoan, setSophiesLoan] = useState<any[]>([]);
    const [alecsLoan, setSAlecsLoan] = useState([]);
    const [logoutEvent, setLogoutEvent] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [messagesLoaded, setMessagesLoaded] = useState(false);
    const [avatar, setAvatar] = useState<string>(defaultAvatar);
    const [settings, setSettings] = useState<any>({});
    const ChangePassword = async () => { if (pb.authStore.model) resetPassword(pb.authStore.model.email) }

    useEffect(() => {
        if (pb.authStore.isValid && pb.authStore.model) {
            setAvatar(pb.files.getUrl(pb.authStore.model, pb.authStore.model.avatar));
            setSettings(pb.authStore.model.settings);
            try {
                pb.collection('users').subscribe(pb.authStore.model?.id, async (e) => {
                    try {
                        if (pb.authStore.isValid) {
                            await pb.collection('users').authRefresh();
                        }
                    } catch (error) {
                        console.log("error: ", error)
                    }
                    // if (pb.authStore.model?.verified == true)
                    //     setVerified(true);
                    // else
                    //     setVerified(false);
                }, { /* other options like expand, custom headers, etc. */ });
            } catch (error) {
                console.log("error: ", error);
            }
            return () => {
                pb.collection('users').unsubscribe(pb.authStore.model?.id);
            }
        } else {
            return () => { };
        }

    }, [pb.authStore.isValid])

    const login = async (email: string, password: string) => {
        try {
            await pb.collection('users').authWithPassword(email, password);
        } catch (error) {
            console.log("error: ", error);
        }
    }

    const googleLogin = async () => {

        //all-in-1 google login
        //explanation: https://pocketbase.io/docs/authentication
        //get key and secret from google developer console, and set them in pocketbase auth configuration 
        //redirect set to https://pocketbase.thilenius.com/api/oauth2-redirect
        try {
            const authData = await pb.collection('users').authWithOAuth2({ provider: 'google' });
            if (authData.meta && authData.record) {
                if ((authData.meta.name.length > 0) &&
                    (authData.meta.name !== authData.record.name) &&
                    pb.authStore.model
                ) pb.collection('users').update(pb.authStore.model.id, { name: authData.meta.name });

                const meta = authData.meta;

                if (meta.isNew) {
                    const formData = new FormData();
                    const response = await fetch(meta.avatarUrl);
                    if (response.ok) {
                        const file = await response.blob();
                        formData.append('avatar', file);
                    }
                    formData.append('name', meta.name);
                    formData.append('role', "member");
                    await pb.collection('users').update(authData.record.id, formData);
                    await pb.collection("users").authRefresh();
                }
                // setIsLoggedIn(true);
                console.log(pb.authStore.isValid);
                // debugger;
            }
        } catch (error) {
            console.log("Failed to exchange code.\n" + error)
        }
        // setIsLoggedIn(true);
    }

    const logout = () => {
        pb.authStore.clear();
        setLogoutEvent(!logoutEvent);
    }

    const signUp = async (data: any) => {
        await pb
            .collection('users')
            .create({
                email: data.email,
                password: data.password,
                passwordConfirm: data.passwordConfirm,
                name: data.name,
                role: "Member"
            })
    }


    const sendVerification = async (email: string) => {
        const requestVerification = useData();
        if (await pb.collection('users').requestVerification(email)) console.log("Verification Email Sent!")
    }

    const requestVerification = async () => {
        if (await pb.collection('users').requestVerification(pb.authStore.model?.email)) alert('Verification Email Sent! Check your inbox.')
        else alert('Error sending verification email.')
    }

    const resetPassword = async (email: string) => {
        if (await pb.collection('users').requestPasswordReset(email)) alert('Password Reset Email Sent to ' + email + '! Check your inbox.')
        else alert('Error sending Password Reset email.')
    }

    const ChangeEmail = async (newEmail: string) => await pb.collection('users').requestEmailChange(newEmail);

    const changeAvatar = async (data: FormData) => {
        if (pb.authStore.model != null) {
            await pb.collection("users").update(pb.authStore.model.id, data);
            await pb.collection("users").authRefresh();
            setAvatar(pb.authStore.model.avatar);
        }
    }

    const getLoan = (id: string) => {
        const rate = 0.025
        pb.collection('loans').getFirstListItem(`loanId="${id}"`, {}).then((record) => {
            console.log("record:", record);

            const ordered = Object.keys(record.info).sort().reduce(
                (obj: any, key) => {
                    obj[key] = record.info[key];
                    return obj;
                },
                {}
            );
            let list: any[] = []
            let balance = 0
            let lastDate = Number(Object.keys(ordered)[0]);
            console.log("lastDate:", lastDate)
            Object.keys(ordered).forEach((key: string, i) => {
                const record = ordered[key]
                const transaction: any = {}
                transaction.confirmed = record.confirmed
                transaction.date = new Date(1000 * Number(key))
                const duration = Number(key) - lastDate;
                lastDate = Number(key);
                transaction.interest = balance * rate * (duration / (3600 * 24)) / 365
                if (record.payment < 0) {
                    transaction.withdraw = -record.payment
                    transaction.payment = 0
                }
                else {
                    transaction.withdraw = 0
                    transaction.payment = record.payment
                }
                balance -= record.payment
                balance -= record.extra
                balance += transaction.interest
                transaction.extra = record.extra
                transaction.balance = balance
                list.push(transaction)
            })

            setSophiesLoan(list)
        });
    }


    const updateLoan = async (transaction: any) => {
        // const docRef = doc(db, "loan", transaction.id);
        // await updateDoc(docRef, {
        //     date: transaction.date.getTime() / 1000,
        //     payment: transaction.payment,
        //     extra: transaction.extra,
        //     confirmed: transaction.confirmed
        // })
    }

    const addLoan = async (transaction: any) => {
        // const loanRef = collection(db, "loan")
        // await addDoc(loanRef, {
        //     date: transaction.date.getTime() / 1000,
        //     payment: transaction.payment,
        //     extra: transaction.extra,
        //     confirmed: transaction.confirmed
        // })
    }

    const deleteLoan = async (id: any) => {
        // const docRef = doc(db, "loan", id);
        // await deleteDoc(docRef)
    }

    const getDailySolarPower = async () => {
        let result: any = [];
        try {
            result = await pb.collection('dailySolarPower').getFullList();
        } catch (error) {
            console.error("Error fetching data from PocketBase:", error);
        }
        return result.items;

    }

    const saveMessage = async (msg: any) => {
        //msg.message is already set
        if (pb.authStore.isValid) {
            msg.userId = pb.authStore.model ? pb.authStore.model.id : "";
            msg.site = 'Thilenius';
            try {
                await pb.collection('posts').create(msg);
            } catch (e) {
                console.log("error:", e);
            }
        }
    }

    const deleteMessage = async (msg: any) => {
        if (msg.userId === pb.authStore.model?.id) {
            if (confirm("Do you want to delete this message?"))
                await pb.collection('posts').delete(msg.id);
        }

    }

    const loadMessages = (msg: any) => {
        pb.collection('posts').getList(1, 50, {
            sort: '-created',
            expand: 'userId',
        }).then((record: any) => {
            setMessages(record.items);
            setMessagesLoaded(true);
        });
    }


    useEffect(() => {
        const updateMessages = async (e: any) => {
            const record: any = e.action == 'delete' ? '' : await pb.collection('posts').getOne(e.record.id, { expand: 'userId' });
            try {
                switch (e.action) {
                    case 'delete':
                        setMessages(messages.filter(m => m.id !== e.record.id));
                        break;
                    case 'create':
                        setMessages([record, ...messages]);
                        console.log("created");
                        break;
                    case 'update':
                        setMessages(messages.map(m => m.id === e.record.id ? record : m));
                        break;
                }
                console.log("success");
            } catch (e) {
                console.log("error:", e);
            }
        }
        pb.collection('posts').subscribe('*', updateMessages);
        return () => {
            pb.collection('posts').unsubscribe('*');
        }
    }, [messages])



    const value = {
        getLoan,
        updateLoan,
        sophiesLoan,
        alecsLoan,
        addLoan,
        deleteLoan,
        getDailySolarPower,

        saveMessage,
        deleteMessage,
        loadMessages,
        messages,
        messagesLoaded,

        pb,
        ChangePassword,
        avatar,
        login,
        googleLogin,
        logout,
        logoutEvent,
        signUp,
        sendVerification,
        requestVerification,
        resetPassword,
        ChangeEmail,
        changeAvatar,
        // isLoggedIn,
        // role: pb.authStore.model ? pb.authStore.model.role : '',
        // token: pb.authStore.token,
        // settings,
        // email: pb.authStore.model ? pb.authStore.model.email : '',
        // name: pb.authStore.model ? pb.authStore.model.name : '',
        // verified: pb.authStore.model ? pb.authStore.model.verified : '',
        // userId: pb.authStore.model ? pb.authStore.model.id : '',
    } as any

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    )
}

