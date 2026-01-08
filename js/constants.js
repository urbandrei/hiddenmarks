// Card dimensions
export const CARD_WIDTH = 2.5;
export const CARD_HEIGHT = 3.5;
export const CARD_DEPTH = 0.02;

// Sprite sheet configuration
export const SPRITE_COLS = 10;
export const SPRITE_ROWS = 6;

// Card values by back color (mark cards have no value)
// Back indices: 54=red, 55=blue, 56=white, 57=mark
export const BACK_VALUES = { 54: 3, 55: 2, 56: 1 };

// Card definitions from sprite sheet
export const CARD_DEFS = [
    // White back (56)
    { index: 1, name: 'body swap', back: 56, count: 2, cost: 3, effect: 'swap any two player marks' },
    { index: 3, name: 'alter ego', back: 56, count: 2, cost: 2, effect: 'swap any player\'s mark\nwith the extra mark' },
    { index: 5, name: 'greed', back: 56, count: 2, cost: 0, effect: 'draw 2 cards' },
    { index: 7, name: 'tied up', back: 56, count: 2, cost: 3, effect: 'skip any player\'s next turn' },
    { index: 9, name: 'revenge', back: 56, count: 2, cost: 2, effect: 'REACTIVE:\nif someone tries to peek your mark\npeek at their mark, does not block' },
    { index: 11, name: 'insomnia', back: 56, count: 2, cost: 3, effect: 'do 3 more actions' },
    { index: 13, name: 'blind spot', back: 56, count: 2, cost: 2, effect: 'REACTIVE:\nblock a mark peek' },
    { index: 15, name: 'trade off', back: 56, count: 4, cost: 3, effect: 'swap any card from your hand\nwith a card from any hand/bank' },
    { index: 19, name: 'unmasked', back: 56, count: 4, cost: 3, effect: 'peek at another player\'s mark' },
    // Blue back (55)
    { index: 23, name: 'upheaval', back: 55, count: 2, cost: 5, effect: 'cut the draw pile' },
    { index: 25, name: 'arson', back: 55, count: 2, cost: 5, effect: 'discard all cards from any\nplayer\'s bank' },
    { index: 27, name: 'snub', back: 55, count: 4, cost: 5, effect: 'REACTIVE:\nprevent a nonlethal card effect' },
    { index: 31, name: 'red handed', back: 55, count: 2, cost: 10, effect: 'kill a player with 2+ red cards\nin their HAND' },
    { index: 33, name: 'counterfeit', back: 55, count: 3, cost: 10, effect: 'kill a player with 6+ cards\nin their BANK' },
    { index: 36, name: 'heavy hand', back: 55, count: 3, cost: 10, effect: 'kill a player with 6+ cards\nin their HAND' },
    // Red back (54)
    { index: 39, name: 'clubs bounty', back: 54, count: 1, cost: 0, effect: 'draw 3 cards. place this card face up\n\nWHILE FACE UP\nAnyone can discard this by paying 5\n\nOR AFTER 1 ROUND\nbounty open an [suit], see rules' },
    { index: 40, name: 'hearts bounty', back: 54, count: 1, cost: 0, effect: 'draw 3 cards. place this card face up\n\nWHILE FACE UP\nAnyone can discard this by paying 5\n\nOR AFTER 1 ROUND\nbounty open an [suit], see rules' },
    { index: 41, name: 'spades bounty', back: 54, count: 1, cost: 0, effect: 'draw 3 cards. place this card face up\n\nWHILE FACE UP\nAnyone can discard this by paying 5\n\nOR AFTER 1 ROUND\nbounty open an [suit], see rules' },
    { index: 42, name: 'diamonds bounty', back: 54, count: 1, cost: 0, effect: 'draw 3 cards. place this card face up\n\nWHILE FACE UP\nAnyone can discard this by paying 5\n\nOR AFTER 1 ROUND\nbounty open an [suit], see rules' },
    { index: 43, name: 'jokers bounty', back: 54, count: 1, cost: 0, effect: 'draw 3 cards. place this card face up\n\nWHILE FACE UP\nAnyone can discard this by paying 5\n\nOR AFTER 1 ROUND\nbounty open an [suit], see rules' },
    { index: 44, name: 'backfire', back: 54, count: 2, cost: 10, effect: 'kill a player with 5+ cards\nin their HAND' },
    { index: 46, name: 'bloodshot', back: 54, count: 1, cost: 10, effect: 'kill a player with any red card\nin their HAND' },
    { index: 47, name: 'gold digger', back: 54, count: 2, cost: 10, effect: 'kill a player with 5+ cards\nin their BANK' },
    // Mark back (57)
    { index: 49, name: 'hearts mark', back: 57, count: 1 },
    { index: 50, name: 'spades mark', back: 57, count: 1 },
    { index: 51, name: 'clubs mark', back: 57, count: 1 },
    { index: 52, name: 'diamonds mark', back: 57, count: 1 },
    { index: 53, name: 'jokers mark', back: 57, count: 1 },
];

// Zone layout constants
export const GAP = 0.5;
export const ZONE_LENGTH = 15;
export const MARK_WIDTH = CARD_WIDTH;
export const EFFECT_WIDTH = CARD_WIDTH * 1.5;
export const BANK_WIDTH = ZONE_LENGTH - MARK_WIDTH - EFFECT_WIDTH - GAP * 2;

// Message types for networking
export const MSG = {
    JOIN_REQUEST: 'join_request',
    JOIN_ACCEPTED: 'join_accepted',
    JOIN_REJECTED: 'join_rejected',
    PLAYER_LIST: 'player_list',
    STATE_UPDATE: 'state_update',
    STATE_BROADCAST: 'state_broadcast',
    REACTION_START: 'reaction_start',
    REACTION_RESPONSE: 'reaction_response',
    REACTION_RESOLVE: 'reaction_resolve',
    COUNTER_REACTION_START: 'counter_reaction_start',
    MARK_KNOWLEDGE_UPDATE: 'mark_knowledge_update',
    PLAYER_DEATH: 'player_death',
};
