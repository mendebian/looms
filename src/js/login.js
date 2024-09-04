import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, database, set, databaseRef  } from '../../firebase.js';

let user;

const signIn = document.getElementById("sign-in");
const signUp = document.getElementById("sign-up");

function showSignUp() {
    signUp.style.display = "block";
    signIn.style.display = "none";
}

function showSignIn() {
    signUp.style.display = "none";
    signIn.style.display = "block";
}

function loading(show) {
    if (show) {
        document.getElementById('loading').style.display = 'flex';
    } else {
        document.getElementById('loading').style.display = 'none';
    }
}

async function writeUserData(user, name) {
    await set(databaseRef(database, 'users/' + user.uid + '/details'), {
        uid: user.uid,
        email: user.email,
        display_name: name,
        created_on: user.metadata.creationTime
    });
    window.location.href = "./main.html";
  }

function createUserAuth() {
    const name = document.querySelector(".sign-up-name").value.trim();
    const email = document.querySelector(".sign-up-email").value.trim();
    const password = document.querySelector(".sign-up-password").value.trim();
    const checkPassword = document.querySelector(".sign-up-check").value.trim();
    
    if (name === "" || email === "" || password === "" || checkPassword === "") {
        alert("Preencha todos os campos")
    } else {
        if (password === checkPassword) {
            loading(true);

            createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                writeUserData(userCredential.user, name);
            })
            .catch((error) => {
                const errorCode = error.code;
                const errorMessage = error.message;
                loading(false);
            });
        } else {
            alert("Senhas não coincidem.")
        }
    }
}

function signInAuth() {
    const email = document.querySelector(".sign-in-email").value.trim();
    const password = document.querySelector(".sign-in-password").value.trim();

    if (email === "" || password === "") {
        alert("Preencha todos os campos.")
    } else {
        loading(true);
        
        signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            window.location.href = "./main.html";
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            loading(false);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if ((localStorage.getItem('dark') || 'light') === 'dark') {
        document.documentElement.classList.add('dark');
    }
});

for (const funcName in { showSignUp, showSignIn, signInAuth, createUserAuth }) {
    window[funcName] = eval(funcName);
}
