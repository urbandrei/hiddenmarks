const { shuffle, assignCardObfuscationIds, assignMarkObfuscationIds, getObfuscationRanges, addMemory, addMemoryAll, getPlayerView } = require('../../../src/game/obfuscation');
const { buildDeck, buildMarks } = require('../../../src/game/cardUtils');

describe('obfuscation', () => {
  describe('shuffle', () => {
    it('should return an array of the same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffle([...arr]);
      expect(result).toHaveLength(5);
    });

    it('should contain the same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffle([...arr]);
      expect(result.sort()).toEqual(arr.sort());
    });

    it('should modify the array in place', () => {
      const arr = [1, 2, 3, 4, 5];
      const same = shuffle(arr);
      expect(same).toBe(arr);
    });

    it('should produce different orderings (statistical, may rarely fail)', () => {
      const original = Array.from({ length: 20 }, (_, i) => i);
      let differentCount = 0;
      for (let trial = 0; trial < 10; trial++) {
        const copy = [...original];
        shuffle(copy);
        if (JSON.stringify(copy) !== JSON.stringify(original)) {
          differentCount++;
        }
      }
      expect(differentCount).toBeGreaterThan(0);
    });
  });

  describe('assignCardObfuscationIds', () => {
    let deck, result;

    beforeEach(() => {
      deck = buildDeck();
      result = assignCardObfuscationIds(deck);
    });

    it('should return cardMap and obfIdOrder', () => {
      expect(result).toHaveProperty('cardMap');
      expect(result).toHaveProperty('obfIdOrder');
    });

    it('cardMap should have entry for every card in deck', () => {
      expect(Object.keys(result.cardMap)).toHaveLength(deck.length);
    });

    it('obfIdOrder should have same length as deck', () => {
      expect(result.obfIdOrder).toHaveLength(deck.length);
    });

    it('all obfuscation IDs should be unique', () => {
      const ids = new Set(result.obfIdOrder);
      expect(ids.size).toBe(deck.length);
    });

    it('IDs should be in exact-count ranges by color', () => {
      const whiteCount = deck.filter(c => c.back === 56).length;
      const blueCount = deck.filter(c => c.back === 55).length;
      const redCount = deck.filter(c => c.back === 54).length;

      for (const [obfId, card] of Object.entries(result.cardMap)) {
        const id = Number(obfId);
        if (card.backColor === 'white') {
          expect(id).toBeGreaterThanOrEqual(1);
          expect(id).toBeLessThanOrEqual(whiteCount);
        } else if (card.backColor === 'blue') {
          expect(id).toBeGreaterThanOrEqual(whiteCount + 1);
          expect(id).toBeLessThanOrEqual(whiteCount + blueCount);
        } else if (card.backColor === 'red') {
          expect(id).toBeGreaterThanOrEqual(whiteCount + blueCount + 1);
          expect(id).toBeLessThanOrEqual(whiteCount + blueCount + redCount);
        }
      }
    });

    it('every cardMap entry should have name, back, backColor, and cost', () => {
      for (const card of Object.values(result.cardMap)) {
        expect(card).toHaveProperty('name');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('backColor');
        expect(card).toHaveProperty('cost');
        expect(['white', 'blue', 'red']).toContain(card.backColor);
      }
    });

    it('obfuscation IDs should be randomized (statistical)', () => {
      // Run twice, should get different ID assignments
      const result2 = assignCardObfuscationIds(buildDeck());
      // Compare first 10 entries — at least some should differ
      let differences = 0;
      for (let i = 0; i < 10; i++) {
        if (result.obfIdOrder[i] !== result2.obfIdOrder[i]) {
          differences++;
        }
      }
      // With 22+ cards per color pool, extremely unlikely all 10 match
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('assignMarkObfuscationIds', () => {
    let marks, result;

    beforeEach(() => {
      marks = buildMarks();
      result = assignMarkObfuscationIds(marks);
    });

    it('should return markMap and markObfIds', () => {
      expect(result).toHaveProperty('markMap');
      expect(result).toHaveProperty('markObfIds');
    });

    it('markMap should have 5 entries', () => {
      expect(Object.keys(result.markMap)).toHaveLength(5);
    });

    it('markObfIds should have 5 entries', () => {
      expect(result.markObfIds).toHaveLength(5);
    });

    it('mark IDs should be M1 through M5', () => {
      const ids = new Set(result.markObfIds);
      expect(ids).toEqual(new Set(['M1', 'M2', 'M3', 'M4', 'M5']));
    });

    it('every markMap entry should have suit and name', () => {
      for (const mark of Object.values(result.markMap)) {
        expect(mark).toHaveProperty('suit');
        expect(mark).toHaveProperty('name');
      }
    });

    it('all 5 suits should be represented', () => {
      const suits = new Set(Object.values(result.markMap).map(m => m.suit));
      expect(suits.size).toBe(5);
    });
  });

  describe('getObfuscationRanges', () => {
    it('should return correct ranges', () => {
      const deck = buildDeck();
      const { cardMap } = assignCardObfuscationIds(deck);
      const ranges = getObfuscationRanges(cardMap);

      const whiteCount = deck.filter(c => c.back === 56).length;
      const blueCount = deck.filter(c => c.back === 55).length;

      expect(ranges.white.min).toBe(1);
      expect(ranges.white.max).toBe(whiteCount);
      expect(ranges.blue.min).toBe(whiteCount + 1);
      expect(ranges.blue.max).toBe(whiteCount + blueCount);
      expect(ranges.red.min).toBe(whiteCount + blueCount + 1);
      expect(ranges.red.max).toBe(deck.length);
    });
  });

  describe('addMemory', () => {
    it('should add card identity to player memory', () => {
      const playerMemory = { 1: {}, 2: {} };
      const cardMap = { 5: { name: 'greed', back: 56, backColor: 'white', cost: 0 } };
      const markMap = {};

      addMemory(playerMemory, 1, 5, cardMap, markMap);

      expect(playerMemory[1]['5']).toEqual({ name: 'greed', back: 'white', cost: 0 });
    });

    it('should add mark identity to player memory', () => {
      const playerMemory = { 1: {} };
      const cardMap = {};
      const markMap = { 'M1': { suit: 'hearts', name: 'hearts mark' } };

      addMemory(playerMemory, 1, 'M1', cardMap, markMap);

      expect(playerMemory[1]['M1']).toEqual({ suit: 'hearts', name: 'hearts mark' });
    });

    it('should not overwrite existing memory', () => {
      const playerMemory = { 1: { '5': { name: 'greed', back: 'white', cost: 0 } } };
      const cardMap = { 5: { name: 'WRONG', back: 56, backColor: 'white', cost: 99 } };

      addMemory(playerMemory, 1, 5, cardMap, {});

      expect(playerMemory[1]['5'].name).toBe('greed');
    });

    it('should create player memory object if it does not exist', () => {
      const playerMemory = {};
      const cardMap = { 5: { name: 'greed', back: 56, backColor: 'white', cost: 0 } };

      addMemory(playerMemory, 3, 5, cardMap, {});

      expect(playerMemory[3]).toBeDefined();
      expect(playerMemory[3]['5']).toBeDefined();
    });

    it('should not add memory for unknown card', () => {
      const playerMemory = { 1: {} };
      addMemory(playerMemory, 1, 999, {}, {});
      expect(Object.keys(playerMemory[1])).toHaveLength(0);
    });
  });

  describe('addMemoryAll', () => {
    it('should add memory to all alive players', () => {
      const playerMemory = { 1: {}, 2: {}, 3: {}, 4: {} };
      const playerAlive = { 1: true, 2: true, 3: false, 4: true };
      const cardMap = { 5: { name: 'greed', back: 56, backColor: 'white', cost: 0 } };

      addMemoryAll(playerMemory, playerAlive, 5, cardMap, {});

      expect(playerMemory[1]['5']).toBeDefined();
      expect(playerMemory[2]['5']).toBeDefined();
      expect(playerMemory[3]['5']).toBeUndefined();
      expect(playerMemory[4]['5']).toBeDefined();
    });
  });

  describe('getPlayerView', () => {
    let state;

    beforeEach(() => {
      state = {
        zones: { 'p1-hand': [1, 2], 'p2-hand': [3, 4] },
        playerMemory: {
          1: { '1': { name: 'greed', back: 'white', cost: 0 } },
          2: { '3': { name: 'snub', back: 'blue', cost: 5 } },
        },
        turn: { currentPlayerNum: 1, actionsRemaining: 3, gameStarted: true },
        playerAlive: { 1: true, 2: true, 3: true, 4: true },
        bountyState: {},
        reactionState: null,
        currentTurnNumber: 1,
        cardMap: { 1: { backColor: 'white' }, 2: { backColor: 'white' }, 3: { backColor: 'blue' }, 4: { backColor: 'blue' } },
      };
    });

    it('should return board zones for any player', () => {
      const view = getPlayerView(state, 1);
      expect(view.board).toBe(state.zones);
    });

    it('should return only the requesting player\'s memory', () => {
      const view1 = getPlayerView(state, 1);
      expect(view1.memory).toEqual(state.playerMemory[1]);

      const view2 = getPlayerView(state, 2);
      expect(view2.memory).toEqual(state.playerMemory[2]);
    });

    it('should NEVER include cardMap in the view', () => {
      const view = getPlayerView(state, 1);
      expect(view).not.toHaveProperty('cardMap');
    });

    it('should NEVER include markMap in the view', () => {
      state.markMap = { 'M1': { suit: 'hearts' } };
      const view = getPlayerView(state, 1);
      expect(view).not.toHaveProperty('markMap');
    });

    it('should NEVER include other players\' memory', () => {
      const view = getPlayerView(state, 1);
      expect(view.memory).not.toHaveProperty('3'); // P2's known card
    });

    it('should include turn, playerAlive, bountyState, currentTurnNumber', () => {
      const view = getPlayerView(state, 1);
      expect(view.turn).toBeDefined();
      expect(view.playerAlive).toBeDefined();
      expect(view.bountyState).toBeDefined();
      expect(view.currentTurnNumber).toBe(1);
    });

    it('should include obfuscation ranges', () => {
      const view = getPlayerView(state, 1);
      expect(view).toHaveProperty('obfuscationRanges');
    });
  });
});
