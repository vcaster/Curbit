const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

require('dotenv').config();

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI)

const app = express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('client/build'))

// Models
const { User } = require('./models/user');

// Middlewares
const { auth } = require('./middleware/auth');

/* -------------------------------------------
                USERS
---------------------------------------------*/

app.get('/api/users/auth',auth,(req,res)=>{
    res.status(200).json({
        isUser: req.user.role === 0 ? false : true,
        isProf: req.user.role === 1 ? false : true,
        isAuth: true,
        email: req.user.email,
        username: req.user.username,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        lastLogin: req.user.lastLogin
    })
})

app.post('/api/users/register', (req, res) => {
    const user = new User(req.body);


    user.save((err,doc)=>{
        if(err) return res.json({success:false,err});
        res.json({
            doc
        })
    })
});

app.post('/api/users/login', auth, (req, res) => {

    User.findOne({'username':req.body.username},(err,user)=>{
        console.log(user)
        if(!user) return res.status(401).json({loginSuccess:false,message:'Wrong password'});
        if(user.deleted === '1') return res.status(401).json({loginSuccess:false,message:'User Deleted'});
        
        // comparePassword in user module
        user.comparePassword(req.body.password,(err,isMatch)=>{
            if(!isMatch) return res.status(401).json({loginSuccess:false,message:'Wrong password!'});

            user.generateToken((err,user)=>{
                if(err) return res.status(400).send(err);
                res.cookie('auth',user.token).status(200).json({
                    loginSuccess: true,
                    id: user._id
                })
            })
        })
    })
});

if(process.env.NODE_ENV === 'production'){
    app.get('/*',(req,res)=>{
        res.sendfile(path.resolve(__dirname,'../client', 'build', 'index.html'))
    })
}


const port = process.env.PORT || 3001;
app.listen(port,()=>{
    console.log(`Server Running at ${port}`)
})