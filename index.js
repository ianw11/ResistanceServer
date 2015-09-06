var socket = io();

// Keeps track of the element visible to the user
var _visibleElem = null;

// Holds the list of games downloaded from the server
var games = null;

// URL of the game to load
var urls = {};

// Remembers if this user is currently the owner of the room they're in
var ownerOfRoom = false;

var _name = "";


/* When the page loads */
window.onload = function() {
   
   // Download the latest games that are available to play
   $.getJSON('Games.json')
   .done(function (data) {
      games = data.games;
      games.splice(0, 0, {'name': '', 'modules':[]} );
   })
   .fail(function (jqxhr, status, error) {
      console.log("Error in getting Games.json from server: " + jqxhr.status + ", " + error);
      alert('Error downloading games, try refreshing page');
      return;
   });
   
   
   $('#createGameButton')[0].onclick = createGame;
   $('#createGameSubmit')[0].disabled = true;
   $('#createGameSubmit')[0].onclick = openGame;
   
   $('#joinGameButton')[0].onclick = listRooms;
   $('#refreshOpenRoomsButton')[0].onclick = listRooms;
   
   $('#lookingForGameBack')[0].onclick = backToHome;
   $('#createGameBack')[0].onclick = backToHome;
   
   $('#leaveRoomButton')[0].onclick = leaveRoom;
   
   $('#chatSendButton')[0].onclick = sendChat;
   $('#chatForm').submit(sendChat);
   
   // Preparation for accordion view in the 'Available Rooms' view
   $('#openRoomsList')[0].accordionActive = false;
   
   _visibleElem = $('#enterName');
   // Hide all divs that are not yet in use
   $('.myhidden').each(function(index) {
      $(this).toggle(0);
   });
};


/* When the user submits their name */
$('#nameInputForm').submit(function() {
   var name = $('#nameInput').val();
   if (name === undefined || name === '')
      return false;
   
   _name = name;
   
   socket.emit('name', name);
   
   _swapVisibility($('#createOrJoin'));
   return false;
});


/* Navigation */

var backToHome = function() {
   if (this.chatVisible) {
      $('#chatDiv').toggle(0);
   }
   
   _swapVisibility($('#createOrJoin'));
};


/* Room Creation */

var createGame = function() {
   var baseGameSelect = $('#baseGameSelect')[0];
   dropChildren(baseGameSelect);
   
   for (var ndx in games) {
      var option = document.createElement('option');
      var gameName = games[ndx].name
      option.text = gameName;
      option.value = gameName;
      urls[gameName] = games[ndx].url;
      urls[gameName + 'server'] = games[ndx].server_url;
      baseGameSelect.appendChild(option);
   }

   _swapVisibility($('#createGame'));
   
};

var baseGameSelect = function(sel) {
   var moduleForm = $('#moduleForm')[0];
   dropChildren(moduleForm);
   
   // The currently selected game from the drop-down select
   var baseGame = sel.value;
   
   // If the empty option is selected, nothing else can happen
   if (baseGame === '') {
      $('#createGameSubmit')[0].disabled = true;
      return;
   }
   $('#createGameSubmit')[0].disabled = false;
   
   // Display all modules available to play
   for (var ndx in games) {
      if (games[ndx].name === baseGame) {
         for (var mod_ndx in games[ndx].modules) {
            var module = games[ndx].modules[mod_ndx];
         
            var label = document.createElement('label');
            label.innerHTML = '<input type=checkbox value=' + module.val + '> ' + module.name;
            moduleForm.appendChild(label);
            
            moduleForm.appendChild(document.createElement('br'));
         }
      }
   }
};

var openGame = function() {
   $('#numberOfPeopleError')[0].innerHTML = "";
   $('#numberOfAIError')[0].innerHTML = "";
   $('#radioError')[0].innerHTML = "";
   $('#targetPlayersError')[0].innerHTML = "";
   
   
   var base = $('#baseGameSelect')[0].value;
   var modules = [];
   var numHumans = -1;
   var numAI = -1;
   var targetPlayers = -1;
   var autofill = false;
   var gameTitle = $('#gameTitle')[0].value;
   
   
   var radio = document.getElementsByName('variation');
   if (!radio[0].checked && !radio[1].checked) {
      $('#radioError')[0].innerHTML = "One of the radio buttons must be checked";
      return;
   }
   
   if (radio[0].checked) {
      // VERIFY OPTIONS 1
      numHumans = $('#numberOfPeople')[0].value;
      if (numHumans > 10 || numHumans < 1) {
         $('#numberOfPeopleError')[0].innerHTML = "Bad Value";
         return;
      }
      
      numAI = $('#numberOfAI')[0].value;
      if (numAI > 9 || numAI < 0) {
         $('#numberOfAIError')[0].innerHTML = "Bad Value";
         return;
      }
      
      var total = parseInt(numHumans) + parseInt(numAI);
      if (total > 10 || total < 5) {
         $('#numberOfPeopleError')[0].innerHTML = "Bad Value";
         $('#numberOfAIError')[0].innerHTML = "Bad Value";
         return;
      }
      targetPlayers = total;
      
   } else {
      // VERIFY OPTIONS 2
      targetPlayers = parseInt($('#targetPlayers')[0].value);
      if (targetPlayers < 5 || targetPlayers > 10) {
         $('#targetPlayersError')[0].innerHTML = "Bad Value";
         return;
      }
      
      autofill = true;
   }
   
   
   var modForm = $('#moduleForm')[0];
   for (var i = 0; i < modForm.length; ++i) {
      if (modForm[i].checked)
         modules[modules.length] = modForm[i].value;
   }
   
   var obj = {baseGame: base,
              modules: modules,
              numHumans: numHumans,
              numAI: numAI,
              title: gameTitle,
              targetPlayers: targetPlayers,
              autofill: autofill,
              url: urls[base],
              serverUrl: urls[base + 'server']};
   
   socket.emit('open_room', obj);
};


/* Room Joining */

var listRooms = function() {
   socket.emit('get_open_rooms');
}

socket.on('open_rooms', function(list) {
   var rooms = $('#openRoomsList')[0];
   
   dropChildren(rooms);
   
   for (var i = 0; i < list.length; ++i) {
      var room = list[i];
      
      
      var title = document.createElement('h3');
      title.innerHTML = room.title;
      
      var childDiv = document.createElement('div');
      
      var params = document.createElement('ul');
      childDiv.appendChild(params);
      
      // What game
      var game = document.createElement('li');
      game.innerHTML = room.baseGame;
      params.appendChild(game);
      
      // Game Owner
      var host = document.createElement('li');
      host.innerHTML = "Hosted by: " + room.owner;
      params.appendChild(host);
      
      // Mods
      var modules = document.createElement('li');
      var modStr = "";
      if (room.modules.length > 0) {
         modStr = "MODS:  ";
         room.modules.forEach(function(val) {
            modStr += '[' + getFullName(room.baseGame, val) + "]  ";
         });
      } else {
         modStr = "No Mods";
      }
      modules.innerHTML = modStr;
      params.appendChild(modules);
      
      // Looking for
      var numHumanLI = document.createElement('li');
      if (room.autofill) {
         numHumanLI.innerHTML = "Looking for UP TO " + (room.targetPlayers - room.inQueue) + " more people";
      } else {
         numHumanLI.innerHTML = "Looking for " + (room.numHumans - room.inQueue) + " more people";
      }
      params.appendChild(numHumanLI);
      
      // Num AI
      var numAILI = document.createElement('li');
      if (room.autofill) {
         numAILI.innerHTML = "AI will fill in the rest if not enough people join"
      } else {
         numAILI.innerHTML = "Playing with " + room.numAI + " AI";
      }
      params.appendChild(numAILI);
      
      // Join
      var joinButton = document.createElement('button');
      joinButton.innerHTML = 'Join Game';
      joinButton.room_id = room.id;
      joinButton.onclick = function() {
         socket.emit('join_room', this.room_id);
      }
      childDiv.appendChild(joinButton);
      
      rooms.appendChild(title);
      rooms.appendChild(childDiv);
      
      
   }
   
   
   /* Code to handle the UI component known as 'accordion' */
   
   if (rooms.accordionActive) {
      $(function() {
         $('#openRoomsList').accordion( 'destroy' );
      });
   } else {
      rooms.accordionActive = true;
   }
   
   $(function() {
      $('#openRoomsList').accordion( { heightStyle: 'content' } );
   });
   
   
   _swapVisibility($('#lookingForGame'));
});


/* Once In A Room */

socket.on('in_room', function(room, isOwner) {
   _swapVisibility($('#room'));
   $('#chatDiv').toggle(0);
   chatVisible = true;
   
   ownerOfRoom = isOwner;
   
   // Display Title
   $('#roomTitle')[0].innerHTML = room.title;
   
   // Display Module List for Current Game
   var moduleList = $('#moduleList')[0];
   for (var i = 0; i < room.modules.length; ++i) {
      var li = document.createElement('li');
      li.innerHTML = getFullName(room.baseGame, room.modules[i]);
      moduleList.appendChild(li);
   }
   
   // Owner can see the 'start' button
   if (isOwner) {
      var startButton = document.createElement('button');
      $('#ownerPlaceHolder')[0].appendChild(startButton);
      startButton.innerHTML = 'Start Game';
      startButton.onclick = function() {
         socket.emit('ready_to_start', room.id);
      }
   }
});

socket.on('player_list_update', function(names) {
   var userlist = $('#userList')[0];
   dropChildren(userlist);
   
   names.forEach(function (val, ndx) {
      var li = document.createElement('li');
      userlist.appendChild(li);
      li.innerHTML = val;
   });
   
});

var leaveRoom = function() {
   socket.emit('leaving_room');
   dropChildren($('#ownerPlaceHolder')[0]);
   backToHome(ownerOfRoom);
};

socket.on('room_closed', function(active) {
   if (active) {
      alert("Player disconnected, please refresh");
      _swapVisibility($('#_blank'));
      
      $('#chatDiv').toggle(0);
      
      return;
   }
   
   alert("Room closed, please choose another option");
   backToHome();
});


/* Starting Game */

socket.on('start_game', function(url) {
   $(function() {
      $('#game').load(url, null, function() {
         start();
      });
   });
   
   _swapVisibility($('#game'));
});


/* Server Notifications */

socket.on('notify', function(msg) {
   alert(msg);
});



/* Chat functions */
socket.on('chat_message', function(msg) {
   
   var ul = $('#messages');
   var li = $('<li>').text(msg);
   ul.append(li);
   
});

function sendChat() {
   
   if ($('#m')[0].value.length === 0)
      return false;
   
   socket.emit('chat_message', _name + '-> '  + $('#m')[0].value);
   
   $('#m')[0].value = '';
   
   return false;
};


/* Helper function to switch out visibility */
var _swapVisibility = function(newElem) {
   _visibleElem.toggle(0);
   newElem.toggle(0);
   _visibleElem = newElem;
};

/* Helper function to drop all children */
var dropChildren = function(parent) {
   while (parent.firstChild)
      parent.removeChild(parent.firstChild);
};

/* Helper function to turn a module code to the full name */
var getFullName = function(game, mod) {
   var modList = null;
   for (var i = 0; i < games.length; ++i) {
      if (games[i].name === game) {
         modList = games[i].modules;
      }
   }
   for (var i = 0; i < modList.length; ++i) {
      if (modList[i].val === mod)
         return modList[i].name;
   }
}
