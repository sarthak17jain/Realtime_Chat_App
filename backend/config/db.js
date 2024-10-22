const mongoose = require("mongoose");
const colors = require("colors");
const prismaService = require('../prismaService');

const connectDB = async () => {
    try {
        /*console.log(process.env.DB_LINK);
        const conn = await mongoose.connect(process.env.DB_LINK);

        console.log(
            `MongoDB Connected: ${conn.connection.host}`.cyan.underline
        );
        */
        await prismaService.connect();
    } catch (error) {
        console.error(`Error: ${error.message}`.red.bold);
        process.exit(1); // Exit with a non-zero status code to indicate an error
    }
};

module.exports = connectDB;
