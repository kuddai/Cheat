function randRange(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function Card(owner, value, suit) {
	this.owner = owner;
	this.value = value;
	this.suit = suit;
};
var vals = ["6","7","8","9","10","J","Q","K","A"];
var types = ["♠", "♦", "♥", "♣"];

function GameController(){
	//this.roomName = roomName;
	this.Players = [];
	this.cards = [];
	this.cardsOnBoard=[];
	this.canCheckCards=[];
	this.currPlayer = 0;
	this.inGame = false;
	this.looser = undefined;
	// from 0 to 7 (without A)
	this.currCard = "";


	this.StartGame = function() {
		for (var v=0; v < vals.length; v++) {
			for (var t=0; t < types.length; t++) {
				this.cards.push(new Card( -1, vals[v], types[t]));
			};
		};
		for (var i = 0; i < 36; i+= this.Players.length) {
			for (var j = 0; j < this.Players.length; j++) {
				var rnd = 0; //randRange(0, this.cards.length);
				var crd = this.cards[rnd];
				crd.owner = j;
				this.Players[j].cards.push(crd);
				this.cards.splice(rnd,1);
			};
		};
	};
	this.AddPlayer = function(player) {
		this.Players.push(player);
	};
	this.GetPlayer = function(id) {
		for (var i = 0; i < this.Players.length; i++) {
			if(this.Players[i].id === id){
				return this.Players[i];
			}
		};
		return undefined;
	};
	this.nElem = function(currEl) {
		if(currEl+1 >= this.Players.length){
			return 0;
		}
		else{
			return currEl + 1;
		}
	};
	this.pElem = function(currEl) {
		if(currEl-1 < 0){
			return this.Players.length - 1;
		}
		else{
			return currEl - 1;
		}
	};
	this.Next = function() {
		var res = this.nElem(this.currPlayer);
		while(this.Players[res].win){
			res = this.nElem(res);
		}
		return res;
	};
	this.Prev = function() {
		var res = this.pElem(this.currPlayer);
		//console.log("this.Players[res].win " + (this.Players[res].win === false).toString());
		while(this.Players[res].win){
			res = this.pElem(res);
		}
		return res;
	};
	this.CheckCards = function(cardType, card) {
		return cardType === card.value; 
	};
	this.ChangeOwner = function(newOwner, cards) {
		for (var i = 0; i < cards.length; i++) {
			cards[i].owner = newOwner;
		};
	};
	this.checkEnd = function() {
		var n = 0;
		var loosePl = undefined;
		for (var i = 0; i < this.Players.length; i++) {
			if(this.Players[i].cards.length > 0){
				n++;
				loosePl = this.Players[i];
			}
		};
		if(n === 1){
			this.looser = loosePl;
			return true;
		}  
		else{
			return false;
		}
	};

	function GetIndex(arr, val) {
		var res = -1;
		for (var i = 0; i < arr.length; i++) {
			//if(JSON.stringify(arr[i]) === JSON.stringify(val))
			if(arr[i].owner === val.owner && 
				arr[i].suit === val.suit && 
				arr[i].value === val.value){
				return i;
			}
		};
		return res;
	};
	// turns
	this.Believe = function(cards) {
		//console.log(cards);
		var pl = this.Players[this.currPlayer];
		for (var i = 0; i < cards.length; i++) {
			var n = GetIndex(pl.cards, cards[i]);
			if(n === -1){
				return "You have no such card - " + JSON.stringify(cards[i]) + "!";	
			}
		};
		for (var i = 0; i < cards.length; i++) {
			var n = GetIndex(pl.cards, cards[i]);
			if(n !== -1){
				pl.cards.splice(n,1);	
			}
		};
		//console.log("cards = " + pl.cards);
		this.cardsOnBoard = this.cardsOnBoard.concat(this.canCheckCards);
		this.canCheckCards = cards;
		return "ok";
	};
	this.Check = function(cardNum) {
		//console.log(cardNum);
		if(this.canCheckCards.length === 0) return undefined;
		var pl = this.Players[this.currPlayer];
		var prevPl = this.Players[this.Prev()];
		var resPlayer = {};
		if(!this.CheckCards(this.currCard, this.canCheckCards[cardNum])){
			this.ChangeOwner(prevPl.num, this.canCheckCards);
			this.ChangeOwner(prevPl.num, this.cardsOnBoard);
			prevPl.cards = prevPl.cards.concat(this.canCheckCards);
			prevPl.cards = prevPl.cards.concat(this.cardsOnBoard);
			resPlayer = prevPl;
		}
		else{
			this.ChangeOwner(pl.num, this.canCheckCards);
			this.ChangeOwner(pl.num, this.cardsOnBoard);
			pl.cards = pl.cards.concat(this.canCheckCards);
			pl.cards = pl.cards.concat(this.cardsOnBoard);
			resPlayer = pl;
		}
		this.canCheckCards = [];
		this.cardsOnBoard = [];
		//console.log(resPlayer);
		return resPlayer;
	};
	this.FirstTurn = function(cards, cardName) {
		//console.log(cards + " " + cardName);
		var pl = this.Players[this.currPlayer];
		for (var i = 0; i < cards.length; i++) {
			var n = GetIndex(pl.cards, cards[i])
			if(n === -1){
				return "You have no such card - " + JSON.stringify(cards[i]) + "!";
			}
		};
		var ind = vals.indexOf(cardName);
		if(ind === -1 || ind === vals.length - 1){
			return "You can't say this card value " + cardName + "!";
		}
		for (var i = 0; i < cards.length; i++) {
			var n = GetIndex(pl.cards, cards[i]);
			if(n !== -1){
				pl.cards.splice(n,1);	
			}
		};
		this.canCheckCards = this.canCheckCards.concat(cards);
		this.currCard = cardName;
		//console.log(pl);
		//console.log(this.canCheckCards);
		return "ok";
	};
};

module.exports = {gc: GameController, card : Card};

