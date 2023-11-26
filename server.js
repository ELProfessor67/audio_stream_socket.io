// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const app = express();

app.get('/',(req,res) => res.send('its working'));

const server = http.createServer(app);
const io = socketIO(server,{
  cors: {
    origin: '*'
  }
});

const roomsowners = {};
const ownersSocketId = {}

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('owner-join',(data) => {
    console.log('data',data)
    if(data.user) data.user.socketId = socket.id;
    roomsowners[data?.user?._id] = data?.user;
    ownersSocketId[socket.id] = data?.user?._id;

    io.to(data?.user?._id).emit('room-active-now',{user: data?.user});
    console.log('roomsowners',roomsowners)
    console.log('ids',ownersSocketId)
  });


  socket.on('user-join',(data) => {
    socket.join(data.roomId);
    const owner = roomsowners[data.roomId];

    if(owner){
      io.to(socket.id).emit('room-active',{user: owner});
    }else{
      io.to(socket.id).emit('room-unactive',{});
    }
    console.log(data,socket.id)
  });


  socket.on('offer', (data) => {
    console.log('offer',data);
    console.log('recieverId',data.recieverId)
    console.log(ownersSocketId)
    io.to(data.recieverId).emit('offer',{offer: data?.offer,senderId: socket.id});
  });

  socket.on('answer', (data) => {
    console.log('answer',data);
    io.to(data?.recieverId).emit('answer',{answer: data?.answer});
  });
  
  socket.on('ice-candidate', (data) => socket.broadcast.emit('ice-candidate', data));

  socket.on('disconnect', () => {
    const userId = ownersSocketId[socket.id];
    console.log('userId',userId);
    console.log(socket.id,'socket id')
    let user;
    if(userId){
      user = roomsowners[userId];
    }
    delete roomsowners[userId];
    delete ownersSocketId[socket.id];

    io.to(userId).emit('room-unactive',{});
    console.log('User disconnected',user?.name);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
