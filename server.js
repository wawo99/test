const express = require('express')
const expressSanitizer= require('express-sanitizer')
const app = express()
const fs = require('fs')
const path = require('path')
const chatPosrt = 5000

const options = {
    key : fs.readFileSync('./config/cert.key'),
    cert: fs.readFileSync('./config/cert.crt')
}

const server = require('http').createServer(options, app)
const io = require('socket.io')(server)

const Datastore = require('nedb')
const db = {}

app.use(express.join())
app.use(express.urlencoded({extended:true}))
app.use(expressSanitizer())
app.use(express.static(path.join(__dirname, 'public3')))

server.listen(chatPort, () => {
    console.log('ok')
})

io.on('conncetion', socket => {
    console.log('connect')
    socket.on('chat message', ({user, msg, imageData}) => {
        console.log('수신 ')
        db.chat = new Datastore({filename: getTodayChatFile('chat')})
        db.chat.loadDatabase()
        db.chat.insert({user, msg}) 
        
        if(imageData){
            db.image = new Datastore({filename: getTodayChatFile('image')})
            db.image.loadDatabase()
            db.image.insert({user, imageData})
        }

        io.to(socket.room).emit('chat message', {user, msg, imageData})
    })

    socket.on('chat typing', m => {
        console.log('on typing', m)
        io.to(socket.room).emit('chat typing', m)
    })

    socket.on('leave room', name => {
        socket.leave(name)
        const rooms = getUserRooms()
        if(!rooms.includes(name)){
            io.emit('remove room', {name})
        }
    })

    socket.on('checked date', ({date, name})=>{
        db.checkdate.findOne({date}, (e,d)=>{
            if(d) db.checkdate.remove({_id:d._id}, {multi: false})
            db.checkdate.insert({date, name})
            selectList()
        })
    })

    socket.on('checked dat')


        
})