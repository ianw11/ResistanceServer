var socket = io();

var users = {};
var visibleElem = null;

var thisUser = null;
var thisRole = null;
var thisTeammates = null;

var isLeader = false;

/* Set up onclick listeners */
window.onload = function() {
   visibleElem = $('#index');
   
   $('#chatSendButton')[0].onclick = sendChat;
   
   $('#addAIButton')[0].onclick = addAI;
   $('#addMultipleAIButton')[0].onclick = addMultipleAI;
   
   $('#startGameButton')[0].onclick = startGame;
   $('#selectTeamButton')[0].onclick = selectTeam;
   
   $('#team_vote_yes')[0].onclick = voteTeamYes;
   $('#team_vote_no')[0].onclick = voteTeamNo;
   
   $('#mission_vote_pass')[0].onclick = voteMissionPass;
   $('#mission_vote_fail')[0].onclick = voteMissionFail;
   
   //var toHide = $('.myhidden');
   $('.myhidden').each(function(index) {
      $(this).toggle(0);
   });
};

/* When the user submits their name */
$('#nameInputForm').submit(function() {
   var name = $('#nameInput').val();
   socket.emit('add_name', name);
   thisUser = name;
   return false;
});

$('#chatForm').submit(sendChat);

/* When the server has accepted the user */
socket.on('accepted_user', function() {
   swapVisibility($('#queue_screen'));
   setHeaderText("Welcome to the game!  Please wait for others...");
   
   updateScoreBar();
});

/* When a new user enters the game. */
socket.on('new_user', function(name) {
   var queue = $('#queue');
   var li = document.createElement('li');
   users[name] = li;
   li.innerHTML = name;
   queue.append(li);
   
   updateNumUsers();
});

/* When somebody's connection drops */
socket.on('dropped_user', function(name) {
   var queue = $('#queue');
   users[name].parentNode.removeChild(users[name]);
   
   updateNumUsers();
});



/* When the server informs the clients that the game has started */
socket.on('game_started', function() {
   socket.emit('send_role', thisUser);
});

/* When the server informs this client what role it is */
socket.on('role', function(role, teammates) {
   var h1 = $('#roleElem')[0];
   h1.innerHTML = 'You are: ' + role;
   thisRole = role;
   
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
         if (value === thisUser)
            onMission = true;
      });
      
      swapVisibility($('#mission'));
      
      if (onMission) {
            $('#on_mission').toggle(0);
            if (thisRole === 'SPY')
               $('#mission_vote_fail').toggle(0);
               
         }
      
   } else {
      setHeaderText('Vote failed');
   }
});


socket.on('mission_result', function(res) {
   setHeaderText((res === false ? 'Spy' : 'Resistance') + " wins mission");
});


socket.on('victory', function(side) {
   var text = "";
   if (side === 0)
      text += "SPIES WIN";
   else
      text += "RESISTANCE WINS";
   
   text += "    (Refresh to play another)"
   
   setHeaderText(text);
   
   swapVisibility($('#emptyDiv'));
   swapVisibility($('#scoreBar'));
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


/* Chat functions */
socket.on('chat_message', function(msg) {
   
   var ul = $('#messages');
   var li = $('<li>').text(msg);
   ul.append(li);
});

var sendChat = function() {
   if (thisUser === null)
      thisUser = 'Anon';
   
   if ($('#m')[0].value.length === 0)
      return false;
   
   socket.emit('chat_message', thisUser + '-> '  + $('#m')[0].value);
   
   $('#m')[0].value = '';
   
   return false;
};



/* Helper functions */

var addAI = function() {
   if ($('#queue')[0].childElementCount < 10)
      socket.emit('add_ai');
};

var addMultipleAI = function() {
   var num = parseInt($('#addMultipleAI')[0].value);
   if (num < 0)
      return;
   
   if ((num + $('#queue')[0].childElementCount) <= 10) {
      while(num--) {
         addAI();
      }
   }
};

/* Handler for the startGameButton */
var startGame = function() {
   socket.emit('start_game');
};

/* Helper function to switch out visibility */
var swapVisibility = function(newElem) {
   visibleElem.toggle(0);
   newElem.toggle(0);
   visibleElem = newElem;
};

/* Helper function to update scores */
var updateScoreBar = function() {
   socket.emit('update_scores')
}

/* Handler for the team selection */
var selectTeam = function() {
   var selected = [];
   var i = 0;
   $('.ms-selection .ms-list .ms-selected').each(function(index) {
      selected[i++] = $(this)[0].getElementsByTagName('span')[0].innerHTML;
   });
   
   socket.emit('team_list', selected);
   
   $('#leaderInfo').toggle(0);
};


/* Functions for choosing a team to go on a mission */
var voteTeam = function() {
   // Remove all lines from #team_list
   while ($('#team_list')[0].firstChild) {
      $('#team_list')[0].removeChild($('#team_list')[0].firstChild);
   }
   
   swapVisibility($('#emptyDiv'));
   
   setHeaderText("Vote Sent");
};

var voteTeamYes = function() {
   voteTeam();
   socket.emit('vote', 1);
};

var voteTeamNo = function() {
   voteTeam();
   socket.emit('vote', 0);
};

/* Functions for running a mission */
var voteMission = function() {
   if (thisRole === 'SPY') {
      $('#mission_vote_fail').toggle(0);
   }
   
   $('#on_mission').toggle(0);
   
   swapVisibility($('#emptyDiv'));
   
};

var voteMissionPass = function() {
   voteMission();
   socket.emit('mission', 1);
};

var voteMissionFail = function() {
   voteMission();
   socket.emit('mission', 0);
};


// Updates the number of people in line for a game
var updateNumUsers = function() {
   var text = 'Num In Queue: ';
   text += $('#queue')[0].childElementCount;
   $('#numInQueue')[0].innerHTML = text;
};

// Function to update the header text
var setHeaderText = function(txt) {
   $('#status')[0].innerHTML = txt;
};