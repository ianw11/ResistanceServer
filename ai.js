



module.exports = {
   AI: function(id, game) {
      this.NAME = 'AI ' + id;
      
      // Set up the client connection and add self to game list
      
      var toDel = [];
      for (var key in require.cache) {
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
	  //var friends = [];
	 // var wentMission = [];
	  //var round;
      
      
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
         if (role === 'SPY')
            self.teammates = spies;
      });
      
      this.socket.on('leader', function(userList, numberOfAgents) {
         // The AI must select <numberOfAgents> from <userList> to go on a mission
         players = game.getUsers().slice(0);
         var team_list = [];
		 var place = -1;
         players.forEach(function(val, ndx) {
            if (val.name === self.NAME) {
               place = ndx;
            }
         });
		 console.log("the index is: "+place)
		 team_list[0] = players[place].name;
		 var q = 0;
		 //if(self.role === "SPY"){
		    while(team_list.length != numberOfAgents) {
			    if(q === place){q++}
			    team_list[team_list.length] = players[q].name;
			    q++;
			    console.log("number of team member"+team_list.length);
		    }
         /*}
		 if(slef.role === "RESISTANCE"){
			 
		 }*/
         self.socket.emit('team_list', team_list);
      });
      
      // The AI doesn't care about this function
      this.socket.on('curr_leader', function(name, roundNum, voteNum) {
      });
      
      this.socket.on('vote_team', function(team) {
         // The AI must decide if the <team> is worthy to go on a mission
         // 1 for yes, 0 for no
         
         var worthy = false;
		 var isOnTeam = false;
         team.forEach(function(val, ndx) {
            if (val === self.NAME) {
               isOnMission = true;
            }
         });
		 //ai will always approve the team
         if(self.role === "RESISTANCE") {
			 if(isOnTeam) {
			    worthy = true;
			 }
		 }
		 if(self.role === "SPY") {
			 worthy = true;
		 }
         var vote = worthy ? 1 : 0;
         self.socket.emit('vote', vote);
      });
      
      this.socket.on('team_vote_result', function(res, team) {
         // If this AI is on the team (ie team[i] is 'AI <id>') then it may vote on the mission
         // Otherwise, nothing
		 //round = game.getRoundNumber();
		 //wentMission[round] = team;
         var isOnMission = false;
         team.forEach(function(val, ndx) {
            if (val === self.NAME) {
               isOnMission = true;
            }
         });
         
         if (isOnMission) {
            // Add code to decide if the mission should pass or fail
            
            var worthy = false;
			//spy fails every time
            if(self.role === "SPY"){
				worthy = false;
			}
            // Resistance can only vote yes
            if (self.role === "RESISTANCE"){
               worthy = true;
            }
            var vote = worthy ? 1 : 0;
            self.socket.emit('mission', vote);
         }
      
      });
      /*this.socket.on('mission_result',function(result){
		 if(result){
			 friends[round] = wentMission[round];
		 } 
	  });*/
      
      this.terminate = function() {
         this.socket.disconnect();
      };
      
   }
};