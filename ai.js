module.exports = {
   AI: function(id, game) {
      var NAME = 'AI ' + id;
      
      // Set up the client connection and add self to game list
      var io = require('socket.io-client');
      var socket = io.connect('http://localhost:3000');
      socket.emit('add_name', NAME);
      
      // Passed in parameters
      this.id = id;
      this.game = game;
      var self = this;
      
      // Game logic member variables
      this.role = "";
      
      this.roundNum = -1;
      this.voteNum = -1;
      
      this.teammates = null;
      
      
      
      /* When the game starts, each AI must request its role */
      socket.on('game_started', this.acceptGameStart);
      this.acceptGameStart = function() {
         console.log("AI id " + self.id + " recognizes the game has started");
         socket.emit('send_role');
      };
      
      socket.on('role', function(role, spies) {
         self.role = role;
         if (role === 'SPY')
            self.teammates = spies;
      });
      
      socket.on('leader', function(userList, numberOfAgents) {
         // The AI must select <numberOfAgents> from <userList> to go on a mission
         
         //var team_list = [];
         
         //socket.emit('team_list', team_list);
      });
      
      // The AI doesn't care about this function
      socket.on('curr_leader', function(name, roundNum, voteNum) {
      });
      
      socket.on('vote_team', function(team) {
         // The AI must decide if the <team> is worthy to go on a mission
         // 1 for yes, 0 for no
         
         var worthy = false;
         
         //var vote = worthy ? 1 : 0;
         //socket.emit('vote', vote);
      });
      
      socket.on('team_vote_result', function(res, team) {
         // If this AI is on the team (ie team[i] is 'AI <id>') then it may vote on the mission
         // Otherwise, nothing
         
         var isOnMission = false;
         team.forEach(function(val, ndx) {
            if (val === self.NAME) {
               isOnMission = true;
            }
         });
         
         if (isOnMission) {
            // Add code to decide if the mission should pass or fail
            
            var worthy = false;
            
            // Resistance can only vote yes
            if (self.role == "RESISTANCE")
               worthy = true;
            
            var vote = worthy ? 1 : 0;
            socket.emit('mission', vote);
         }
         
      });
      
   }
};