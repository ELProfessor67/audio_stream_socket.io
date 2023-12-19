const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

router.post('/upload',async (req,res) => {
	try{
		const {filename,base64} = req.body;
		const filterData = base64.substr(base64.indexOf(',')+1);
		const buffer = new Buffer(filterData,'base64');
	    fs.writeFileSync(path.join(__dirname,`./public${filename}`),buffer,'binary');
	    res.status(201).json({success: true});
	    console.log('upload success')
	}catch(err){
		console.log('err')
		res.status(501).json({success: false,message: err.message});
	}
});

router.delete('/delete',async (req,res) => {
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
	}catch(err){
		res.status(501).json({success: false,message: err.message});
	}
});

module.exports = router;