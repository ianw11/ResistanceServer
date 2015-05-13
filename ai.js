



module.exports = {
   AI: function(id, game) {
      this.NAME = 'AI ' + id;
      
      // Set up the client connection and add self to game list
      
      var toDel = [];
      for (var key in require.cache) {
         //console.log(key);
         if (key.indexOf('socket.io-client') > -1) {
            toDel[toDel.length] = key;
         }
      }
      console.log('About to delete %d items', toDel.length);
      toDel.forEach(function(val) {
         delete require.cache[val];
      });
      
      var io = require('socket.io-client');
      this.socket = io.connect('http://localhost:3000');
      
      this.socket.emit('add_name', this.NAME);
      
      // Passed in parameters
      this.id = id;
      this.game = game;
      var self = this;
      
      // Game logic member variables
      this.role = "";
      
      this.roundNum = -1;
      this.voteNum = -1;
      
      this.teammates = null;
      
      
      this.socket.on('accepted_user', function() {
         // Expected
      });
      this.socket.on('new_user', function(name) {
         // The AI doesn't care about new users
      });
      this.socket.on('dropped_user', function(name) {
         // The AI doesn't care about dropped users
      });
      
      /* When the game starts, each AI must request its role */
      this.socket.on('game_started', function() {
         self.socket.emit('send_role', self.NAME);
      });
      
      this.socket.on('role', function(role, spies) {
         self.role = role;
         console.log('AI.JS> '+self.NAME + " has role " + self.role);
         if (role === 'SPY')
            self.teammates = spies;
      });
      
      this.socket.on('leader', function(userList, numberOfAgents) {
         // The AI must select <numberOfAgents> from <userList> to go on a mission
         
         //var team_list = [];
         
         //socket.emit('team_list', team_list);
      });
      
      // The AI doesn't care about this function
      this.socket.on('curr_leader', function(name, roundNum, voteNum) {
      });
      
      this.socket.on('vote_team', function(team) {
         // The AI must decide if the <team> is worthy to go on a mission
         // 1 for yes, 0 for no
         
         var worthy = false;
         
         //var vote = worthy ? 1 : 0;
         //socket.emit('vote', vote);
      });
      
      this.socket.on('team_vote_result', function(res, team) {
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
            self.socket.emit('mission', vote);
         }
         
      });
      
      
      this.terminate = function() {
         this.socket.disconnect();
      };
      
   }
};