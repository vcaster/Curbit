const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const inputSchema = mongoose.Schema({
    name:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount:{
        type:String
    }
},{timestamps:true});

const Input = mongoose.model('Input',inputSchema);

module.exports = { Input }