const { CARD_DEFS, BACK_VALUES, BACK_NAMES, LETHAL_CARDS, REACTIVE_CARDS, BOUNTY_CARDS, ZONES, getBountySuit, getMarkSuit } = require('../../../src/game/constants');

describe('constants', () => {
  describe('CARD_DEFS', () => {
    it('should have entries for all card types', () => {
      expect(CARD_DEFS.length).toBeGreaterThan(0);
    });

    it('every non-mark card should have name, back, count, and cost', () => {
      for (const def of CARD_DEFS) {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('back');
        expect(def).toHaveProperty('count');
        expect(typeof def.name).toBe('string');
        expect(typeof def.back).toBe('number');
        expect(def.count).toBeGreaterThan(0);
        if (def.back !== 57) {
          expect(typeof def.cost).toBe('number');
          expect(def.cost).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('mark cards should have back 57 and count 1', () => {
      const marks = CARD_DEFS.filter(d => d.back === 57);
      expect(marks).toHaveLength(5);
      for (const mark of marks) {
        expect(mark.count).toBe(1);
        expect(mark.name).toMatch(/mark$/);
      }
    });

    it('should have exactly 5 distinct mark suits', () => {
      const marks = CARD_DEFS.filter(d => d.back === 57);
      const suits = marks.map(m => m.name.replace(' mark', ''));
      const unique = new Set(suits);
      expect(unique.size).toBe(5);
      expect(unique).toContain('hearts');
      expect(unique).toContain('spades');
      expect(unique).toContain('clubs');
      expect(unique).toContain('diamonds');
      expect(unique).toContain('jokers');
    });

    it('all back values should be recognized', () => {
      const validBacks = [54, 55, 56, 57];
      for (const def of CARD_DEFS) {
        expect(validBacks).toContain(def.back);
      }
    });

    it('should have correct total card count when expanded', () => {
      let total = 0;
      for (const def of CARD_DEFS) {
        total += def.count;
      }
      // 22 white + 16 blue + 10 red + 5 marks = 53
      expect(total).toBe(53);
    });

    it('white back cards should total 22', () => {
      const count = CARD_DEFS.filter(d => d.back === 56).reduce((sum, d) => sum + d.count, 0);
      expect(count).toBe(22);
    });

    it('blue back cards should total 16', () => {
      const count = CARD_DEFS.filter(d => d.back === 55).reduce((sum, d) => sum + d.count, 0);
      expect(count).toBe(16);
    });

    it('red back cards should total 10', () => {
      const count = CARD_DEFS.filter(d => d.back === 54).reduce((sum, d) => sum + d.count, 0);
      expect(count).toBe(10);
    });
  });

  describe('BACK_VALUES', () => {
    it('red back (54) should have value 3', () => {
      expect(BACK_VALUES[54]).toBe(3);
    });

    it('blue back (55) should have value 2', () => {
      expect(BACK_VALUES[55]).toBe(2);
    });

    it('white back (56) should have value 1', () => {
      expect(BACK_VALUES[56]).toBe(1);
    });
  });

  describe('BACK_NAMES', () => {
    it('should map back numbers to color names', () => {
      expect(BACK_NAMES[54]).toBe('red');
      expect(BACK_NAMES[55]).toBe('blue');
      expect(BACK_NAMES[56]).toBe('white');
      expect(BACK_NAMES[57]).toBe('mark');
    });
  });

  describe('LETHAL_CARDS', () => {
    it('should contain all kill cards', () => {
      expect(LETHAL_CARDS).toContain('backfire');
      expect(LETHAL_CARDS).toContain('counterfeit');
      expect(LETHAL_CARDS).toContain('bloodshot');
      expect(LETHAL_CARDS).toContain('heavy hand');
      expect(LETHAL_CARDS).toContain('gold digger');
      expect(LETHAL_CARDS).toContain('red handed');
      expect(LETHAL_CARDS).toHaveLength(6);
    });
  });

  describe('REACTIVE_CARDS', () => {
    it('should contain reactive cards', () => {
      expect(REACTIVE_CARDS).toContain('blind spot');
      expect(REACTIVE_CARDS).toContain('snub');
      expect(REACTIVE_CARDS).toContain('revenge');
      expect(REACTIVE_CARDS).toHaveLength(3);
    });
  });

  describe('BOUNTY_CARDS', () => {
    it('should contain all 5 bounty cards', () => {
      expect(BOUNTY_CARDS).toHaveLength(5);
      expect(BOUNTY_CARDS).toContain('clubs bounty');
      expect(BOUNTY_CARDS).toContain('hearts bounty');
      expect(BOUNTY_CARDS).toContain('spades bounty');
      expect(BOUNTY_CARDS).toContain('diamonds bounty');
      expect(BOUNTY_CARDS).toContain('jokers bounty');
    });
  });

  describe('getBountySuit', () => {
    it('should extract suit from bounty card names', () => {
      expect(getBountySuit('clubs bounty')).toBe('clubs');
      expect(getBountySuit('hearts bounty')).toBe('hearts');
      expect(getBountySuit('spades bounty')).toBe('spades');
      expect(getBountySuit('diamonds bounty')).toBe('diamonds');
      expect(getBountySuit('jokers bounty')).toBe('jokers');
    });

    it('should return null for non-bounty cards', () => {
      expect(getBountySuit('greed')).toBeNull();
      expect(getBountySuit('heavy hand')).toBeNull();
    });
  });

  describe('getMarkSuit', () => {
    it('should extract suit from mark card names', () => {
      expect(getMarkSuit('hearts mark')).toBe('hearts');
      expect(getMarkSuit('spades mark')).toBe('spades');
      expect(getMarkSuit('clubs mark')).toBe('clubs');
      expect(getMarkSuit('diamonds mark')).toBe('diamonds');
      expect(getMarkSuit('jokers mark')).toBe('jokers');
    });

    it('should return null for non-mark cards', () => {
      expect(getMarkSuit('greed')).toBeNull();
    });
  });

  describe('ZONES', () => {
    it('should have static zone IDs', () => {
      expect(ZONES.draw).toBe('draw');
      expect(ZONES.discard).toBe('discard');
      expect(ZONES.bounty).toBe('bounty');
      expect(ZONES.extraMark).toBe('extra-mark');
    });

    it('should generate player zone IDs', () => {
      expect(ZONES.playerHand(1)).toBe('p1-hand');
      expect(ZONES.playerBank(2)).toBe('p2-bank');
      expect(ZONES.playerMark(3)).toBe('p3-mark');
      expect(ZONES.playerEffect(4)).toBe('p4-effect');
    });
  });
});
