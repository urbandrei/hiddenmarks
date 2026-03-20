const { getCardCost, getCardValue, getCardBack, isLethalCard, isBountyCard, getCardDef, selectPayment, buildDeck, buildMarks } = require('../../../src/game/cardUtils');

describe('cardUtils', () => {
  describe('getCardCost', () => {
    it('should return correct costs for various cards', () => {
      expect(getCardCost('greed')).toBe(0);
      expect(getCardCost('alter ego')).toBe(2);
      expect(getCardCost('body swap')).toBe(3);
      expect(getCardCost('insomnia')).toBe(3);
      expect(getCardCost('upheaval')).toBe(5);
      expect(getCardCost('arson')).toBe(5);
      expect(getCardCost('snub')).toBe(5);
      expect(getCardCost('heavy hand')).toBe(10);
      expect(getCardCost('backfire')).toBe(10);
    });

    it('should return 0 for bounty cards', () => {
      expect(getCardCost('clubs bounty')).toBe(0);
      expect(getCardCost('hearts bounty')).toBe(0);
    });

    it('should return 0 for unknown cards', () => {
      expect(getCardCost('nonexistent')).toBe(0);
    });
  });

  describe('getCardValue', () => {
    it('should return 1 for white back cards', () => {
      expect(getCardValue('greed')).toBe(1);
      expect(getCardValue('body swap')).toBe(1);
      expect(getCardValue('insomnia')).toBe(1);
    });

    it('should return 2 for blue back cards', () => {
      expect(getCardValue('upheaval')).toBe(2);
      expect(getCardValue('snub')).toBe(2);
      expect(getCardValue('heavy hand')).toBe(2);
    });

    it('should return 3 for red back cards', () => {
      expect(getCardValue('backfire')).toBe(3);
      expect(getCardValue('bloodshot')).toBe(3);
      expect(getCardValue('clubs bounty')).toBe(3);
    });

    it('should return 0 for mark cards', () => {
      expect(getCardValue('hearts mark')).toBe(0);
    });

    it('should return 0 for unknown cards', () => {
      expect(getCardValue('nonexistent')).toBe(0);
    });
  });

  describe('getCardBack', () => {
    it('should return correct back color', () => {
      expect(getCardBack('greed')).toBe('white');
      expect(getCardBack('upheaval')).toBe('blue');
      expect(getCardBack('backfire')).toBe('red');
      expect(getCardBack('hearts mark')).toBe('mark');
    });

    it('should return null for unknown cards', () => {
      expect(getCardBack('nonexistent')).toBeNull();
    });
  });

  describe('isLethalCard', () => {
    it('should return true for kill cards', () => {
      expect(isLethalCard('heavy hand')).toBe(true);
      expect(isLethalCard('backfire')).toBe(true);
      expect(isLethalCard('bloodshot')).toBe(true);
      expect(isLethalCard('red handed')).toBe(true);
      expect(isLethalCard('counterfeit')).toBe(true);
      expect(isLethalCard('gold digger')).toBe(true);
    });

    it('should return false for non-kill cards', () => {
      expect(isLethalCard('greed')).toBe(false);
      expect(isLethalCard('snub')).toBe(false);
      expect(isLethalCard('clubs bounty')).toBe(false);
    });
  });

  describe('isBountyCard', () => {
    it('should return true for bounty cards', () => {
      expect(isBountyCard('clubs bounty')).toBe(true);
      expect(isBountyCard('hearts bounty')).toBe(true);
      expect(isBountyCard('spades bounty')).toBe(true);
      expect(isBountyCard('diamonds bounty')).toBe(true);
      expect(isBountyCard('jokers bounty')).toBe(true);
    });

    it('should return false for non-bounty cards', () => {
      expect(isBountyCard('greed')).toBe(false);
      expect(isBountyCard('heavy hand')).toBe(false);
    });
  });

  describe('getCardDef', () => {
    it('should return definition for valid cards', () => {
      const def = getCardDef('greed');
      expect(def).not.toBeNull();
      expect(def.name).toBe('greed');
      expect(def.back).toBe(56);
      expect(def.cost).toBe(0);
      expect(def.count).toBe(2);
    });

    it('should return null for unknown cards', () => {
      expect(getCardDef('nonexistent')).toBeNull();
    });
  });

  describe('selectPayment', () => {
    it('should return empty array when cost is 0', () => {
      expect(selectPayment([], 0)).toEqual([]);
      expect(selectPayment([{ obfId: 1, value: 3 }], 0)).toEqual([]);
    });

    it('should return null when bank cannot cover cost', () => {
      expect(selectPayment([], 5)).toBeNull();
      expect(selectPayment([{ obfId: 1, value: 1 }], 5)).toBeNull();
    });

    it('should select exact payment when possible', () => {
      const bank = [
        { obfId: 1, value: 3 },
        { obfId: 2, value: 2 },
        { obfId: 3, value: 1 },
      ];
      const payment = selectPayment(bank, 3);
      expect(payment).not.toBeNull();
      // Algorithm prefers exact match; prefers more cards at same total
      // {2,3}=3 exact (2 cards) beats {1}=3 exact (1 card)
      const total = payment.reduce((sum, id) => {
        const card = bank.find(b => b.obfId === id);
        return sum + card.value;
      }, 0);
      expect(total).toBe(3);
    });

    it('should prefer exact match over overpayment', () => {
      const bank = [
        { obfId: 1, value: 3 },
        { obfId: 2, value: 2 },
        { obfId: 3, value: 2 },
        { obfId: 4, value: 1 },
      ];
      const payment = selectPayment(bank, 3);
      expect(payment).not.toBeNull();
      const total = payment.reduce((sum, id) => {
        const card = bank.find(b => b.obfId === id);
        return sum + card.value;
      }, 0);
      expect(total).toBe(3); // exact match
    });

    it('should select minimum overpayment when no exact match', () => {
      const bank = [
        { obfId: 1, value: 3 },
        { obfId: 2, value: 3 },
      ];
      const payment = selectPayment(bank, 5);
      expect(payment).toEqual(expect.arrayContaining([1, 2]));
      expect(payment).toHaveLength(2);
    });

    it('should handle complex payment with multiple cards', () => {
      const bank = [
        { obfId: 1, value: 1 },
        { obfId: 2, value: 1 },
        { obfId: 3, value: 1 },
        { obfId: 4, value: 2 },
        { obfId: 5, value: 3 },
      ];
      const payment = selectPayment(bank, 5);
      expect(payment).not.toBeNull();
      const total = payment.reduce((sum, id) => {
        const card = bank.find(b => b.obfId === id);
        return sum + card.value;
      }, 0);
      expect(total).toBe(5); // exact match
    });
  });

  describe('buildDeck', () => {
    it('should create correct number of cards (no marks)', () => {
      const deck = buildDeck();
      // 22 white + 16 blue + 10 red = 48
      expect(deck).toHaveLength(48);
    });

    it('should not include mark cards', () => {
      const deck = buildDeck();
      const marks = deck.filter(c => c.name.includes('mark'));
      expect(marks).toHaveLength(0);
    });

    it('every card should have name, back, cost, and spriteIndex', () => {
      const deck = buildDeck();
      for (const card of deck) {
        expect(card).toHaveProperty('name');
        expect(card).toHaveProperty('back');
        expect(card).toHaveProperty('cost');
        expect(card).toHaveProperty('spriteIndex');
      }
    });

    it('should expand count correctly (e.g., 4 copies of trade off)', () => {
      const deck = buildDeck();
      const tradeOffs = deck.filter(c => c.name === 'trade off');
      expect(tradeOffs).toHaveLength(4);
    });

    it('should expand count correctly (e.g., 1 copy of bloodshot)', () => {
      const deck = buildDeck();
      const bloodshots = deck.filter(c => c.name === 'bloodshot');
      expect(bloodshots).toHaveLength(1);
    });
  });

  describe('buildMarks', () => {
    it('should create 5 marks', () => {
      const marks = buildMarks();
      expect(marks).toHaveLength(5);
    });

    it('every mark should have name and suit', () => {
      const marks = buildMarks();
      for (const mark of marks) {
        expect(mark).toHaveProperty('name');
        expect(mark).toHaveProperty('suit');
        expect(mark.name).toMatch(/mark$/);
      }
    });

    it('should have all 5 suits', () => {
      const marks = buildMarks();
      const suits = marks.map(m => m.suit);
      expect(suits).toContain('hearts');
      expect(suits).toContain('spades');
      expect(suits).toContain('clubs');
      expect(suits).toContain('diamonds');
      expect(suits).toContain('jokers');
    });
  });
});
