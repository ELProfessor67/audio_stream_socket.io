const mongoose = require('mongoose');

const connectDb = async () => {
	const {connection} = await mongoose.connect(process.env.DB_URL);
	console.log(`database connect with ${connection.host}`)
}

module.exports = connectDb;