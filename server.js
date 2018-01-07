const webpack = require('webpack');
const wMiddleware = require('webpack-dev-middleware');
const compiler = webpack(require('./webpack.config.js'));
const express = require('express');
const app = express();
const easyrtc = require('easyrtc');
const server = require('http').createServer(app);
const io = require('socket.io')(server);

const serveIndex = require('serve-index');
const serveStatic = require('serve-static');

app.use(serveIndex(__dirname));
app.use(serveStatic(__dirname));
app.use(wMiddleware(compiler, {

}));

setupEasyRtc(app, io);

const port = 3032;
server.listen(port, () => console.log('Server listening on port ' + port));


function setupEasyRtc(app, socketServer) {
    var myIceServers = [
        {"url":"stun:stun.l.google.com:19302"},
        {"url":"stun:stun1.l.google.com:19302"},
        {"url":"stun:stun2.l.google.com:19302"},
        {"url":"stun:stun3.l.google.com:19302"}
        // {
        //   "url":"turn:[ADDRESS]:[PORT]",
        //   "username":"[USERNAME]",
        //   "credential":"[CREDENTIAL]"
        // },
        // {
        //   "url":"turn:[ADDRESS]:[PORT][?transport=tcp]",
        //   "username":"[USERNAME]",
        //   "credential":"[CREDENTIAL]"
        // }
      ];
      easyrtc.setOption("appIceServers", myIceServers);
      easyrtc.setOption("logLevel", "debug");
      easyrtc.setOption("demosEnable", false);
      
      // Overriding the default easyrtcAuth listener, only so we can directly access its callback
      easyrtc.events.on("easyrtcAuth", function(socket, easyrtcid, msg, socketCallback, callback) {
          easyrtc.events.defaultListeners.easyrtcAuth(socket, easyrtcid, msg, socketCallback, function(err, connectionObj){
              if (err || !msg.msgData || !msg.msgData.credential || !connectionObj) {
                  callback(err, connectionObj);
                  return;
              }
      
              connectionObj.setField("credential", msg.msgData.credential, {"isShared":false});
      
              console.log("["+easyrtcid+"] Credential saved!", connectionObj.getFieldValueSync("credential"));
      
              callback(err, connectionObj);
          });
      });
      
      // To test, lets print the credential to the console for every room join!
      easyrtc.events.on("roomJoin", function(connectionObj, roomName, roomParameter, callback) {
          console.log("["+connectionObj.getEasyrtcid()+"] Credential retrieved!", connectionObj.getFieldValueSync("credential"));
          easyrtc.events.defaultListeners.roomJoin(connectionObj, roomName, roomParameter, callback);
      });
      
      // Start EasyRTC server
      var rtc = easyrtc.listen(app, socketServer, null, function(err, rtcRef) {
          console.log("Initiated");
      
          rtcRef.events.on("roomCreate", function(appObj, creatorConnectionObj, roomName, roomOptions, callback) {
              console.log("roomCreate fired! Trying to create: " + roomName);
      
              appObj.events.defaultListeners.roomCreate(appObj, creatorConnectionObj, roomName, roomOptions, callback);
          });
      });
}