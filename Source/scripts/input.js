function Input(io, clientId, ownerToShirt, decks) {
    var REVEAL_DELAY = 2000;    
    var ALL_ROUND_CARDS = [
         { value: "6" }
        ,{ value: "7" }
        ,{ value: "8" }
        ,{ value: "9" }
        ,{ value: "10" }
        ,{ value: "J" }
        ,{ value: "Q" }
        ,{ value: "K" } 
    ];
    
    var self = this;
    var innerState = "none";
    var $goButton = $(".go-button");
    var clientShirt = ownerToShirt(clientId);
    var main = decks("main");
    var bottom = decks(clientId);
    
    function disableGoButton() {
        self.goClick = function() {}; 
        $goButton.removeClass("available", 600, "easeOutSine" );
                   
    }
    function enableGoButton(handler) {
        self.goClick = function() {
            //press animation
            $goButton
            .transition({ y: 5, borderBottomWidth: 1, duration: 300 })
        	.transition({ y: 0, borderBottomWidth: 4, duration: 300 });
        	
            handler();
        };
        $goButton.addClass("available", 600, "easeOutSine" );
    }    
    
    function popClient($card, key, up) {
        var deck = decks(key);
        var message = (up) ? "hoverUp" : "hoverDown";
        deck.pop($card, up);
        io.emit(message, key, deck.$cards.index($card));
    }
    
    function popOthers(key, cardIndex, up) {
        var deck = decks(key);
        var $card = $(deck.$cards[cardIndex]);
        deck.pop($card, up);
    }
    
    function minimumHandlers() {
        disableGoButton();
        
        self.goClick = function() { };       
        self.bottomClick = function(el_card) { };
        self.mainClick = function(el_card) { };
        self.mainEnter = function(el_card) { };
        self.mainLeave = function(el_card) { };
        
        self.bottomEnter = function(el_card) {
            popClient($(el_card), "bottom", true);
        };
        self.bottomLeave = function(el_card) {
            popClient($(el_card), "bottom", false);
        };   
        self.otherEnter = function(deckKey, cardIndex) {
            popOthers(deckKey, cardIndex, true);
        };
        self.otherLeave = function(deckKey, cardIndex) {
            popOthers(deckKey, cardIndex, false);
        };
        self.otherToMain = function(cardIndex, roundCardValue) {
            bottom.to(main, cardIndex, roundCardValue);
        };
        self.otherFromMain = function(cardIndex) {
            main.to(bottom, cardIndex, "");
        };
    }  
    
    function defaultHandlers() {     
        minimumHandlers();
        
        self.mainEnter = function(el_card) {
            popClient($(el_card), "main", true);
        };
        self.mainLeave = function(el_card) { 
            popClient($(el_card), "main", false);
        };
    }
    
    function defaultState() {   
        main.removeAll();
        defaultHandlers();
    }
    
    function cleanState() {
        main.removeAll();
        minimumHandlers();
    }
    
    function addingState(nextState) {   
        defaultState();
        innerState = "addingState";
        
        function goOn() {
            var cards = main.getCards();
            defaultState();
            nextState(cards);
        }
        function updateGoButton() {
            if (main.isEmpty()) {
                disableGoButton();
            } else {
                enableGoButton(goOn);
            }
        }    
        self.bottomClick = function(el_card) {
            var index = bottom.to(main, $(el_card));
            updateGoButton();
            io.emit("setCard", index);
        };
        self.mainClick = function(el_card) {
            var index = main.to(bottom, $(el_card));
            updateGoButton();
            io.emit("removeCard", index);
        };
    }
    
    function choosingRoundCardState(chosenCards) {
        defaultState();
        innerState = "choosingRoundCardState";
        main.set(ALL_ROUND_CARDS, "open");
        
        self.mainClick = function(el_card) {
            var roundCardValue = DeckDW.extractData($(el_card)).value;
            defaultState();
            io.emit("firstTurn", JSON.stringify(chosenCards), roundCardValue);            
        };
    }
    
    function checkingState(cards) {
        defaultState();
        innerState = "checkingState";
        main.set(cards, clientShirt);
        enableGoButton(believe);
        
        function believe() {
            defaultState();
            io.emit("some event to add state");
        };
        self.mainClick = function(el_card) {
            var checkedCardIndex = main.$cards.index(el_card);
            minimumHandlers();
            io.emit("check", checkedCardIndex);
        };   
    }
    
    function watchingState(mainCards, currentPlayerId) {
        cleanState(); 
        innerState = "watchingState";
        main.set(mainCards, ownerToShirt(currentPlayerId));
    }
    
    function revealState(revealCards, checkedIndex) {
        innerState = "revealState";
        minimumHandlers();
        main.replaceCard(checkedIndex, revealCards[checkedIndex], "open");
        main.update();
        setTimeout(function() {
            for (var i = 0; i < revealCards.length; i++) {
                if (i == checkedIndex) { continue; }
                main.replaceCard(i, revealCards[i], "open");
            }
            main.update();
        }, REVEAL_DELAY);
    }
    
    this.update = function(mainCards, hasPileCards, currentPlayerId, checkedIndex) {
        if (checkedIndex) {
            revealState(mainCards, checkedIndex);
            return;
        }
        if (currentPlayerId !== clientId) {
            watchingState(mainCards, currentPlayerId);
            return;
        }
        //out turn!
        if (mainCards.length > 0) {
            checkingState(mainCards);
            return;
        }
        //one of addingState
        if (hasPileCards) {
            addingState(function(chosenCards) {
                io.emit("believe", JSON.stringify(chosenCards));
            });
        } else {
            addingState(choosingRoundCardState);
        }
    };
    
    this.getState = function() {
        return innerState;
    };
    
    return self;
}
