const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const SALT_I = 10;
require('dotenv').config();

const userSchema = mongoose.Schema({
    email:{
        type:String,
        required: true,
        trim: true,
        unique: 1
    },
    password:{
        type:String,
        required: true,
        minlength: 5
    },
    username:{
        type:String,
        required: true,
        maxlength:50
    },
    firstname:{
        type:String,
        required: true
    },
    lastname:{
        type:String,
        required: true
    },

    dob:{
        type:String
    },
    startSmoke:{
        type:String
    },
    endSmoke:{
        type:String
    },
    height:{
        type:String
    },

    weight:{
        type:String
    },

    joinDate:{
        type:String,
        required: true
    },
    streak:{
        type:String,        
        default:"0"
    },
    lastLogin:{
        type:String
    },
    role:{
        type:Number,
        default:0
    },
    deleted:{
        type:String,
        default:"0"
    },
    extra0:{
        type:String,
        default:0
    },
    extra1:{
        type:String,
        default:0
    },
    extra2:{
        type:String,
        default:0
    },
    photo:{
        type:String,
        maxlength:100,
        default: "https://via.placeholder.com/320x320?text=NO+IMAGE"

    },
    token:{
        type:String
    }
});

// Before saving to mongo
userSchema.pre('save',function(next){
    var user = this;
    // hash only when password is changed
    if(user.isModified('password')){
        bcrypt.genSalt(SALT_I,function(err,salt){
            if(err) return next(err);
    
            bcrypt.hash(user.password,salt,function(err,hash){
                if(err) return next(err);
                user.password = hash;
                next();
            });
        })
    } else{
        next()
    }
})

//Compare passed password with actual password
userSchema.methods.comparePassword = function(candidatePassword,cb){
    bcrypt.compare(candidatePassword,this.password,function(err,isMatch){
        if(err) return cb(err);
        cb(null,isMatch)
    })
}


userSchema.methods.generateToken = function(cb){
    var user = this;
    var token = jwt.sign(user._id.toHexString(),process.env.SECRET)

    user.token = token;
    user.save(function(err,user){
        if(err) return cb(err);
        cb(null,user);
    })
}

userSchema.statics.findByToken = function(token,cb){
    var user = this;

    jwt.verify(token,process.env.SECRET,function(err,decode){
        user.findOne({"_id":decode,"token":token},function(err,user){
            if(err) return cb(err);
            cb(null,user);
        })
    })
}



const User = mongoose.model('User',userSchema);

module.exports = { User }