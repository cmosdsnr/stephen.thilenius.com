import React, { useState, useEffect, useContext } from 'react'
// import pb from '../lib/pb'
import useLogin from '../src/hooks/useLogin'
import { auth, db } from '../src/firebase'
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    signOut,
    sendPasswordResetEmail,
    updateEmail,
    updatePassword,
    onAuthStateChanged
} from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";


const AuthContext = React.createContext()


export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState()
    const [loading, setLoading] = useState(true)

    async function createUserData(user) {
        const userRef = doc(db, 'users', user.uid)
        const data = {
            firstName: "",
            lastName: "",
            other: "",
            email: user.email,
            role: "Member"
        }
        await setDoc(userRef, data)
    }
    function signup(email, password) {
        return createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                const user = userCredential.user;
                if (user) {
                    createUserData(user)
                    if (user.emailVerified === false) {
                        sendEmailVerification(user).then(() => {
                            console.log("email verification sent to user");
                        });
                    }
                }
                // logout()
                alert("A verification Email has been sent to " + user.email)
            }).catch(function (error) {
                // Handle Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;

                console.log(errorCode, errorMessage);
            });

    }

    async function login(email, password) {

        console.log("login attempt", email, password);

        const res = await signInWithEmailAndPassword(auth, email, password);
        await getUserData(res.user);
    }

    function logout() {
        setCurrentUser(null);
        return signOut(auth);
    }

    function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    function updateUserEmail(email) {
        return updateEmail(auth.currentUser, email);
    }

    function updateUserPassword(password) {
        return updatePassword(auth.currentUser, password)
    }

    function updateUserInfo(first, last, other, role) {
        const data = {
            firstName: first,
            lastName: last,
            other: other,
            email: currentUser.email,
            role: role
        }
        const docRef = doc(db, 'users', currentUser.uid)
        return updateDoc(docRef, data)
    }

    async function reloadUserInfo() {
        const docRef = doc(db, 'users', currentUser.uid)
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const u = { ...currentUser, ...data }
            setCurrentUser(u)
        } else {
            console.log("didn't get record")
        }

    }
    async function getUserData(user) {
        const docRef = doc(db, 'users', user.uid)
        try {
            const docSnap = await getDoc(docRef)
            if (docSnap.exists()) {
                const data = docSnap.data();
                const tot = { ...user, ...data }
                console.log("Document  read data:", tot);
                setCurrentUser(tot)
            } else {
                console.log("No such user document!");
                //we need to create it
                const userRef = doc(db, 'users', user.uid)
                const data = {
                    firstName: "",
                    lastName: "",
                    other: "",
                    email: user.email,
                    role: "Member"
                }
                try {
                    console.log("Writing user data line 128:", data)
                    await setDoc(userRef, data)
                    setCurrentUser({ ...user, ...data })
                } catch (e) {
                    console.log("Could not create user record");
                }
            }
        } catch (e) {
            // we get here on logout: user is still valid, but the authorization has been removed
            console.log("Could not read user record");
        }
    }
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // if (user) await getUserData(user)
            setLoading(false)
        })
        return unsubscribe
    }, [])

    const value = {
        currentUser,
        login,
        logout,
        signup,
        resetPassword,
        updateUserEmail,
        updateUserPassword,
        updateUserInfo,
        reloadUserInfo,
    }
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
