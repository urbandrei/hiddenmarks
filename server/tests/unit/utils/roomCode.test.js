const { generateRoomCode } = require('../../../src/utils/roomCode');

describe('roomCode', () => {
  describe('generateRoomCode', () => {
    it('should return a 6-character string', () => {
      const code = generateRoomCode();
      expect(typeof code).toBe('string');
      expect(code).toHaveLength(6);
    });

    it('should only contain digits', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        expect(code).toMatch(/^\d{6}$/);
      }
    });

    it('should not start with 0 (range starts at 100000)', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateRoomCode();
        expect(code[0]).not.toBe('0');
      }
    });

    it('should produce different codes (statistical)', () => {
      const codes = new Set();
      for (let i = 0; i < 20; i++) {
        codes.add(generateRoomCode());
      }
      expect(codes.size).toBeGreaterThan(1);
    });
  });
});
