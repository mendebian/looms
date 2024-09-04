import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, updateProfile, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js';
import { getDatabase, set, ref as databaseRef, push, onValue, child, query, update, remove, get } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.11.1/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyCCg_gP7ruq4Add-ucxBDWqtinr-RdvMUI",
    authDomain: "lumo-looms.firebaseapp.com",
    projectId: "lumo-looms",
    storageBucket: "lumo-looms.appspot.com",
    messagingSenderId: "648410058046",
    appId: "1:648410058046:web:d0811394f78e288716f06f",
    measurementId: "G-4EVEL2PYNE"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { 
    auth,
    database,
    storage,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    signOut,
    set,
    get,
    child,
    databaseRef,
    push,
    onValue,
    query,
    update,
    remove,
    storageRef,
    uploadBytesResumable,
    getDownloadURL
};
