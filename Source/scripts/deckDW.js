
/*
 DeckDW - deck data wrapper. To deal with JSON representation of cards
 Parameters:
     fieldSelector - CSS selector of html container which will hold all cards of this deck
     updateType - animation type. String. Possible values: horizontal, vertical, radial
     updateTime - time needed to perform update of the deck
     deadTime - time needed to perform removing animation
     popTime - time needed to perform pop animation
 */

function createDeckDW(fieldSelector, updateType, timings) {
    var t = timings;
    var deck = new Deck(fieldSelector, updateType, t.updateTime, t.deadTime , t.popTime);
    return new DeckDW(deck);
}
 
function DeckDW(deck) {
    
    function createMarkup(card, shirt) {
        if (!shirt) {
            throw new Error("No shirt given. Card must have shirt");
        }
        
        var color = (card.suit && (card.suit === "♦" || card.suit === "♥")) ? "red" : "";
        var value = card.value || "";
        var suit = card.suit || "";
        var markup = "<div   class='card" + " " + shirt + " " + color + "' " +
                            "value='" + value + "' " +
                            "suit='" + suit + "'>\n" +
                        "<p>" + suit + "</p>\n" +
                     "</div>\n";
        return markup;
    };
    
    function extractKey($card) {
        var card = DeckDW.extract($card);
        return getKey(card);
    }
    
    function getKey(card) {
        return card.value + card.suit;
    }
    
    function $cardsEnumerator() {
        return Enumerable.From(deck.$cards).Select(function(el) { return $(el); });
    }
    
    function addIdentic$Cards(cardMarkup, count){
        Enumerable
        .Generate(function() { return $(cardMarkup); }, count)
        .ForEach(function($card) { deck.add$Card($card); });          
    }
    
    function setOther(currentCount, shirt, cardValue) {     
        function $cardsWithGivenShirt() {
            return $cardsEnumerator().Where(function($card) {
                    return $card.hasClass(shirt);
                } );
        }
        function increase(count) {
            var markup = createMarkup({ value: cardValue }, shirt);
            addIdentic$Cards(markup, count);           
        }
        function decrease(count) {
            //we gonna remove cards, so we use ToArray to save enumeration order
            var garbage = $cardsWithGivenShirt().Take(count).ToArray();
            Enumerable
            .From(garbage)
            .ForEach(function($card) { deck.remove$Card($card); });
        }
        
        var diff = currentCount - $cardsWithGivenShirt().Count();
        if (diff === 0) {
            return;
        }
        if (diff > 0) {
            increase(diff);
        } else {
            decrease(Math.abs(diff));
        }
    }

    function setOpen(currentCards) {
        function removeObsolete(prev, cur) {
            var to$Card = $cardsEnumerator().Select().ToDictionary(extractKey, "$");
            var obsoleteCards = Enumerable.From(prev).Except(cur, getKey);
            var discard =  function(card) {
                var key = getKey(card);
                var $card = to$Card.Get(key);
                deck.remove$Card($card);
            };
            obsoleteCards.ForEach(discard);
        }     
        function addNew(prev, cur) {
            var newCards = Enumerable.From(cur).Except(prev, getKey);
            var attach = function(card) { deck.addCard(card, "open"); };
            newCards.ForEach(attach);            
        }
        
        var previousCards = deck.getCards();
        removeObsolete(previousCards, currentCards);
        addNew(previousCards, currentCards);
    }
    
    function setPile(currentCards, ownerToShirt) {
        var alive = {};
        var exs = DeckDW.extractShirt;
        
        Enumerable
        .From(currentCards)
        .GroupBy("$.owner")
        .ForEach(function(group) {
            var shirt = ownerToShirt(group.Key());
            var roundCardValue = group.First().value;
            alive[shirt] = true;
            setOther(group.Count(), shirt, roundCardValue);    
        });
            
        $cardsEnumerator()
        .Where(function($card) { return alive[exs($card)] === undefined;})
        .ForEach(function($card) { deck.remove$Card($card); });
    }
    
    function chooseOpenOrOtherSet(cards, shirt){
        if (shirt === "open") {
            setOpen(cards);
        } else {
            var roundCardValue = (cards.length > 0) ? cards[0].value : undefined;
            setOther(cards.length, shirt, roundCardValue);
        }
    }
    
    deck.set = function() {
        var args = arguments;
        var signature = Enumerable
            .From(args)
            .Select(function(arg) { return jQuery.type(arg); });
            
        var updateTime;
        var lastArg = args[args.length - 1];
        if (jQuery.type(lastArg) === "number") {
            updateTime = lastArg;
            signature = signature.Take(args.length - 1);
        }
        
        signature = signature.ToString(", ");
        
        switch (signature) {
            case "array, string":
                chooseOpenOrOtherSet(args[0], args[1]);
                break;
            case "array, function":
                setPile(args[0], args[1]);
                break;
            case "number, string":
                setOther(args[0], args[1]);
                break;
            case "number, string, string":
                setOther(args[0], args[1], args[2]);
                break;
            default:
                throw new Error("Unknown signature: " + signature);
        }
        
        if (updateTime) {
            deck.update(updateTime);
        } else {
            deck.update();
        }
    };
    
    deck.to = function(otherDeck, cardArg, cardValue) {
        var $card = (cardArg.jquery) ? cardArg : $(deck.$cards.get(cardArg));
        var index = (cardArg.jquery) ? deck.$cards.index($card) : cardArg;
        var shirt = DeckDW.extractShirt($card);
        var card = DeckDW.extract($card);
        card.value = (cardValue) ? cardValue : card.value;
        
        deck.remove$Card($card);
        deck.update();
        otherDeck.addCard(card, shirt);
        otherDeck.update();
        
        return index;
    };

    deck.getCards = function(owner) {
        function cardWithOwner($card) {
            var card = DeckDW.extract($card);
            if (typeof owner !== 'undefined') {
                card.owner = owner;
            }
            return card;
        }
        return $cardsEnumerator().Select(cardWithOwner).ToArray();
    };
    
    deck.addCard = function(card, shirt) {
        var cardMarkup = createMarkup(card, shirt);
        var $card = $(cardMarkup);
        deck.add$Card($card);
    };
    
    deck.replaceCard = function(cardIndex, card, shirt) {
        var $card = $(createMarkup(card, shirt));
        deck.replace$Card(cardIndex, $card);
    };
    
    deck.removeCard = function(index) {
        var $card = $(deck.$cards.get(index));
        deck.remove$Card($card);
    };
    
    deck.isEmpty = function() {
        return deck.$cards.length === 0;
    };
    
    deck.count = function() {
        return deck.$cards.length;
    };

    return deck;
}

/*
 Extract JSON data from jQuery object
 Parameters:
    $card - jQuery object
 Return:
    JSON data object {owner, suit, value} without owner
 */
DeckDW.extract = function($card) {
    return { value: $card.attr('value'), suit: $card.attr('suit') };
};

DeckDW.extractShirt = function($card) {
    if ($card.hasClass("open")) {
        return "open";
    }
    var found = $card.attr("class").match(/(shirt\d)/);
    return (found) ? found[0] : "";
};







