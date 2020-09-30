# RePost Bot

Simple NodeJS Bot to repost your Reddit's upvotes to any Telegram Chat

## Install
Follow these step

Create a bot on Telegram with [BotFather](https://t.me/BotFather) and get the token  
Create a [Reddit Application](https://ssl.reddit.com/prefs/apps/) and get the Client ID under the App name and the Secret
Create a Database with MySQL

```bash
git clone https://github.com/AlePini/RePost.git
cd RePost
npm install
node index.js
```

You also need a config file

### RePost.ini
```
[Telegram]
token = Telegram Bot Token
channelid = ID or Channel Tag
chatid = 
groupid = 

[Reddit]
userAgent = Name Of Your Bot
clientId = Client Id
clientSecret = Reddit Client Secret Token
username = Username
password = Password
upvoteLimit = 30

[DB]
host = hostip
user = user
password = password
database = database
```
