var _game = require('./game');

/* Here are the 'node' require statements */
// Express initializes app to be a function handler
// that you can supply to an HTTP server
var app = require('express')();
// app is being supplied to an http server here.
var http = require('http').Server(app);
var io = require('socket.io')(http);

var game = null;
var connectedUsers = 0;

var user_list = null;
var role_list = null;

var team_list = null;


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
      if (game == null) {
         console.log("Creating new game");
         game = new _game.Game();
         user_list = {};
      }
      
      if (game.isGameStarted()) {
         socket.emit('_error', "Game has already started");
         return;
      }
      
      connectedUsers++;
      
      socket.emit('accepted_user');
      
      var users = game.getUsers();
      for (var i = 0; i < users.length; ++i) {
         socket.emit('new_user', users[i]);
      }
      io.emit('new_user', name);
      
      socket['username'] = name;
      user_list[name] = socket;
      
      game.addUser(name);
   });
   
   // disconnect
   socket.on('disconnect', function() {
      if (socket['username'] == null) {
         return;
      }
      
      game.dropUser(socket['username']);
      console.log(socket['username'] + " has disconnected");
      io.emit('dropped_user', socket['username']);
      
      connectedUsers--;
      if (connectedUsers == 0 && game != null) {
         console.log("No more users, closing game");
         game = null;
         role_list = null;
         user_list = null;
         team_list = null;
      }
   });

   // start_game
   socket.on('start_game', function() {
      if (game.isGameStarted()) {
         return;
      }
      
      if (game.getNumUsers() < 5 || game.getNumUsers() > 10) {
         socket.emit('violation', "There must be between 5 and 10 people");
         return;
      }
      
      role_list = game.newGame();
      io.emit('game_started');
      
      socket.advanceRound();
   });
   
   /**********************/
   // send_role
   socket.on('send_role', function(name) {
      if (role_list[name] === 'SPY') {
         socket.emit('role', role_list[name], game.getSpies());
      } else {
         socket.emit('role', role_list[name]);
      }
   });
   
   /*
   // next_round
   socket.on('next_round', function() {
      socket.advanceRound();
   });
   */
   
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
      if (game.teamVote(choice)) {
         var result = game.getVoteResult();
         io.emit('team_vote_result', result, team_list, role_list);
         if (result) {
         } else {
            socket.advanceVote();
         }
      }
   });
   
   // mission
   socket.on('mission', function(res) {
      if (game.mission(res)) {
         var winningTeam = game.getWinner();
         if (winningTeam !== -1) {
            io.emit('victory', winningTeam);
            return;
         }
         
         var result = game.missionResult();
         io.emit('mission_result', result);
         
         socket.advanceRound();
      }
   });
   
   
   socket.advanceVote = function() {
      if (game.nextVote()) {
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
   };
   
});




// Lastly we listen to port 3000
http.listen(3000, function() {
   console.log('Server started -- Listening on *:3000');
});
