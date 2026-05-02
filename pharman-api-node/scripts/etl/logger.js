module.exports = {
  info: (msg) => console.log(' [INFO] ' + msg),
  success: (msg) => console.log(' [SUCCESS] ' + msg),
  warn: (msg) => console.log(' [WARN] ' + msg),
  error: (msg, err) => {
    console.error(' [ERROR] ' + msg);
    if (err) console.error(err);
  },
  step: (num, msg) => console.log(`\n${num}. ${msg.toUpperCase()}`)
};
