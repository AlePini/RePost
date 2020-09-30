const fs = require('fs');
const ini = require('ini');
const mysql = require('mysql');
const snoowrap = require('snoowrap');
const telegraf = require('telegraf');
const ytdlWrap = require("youtube-dl-wrap");
const ytdl = new ytdlWrap("/usr/bin/youtube-dl");

const vidDir = "vid/"

function getExtension(filename) {
  var i = filename.lastIndexOf('.');
  return (i < 0) ? '' : filename.substr(i);
}

function sleep(s) {
  return new Promise((resolve) => {
    setTimeout(resolve, s * 1000);
  });
} 

function downloadDASH(url){
  
  return new Promise( (resolve, reject) => {

    !fs.existsSync(vidDir) && fs.mkdirSync(vidDir);
    var output = vidDir + url.split('/')[3] + '.mp4';
    fs.existsSync(output) && fs.unlinkSync(output);

    ytdl.exec([url,
      "-f", "bestvideo+bestaudio", "-o", output])
    .on("error", (exitCode, processError, stderr) => 
      reject("An error occured",  exitCode,  processError, stderr))
    .on("close", () => {
      resolve(output)});
  });

}

var submit = function submit(){
  
  var time = 0;

  // _ Get Last Submissions
  r.getMe().getUpvotedContent({limit: parseInt( conf.Reddit.upvoteLimit ), skipReplies: true}).then(list => {
    
    list.forEach( async e => {
      
      // Wait at least 1 sec between each loop
      time++;
      await sleep(time);
      
      // Ask to db if the submission is already been checked
      upvoted.query("SELECT * FROM upvoted WHERE id LIKE ?", [e.id], function (err, result) {
        if (err) throw err;

        // If it doesn't show up on the db, then insert into it and then PUSH TO TELEGRAM
        if ( !result.length ) upvoted.query("INSERT INTO upvoted (id) VALUES (?)", [e.id], function (err, result){
          if (err) throw err;
          console.log("- Added new submission: " + e.id);
          // TODO - Telegram RePost Bot
          if ( ['.gif'].includes(getExtension(e.url)) ) {
            console.log(" * Sending gif ...");
            tbot.telegram.sendAnimation(conf.Telegram.channelid, e.url);
          } else if ( ['.png','.jpg','.jpeg'].includes(getExtension(e.url)) ) {
            console.log(" * Sending pic ...");
            tbot.telegram.sendPhoto(conf.Telegram.channelid, e.url);
          } else if ( ['.mp4'].includes(getExtension(e.url)) ) {
            console.log(" * Sending vid ...");
            tbot.telegram.sendVideo(conf.Telegram.channelid, e.url);
          } else if ( e.url.includes('https://v.redd.it/') ) {
            console.log(" * Sending DASH vid ...");
            downloadDASH(e.url).then(
              file => { 
                console.log(file);
                tbot.telegram.sendVideo(conf.Telegram.channelid, { source : file }).then( () => fs.unlinkSync(file));
              });
          }
        });
        else {
          console.log("- Already exists: " + e.id + " _ " + e.url);
        }
      });

    });

  });

  setTimeout(submit, 60000);

}

// _ Setup Telegram Bot
var conf = ini.decode(fs.readFileSync('./RePost.ini', 'utf-8'));
var tbot = new telegraf(conf.Telegram.token);
// TODO - IP Command
tbot.launch();

// _ Setup reddit api
var r = new snoowrap({
  userAgent: conf.Reddit.userAgent,
  clientId: conf.Reddit.clientId,
  clientSecret: conf.Reddit.clientSecret, 
  username: conf.Reddit.username,
  password: conf.Reddit.password
});

// _ Setup database connection
var upvoted = mysql.createConnection({
  host: conf.DB.host,
  user: conf.DB.user,
  password: conf.DB.password,
  database: conf.DB.database
});

upvoted.connect(function(err) {
  
  if (err) throw err;
  console.log("Connected!");

  submit();

});
