// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const {config} = require('dotenv');
const connectDb = require('./db/connectDB');
const scheduleSchems = require('./models/schedule');
// const {setJobs} = require('./utils/cron-job');
const downloadAndMergeSongs = require('./utils/merge-file')
const fs = require('fs');
const cors = require('cors');
const subtractOneMinute = require('./utils/subtractOneMinutes');
const userModel = require('./models/user')
const songModel = require('./models/song')
// const uploadRouter = require('./upload');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const schedule = require('node-schedule');
const { rootCertificates } = require('tls');


config({path: path.join(__dirname,'./config/config.env')});
connectDb();
const app = express();
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({limit: '100mb'}));
app.use(cors());
app.use('',express.static(path.join(__dirname,'./public')));
// app.use('',uploadRouter);

let cronJobRefs = {}
const songsStartTime = {}
const songsStartTimeByUser = {}
const listeners = {};

let currentSong = {}
let popSong = {}
let leftsong = {}
let autosettimeoutRef;



//auto dj start


async function autoDj(){
  let users = await userModel.find();
  users = users.filter((data) => { 
    return !data.isDJ
  })
  
  users.forEach(async ({_id}) => {
    let songs = await songModel.find({owner: _id});
    leftsong[_id] = songs
    // console.log(leftsong[_id].length)
    if(leftsong[_id] && leftsong[_id].length != 0){
      const pop = leftsong[_id].pop();
      popSong[_id] = [pop]
      const nextSong = leftsong[_id][leftsong[_id].length-1]
    
   
      currentSong[_id] = {url: `${process.env.SOCKET_URL}${pop.audio}`,currentTime: Date.now(),nextSong, currentSong: pop}
      let duration = JSON.parse(JSON.stringify(pop)).duration || 30
      // console.log(JSON.parse(JSON.stringify(pop)).duration)
      // console.log(leftsong[_id].length)
      io.to(_id.toString()).emit('song-change',{currentSong: currentSong[_id]})
      setOut(duration*1000,_id);
    }
  });
}


autoDj();
let settimeoutref;
app.post('/upload',async (req,res) => {
  try{
    const {filename,base64} = req.body;
    const filterData = base64.substr(base64.indexOf(',')+1);
    console.log('uploading...')
    const buffer = new Buffer(filterData,'base64');
      fs.writeFileSync(path.join(__dirname,`./public${filename}`),buffer,'binary');
      res.status(201).json({success: true});
      console.log('uploading end...')

      if(settimeoutref){
        clearTimeout(settimeoutref);
      }

      settimeoutref = setTimeout(() => {
        if(autosettimeoutRef){
          clearTimeout(autosettimeoutRef);
        }
        currentSong = {}
        popSong = {}
        leftsong = {}
        autoDj();
      },5000)
      console.log('upload success')
  }catch(err){
    console.log('err')
    res.status(501).json({success: false,message: err.message});
  }
});


app.get('/api/v1/channel-detail/:id', async (req,res) => {
  const id = req.params.id;
  const result = await fetch("http://onlinebazaarr.com/api/v1/channel-detail/"+id);
  const data = await result.json();
  res.status(200).json({
    ...data
  })
})


app.get('/api/v1/all-djs', async (req,res) => {
  const id = req.params.id;
  const result = await fetch("https://onlinebazaarr.com/api/v1/dj", {
    "headers": {
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,/;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "accept-language": "en-US,en;q=0.9,hi;q=0.8",
      "cache-control": "max-age=0",
      "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "sec-fetch-user": "?1",
      "upgrade-insecure-requests": "1",
      "cookie": "token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTUzNDdiNTljMDBhNzQwOWQ5MTgxYzMiLCJpYXQiOjE3MjMxMTYwMjYsImV4cCI6MTcyNDQxMjAyNn0.mpmRLBA2KO9PYa4ZBv-zJYxZ1HAvRaANeRYnVc7aq7Y"
    },
    "referrerPolicy": "strict-origin-when-cross-origin",
    "body": null,
    "method": "GET"
  });
  const data = await result.json();
  res.status(200).json({
    ...data
  })
})


app.delete('/delete',async (req,res) => {
  try{
    const {id:filename} = req.query;
    console.log(filename)
    fs.unlink(path.join(__dirname,`./public${filename}`),(err) => {
      if(err){
        console.log(err)
      }
      console.log(`delete file: ${filename}`)
    });
    res.status(200).json({success: true});

    if(settimeoutref){
      clearTimeout(settimeoutref);
    }

    settimeoutref = setTimeout(() => {
      if(autosettimeoutRef){
        clearTimeout(autosettimeoutRef);
      }
      currentSong = {}
      popSong = {}
      leftsong = {}
      autoDj();
    },5000)
  }catch(err){
    res.status(501).json({success: false,message: err.message});
  }
});

//auto dj end


// add cron jobs
async function addCrobJobs(){
  const scheduleItems = await scheduleSchems.find().populate('songs');
  // console.log(JSON.stringify(scheduleItems[0]))
  scheduleItems.forEach(({ date,time, songs, owner,_id,status }) => {

    // songs = songs.map(data => `${process.env.FRONTEND_URL}${data.audio}`);
    songs = songs.map(data => `${data.audio}`);
    // console.log(songs)
    // console.log(time);
    time = subtractOneMinute(time);
    const datetime = `${date}T${time}:00`
    // console.log(datetime)
    const isExist = cronJobRefs[_id];
    // console.log('set ho raha ab ',_id);
    if(isExist){
      console.log('is already set');
      return
    }
    if(status != 'pending'){
      console.log(`is already ${status}`);
      return
    }
    const user = {_id: owner}
    // console.log(user)
    setJobs(datetime, songs, user,_id,status);
  });
}

addCrobJobs()

app.get('/',(req,res) => res.send('its working'));
app.get('/refresh',(req,res) => {
  cronJobRefs = {};
  schedule.gracefulShutdown();
  addCrobJobs();
  console.log('refresh....');
  res.send('refresh successfully');
});


app.get('/start-time/:id',(req,res) => {
  console.log('id',songsStartTimeByUser[req.params.id])
  console.log(req.params)
  res.json({starttime: songsStartTimeByUser[req.params.id]});
});
// app.post('/schedule/add',async function(req,res){
//   let {schedule:{date,time, songs, owner,_id,status}} = req.body;
//   const datetime = `${date}T${time}:00`
//   songs = songs.map(data => `${process.env.FRONTEND_URL}${data.audio}`);
//   const user = {_id: owner}
//   console.log('adding...',datetime);
//   setJobs(datetime, songs, user,_id,status);
//   res.send('add successfully')
// });

// app.put('/schedule/update',async function(req,res){
//   let {schedule:{date,time, songs, owner,_id,status}} = req.body;
//   const datetime = `${date}T${time}:00`
//   songs = songs.map(data => `${process.env.FRONTEND_URL}${data.audio}`);
//   const user = {_id: owner}
//   console.log('ref',cronJobRefs[_id]);
//   if(cronJobRefs[_id]){
//     console.log(cronJobRefs[_id].cancel)
//     cronJobRefs[_id].cancel();
//     delete cronJobRefs[_id];
//   }
//   console.log('update...',datetime)
//   setJobs(datetime, songs, user,_id,status);
//   res.send('update successfully')
// });

const server = http.createServer(app);
const io = socketIO(server,{
  cors: {
    origin: '*'
  }
});

const roomsowners = {};
const ownersSocketId = {};
const scheduleActive = {};
const roomCurrentSongPlay = {};



// socket connections 

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('owner-join',(data) => {
    console.log('data',data)
    socket.join(data?.user?._id.toString());
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
    listeners[socket.id] = data.roomId;

    if(owner){
      if(roomCurrentSongPlay[data.roomId]){
        const {nextSong,currentSong} = roomCurrentSongPlay[data.roomId];
        io.to(socket.id).emit('room-active',{user: owner,nextSong,currentSong});
      }else{
        io.to(socket.id).emit('room-active',{user: owner});
      }
    }else{
      const butScheduleActive = scheduleActive[data.roomId];
      console.log('butScheduleActive',butScheduleActive);
      io.to(socket.id).emit('room-unactive',{butScheduleActive});
    }
    console.log(data,socket.id)
  });


  socket.on('send-message', (data) => {
    console.log('message',data)
    io.to(data.roomId).emit('receive-message',{...data});
  })

  socket.on('call-admin', (data) => {
    console.log("data",data)
    const socketId = roomsowners[data.roomId].socketId;
    
    io.to(socketId).emit('call-coming',{...data,callerID: socket.id});
  })

  socket.on('cut-admin', (data) => {
    
    const socketId = roomsowners[data.roomId].socketId;
   
    io.to(socketId).emit('cut-admin',{...data,callerID: socket.id});
  })

  socket.on('admin-call-cut', (data) => {
    io.to(data.callerId).emit('admin-call-cut',{});
  })

  socket.on('call-response', (data) => {
    // console.log('message',data)

    // console.log('socket id ',socketId);
    io.to(data.callerId).emit('call-response',{...data});
  })


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

  socket.on('auto-dj',(data) => {
    console.log('auto-dj',data)
    io.to(socket.id).emit("song-change",{currentSong: currentSong[data?.roomId]})
  });
  
  socket.on('ice-candidate', (data) => socket.broadcast.emit('ice-candidate', data));


  socket.on('send-request-song',(data) => {
    const owner = roomsowners[data?.roomId];
    console.log(owner);
    if(owner){
      io.to(owner.socketId).emit('recieve-request-song',{...data});
    }
  })


  socket.on('next-song', ({roomId,nextSong, currentSong}) => {
    roomCurrentSongPlay[roomId] = {nextSong,currentSong};
    io.to(roomId).emit('next-song',{nextSong, currentSong});
  })

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
    io.to(userId).emit('owner-left',{});
    io.to(userId).emit('room-unactive',{});
    console.log('User disconnected',user?.name);

    const roomId = listeners[socket.id];
    if(roomsowners[roomId]){
      io.to(roomsowners[roomId].socketId).emit('user-disconnet',{id:socket.id});
    }

  });
});




async function playSong(filePath, res,req,_id) {
  try{
    const stat = fs.statSync(filePath);
    console.log('file read successfully');
  const range = req.headers.range;
  if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

      res.writeHead(206, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Start-Time': songsStartTime[_id]
      });

      console.log('time start',songsStartTime[_id])

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);

      console.log('uper wala')
    } else {
      // If no range header is provided, send the entire file
      console.log('niche wala')
      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stat.size,
        'Start-Time': songsStartTime[_id]
      });
      console.log('time start',songsStartTime[_id])

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  }catch(err){
    console.log(err.message);
    res.send(err.message)
  }
}


function deleteRoute(route) {
  console.log('progressing deleting route')
  app._router.stack.forEach((routeLayer, index, routes) => {
    if (routeLayer.route && routeLayer.route.path === route) {
      routes.splice(index, 1);
    }
  });
  console.log('after deleting route')
}

async function setJobs(datetime, song, user,_id,status ){
  console.log('jobs set ho rhi ha');
  cronJobRefs[_id] = schedule.scheduleJob(new Date(datetime), async () => {
    console.log('job starting...',_id,user)
    // scheduleItems.forEach((ele,i) => {
    //   if(ele._id == _id){
    //     scheduleItems[i].status = 'processing'
    //   }
    // });

    await scheduleSchems.findByIdAndUpdate(_id,{status:'processing'});

    // console.log(scheduleItems);
    const mergedFilePath = path.join(__dirname,`./${user._id}.mp3`);
    const isFileCreated = await downloadAndMergeSongs(song,mergedFilePath);
    console.log('isFileCreated',isFileCreated);
    scheduleActive[user._id] = true;
    songsStartTime[_id] = Date.now();
    songsStartTimeByUser[user._id] = Date.now();

    
    io.to(user?._id.toString()).emit('schedule-active',{});

    console.log('ids',Array.from(io?.sockets?.adapter.rooms.get(user?._id.toString()) || []));
    console.log('user id',user._id.toString());

    app.get(`/schedule/${user._id}`, async (req, res) => {
      console.log('url hit kiya kisi ne')
      if(isFileCreated){
        playSong(mergedFilePath, res,req,_id);
      }else{
        res.send('something wants wrong')
      }
    });
    setExpireRoute(mergedFilePath,_id,user);
  });
  console.log('jobs',cronJobRefs,_id);
}

async function setExpireRoute (outputFileName,_id,user){
  ffmpeg.ffprobe(outputFileName,(err,metadata) => {
      if(err){
        console.log(err)
      }else{
        duration = metadata.format.duration;
        const songLengthInMilliseconds = duration * 1000 // Adjust as needed
        setTimeout(async () => {
          // Delete the route only if there are no active streams for this route
        // scheduleItems.forEach((ele,i) => {
        //   if(ele._id == _id){
        //     scheduleItems[i].status = 'complete'
        //   }
        // });
        await scheduleSchems.findByIdAndUpdate(_id,{status:'complete'});

        // console.log(scheduleItems)
          // Remove the client ID when the connection is closed
          delete cronJobRefs[_id];
          delete songsStartTime[_id];
          delete scheduleActive[user._id];
          delete songsStartTimeByUser[user._id]
          console.log('before deleting route')
          deleteRoute(`/schedule/${user._id}`);

          
          io.to(user?._id.toString()).emit('schedule-unactive',{});
          // console.log('user id',user._id.toString);
          console.log('ids',Array.from(io?.sockets?.adapter.rooms.get(user?._id.toString) || []));

          fs.unlink(outputFileName, (err) => {
            if (err) {
              // console.error(`Error deleting file: ${err}`);
            } else {
              console.log(`File ${outputFileName} has been deleted successfully`);
            }
          });

        }, songLengthInMilliseconds);
      }
   });
}



function setOut(ms,_id){
  // console.log('calling setOut',ms,_id)
  // console.log(currentSong[_id])
  autosettimeoutRef = setTimeout(() => {
    // console.log('calling setTimeout')
    if(leftsong[_id] && leftsong[_id].length == 0){
      // console.log('suffling...')
      const arr = [...popSong[_id]]
      for(let i = arr.length -1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i],arr[j]] = [arr[j],arr[i]];
      }

      leftsong[_id] = arr;
      popSong[_id] = [];
      // console.log(popSong[_id]);
      // console.log(leftsong[_id]);
    }

    if(leftsong[_id] && leftsong[_id].length != 0){
        const pop = leftsong[_id].pop();
        popSong[_id] = [...popSong[_id],pop]
        const nextSong = leftsong[_id][leftsong[_id].length-1]
       
        console.log(pop,nextSong,'sssssss')
    
        currentSong[_id] = {url: `${process.env.SOCKET_URL}${pop.audio}`,currentTime: Date.now(), nextSong, currentSong: pop }
        let duration = JSON.parse(JSON.stringify(pop)).duration || 30
        // console.log(duration)
        // console.log(currentSong[_id])
        // console.log(popSong[_id])
        // console.log(leftsong[_id])
        io.to(_id.toString()).emit('song-change',{currentSong: currentSong[_id]})
        setOut(duration*1000,_id);
    }else{
      // console.log('nothing',leftsong[_id] && leftsong[_id].length != 0)
    }
  },ms-2000)
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
