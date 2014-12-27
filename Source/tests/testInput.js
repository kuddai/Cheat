var CLINET_ID = 0;

function getWatchingStateSample(roundCardValue) {
    return {
        mainCards: [
            {value: roundCardValue || "", suit: ""},
            {value: roundCardValue || "", suit: ""}
        ],
        hasPileCards: false,
        currentPlayerId: CLINET_ID + 1,
        state: "watchingState"
    };
}

function getCheckingStateSample() {
    return {
        mainCards: [
            {value: "K", suit: ""},
            {value: "K", suit: ""}
        ],
        hasPileCards: false,
        currentPlayerId: CLINET_ID,
        state: "checkingState"
    };
}

function getAddingStateSample(hasPileCards) {
    return {
        mainCards: [],
        hasPileCards: hasPileCards,
        currentPlayerId: CLINET_ID,
        state: "addingState"
    };
}

function getRevealStateSample() {
    return {
        mainCards: [{value: "7", suit: "♦"}, {value: "10", suit: "♦"}],
        hasPileCards: true,
        currentPlayerId: CLINET_ID,
        checkedIndex: 0,
        state: "revealState"
    };
}

function testChoosingRoundCard(test) {
    var sample = getAddingStateSample(false);
    testCase(sample, function(io, decks, input) {
        var card = decks("bottom").getCards()[0];
        input.bottomClick(decks("bottom").$cards[0]);
        input.goClick();
        
        test(io, decks, input, card);
    });
}

function createIoMock() {
    return {
        emitted: [],
        reset: function() {
            this.emitted = [];
        },
        emit: function() {
            this.emitted = Array.prototype.slice.call(arguments);
        } 
    };
}

function createInput(io_mock, decks) {
    function ownerToShirt(id) {
        return "shirt" + id + 1;//+1 due to array numeration
    }
	return new Input(io_mock, CLINET_ID, ownerToShirt, decks);
}

function testCase(sample, test) {
    var io = createIoMock();
    var decks = createDecks(CLINET_ID);
    var input = createInput(io, decks);
    
    decks("bottom").set([
        {value: "K", suit: "♦"},
        {value: "8", suit: "♦"}
    ], "open");
    
    input.update(
        sample.mainCards, 
        sample.hasPileCards, 
        sample.currentPlayerId,
        sample.checkedIndex
    );    
    
    test(io, decks, input);
}

function testBottomHover(assert, sample) {
    testCase(sample, function(io, decks, input) {
        var bottom = decks("bottom");
        for (var i = 0; i < bottom.$cards.length; i++) {
            var el_card = bottom.$cards[i];
            input.bottomEnter(el_card);
            assert.deepEqual(io.emitted, ["hoverUp", "bottom", i], sample.state);
            input.bottomLeave(el_card);
            assert.deepEqual(io.emitted, ["hoverDown", "bottom", i], sample.state);
        }        
    });

}

function testMainHover(assert, sample) {
    testCase(sample, function(io, decks, input) {
        var main = decks("main");
        for (var i = 0; i < main.$cards.length; i++) {
            var el_card = main.$cards[i];
            input.mainEnter(el_card);
            assert.deepEqual(io.emitted, ["hoverUp", "main", i], sample.state);
            input.mainLeave(el_card);
            assert.deepEqual(io.emitted, ["hoverDown", "main", i], sample.state);
        }
    });
}

function testEmptyHandlers(assert, sample, handlersNames) {
    testCase(sample, function(io, decks, input) {
        for (var i = 0; i < handlersNames.length; i++) {
            var name = handlersNames[i];
            input[name]("nothing");
            assert.deepEqual(io.emitted, []);
        }
    });
}

QUnit.test("Input watching state sample correctness", function(assert) {
    var sample = getWatchingStateSample();
    testCase(sample, function(io, decks, input) {
        assert.equal(input.getState(), sample.state, sample.state);
    });
});

QUnit.test("Input watching state render with round card value", function(assert) {
    var sample = getWatchingStateSample("Q");
    testCase(sample, function(io, decks, input) {
        assert.deepEqual(decks("main").getCards(), sample.mainCards, sample.state);
    });
});

QUnit.test("Input watching state render without round card value", function(assert) {
    var sample = getWatchingStateSample();
    testCase(sample, function(io, decks, input) {
        assert.deepEqual(decks("main").getCards(), sample.mainCards, sample.state);
    });
});

QUnit.test("Input watching state empty handlers", function(assert) {
    var sample = getWatchingStateSample();
    var handlersNames = [
        "goClick", "bottomClick", "mainClick", "mainEnter", "mainLeave"
    ];
    testEmptyHandlers(assert, sample, handlersNames);
});

QUnit.test("Input watching state hover handlers", function(assert) {
    var sample = getWatchingStateSample();
    testBottomHover(assert, sample);
});

QUnit.test("Input checking state sample correctness", function(assert) {
    var sample = getCheckingStateSample();
    testCase(sample, function(io, decks, input) {
        assert.equal(input.getState(), sample.state, sample.state);
    });
});

QUnit.test("Input checking state render", function(assert) {
    var sample = getCheckingStateSample();
    testCase(sample, function(io, decks, input) {
        assert.deepEqual(decks("main").getCards(), sample.mainCards, sample.state);
    });
});

QUnit.test("Input checking state hover handlers", function(assert) {
    var sample = getCheckingStateSample();
    testBottomHover(assert, sample);
    testMainHover(assert, sample);
});

QUnit.test("Input checking state empty handlers", function(assert) {
    var sample = getCheckingStateSample();
    testEmptyHandlers(assert, sample, [ "bottomClick" ]);   
});

QUnit.test("Input checking state main click", function(assert) {
    var sample = getCheckingStateSample();
    testCase(sample, function(io, decks, input) {
        var el_card = decks("main").$cards[0];
        input.mainClick(el_card);
        assert.deepEqual(io.emitted, ["check", 0]);;
    });    
});

QUnit.test("Input checking state go click", function(assert) {
    var sample = getCheckingStateSample();
    testCase(sample, function(io, decks, input) {
        input.goClick();
        assert.deepEqual(io.emitted, ["some event to add state"]);;
    });    
});

QUnit.test("Input adding state sample correctness", function(assert) {
    var sample = getAddingStateSample(false);
    testCase(sample, function(io, decks, input) {
        assert.equal(input.getState(), sample.state, sample.state);
    });
});

QUnit.test("Input adding state render without round card", function(assert) {
    var sample = getAddingStateSample(false);
    testCase(sample, function(io, decks, input) {
        assert.deepEqual(decks("main").getCards(), sample.mainCards, sample.state);
    });
});

QUnit.test("Input adding state render with round card", function(assert) {
    var sample = getAddingStateSample(true);
    testCase(sample, function(io, decks, input) {
        assert.deepEqual(decks("main").getCards(), sample.mainCards, sample.state);
    });
});

QUnit.test("Input adding state bottom hover", function(assert) {
    var sample = getAddingStateSample();
    testBottomHover(assert, sample);
});

QUnit.test("Input adding state add, main hover, and remove card", function(assert) {
    var sample = getAddingStateSample(true);
    testCase(sample, function(io, decks, input) {
        var bottom = decks("bottom"), main = decks("main");
        var initialCardsCount = bottom.$cards.length;
        var card = bottom.getCards()[0];
        //add card
        input.bottomClick(bottom.$cards[0]);
        assert.equal(bottom.$cards.length, initialCardsCount - 1);
        assert.equal(main.$cards.length, 1);
        assert.deepEqual(io.emitted, ["setCard", 0, 0]);
        assert.deepEqual(main.getCards()[0], card);
        //hover main
        var el_card = main.$cards[0];
        input.mainEnter(el_card);
        assert.deepEqual(io.emitted, ["hoverUp", "main", 0], "mainEnter");
        input.mainLeave(el_card);
        assert.deepEqual(io.emitted, ["hoverDown", "main", 0], "mainLeave");
        //remove card
        input.mainClick(main.$cards[0]);
        assert.equal(bottom.$cards.length, initialCardsCount);
        assert.equal(main.$cards.length, 0);
        assert.deepEqual(io.emitted, ["removeCard", 0, 0]);
        assert.deepEqual(bottom.getCards()[initialCardsCount - 1], card);
    });
});

QUnit.test("Input adding state go button click if there are no main cards", function(assert) {
    var sample = getAddingStateSample(true);
    testCase(sample, function(io, decks, input) {
        input.goClick();
        assert.deepEqual(io.emitted, []);
    });        
});

QUnit.test("Input adding state go button click if there are pile cards", function(assert) {
    var sample = getAddingStateSample(true);
    testCase(sample, function(io, decks, input) {
        var card = decks("bottom").getCards()[0];  
        input.bottomClick(decks("bottom").$cards[0]);
        input.goClick();
        assert.deepEqual(io.emitted, [ "believe", JSON.stringify([card]) ]);
    });
});

QUnit.test("Input adding state go button click if there are no pile cards", function(assert) {
    var sample = getAddingStateSample(false);
    testCase(sample, function(io, decks, input) {
        var card = decks("bottom").getCards()[0];  
        input.bottomClick(decks("bottom").$cards[0]);
        input.goClick();
        assert.equal(input.getState(), "choosingRoundCardState");
    });
});

QUnit.test("Input choosing round card state main click", function(assert) {
    testChoosingRoundCard(function(io, decks, input, card) {
        var roundCard = decks("main").getCards()[0];  
        input.mainClick(decks("main").$cards[0]);
        assert.deepEqual(io.emitted, [
            "firstTurn",  JSON.stringify([card]), roundCard.value
        ], input.getState());
    });
});

QUnit.test("Input reveal state", function(assert) {
    var io = createIoMock();
    var decks = createDecks(CLINET_ID);
    var input = createInput(io, decks);
    var sample = getRevealStateSample();
    
    decks("bottom").set([
        {value: "K", suit: "♦"},
        {value: "8", suit: "♦"}
    ], "open");
    
    decks("main").set([
        {value: "Q", suit: ""},
        {value: "Q", suit: ""}
    ], "shirt3");
    
    input.update(
        sample.mainCards, 
        sample.hasPileCards, 
        sample.currentPlayerId,
        sample.checkedIndex
    );   
    
    var done = assert.async();
    setTimeout(function() {
        assert.equal(input.getState(), "revealState");
        assert.deepEqual(io.emitted, ['hi']);
        assert.deepEqual(decks("main").getCards(), sample.mainCards);
        done();
    }, input.REVEAL_DELAY + 100);
});









