const functions = require('firebase-functions');
const admin = require('firebase-admin')


const app = require('express')()
admin.initializeApp()
//
var firebaseConfig = {
    apiKey: "AIzaSyA0M86Qgg2wb99shALJUeyD-ZQStSy2rEE",
    authDomain: "socialappreact-c8328.firebaseapp.com",
    databaseURL: "https://socialappreact-c8328.firebaseio.com",
    projectId: "socialappreact-c8328",
    storageBucket: "socialappreact-c8328.appspot.com",
    messagingSenderId: "911189140730",
    appId: "1:911189140730:web:3c52e5da12d5942db09543",
    measurementId: "G-Y1PE9E33X2"
};



const firebase = require('firebase');
firebase.initializeApp(firebaseConfig);

const db = admin.firestore()

app.get('/screams', (req, res) => {
    db
        .collection('screams')
        .orderBy('createdAt', 'desc')
        .get()
        .then(data => {
            let screams = [];
            data.forEach(doc => {
                screams.push({
                    screamId: doc.id,
                    body: doc.data().body,
                    userHandle: doc.data().userHandle,
                    createdAt: doc.data().createdAt
                });
            })
            return res.json(screams)
        })
        .catch(err => console.log(err))
})


app.post('/scream', (req, res) => {

    const newScream = {
        body: req.body.body,
        userHandle: req.body.userHandle,
        createdAt: new Date().toISOString()
    };
    db
        .collection('screams')
        .add(newScream)
        .then(doc => {
            res.json({ message: `document ${doc.id} created successfully` })
        })
        .catch(err => {
            res.status(500).json({ error: 'Something went wrong' });
            console.log(err)
        })
})

const isEmail = email => {
    const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (email.match(regex)) return true;
    else return false;
}

const isEmpty = (string) => {
    if (string.trim() === '') return true;
    else return false
}

// Signup Route
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle,
    };

    let errors = {};


    if (isEmpty(newUser.email)) {
        errors.email = "Email must not be empty"
    } else if (!isEmail(newUser.email)) {
        errors.email = 'Must be a valid email address'
    }

    if (isEmpty(newUser.password)) errors.password = 'Must not be empty'
    if (newUser.password !== newUser.confirmPassword) errors.confirmPassword = "Password must match"
    if (isEmpty(newUser.handle)) errors.handle = 'Must not be empty'

    if (Object.keys.length > 0) return res.status(400).json(errors)
    //should not have duplicate user handle
    let token, userId;
    db.doc(`/users/${newUser.handle}`).get()
        .then(doc => {
            if (doc.exists) {
                return res.status(400).json({
                    handle: "this handle is already taken"
                })
            } else {
                return firebase.auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
            }
        }).then(data => {
            userId = data.user.uid;
            return data.user.getIdToken();
        }).then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            };
            db.doc(`/users/${newUser.handle}`).set(userCredentials)
        })
        .then(() => {
            return res.status(201).json({ token })
        })
        .catch(err => {
            console.log(err)
            if (err.code === 'auth/email-already-in-use') {
                return res.status(400).json({
                    email: `Email is already in use`
                })
            } else {
                return res.status(500).json({ error: err.code })
            }
        })

})

app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body.password
    }

    let errors = {};

    if (isEmpty(user.email)) errors.email = "Must not be empty";
    if (isEmpty(user.password)) errors.password = "Must not be empty";

    if (Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        }).then(token => {
            return res.json(token)
        }).catch(err => {
            console.log(err)
            return res.status(500).json({
                error: err.code
            })
        })
})

exports.api = functions.region('europe-west1').https.onRequest(app);