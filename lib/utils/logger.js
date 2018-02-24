var winston = require('winston');
winston.emitErrs = true;
winston.level = process.env.LOG_LEVEL; 

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            level: 'silly',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

module.exports = logger;
module.exports.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};