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

function createDecks() {    
    var timings = { updateTime: 700, deadTime: 1200, popTime: 400};
    
    var bottom = createDeckDW('.player-bottom', 'horizontal', timings );
	var top = createDeckDW('.player-top', 'horizontal', timings );
	var left = createDeckDW('.player-left', 'radial', timings );
	var right = createDeckDW('.player-right', 'radial', timings );
	var playerDecks = [bottom, left, top, right];
	
	var main = createDeckDW('.main-field', 'horizontal', timings );
	var pile = createDeckDW('.pile', 'vertical', timings );
		
	var deckByKey = function(key) {
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
	return deckByKey;
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
    var decks = createDecks();
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
            assert.deepEqual(io.emitted, ["hoverUp", "bottom", i]);
            input.bottomLeave(el_card);
            assert.deepEqual(io.emitted, ["hoverDown", "bottom", i]);
        }        
    });

}

function testMainHover(assert, sample) {
    testCase(sample, function(io, decks, input) {
        var main = decks("main");
        for (var i = 0; i < main.$cards.length; i++) {
            var el_card = main.$cards[i];
            input.mainEnter(el_card);
            assert.deepEqual(io.emitted, ["hoverUp", "main", i]);
            input.mainLeave(el_card);
            assert.deepEqual(io.emitted, ["hoverDown", "main", i]);
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
        assert.deepEqual(decks("main").getCards(), sample.mainCards);
    });
});

QUnit.test("Input watching state render without round card value", function(assert) {
    var sample = getWatchingStateSample();
    testCase(sample, function(io, decks, input) {
        assert.deepEqual(decks("main").getCards(), sample.mainCards);
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
        assert.deepEqual(decks("main").getCards(), sample.mainCards);
    });
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
    var sample = getAddingStateSample();
    testCase(sample, function(io, decks, input) {
        assert.equal(input.getState(), sample.state, sample.state);
    });
    //sdfasdfdas
});

