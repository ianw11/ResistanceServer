var self = this;
var visibleElem = null;

function start() {
   visibleElem = $('#startDiv');
   
   $('#startDraftButton')[0].onclick = startDraft;
   
   // Hide all divs that are not yet in use
   $('.cube_hidden').each(function(index) {
      $(this).toggle(0);
   });
   
   /*********************************************/

   /* When the server informs this client what ... */
   socket.on('connected_players', function(player_list) {
      for (var ndx in player_list) {
         var li = document.createElement('li');
         li.innerHTML = player_list[ndx];
         $('#connectedPlayerList').append(li);
      };
   });
   
   socket.on('starting_draft', function() {
      swapVisibility($('#cardSelect'));
   });
   
   socket.on('new_pack', function(pack) {
      for (var ndx in pack) {
         var card = pack[ndx];
         var li = document.createElement('li');
         li.innerHTML = card.name;
         //$('#cardlist').append(li);
      }
      for (var i = 0; i < 5; ++i) {
         var tr = document.createElement('tr');
         for (var j = 0; j < (pack.length/5); ++j) {
            var card = pack[i + (5*j)];
            
            // Remove the card's flavor text as it sometimes has quotes that hurts our sanitization efforts
            card.flavor = "";
            var card_str = sanitize(JSON.stringify(card));
            
            tr.innerHTML += "<td><img src='http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=" + card.multiverseid + "&type=card'></img><br><h3>" + card.name + "</h3><br><button onclick='cardPicked(\"" + card.name + "\")'>Select</button><button onclick='showOracle(\"" + card_str + "\")'>?</button></td>";
            //.name + "\", \"" + cardtext
            //
         }
         $('#cardtable').append(tr);
      }
   });
   
   socket.emit('ready');
};

function cardPicked(cardname) {
   console.log("Picked " + cardname);
};

function showOracle(sanitized_card) {
   var desanitized_str = desanitize(sanitized_card);
   var card = JSON.parse(desanitized_str);
   document.getElementById('name').innerHTML = card.name + "   --  " + card.manaCost;
   document.getElementById('oracletype').innerHTML = card.type;
   document.getElementById('oracletext').innerHTML = card.text;
   if (card.power !== undefined) {
      document.getElementById('oraclept').innerHTML = card.power + "/" + card.toughness;
   } else {
      document.getElementById('oraclept').innerHTML = "";
   }
   
   document.getElementById('oraclepopup').style.display='block';
   document.getElementById('fade').style.display='block';
};

function closeOracle() {
   document.getElementById('oraclepopup').style.display = 'none';
   document.getElementById('fade').style.display = 'none';
};

function sanitize(str) {
   return str.split("'").join("APOSTROPHE")
   //.split("\n").join("NEWLINE")
   .split("/").join("SLASH")
   .split("{").join("OPEN_BRACKET")
   .split("}").join("CLOSE_BRACKET")
   .split("\"").join("QUOTE")
   .split("[").join("OPEN_ARRAY")
   .split("]").join("CLOSE_ARRAY");
};

function desanitize(str) {
   return str.split("APOSTROPHE").join("'")
   .split("\n").join("<br><br>")
   .split("SLASH").join("/")
   .split("OPEN_BRACKET").join("{")
   .split("CLOSE_BRACKET").join("}")
   .split("QUOTE").join("\"")
   .split("OPEN_ARRAY").join("[")
   .split("CLOSE_ARRAY").join("]");
};

function startDraft() {
   socket.emit('start_draft');
   return false;
};

function swapVisibility(newElem) {
   visibleElem.toggle(0);
   newElem.toggle(0);
   visibleElem = newElem;
};
