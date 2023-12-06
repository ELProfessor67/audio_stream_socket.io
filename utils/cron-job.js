const {app,cronJobRefs,songsStartTime} = require('../server');
const fs = require('fs');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);
const schedule = require('node-schedule');
const path = require('path');


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

function setJobs(datetime, song, user,_id,status ){
	console.log('cronJobRefs',app)
	cronJobRefs[_id] = schedule.scheduleJob(new Date(datetime), async () => {
  	console.log('job starting...',_id,user)
  	scheduleItems.forEach((ele,i) => {
  		if(ele._id == _id){
  			scheduleItems[i].status = 'processing'
  		}
  	});

  	console.log(scheduleItems);
  	const mergedFilePath = path.join(__dirname,`./${user._id}.mp3`);
    const isFileCreated = await downloadAndMergeSongs(song,mergedFilePath);
    console.log('isFileCreated',isFileCreated);
    songsStartTime[_id] = Date.now();
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
}

async function setExpireRoute (outputFileName,_id,user){
	ffmpeg.ffprobe(outputFileName,(err,metadata) => {
      if(err){
        console.log(err)
      }else{
        duration = metadata.format.duration;
        const songLengthInMilliseconds = duration * 1000 // Adjust as needed
	      setTimeout(() => {
	        // Delete the route only if there are no active streams for this route
	     	scheduleItems.forEach((ele,i) => {
		  		if(ele._id == _id){
		  			scheduleItems[i].status = 'complete'
		  		}
		  	});

		  	console.log(scheduleItems)
	        // Remove the client ID when the connection is closed
	        delete cronJobRefs[_id];
	        delete songsStartTime[_id];
	        console.log('before deleting route')
	        deleteRoute(`/schedule/${user._id}`);
	        fs.unlink(outputFileName, (err) => {
		        if (err) {
		          console.error(`Error deleting file: ${err}`);
		        } else {
		          console.log(`File ${path} has been deleted successfully`);
		        }
		      });

	      }, songLengthInMilliseconds);
      }
   });
}


module.exports = {setJobs}