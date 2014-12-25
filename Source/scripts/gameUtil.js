function createDecks(clientPlayerId, timings) {    
    timings = timings || { updateTime: 700, deadTime: 1200, popTime: 400};
    
    var bottom = createDeckDW('.player-bottom', 'horizontal', timings );
	var top = createDeckDW('.player-top', 'horizontal', timings );
	var left = createDeckDW('.player-left', 'radial', timings );
	var right = createDeckDW('.player-right', 'radial', timings );
	var main = createDeckDW('.main-field', 'horizontal', timings );
	var pile = createDeckDW('.pile', 'vertical', timings );
	
	var playerDecks = new Array(4)
	playerDecks[clientPlayerId] = bottom;
	playerDecks[(clientPlayerId + 1) % 4] = left;
	playerDecks[(clientPlayerId + 2) % 4] = top;
	playerDecks[(clientPlayerId + 3) % 4] = right;
	
	var decks = function(key) {
	    if (jQuery.type(key) === "number") {
	        return playerDecks[key];
	    } 
	    if (key === "bottom") {
	        return bottom;
	    }
	    if (key === "main") {
	        return main;
	    }
	    if (key === "pile") {
	        return pile;
	    }
	    throw new Error("Unknown signature: " + key);
	};    
	return decks;
}

function getShirt(playerID) {
    var shirtNumber = playerID + 1;//have to add one due to array numeration
    return "shirt" +  shirtNumber;
}