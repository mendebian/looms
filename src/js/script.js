import { auth } from '../../firebase.js';

auth.onAuthStateChanged(user => {
    if (user) {
        window.location.href = "./src/html/main.html";
    } else {
        window.location.href = "./src/html/login.html";
    }
});