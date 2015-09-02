var Room = require('./Room');

/* Here are the 'node' require statements */
// Express initializes app to be a function handler
// that you can supply to an HTTP server
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

/**********
socket.room -- the player is in
socket.name -- the name of the user
socket.uid -- unique ID of a socket
socket.ai -- whether this is ai or not
socket.inGame -- whether this connection is in a game
**********/

var room_id = -1;

// Array to hold Rooms waiting for players
var open_rooms = [];
// Array to hold active Rooms for AI to connect to
var active_rooms = [];

// Counter to identify connections
var playerUID = -1;


// We define a route handler '/' that gets called when we hit the website home
app.get('/', function(req, res) {
   //res.sendFile(__dirname + '/resistance_index.html');
   res.sendFile(__dirname + '/index.html');
});
app.get('/index.js', function(req, res) {
   res.sendFile(__dirname + '/index.js');
});

// Sends the client the latest and greatest list of games to play
app.get('/Games.json', function(req, res) {
   res.sendFile(__dirname + '/Games.json');
});

app.get('/resistance.html', function(req, res) {
   res.sendFile(__dirname + '/resistance.html');
});
app.get('/resistance.js', function(req, res) {
   res.sendFile(__dirname + '/resistance.js');
});
app.get('/avalon.html', function(req, res) {
   res.sendFile(__dirname + '/avalon.html');
});



/* MultiSelect code */
app.get('/multi_select', function (req, res) {
   res.sendFile(__dirname + '/multi_select/css/multi-select.css');
});
app.get('/multi_select.js', function(req, res) {
   res.sendFile(__dirname + '/multi_select/js/jquery.multi-select.js');
});
app.get('/img/switch.png', function(req, res) {
   res.sendFile(__dirname + '/multi_select/img/switch.png');
});
/* End of MultiSelect code */


function verifyRoom(room) {
   if (room.numPlayers() === 0) {
      var ndx = -1;
      for (var i = 0; i < open_rooms.length && ndx === -1; ++i) {
         if (open_rooms[i].id === room.id)
            ndx = i;
      }
      if (ndx > -1) {
         open_rooms.splice(ndx, 1);
      }
   }
};

/* Begin definition of socket code */

io.on('connection', function(socket) {
   socket.uid = ++playerUID;
   socket.inGame = false;
   socket.ai = false;
   
   socket.on('name', function(name) {
      socket.name = name;
   });
   
   socket.on('get_open_rooms', function() {
      var rms = [];
      
      for (var i = 0; i < open_rooms.length; ++i) {
         rms[rms.length] = open_rooms[i].toObject();
      }
      
      socket.emit('open_rooms', rms);
   });
   
   socket.on('open_room', function(game_obj) {
      var room = new Room(++room_id, socket.name, game_obj);
      open_rooms[open_rooms.length] = room;
      
      room.connect(socket);
      socket.room = room
      
      socket.emit('in_room', room.toObject(), true);
   });
   
   socket.on('join_room', function(room_id) {
      var room = null;
      for (var i = 0; i < open_rooms.length; ++i) {
         if (open_rooms[i].id === room_id)
            room = open_rooms[i];
      }
      
      if (room === null) {
         socket.emit('notify', "Room has already closed.  Please choose another");
         return;
      }
      
      if (!room.connect(socket)) {
         socket.emit('notify', 'Room is full. Please choose another');
         return;
      }
      
      socket.room = room;
      
      socket.emit('in_room', room.toObject(), false);
   });
   
   socket.on('leaving_room', function() {
      socket.room.disconnect(socket);
      
      verifyRoom(socket.room);
      
      socket.room = null;
   });
   
   
   socket.on('ready_to_start', function(room_id) {
      var room = null;
      var room_ndx = -1;
      
      // Find the room that's ready
      open_rooms.forEach(function(r, ndx) {
         if (r.id === room_id) {
            room = r;
            room_ndx = ndx;
         }
      });
      
      // Verify it's ready
      var isReady = room.verifyAndLaunch();
      
      // If it's ready, remove it from 'open' and move it to 'active'
      if (isReady) {
         open_rooms.splice(room_ndx, 1);
         
         active_rooms[active_rooms.length] = room;
         
         // Mark each socket as 'in game'
         room.connectedPlayers.forEach(function(sock) {
            sock.inGame = true;
         });
         
         room.takeTheReins();
      }
   });
   
   
   socket.on('disconnect', function() {
      if (socket.ai) {
         return;
      }
      
      
      if (socket.inGame === true) {
         socket.room.closeRunningGame();
         
         var ndx = -1;
         for (var i = 0; i < active_rooms.length && ndx === -1; ++i) {
            if (active_rooms[i].id === socket.room.id)
               ndx = i;
         }
         if (ndx > -1) {
            active_rooms.splice(ndx, 1);
         }
         
         return;
      }
      
      if (socket.room !== undefined && socket.room !== null) {
         socket.room.disconnect(socket);
         
         verifyRoom(socket.room);
      }
   });
   
   
   socket.on('ai', function(room_id, ai_id) {
      socket.ai = true;
      
      var room = null;
      
      // Find the room
      active_rooms.forEach(function(r) {
         if (r.id === room_id)
            room = r;
      });
      
      room.addAI(socket, ai_id);
   });
   
});



// Lastly we listen to port 3000
http.listen(3000, function() {
   console.log('Server started -- Listening on *:3000');
});
