import random

class Player:
    def __init__(self, mark, hand, alive):
        self.hand = hand
        self.bank = []
        self.knowledge = [[0]*5]*5
        self.mark = mark
        self.alive = alive

class Game:
    def __init__(self, numPlayers):
        self.drawPile = list(range(55))
        random.shuffle(self.drawPile)
        self.discardPile = []
        self.unusedMarks = list(range(5))
        random.shuffle(self.unusedMarks)
        self.extraMark = self.unusedMarks.pop()
        self.players = []
        for i in range(4):
            if i<numPlayers:
                hand = []
                for j in range(3):
                    hand.append(self.drawPile.pop())
                self.players.append(Player(self.unusedMarks.pop(),hand, True))
            else:
                self.players.append(Player(self.unusedMarks.pop(),[], False))

        self.currentPlayer = 0
        self.action = 0

    def view(self):
        v = []
        for i in self.drawPile:
            if i<22:
                v.extend([1,0,0])
            elif i<38:
                v.extend([0,1,0])
            else:
                v.extend([0,0,1])
        for i in range(48-len(self.drawPile)):
            v.extend([0,0,0])
        for i in range(4):
            hr = 0
            hb = 0
            hw = 0
            br = 0
            bb = 0
            bw = 0
            for j in self.players[i].hand:
                if j<22:
                    hw += 1
                elif j<38:
                    hb += 1
                else:
                    hr += 1
            for j in self.players[i].bank:
                if j<22:
                    bw += 1
                elif j<38:
                    bb += 1
                else:
                    br += 1
            v.extend([1]*hw)
            v.extend([0]*(22-hw))
            v.extend([1]*hb)
            v.extend([0]*(22-hb))
            v.extend([1]*hr)
            v.extend([0]*(22-hr))
            v.extend([1]*bw)
            v.extend([0]*(22-bw))
            v.extend([1]*bb)
            v.extend([0]*(22-bb))
            v.extend([1]*br)
            v.extend([0]*(22-br))

        return v

    def possible(self):
        return []

    def action(self, out):
        return []


