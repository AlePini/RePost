const fs = require('fs');
const ini = require('ini');
const mysql = require('mysql');
const queue = require('queue-fifo');
const snoowrap = require('snoowrap');
const telegraf = require('telegraf');
const ytdlWrap = require("youtube-dl-wrap");
const ytdl = new ytdlWrap("/usr/bin/youtube-dl");

const vidDir = "vid/"
var Q = new queue();

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
      "-f", "bestvideo+bestaudio/bestvideo", "-o", output])
    .on("error", (exitCode, processError, stderr) => 
      reject("An error occured",  exitCode,  processError, stderr))
    .on("close", () => {
      resolve(output)});
  });

}

async function submit(){
    while(!Q.isEmpty()){
        var e = Q.peek(); Q.dequeue();
        if ( ['.gif'].includes(getExtension(e.url)) ) {
            console.log(" * Sending gif ... " + e.id);
            tbot.telegram.sendAnimation(conf.Telegram.channelid, e.url);
        } else if ( ['.png','.jpg','.jpeg'].includes(getExtension(e.url)) ) {
            console.log(" * Sending pic ... " + e.id);
            tbot.telegram.sendPhoto(conf.Telegram.channelid, e.url);
        } else if ( ['.mp4'].includes(getExtension(e.url)) ) {
            console.log(" * Sending vid ... " + e.id);
            tbot.telegram.sendVideo(conf.Telegram.channelid, e.url);
        } else if ( e.url.includes('https://v.redd.it/') ) {
            console.log(" * Sending DASH vid ... " + e.id);
            downloadDASH(e.url).then(
                file => { 
                console.log(file);
                tbot.telegram.sendVideo(conf.Telegram.channelid, { source : file }).then( () => fs.unlinkSync(file));
            });
        }
        await sleep(1);
    }
}

var fetch = function fetch(){

  // _ Get Last Submissions
  r.getMe().getUpvotedContent({limit: parseInt( conf.Reddit.upvoteLimit ), skipReplies: true}).then(list => {
    
    list.forEach( e => {
      // Ask to db if the submission is already been checked
      upvoted.query("SELECT * FROM upvoted WHERE id LIKE ?", [e.id], function (err, result) {
        if (err) throw err;

        // If it doesn't show up on the db, then insert into it and then PUSH TO TELEGRAM
        if ( !result.length )
            upvoted.query("INSERT INTO upvoted (id) VALUES (?)", [e.id], function (err, result){
              if (err) throw err;
              console.log("- Added new submission: " + e.id);
              Q.enqueue(e);
            });
        else
            console.log("- Already exists: " + e.id + " _ " + e.url);
      });

    });

  });

  submit();  
  setTimeout(fetch, 60000);

}

// _ Setup Telegram Bot
var conf = ini.decode(fs.readFileSync('./RePost.ini', 'utf-8'));
var tbot = new telegraf(conf.Telegram.token);

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

// _ LAUNCH
tbot.launch();
upvoted.connect(function(err) {
  
  if (err) throw err;
  console.log("Connected!");

  fetch();

});
