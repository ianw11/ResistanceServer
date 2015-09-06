var self = this;

var name = null;
var role = null;

var visibleElem = null;

function start() {
   
   var thisTeammates = null;

   var isLeader = false;
   
   visibleElem = $('#startDiv');
   
   $('#selectTeamButton')[0].onclick = selectTeam;
   
   $('#team_vote_yes')[0].onclick = voteTeamYes;
   $('#team_vote_no')[0].onclick = voteTeamNo;
   
   $('#mission_vote_pass')[0].onclick = voteMissionPass;
   $('#mission_vote_fail')[0].onclick = voteMissionFail;
   
   // Hide all divs that are not yet in use
   $('.r_hidden').each(function(index) {
      $(this).toggle(0);
   });
   
   
   
   /*********************************************/

   /* When the server informs this client what role it is */
   socket.on('role', function(name, role, teammates) {
      self.name = name;
      
      var h1 = $('#roleElem')[0];
      h1.innerHTML = 'You are: ' + role;
      self.role = role;
      
      if (role === 'SPY') {
         thisTeammates = teammates;
         var mates = $('#teammates');
         for (var i = 0; i < teammates.length; ++i) {
            var li = document.createElement('li');
            li.innerHTML = teammates[i].name;
            mates.append(li);
         }
      } else {
         var mates = $('#teammates');
         var li = document.createElement('li');
         li.innerHTML = '???';
         mates.append(li);
      }
   });

   /* If this client is the leader, this is triggered */
   socket.on('leader', function(userList, numberOfAgents) {
      
      isLeader = true;
      
      var multiSelect = $('#leader_select');
      $('#leaderInfo').toggle(0);
      
      userList.forEach(function(user, index, array) {
         var opt = document.createElement('option');
         opt.value = user.name;
         opt.innerHTML = user.name;
         multiSelect.append(opt);
      });
      
      // Turn it into a multiselect
      multiSelect.multiSelect();
      
      $('#neededNumberOfPeople')[0].innerHTML = "Need: " + numberOfAgents + " agent(s)";
   });

   /* When the server informs everybody who the leader is */
   socket.on('curr_leader', function(leader, roundNum, voteNum) {
      
      swapVisibility($('#role_screen'));
      $('#currLeader')[0].innerHTML = "Current Captain: " + leader;
      $('#roundAndVote')[0].innerHTML = "Round Number: " + roundNum + " and vote number: " + voteNum;
      
      //updateScoreBar();
   });

   /* When the server asks each user to vote */
   socket.on('vote_team', function(team) {
      swapVisibility($('#voteOnTeam'));
      team.forEach(function(value, index) {
         var li = document.createElement('li');
         li.innerHTML = value;
         $('#team_list').append(li);
      });
   });

   /* When the vote has gone through */
   socket.on('team_vote_result', function(res, team) {
      isLeader = false;
      if (res) {
         setHeaderText('Vote passed, Wait for Mission...');
         var onMission = false;
         
         team.forEach(function(value, index) {
            if (value === self.name)
               onMission = true;
         });
         
         swapVisibility($('#mission'));
         
         if (onMission) {
               $('#on_mission').toggle(0);
               if (self.role === 'SPY')
                  $('#mission_vote_fail').toggle(0);
                  
            }
         
      } else {
         setHeaderText('Vote failed');
      }
   });


   socket.on('mission_result', function(res) {
      setHeaderText( (res ? 'Resistance' : 'Spy') + " wins mission");
   });


   socket.on('victory', function(side) {
      updateScoreBar();
      
      var text = "";
      if (side === 0)
         text += "SPIES WIN";
      else
         text += "RESISTANCE WINS";
      
      text += "    (Refresh to play another)"
      
      setHeaderText(text);
      
      swapVisibility($('#emptyDiv'));
      swapVisibility($('#scoreBar'));
      swapVisibility($('#restartButton'));
   });


   socket.on('updated_scores', function(resistance, spies) {
      $('#scoreBar')[0].innerHTML = "Resistance: " + resistance + " Spies: " + spies;
   });

   /* Any error. Bumps the user back to the main page */
   socket.on('_error', function(msg) {
      alert(msg);
      swapVisibility($('#index'));
   });

   socket.on('violation', function(msg) {
      alert(msg);
      if (isLeader) {
         $('#leaderInfo').toggle(0);
      }
   });
   
   
   socket.emit('ready');
   
};


function swapVisibility(newElem) {
   visibleElem.toggle(0);
   newElem.toggle(0);
   visibleElem = newElem;
};

/* Functions for choosing a team to go on a mission */
function voteTeam() {
   // Remove all lines from #team_list
   while ($('#team_list')[0].firstChild) {
      $('#team_list')[0].removeChild($('#team_list')[0].firstChild);
   }
   
   swapVisibility($('#emptyDiv'));
   
   setHeaderText("Vote Sent");
};

function voteTeamYes() {
   voteTeam();
   socket.emit('vote', 1);
};

function voteTeamNo() {
   voteTeam();
   socket.emit('vote', 0);
};


/* Functions for running a mission */

function voteMission() {
   if (this.role === 'SPY') {
      $('#mission_vote_fail').toggle(0);
   }
   
   $('#on_mission').toggle(0);
   
   swapVisibility($('#emptyDiv'));
};

function voteMissionPass() {
   voteMission();
   socket.emit('mission', 1);
};

function voteMissionFail() {
   voteMission();
   socket.emit('mission', 0);
};




// Function to update the header text
function setHeaderText(txt) {
   $('#status')[0].innerHTML = txt;
};

/* Helper function to update scores */
function updateScoreBar() {
   socket.emit('update_scores')
}

/* Handler for the team selection */
function selectTeam() {
   var selected = [];
   var i = 0;
   $('.ms-selection .ms-list .ms-selected').each(function(index) {
      selected[i++] = $(this)[0].getElementsByTagName('span')[0].innerHTML;
   });
   
   socket.emit('team_list', selected);
   
   $('#leaderInfo').toggle(0);
};