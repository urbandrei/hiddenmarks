import random

class Player:
    def __init__(self, mark):
        self.hand = []
        self.bank = []
        self.mark = mark

class Game:
    def __init__(self, numPlayers):
        self.drawPile = list(range(55))
        random.shuffle(self.drawPile)
        self.discardPile = []
        self.unusedMarks = list(range(5))
        random.shuffle(self.unusedMarks)
        self.extraMark = self.unusedMarks.pop()
        self.players = []
        for i in range(numPlayers):
            self.players.append(Player(self.unusedMarks.pop()))
            for j in range(3):
                self.players[i].hand.append(self.drawPile.pop())

        self.currentPlayer = 0
        self.action = 0

    def view(self, player):
        print(self.players[player].hand)

newGame = Game(2)

newGame.view(1)