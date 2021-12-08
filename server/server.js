const express = require('express');
const http = require("http");
const moment = require('moment');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { Server } = require("socket.io");


require('dotenv').config();

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI)

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static('client/build'))

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

// Models
const { User } = require('./models/user');
const { Input } = require('./models/input');

// Middlewares
const { auth } = require('./middleware/auth');

/* -------------------------------------------
                socket.io
---------------------------------------------*/

io.on("connection", (socket) => {
    console.log(socket.id);

    socket.on("chat", (data) => {
        socket.join(data);
    });

    socket.on("send_message", (data) => {
        socket.to(data.room).emit("receive_message", data);
        console.log(data)
    });

    socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
    });
});

/* -------------------------------------------
                USERS
---------------------------------------------*/

app.get('/api/users/auth', auth, (req, res) => {
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
        role: req.user.role,
        joinDate: req.user.joinDate,
        weight: req.user.weight,
        height: req.user.height
    })
})

app.post('/api/users/register', (req, res) => {
    const user = new User(req.body);
    var error = false
    var message = ""
    console.log(req.body.password)
    User.findOne({
        username: req.body.username
    }, (err, usr) => {
        if (usr) {
            message += " 'Username already taken'"
            error = true
        }

        User.findOne({
            email: req.body.email
        }, (err, usrr) => {
            if (usrr) {
                message += " 'Email already used'"
                error = true
            }

            if (req.body.password.length <= 5) {
                message += " 'Password needs to be greater than 5'"
                error = true
            }
            if (!/(0[1-9]|1[012])[/](0[1-9]|[12][0-9]|3[01])[/](19|20)\d\d/.test(req.body.dob) && !/(0[1-9]|1[012])[/](0[1-9]|[12][0-9]|3[01])[/](19|20)\d\d/.test(req.body.endSmoke)) {
                message += " 'Date(s) need to be in (MM/DD/YYYY)' "
                error = true
            }

            if (error) return res.json({ success: false, message: message })

            user.save((err, doc) => {
                if (err) return res.json({ success: false, message: 'Something Went Wrong', err });
                res.status(200).json({
                    loginSuccess: true,
                    doc
                })
            })
        })


    })


});

app.post('/api/users/login', (req, res) => {
    console.log(req.body.username)
    User.findOne({ 'username': req.body.username }, (err, user) => {
        console.log(user)
        if (!user) return res.json({ loginSuccess: false, message: 'Wrong username or password' });
        if (user.deleted === '1') return res.json({ loginSuccess: false, message: 'User Deleted' });

        // comparePassword in user module
        user.comparePassword(req.body.password, (err, isMatch) => {
            if (!isMatch) return res.json({ loginSuccess: false, message: 'Wrong username or password' });

            user.generateToken((err, user) => {
                if (err) return res.send(err);
                res.cookie('auth', user.token).status(200).json({
                    loginSuccess: true,
                    id: user._id,
                    role: user.role
                })
            })
        })
    })
});

app.get('/api/users/logout', auth, (req, res) => {
    res.cookie('auth', "")
    User.findOneAndUpdate(
        { _id: req.user._id },
        { token: '' },
        (err, doc) => {
            if (err) return res.json({ success: false, err });
            return res.status(200).send({
                success: true,
                id: req.user._id
            })
        }
    )
})

app.post('/api/users/reset_password', (req, res) => {

    User.findOne({
        _id: req.body._id
    }, (err, user) => {
        if (!user) return res.json({ success: false, message: 'Something is wrong' })
        user.comparePassword(req.body.oldpass, (err, isMatch) => {
            if (!isMatch) return res.json({ loginSuccess: false, message: 'Wrong password!' });
            if (req.body.password.length <= 5) return res.json({ success: false, message: 'Password needs to be greater than 5' })
            user.password = req.body.password;
            // user.resetp = req.body.resetp
            user.save((err, doc) => {
                if (err) return res.json({ success: false, err });
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

    let findArgs = {};
    findArgs['name'] = req.body.name;
    Input.find(findArgs).sort({ _id: -1 }).limit(1).then((user) => {
        console.log(user[0].updatedAt)
        var yesterday = new Date();
        var tday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        var yesterday = moment(yesterday).format("YYYY-MM-DD");
        var updated = moment(user[0].updatedAt).format("YYYY-MM-DD");
        var today = moment(tday).format("YYYY-MM-DD");

        console.log(yesterday + " " + updated + " " + today)
        if (updated == yesterday) {
            User.findOneAndUpdate({ _id: req.body.name }, { $inc: { 'streak': 1 } }, (err, doc) => {
                if (err) return res.json({ success: false, err });
            })
        } else if (today == updated) {
            console.log("do nothing")
        }
        else {
            User.findOneAndUpdate({ _id: req.body.name }, { streak: 1 }, (err, doc) => {
                if (err) return res.json({ success: false, err });
            })
        }
    })



    const input = new Input(req.body);

    input.save((err, doc) => {
        if (err) return res.json({ success: false, err });
        res.json({
            doc
        })
    })
});


/* -------------------------------------------
                profile
---------------------------------------------*/

app.post('/api/users/update', (req, res) => {

    var error = false
    var message = ""
    if (!/(0[1-9]|1[012])[/](0[1-9]|[12][0-9]|3[01])[/](19|20)\d\d/.test(req.body.dob)) {
        message += " 'Date(s) need to be in (MM/DD/YYYY)' "
        error = true
    }

    if (error) return res.json({ success: false, message: message })


    User.findOneAndUpdate(
        { _id: req.body._id },
        {
            "$set": req.body
        },
        { new: true },
        (err, doc) => {
            if (err) return res.json({ success: false, err });
            return res.status(200).send({
                success: true
            })
        }
    )

});

/* -------------------------------------------
                GRAPH
---------------------------------------------*/


app.get('/api/graph/date_range', (req, res) => {

    var startDate = moment(req.query.startDate).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    var endDate = moment(req.query.endDate).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    console.log(startDate)
    Input.
        find({ 'name': { $in: req.query._id }, 'createdAt': { $gte: startDate, $lt: endDate } }).
        populate('name').
        exec((err, docs) => {
            return res.status(200).send(docs)
        })
})

if (process.env.NODE_ENV === 'production') {
    app.get('/*', (req, res) => {
        res.sendfile(path.resolve(__dirname, '../client', 'build', 'index.html'))
    })
}


const port = process.env.PORT || 3001;
server.listen(port, () => {
    console.log(`Server Running at ${port}`)
})