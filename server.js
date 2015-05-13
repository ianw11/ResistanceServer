var _game = require('./game');
var _ai = require('./ai');

/* Here are the 'node' require statements */
// Express initializes app to be a function handler
// that you can supply to an HTTP server
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

/************GLOBAL VARIABLES****************/
var REQUIRE_FIVE = true;
/********************************************/

var game = null;
var connectedUsers = 0;

// user_list is an object with key-value pairs
// in the form of <username>:<socket>
var user_list = null;

var team_list = null;



/* Code to allow AI to take part in the game too */
var connected_ai = [];

var add_ai = function() {
   connected_ai[connected_ai.length] = new _ai.AI(connected_ai.length, game);
};


/* END OF AI SECTION */


// We define a route handler '/' that gets called when we hit the website home
app.get('/', function(req, res) {
   res.sendFile(__dirname + '/resistance_index.html');
});

// Send the client javascript code too!
app.get('/client.js', function(req, res) {
   res.sendFile(__dirname + '/client.js');
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

io.on('connection', function(socket) {
   
   // connect
   socket.on('add_name', function(name) {
      
      // If no game object exists, create a new one
      // Also resets user_list
      if (game == null) {
         console.log("Creating new game");
         game = new _game.Game();
         user_list = {};
      }
      
      // If the game has already started, don't allow
      // the user to connect.
      // This can be replaced later on by allowing multiple
      // instances of games at one time
      if (game.isGameStarted()) {
         socket.emit('_error', "Game has already started");
         return;
      }
      
      if (connectedUsers >= 10) {
         socket.emit('_error', "Game has 10 people already");
         return;
      }
      
      
      // Increment the connected users
      connectedUsers++;
      
      
      socket.emit('accepted_user');
      
      var users = game.getUsers();
      for (var i = 0; i < users.length; ++i) {
         // Send all users to the new connection
         socket.emit('new_user', users[i].name);
      }
      // Send the new user to all users
      io.emit('new_user', name);
      
      // Tie the socket to the user
      socket['username'] = name;
      user_list[name] = socket;
      
      game.addUser(name);
   });
   
   socket.on('add_ai', add_ai);
   
   // disconnect
   socket.on('disconnect', function() {
      
      // If the user never actually entered their name, just exit this function
      if (socket['username'] == null) {
         return;
      }
      
      game.dropUser(socket['username']);
      console.log(socket['username'] + " has disconnected");
      io.emit('dropped_user', socket['username']);
      
      // Decrement connectedUsers and if 0, drop the game instance
      connectedUsers--;
      if (connectedUsers == connected_ai.length && game != null) {
         console.log("No more users, closing game");
         game = null;
         team_list = null;
         
         connected_ai.forEach(function(val, ndx) {
            val.terminate();
         });
         connected_ai = [];
         connectedUsers = 0;
      }
   });

   // start_game
   socket.on('start_game', function() {
      console.log(io.sockets.sockets.length);
      
      if (game.isGameStarted()) {
         return;
      }
      
      
      if (REQUIRE_FIVE && (game.getNumUsers() < 5 || game.getNumUsers() > 10)) {
         socket.emit('violation', "There must be between 5 and 10 people");
         return;
      }
      
      //role_list = game.newGame();
      game.newGame();
      
      io.emit('game_started');
      
      socket.advanceRound();
   });
   
   /**********************/
   // send_role
   socket.on('send_role', function(name) {
      var role = game.getRole(name);
      if (role === 'SPY') {
         socket.emit('role', role, game.getSpies());
      } else {
         socket.emit('role', role);
      }
   });
   
   // team_list (submitting the mission team list)
   socket.on('team_list', function(team) {
      if (game.correctNumberOnTeam(team.length)) {
         io.emit('vote_team', team);
         team_list = team;
      } else {
         socket.emit('violation', "Wrong number of people on team");
      }
   });
   
   // vote
   socket.on('vote', function(choice) {
      // Submit the current vote
      if (game.teamVote(choice)) {
         
         // If everybody has voted, move on to the result analysis
         var result = game.getVoteResult();
         io.emit('team_vote_result', result, team_list);
         if (result) {
         } else {
            socket.advanceVote();
         }
      }
   });
   
   // mission
   socket.on('mission', function(res) {
      // Submit the vote for the current mission
      if (game.mission(res)) {
         
         // Once everybody has voted, get results
         var result = game.missionResult();
         
         var winningTeam = game.getWinner();
         if (winningTeam !== -1) {
            io.emit('victory', winningTeam);
            return;
         }
         
         io.emit('mission_result', result);
         
         socket.advanceRound();
      }
   });
   
   
   socket.advanceVote = function() {
      if (game.nextVote()) {
         // If the number of votes has exceeded 5
         io.emit('victory', 0);
         return;
      }
      var leader = game.getRoundLeader();
      user_list[leader].emit('leader', game.getUsers(), game.getNumberOfAgents());
      io.emit('curr_leader', leader, game.getRoundNumber(), game.getVoteNumber());
   };
   
   socket.advanceRound = function() {
      if (game.nextRound()) {
         io.emit('victory', game.getWinner());
         return;
      }
      
      var leader = game.getRoundLeader();
      user_list[leader].emit('leader', game.getUsers(), game.getNumberOfAgents());
      io.emit('curr_leader', leader, game.getRoundNumber(), game.getVoteNumber());
      
      io.emit('updated_scores', game.getNumResistanceWins(), game.getNumSpyWins());
   };
   
   
   // To update the client's scores
   socket.on('update_scores', function() {
      socket.emit('updated_scores', game.getNumResistanceWins(), game.getNumSpyWins());
   });
   
   
   socket.on('chat_message', function(msg) {
      console.log("Received message");
      io.emit('chat_message', msg);
   });
   
});



// Lastly we listen to port 3000
http.listen(3000, function() {
   console.log('Server started -- Listening on *:3000');
});
