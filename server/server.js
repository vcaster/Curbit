const express = require('express');
const moment = require('moment');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');

require('dotenv').config();

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI)

const app = express();

app.use(cors({origin: 'http://localhost:3000',credentials: true}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('client/build'))

// Models
const { User } = require('./models/user');
const { Input } = require('./models/input');

// Middlewares
const { auth } = require('./middleware/auth');

/* -------------------------------------------
                USERS
---------------------------------------------*/

app.get('/api/users/auth',auth,(req,res)=>{
    res.status(200).json({
        isUser: req.user.role === 0 ? true : false,
        isProf: req.user.role === 1 ? true : false,
        isAuth: true,
        _id: req.user._id,
        email: req.user.email,
        username: req.user.username,
        firstname: req.user.firstname,
        lastname: req.user.lastname,
        lastLogin: req.user.lastLogin,
        startSmoke: req.user.startSmoke,
        endSmoke: req.user.endSmoke,
        streak: req.user.streak,
        dob: req.user.dob,
        joinDate: req.user.joinDate,
        weight: req.user.weight,
        height: req.user.height
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

app.post('/api/users/login', (req, res) => {
    console.log(req.body.username)
    User.findOne({'username':req.body.username},(err,user)=>{
        console.log(user)
        if(!user) return res.json({loginSuccess:false,message:'Wrong password'});
        if(user.deleted === '1') return res.json({loginSuccess:false,message:'User Deleted'});
        
        // comparePassword in user module
        user.comparePassword(req.body.password,(err,isMatch)=>{
            if(!isMatch) return res.json({loginSuccess:false,message:'Wrong password!'});

            user.generateToken((err,user)=>{
                if(err) return res.send(err);
                res.cookie('auth',user.token).status(200).json({
                    loginSuccess: true,
                    id: user._id
                })
            })
        })
    })
});

app.get('/api/users/logout',auth,(req,res)=>{
    res.cookie('auth', "")
    User.findOneAndUpdate(
        { _id:req.user._id },
        { token: '' },
        (err,doc)=>{
            if(err) return res.json({success:false,err});
            return res.status(200).send({
                success: true,
                id: req.user._id
            })
        }
    )
})

app.post('/api/users/reset_password',(req,res)=>{

    User.findOne({
        _id: req.body._id
    },(err,user)=>{
        if(!user) return res.json({success:false,message:'Something is wrong'})
        user.comparePassword(req.body.oldpass,(err,isMatch)=>{
            if(!isMatch) return res.json({loginSuccess:false,message:'Wrong password!'});    
                user.password = req.body.password;
                // user.resetp = req.body.resetp
                user.save((err,doc)=>{
                    if(err) return res.json({success:false,err});
                    return res.status(200).json({
                        success: true
                    })
                })
        })
    })
})

/* -------------------------------------------
                INPUT
---------------------------------------------*/

app.post('/api/users/input', (req, res) => {
    const input = new Input(req.body);

    input.save((err,doc)=>{
        if(err) return res.json({success:false,err});
        res.json({
            doc
        })
    })
});


/* -------------------------------------------
                profile
---------------------------------------------*/

app.post('/api/profile/update', (req, res) => {
    User.findOneAndUpdate(
        {_id: req.body._id},
        {
            "$set": req.body
        },
        {new:true},
        (err,doc)=>{
            if(err) return res.json({success: false,err});
            return res.status(200).send({
                success:true
            })
        }
    )
});

/* -------------------------------------------
                GRAPH
---------------------------------------------*/


app.get('/api/graph/date_range', (req,res) =>{

    var startDate = moment(req.query.startDate).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    var endDate   = moment(req.query.endDate).format("YYYY-MM-DDTHH:mm:ss.SSSZ"); 
    Input.
    find({'name':{$in:req.query._id},'createdAt':{$gte:startDate,$lt:endDate}}).
    populate('name').
    exec((err,docs)=>{
         return res.status(200).send(docs)
    })
})

if(process.env.NODE_ENV === 'production'){
    app.get('/*',(req,res)=>{
        res.sendfile(path.resolve(__dirname,'../client', 'build', 'index.html'))
    })
}


const port = process.env.PORT || 3001;
app.listen(port,()=>{
    console.log(`Server Running at ${port}`)
})