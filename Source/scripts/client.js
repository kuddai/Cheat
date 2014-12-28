function save(key, val) {
    sessionStorage.setItem(key, val);
}
function remove(key) {
    sessionStorage.removeItem(key);
}
function getVal(key) {
    return sessionStorage.getItem(key);
}

$(document).ready(function() {
	var socket = io.connect('http://31.23.52.23:25002');
    var MAX_PLAYERS = 4;
 
    socket.once('connect', function() {
        var clientPlayerId;
        var currentPlayerId;
        var decks;
        var input;
        var gameStart = true;
        
        console.log("wait for the game to start");
        var intervalID = setInterval( function () {
        	socket.emit("ready", 
        		JSON.stringify({ "name": "defaultName", "id":getVal("id") })
        		); 
        }, 1000);
//-----------------------EVENTS-----------------------        
		// playerInfo - {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on('startGame', function(playerInfo) {
        	clearInterval(intervalID);
            var parsed = JSON.parse(playerInfo);
            clientPlayerId = parseInt(parsed.num);
            save("id", parsed.id);
            save("num", clientPlayerId);

            decks = createDecks(clientPlayerId);
            input = new Input(socket, clientPlayerId, getShirt, decks);
            
            console.log("Game has started. Our client id: " + clientPlayerId);
        });
        
        socket.on("changeID", function(id) {
        	console.log("My id: " + id);
            save("id", id);
        });
        
        // SERVER SENDS common info about all players.
		// {"номер игрока": [массив его карт в виде пустышек],.., 
		//"карты в куче": [массив карт в куче], "карты на столе": [массив карт на столе]}
        socket.on("update", function(rawData) {
            //all cards in the game
			var data = JSON.parse(rawData);
		    for (var playerid = 0; playerid < MAX_PLAYERS; playerid++) {
		        var shirt = (playerid === clientPlayerId) ? "open" : ownerToShirt(playerid);
		        decks(playerid).set(data[playerid], shirt);
			}
			
			//подсветка текущего игроков
			switchHighlighting(currentPlayerId, data["currPlayer"], decks);
			
			currentPlayerId = data["currPlayer"];
			console.log(clientPlayerId + ": Current Player " + currentPlayerId);
			
            var checkedIndex = data["checkedIndex"];
            var mainCards = data["canCheckCards"] || [];
            var pileCards = data["pileCards"] || [];
            
            decks("pile").set(pileCards, ownerToShirt);
            input.update(mainCards, pileCards.length > 0, currentPlayerId, checkedIndex);
            console.log(clientPlayerId + ": Current state " + input.getState());
        });
        
        // ERROR HANDLER
        socket.on("gameError", function(msg) {
            console.log(clientPlayerId + ": " + msg);
        });
		//handler signature: deckKey, cardIndex, roundCardValue
        socket.on("setCard", input.otherToMain);
		//handler signature: deckKey, cardIndex
        socket.on("removeCard", input.otherFromMain);
		//handler signature: deckKey, cardIndex
        socket.on("hoverUp", input.otherEnter);
        //handler signature: deckKey, cardIndex
        socket.on("hoverDown", input.otherLeave);
        
        decks("bottom").$field.on("click", '.card[status="alive"]', input.bottomClick);
        decks("bottom").$field.on("mouseenter", '.card[status="alive"]', input.bottomEnter);
        decks("bottom").$field.on("mouseleave", '.card[status="alive"]', input.bottomLeave);
        decks("main").$field.on("click", '.card[status="alive"]', input.mainClick);
        decks("main").$field.on("mouseenter", '.card[status="alive"]', input.mainEnter);
        decks("main").$field.on("mouseleave", '.card[status="alive"]', input.mainLeave);
        
		// Присылается игрок looser
		// {name:"имя игрока", id:val, num:"номер игрока", cards:[массив карт игрока]}
        socket.on("endGame", function(looser) {
            input.clean();
            var p = JSON.parse(looser);
            console.log(clientPlayerId + ": " +"Looser - " + p.name);
        });
		// Разные сообщения, которые нужно выводить в каком нибудь text field.
		// Сообщения типа: "Для старта игры нужно еще 2 игрока"
        socket.on("message", function(msg) {
            console.log(clientPlayerId + ": " +"message: " + msg);
        });
        


    });

    $(window).resize(function() {
        var allDecks = decks("all");
        for (var i = 0; i < allDecks.length; i++) {
            allDecks[i].update();
        };
    });
});
