const express = require('express')
const expressSanitizer= require('express-sanitizer')
const app = express()
const fs = require('fs')
const path = require('path')
const chatPort = 5000

const options = {
    key : fs.readFileSync('./config/cert.key'),
    cert: fs.readFileSync('./config/cert.crt')
}

const server = require('http').createServer(options, app)
const io = require('socket.io')(server)

const Datastore = require('nedb')
const db = {}

app.use(express.json())
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

    socket.on('checked date list', () => {
        getCheckedList()
    })

    socket.on('checked remove date', ({date}) => {
        db.checkdate.remove({date}, {multi: false})
        getCheckedList()
    })

    socket.on('remove room', ({name}) => {
        setRooms((prev) => prev.filter((item) => item !== name))
    })

    socket.on('join room', ({preRoom, newRoom, name}) => {
        console.log('입장')
        socket.name = name
        socket.join(newRoom)
        socket.room = newRoom
        let clients = io.sockets.adapter.rooms.get(newRoom)
        const {currentChatRoomUserList, roomClientsNum} = getRoomInfo(clients)

        const chatRoomList = getUserRooms()
        io.emit('chatRoomList', chatRoomList)
        io.emit('notice', {currentChatRoomUserList, roomClientsNum, name: socket.name})
    })

    socket.on('get room list', () => {
        const chatRoomList = getUserRooms()
        io.emit('chatRoomList', chatRoomList)
    })
        
})

function getToday() {
    const ts = Date.now()
    const dateTime = new Date(ts)
    const date = dateTime.getDate()
    const month = dateTime.getMonth() + 1
    const year = dateTime.getFullYear()
    return `${year}${month}${date}`
}

function getTodayChatFile(type) {
    const fileName = `${type}${getToday()}.db`
    const filePath = `${__dirname}/data/${fileName}`
    return filePath
}

function getRoomInfo(clients) {
    const roomClientsNum = clients ? clients.size : 0
    const currentChatRoomUserList = []
    if(clients){
        clients.forEach(element => {
            currentChatRoomUserList.push(io.sockets.sockets.get(element).name)
        })
    }

    return { roomClientsNum, currentChatRoomUserList }
}

const getUserRooms = () => {
    const userRooms = []
    const { sids, rooms } = io.of('/').adapter
    rooms.forEach((_, key) => {
        if(sids.get(key) === undefined){
            userRooms.push(key)
        }
    })
    return userRooms
}

function selectList() {
    db.checkdate.find({}, (e,v)=>{
        io.emit('checked date list', v)
    })
}

function getCheckedList() {
    const filePath = `${__dirname}/data/checkDate.db`
    db.checkdate = new Datastore({filename: filePath, autoload: true})
    selectList()
}