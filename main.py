import random
import math

class Player:
    def __init__(self, mark, hand, alive):
        self.hand = hand
        self.bank = []
        self.knowledge = [[0]*5]*5
        self.mark = mark
        self.alive = alive

class Game:
    def __init__(self):
        self.drawPile = list(range(48))
        random.shuffle(self.drawPile)
        self.discardPile = []
        self.unusedMarks = list(range(5))
        random.shuffle(self.unusedMarks)
        self.extraMark = self.unusedMarks.pop()
        self.players = []
        for i in range(4):
            hand = []
            for j in range(3):
                hand.append(self.drawPile.pop())
            self.players.append(Player(self.unusedMarks.pop(),hand, True))
        self.bounties = []
        self.skips = []

        self.currentPlayer = 0
        self.actions = 0

    def restart(self):
        self.drawPile = list(range(48))
        random.shuffle(self.drawPile)
        self.discardPile = []
        self.unusedMarks = list(range(5))
        random.shuffle(self.unusedMarks)
        self.extraMark = self.unusedMarks.pop()
        for i in range(4):
            hand = []
            for j in range(3):
                hand.append(self.drawPile.pop())
            self.players[i].mark = self.unusedMarks.pop()
            self.players[i].hand = hand
            self.players[i].alive = True
        self.bounties = []
        self.skips = []

        self.currentPlayer = 0
        self.actions = 0


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

        cont = [0]*23
        for i in self.discardPile:
            if i < 4:
                cont[0] += 1
            elif i < 8:
                cont[1] += 1
            elif i < 10:
                cont[2] += 1
            elif i < 12:
                cont[3] += 1
            elif i < 14:
                cont[4] += 1
            elif i < 16:
                cont[5] += 1
            elif i < 18:
                cont[6] += 1
            elif i < 20:
                cont[7] += 1
            elif i < 22:
                cont[8] += 1
            elif i < 26:
                cont[9] += 1
            elif i < 28:
                cont[10] += 1
            elif i < 30:
                cont[11] += 1
            elif i < 33:
                cont[12] += 1
            elif i < 36:
                cont[13] += 1
            elif i < 38:
                cont[14] += 1
            elif i < 40:
                cont[15] += 1
            elif i < 42:
                cont[16] += 1
            else:
                cont[i-25] += 1
        for i in range(len(cont)):
            if i < 2 or i == 9:
                v.extend([1]*cont[i])
                v.extend([0]*(4-cont[i]))
            elif i == 12 or i == 13:
                v.extend([1]*cont[i])
                v.extend([0]*(3-cont[i]))
            elif i < 17:
                v.extend([1]*cont[i])
                v.extend([0]*(2-cont[i]))
            elif cont[i] > 0:
                v.extend([1])
            else:
                v.extend([0])

        cont = [0]*23
        for i in self.players[self.currentPlayer].hand:
            if i < 4:
                cont[0] += 1
            elif i < 8:
                cont[1] += 1
            elif i < 10:
                cont[2] += 1
            elif i < 12:
                cont[3] += 1
            elif i < 14:
                cont[4] += 1
            elif i < 16:
                cont[5] += 1
            elif i < 18:
                cont[6] += 1
            elif i < 20:
                cont[7] += 1
            elif i < 22:
                cont[8] += 1
            elif i < 26:
                cont[9] += 1
            elif i < 28:
                cont[10] += 1
            elif i < 30:
                cont[11] += 1
            elif i < 33:
                cont[12] += 1
            elif i < 36:
                cont[13] += 1
            elif i < 38:
                cont[14] += 1
            elif i < 40:
                cont[15] += 1
            elif i < 42:
                cont[16] += 1
            else:
                cont[i-25] += 1
        for i in range(len(cont)):
            if i < 2 or i == 9:
                v.extend([1]*cont[i])
                v.extend([0]*(4-cont[i]))
            elif i == 12 or i == 13:
                v.extend([1]*cont[i])
                v.extend([0]*(3-cont[i]))
            elif i < 17:
                v.extend([1]*cont[i])
                v.extend([0]*(2-cont[i]))
            elif cont[i] > 0:
                v.extend([1])
            else:
                v.extend([0])
            
        for i in self.players[self.currentPlayer].knowledge:
            v.extend(i)

        cont = [0]*4
        cont[self.currentPlayer] = 1
        v.extend(cont)

        cont = [0]*3
        cont[self.actions] = 1
        v.extend(cont)

        cont = [0]*4
        for i in range(4):
            if self.players[i].alive:
                cont[i] = 1
        v.extend(cont)

        return v

    def possible(self):
        v = [1]

        cont = [0]*23
        for i in self.players[self.currentPlayer].hand:
            if i < 4:
                cont[0] += 1
            elif i < 8:
                cont[1] += 1
            elif i < 10:
                cont[2] += 1
            elif i < 12:
                cont[3] += 1
            elif i < 14:
                cont[4] += 1
            elif i < 16:
                cont[5] += 1
            elif i < 18:
                cont[6] += 1
            elif i < 20:
                cont[7] += 1
            elif i < 22:
                cont[8] += 1
            elif i < 26:
                cont[9] += 1
            elif i < 28:
                cont[10] += 1
            elif i < 30:
                cont[11] += 1
            elif i < 33:
                cont[12] += 1
            elif i < 36:
                cont[13] += 1
            elif i < 38:
                cont[14] += 1
            elif i < 40:
                cont[15] += 1
            elif i < 42:
                cont[16] += 1
            else:
                cont[i-26] += 1

        for i in cont:
            if i > 0:
                v.extend([1])
            else:
                v.extend([0])

        money = 0
        for i in self.players[self.currentPlayer].bank:
            if i < 22:
                money += 1
            elif i < 38:
                money += 2
            else:
                money += 3

        #unmask
        if cont[0] > 0 and money >= 3:
            ad = [1]*5
            ad[self.currentPlayer] = 0
            v.extend(ad)
        else:
            v.extend([0]*5)

        #trade off
        if cont[1] > 0 and money >= 3 and len(self.players[self.currentPlayer].hand) > 1:
            totad = [1]
            exists = False
            for i in cont:
                if i > 0:
                    totad.extend([1])
                else:
                    totad.extend([0])
            for i in range(4):
                ad = [0]*6
                if i != self.currentPlayer:
                    for j in self.players[i].hand:
                        exists = True
                        if j < 22:
                            ad[0] = 1
                        elif j < 38:
                            ad[1] = 1
                        else:
                            ad[2] = 1
                    for j in self.players[i].bank:
                        exists = True
                        if j < 22:
                            ad[3] = 1
                        elif j < 38:
                            ad[4] = 1
                        else:
                            ad[5] = 1
                totad.extend(ad)
            if exists:
                v.extend(totad)
            else:
                v.extend([0]*48)
        else:
            v.extend([0]*48)
            

        #greed
        if cont[2] > 0:
            v.extend([1])
        else:
            v.extend([0])
        
        #insomnia
        if cont[5] > 0 and money >= 3:
            v.extend([1])
        else:
            v.extend([0])



        #tied up
        if cont[6] > 0 and money >= 3:
            ad = [1]*5
            ad[self.currentPlayer] = 0
            v.extend(ad)
        else:
            v.extend([0]*5)

        #alter ego
        if cont[7] > 0 and money >= 2:
            v.extend([1]*5)
        else:
            v.extend([0]*5)

        #body swap
        if cont[8] > 0 and money >= 3:
            v.extend([1]*9)
        else:
            v.extend([0]*9)

        #arson
        if cont[10] > 0 and money >= 5:
            v.extend([1]*5)
        else:
            v.extend([0]*5)

        #upheaval
        if cont[11] > 0 and money >= 5:
            v.extend([1]*len(self.drawPile))
            v.extend([0]*(48-len(self.drawPile)))
        else:
            v.extend([0]*48)

        #counterfeit
        if cont[12] > 0 and money >= 10:
            ad = [0]*4
            found = False
            for i in range(4):
                if len(self.players[i].bank) >= 6 and i != self.currentPlayer:
                    ad[i] = 1
                    found = True
            if found:
                v.extend([1])
                v.extend(ad)
            else:
                v.extend([0]*5)
        else:
            v.extend([0]*5)

        #heavy hand
        if cont[13] > 0 and money >= 10:
            ad = [0]*4
            found = False
            for i in range(4):
                if len(self.players[i].hand) >= 6 and i != self.currentPlayer:
                    ad[i] = 1
                    found = True
            if found:
                v.extend([1])
                v.extend(ad)
            else:
                v.extend([0]*5)
        else:
            v.extend([0]*5)

        #red handed
        if cont[14] > 0 and money >= 10:
            ad = [0]*4
            found = False
            for i in range(4):
                reds = 0
                for i in self.players[i].hand:
                    if i >=38:
                        reds += 1
                if reds >= 2 and i != self.currentPlayer:
                    ad[i] = 1
                    found = True
            if found:
                v.extend([1])
                v.extend(ad)
            else:
                v.extend([0]*5)
        else:
            v.extend([0]*5)

        #gold digger
        if cont[15] > 0 and money >= 10:
            ad = [0]*4
            found = False
            for i in range(4):
                if len(self.players[i].bank) >= 5 and i != self.currentPlayer:
                    ad[i] = 1
                    found = True
            if found:
                v.extend([1])
                v.extend(ad)
            else:
                v.extend([0]*5)
        else:
            v.extend([0]*5)

        #backfire
        if cont[16] > 0 and money >= 10:
            ad = [0]*4
            found = False
            for i in range(4):
                if len(self.players[i].hand) >= 5 and i != self.currentPlayer:
                    ad[i] = 1
                    found = True
            if found:
                v.extend([1])
                v.extend(ad)
            else:
                v.extend([0]*5)
        else:
            v.extend([0]*5)

        #red handed
        if cont[17] > 0 and money >= 10:
            ad = [0]*4
            found = False
            for i in range(4):
                reds = 0
                for i in self.players[i].hand:
                    if i >=38:
                        reds += 1
                if reds > 0 and i != self.currentPlayer:
                    ad[i] = 1
                    found = True
            if found:
                v.extend([1])
                v.extend(ad)
            else:
                v.extend([0]*5)
        else:
            v.extend([0]*5)


        #bounty 0
        if cont[18] > 0:
            v.extend([1])
        else:
            v.extend([0])

        #bounty 1
        if cont[19] > 0:
            v.extend([1])
        else:
            v.extend([0])

        #bounty 2
        if cont[20] > 0:
            v.extend([1])
        else:
            v.extend([0])

        #bounty 3
        if cont[21] > 0:
            v.extend([1])
        else:
            v.extend([0])

        #bounty 4
        if cont[22] > 0:
            v.extend([1])
        else:
            v.extend([0])

        #closing bounties
        ad = [0]*5
        for i in self.bounties:
            ad[i[0]] = 1
        v.extend(ad)

        #using bounties
        ad = [0]*5
        plu = [1]*5
        plu[self.currentPlayer+1] = 0
        for i in self.bounties:
            if i[1] == 0:
                ad[i[0]] = 1
        for i in ad:
            if i == 1:
                v.extend(plu)
            else:
                v.extend([0]*5)
            
        return v

    def lastdraw(self):
        tar = random.randint(0, 3)
        mar = random.randint(0, 4)

        if len(self.drawPile) == 0:
            for i in range(4):
                if self.players[i].alive:
                    for j in range(5):
                        if self.players[self.currentPlayer].knowledge[i][j] == 1:
                            tar = i
                            mar = j

        if self.players[tar].mark == mar:
            #TODO: add kill gains
            for i in range(len(self.players[tar].hand)):
                self.discardPile.append(self.players[tar].hand.pop())
            for i in range(len(self.players[tar].bank)):
                self.discardPile.append(self.players[tar].bank.pop())
            self.players[tar].alive = False
            for i in range(4):
                self.players[i].knowledge[tar][self.players[tar].mark]

        else:
            for i in range(len(self.players[self.currentPlayer].hand)):
                self.discardPile.append(self.players[self.currentPlayer].hand.pop())
            for i in range(len(self.players[self.currentPlayer].bank)):
                self.discardPile.append(self.players[self.currentPlayer].bank.pop())
            self.players[self.currentPlayer].alive = False
            temp = self.players[tar].mark
            self.players[tar].mark = self.players[self.currentPlayer].mark
            self.players[self.currentPlayer].mark = temp
            for i in range(4):
                for j in range(5):
                    temp = self.players[i].knowledge[tar][j]
                    self.players[i].knowledge[tar][j] = self.players[i].knowledge[self.currentPlayer][j]
                    self.players[i].knowledge[self.currentPlayer][j] = temp
                self.players[i].knowledge[self.currentPlayer][self.players[self.currentPlayer].mark]
            self.actions = 0
            self.currentPlayer = (self.currentPlayer+1)%4

        self.drawPile = self.discardPile
        self.discardPile = []
        random.shuffle(self.drawPile)

    def action(self, out):
        acts = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,29,77,78,79,84,89,98,103,151,156,161,166,171,176,181,182,183,184,185,186,187,188,189,190,191,196,201,206,211]
        mask = self.possible()
        for i in range(len(out)):
            mask[i] = mask[i]*out[i]

        chosen = 0
        for i in acts:
            if mask[i] > mask[chosen]:
                chosen = i


        #draw
        if chosen == 0:
            self.players[self.currentPlayer].hand.append(self.drawPile.pop())
            if len(self.drawPile) == 0:
                self.lastdraw()


                        
        #bank unmask
        elif chosen == 1:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] < 4:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank tradeoff
        elif chosen == 2:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 4 and self.players[self.currentPlayer].hand[i] < 8:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank greed
        elif chosen == 3:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 8 and self.players[self.currentPlayer].hand[i] < 10:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank blindspot
        elif chosen == 4:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 10 and self.players[self.currentPlayer].hand[i] < 12:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank revenge
        elif chosen == 5:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 12 and self.players[self.currentPlayer].hand[i] < 14:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank insomnia
        elif chosen == 6:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 14 and self.players[self.currentPlayer].hand[i] < 16:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank tied up
        elif chosen == 7:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 16 and self.players[self.currentPlayer].hand[i] < 18:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank alter ego
        elif chosen == 8:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 18 and self.players[self.currentPlayer].hand[i] < 20:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank bodyswap
        elif chosen == 9:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 20 and self.players[self.currentPlayer].hand[i] < 22:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank snub
        elif chosen == 10:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 22 and self.players[self.currentPlayer].hand[i] < 26:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank arson
        elif chosen == 11:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 26 and self.players[self.currentPlayer].hand[i] < 28:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank upheaval
        elif chosen == 12:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 28 and self.players[self.currentPlayer].hand[i] < 30:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank counterfeit
        elif chosen == 13:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 30 and self.players[self.currentPlayer].hand[i] < 33:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank heavyhand
        elif chosen == 14:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 33 and self.players[self.currentPlayer].hand[i] < 36:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank red handed
        elif chosen == 15:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 36 and self.players[self.currentPlayer].hand[i] < 38:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank gold digger
        elif chosen == 16:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 38 and self.players[self.currentPlayer].hand[i] < 40:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank gold digger
        elif chosen == 17:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 40 and self.players[self.currentPlayer].hand[i] < 42:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
        #bank bloodshot or bounties
        elif chosen <= 23:
            self.players[self.currentPlayer].hand.remove(chosen+25)
            self.discardPile.append(chosen+25)
        #play unmask
        elif chosen == 24:
            best = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+best+1]:
                    best = i
            self.players[self.currentPlayer].knowledge[best][self.players[best].mark] = 1

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] < 4:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 3
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        #play tradeoff
        elif chosen == 29:
            best = 0
            for i in range(24):
                if mask[chosen+i+1] > mask[chosen+best+1]:
                    mycard = i
            pla = 0
            hob = 0
            col = 0
            for i in range(4):
                for j in range(2):
                    for k in range(3):
                        if mask[pla*6+hob*3+col+53] < mask[i*6+j*3+k+53]:
                            pla = i
                            hob = j
                            col = k
            fincar = 0
            if hob == 0:
                for i in range(len(self.players[pla].hand)):
                    if self.players[pla].hand[i] < 22:
                        if col == 0:
                            fincar = i
                    elif self.players[pla].hand < 38:
                        if col == 1:
                            fincar = i
                    else:
                        if col == 2:
                            fincar = i
            else:
                for i in range(len(self.players[pla].bank)):
                    if self.players[pla].hand[i] < 22:
                        if col == 0:
                            fincar = i
                    elif self.players[pla].hand < 38:
                        if col == 1:
                            fincar = i
                    else:
                        if col == 2:
                            fincar = i
            if hob == 0:
                self.players[self.currentPlayer].hand.append(self.players[pla].hand.pop(fincar))
            else:
                self.players[self.currentPlayer].hand.append(self.players[pla].bank.pop(fincar))
            #TODO: implement trade back

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 4 and self.players[self.currentPlayer].hand[i] < 8:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 3
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        #play greed
        elif chosen == 77:
        
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 8 and self.players[self.currentPlayer].hand[i] < 10:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))
            for i in range(2):
                self.players[self.currentPlayer].hand.append(self.drawPile.pop())
                if len(self.drawPile) == 0:
                    self.lastdraw()

        #play insomnia
        elif chosen == 78:
            self.actions -= 3

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 14 and self.players[self.currentPlayer].hand[i] < 16:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 3
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)
    
        #play tied up
        elif chosen == 79:
            best = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+best+1]:
                    best = i
            self.skips.append(best-1)

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 16 and self.players[self.currentPlayer].hand[i] < 18:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 3
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)
        #play alter ego
        elif chosen == 84:
            best = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+best+1]:
                    best = i
            temp = self.players[best].mark
            self.players[best].mark = self.extraMark
            self.extraMark = temp

            for i in range(4):
                for j in range(5):
                    temp = self.players[i].knowledge[best][j]
                    self.players[i].knowledge[best][j] = self.players[i].knowledge[4][j]
                    self.players[i].knowledge[4][j] = temp


            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 18 and self.players[self.currentPlayer].hand[i] < 20:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 2
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        #play body swap
        elif chosen == 89:
            fir = 0
            sec = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+fir+1]:
                    fir = i
            for i in range(4):
                if mask[chosen+i+5] > mask[chosen+fir+6]:
                    sec = i
            temp = self.players[fir].mark
            self.players[fir].mark = self.players[sec].mark
            self.players[sec].mark = temp

            for i in range(4):
                for j in range(5):
                    temp = self.players[i].knowledge[fir][j]
                    self.players[i].knowledge[fir][j] = self.players[i].knowledge[sec][j]
                    self.players[i].knowledge[sec][j] = temp


            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 20 and self.players[self.currentPlayer].hand[i] < 22:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 3
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        #play arson
        elif chosen == 98:
            fir = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+fir+1]:
                    fir = i
            for i in range(len(self.players[fir].bank)):
                self.discardPile.append(self.players[fir].bank.pop())

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 26 and self.players[self.currentPlayer].hand[i] < 28:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 5
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        #play upheaval
        elif chosen == 103:
            fir = 0
            for i in range(47):
                if mask[chosen+i+1] > mask[chosen+fir+1]:
                    fir = i
            
            for i in range(fir):
                self.drawPile.append(self.drawPile.pop())

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 28 and self.players[self.currentPlayer].hand[i] < 30:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 5
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        #play lethal cards
        elif chosen == 151 or chosen == 156 or chosen == 161 or chosen == 166 or chosen == 171 or chosen == 176:
            fir = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+fir+1]:
                    fir = i
            
            #TODO: add kill gains

            for i in range(len(self.players[fir].hand)):
                self.discardPile.append(self.players[fir].hand.pop())

            for i in range(len(self.players[fir].bank)):
                self.discardPile.append(self.players[fir].bank.pop())

            self.players[fir].alive = False

            for i in range(4):
                self.players[i].knowledge[fir][self.players[fir].mark]

            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 30 and self.players[self.currentPlayer].hand[i] < 33 and chosen == 151:
                    discard = i
                elif self.players[self.currentPlayer].hand[i] >= 33 and self.players[self.currentPlayer].hand[i] < 36 and chosen == 156:
                    discard = i
                elif self.players[self.currentPlayer].hand[i] >= 36 and self.players[self.currentPlayer].hand[i] < 38 and chosen == 161:
                    discard = i
                elif self.players[self.currentPlayer].hand[i] >= 38 and self.players[self.currentPlayer].hand[i] < 40 and chosen == 166:
                    discard = i
                elif self.players[self.currentPlayer].hand[i] >= 40 and self.players[self.currentPlayer].hand[i] < 42 and chosen == 171:
                    discard = i
                elif self.players[self.currentPlayer].hand[i] >= 42 and self.players[self.currentPlayer].hand[i] < 43 and chosen == 176:
                    discard = i
            self.discardPile.append(self.players[self.currentPlayer].hand.pop(i))

            debt = 10
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        elif chosen < 186:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] == chosen - 137:
                    discard = i
            self.players[self.currentPlayer].hand.pop(i)
            self.bounties.append([chosen-181,4])

            for i in range(3):
                self.players[self.currentPlayer].hand.append(self.drawPile.pop())
                if len(self.drawPile) == 0:
                    self.lastdraw()

        elif chosen < 191:
            de = -1
            for i in range(len(self.bounties)):
                if self.bounties[i][0] == chosen - 143:
                    de = i
            self.bounties.pop(de)
            self.discardPile.append(chosen-142)

            debt = 5
            for i in range(len(self.players[self.currentPlayer].bank)):
                if debt > 0:
                    te = self.players[self.currentPlayer].bank.pop()
                    if te < 22:
                        debt -= 1
                    elif te < 38:
                        debt -= 2
                    else:
                        debt -= 3
                    self.discardPile.append(te)

        else:
            fir = 0
            for i in range(4):
                if mask[chosen+i+1] > mask[chosen+fir+1]:
                    fir = i
            
            if self.players[fir].mark == (chosen-191)/5:
                #TODO: add kill gains
                for i in range(len(self.players[fir].hand)):
                    self.discardPile.append(self.players[fir].hand.pop())
                for i in range(len(self.players[fir].bank)):
                    self.discardPile.append(self.players[fir].bank.pop())
                self.players[fir].alive = False
                for i in range(4):
                    self.players[i].knowledge[fir][self.players[fir].mark]

            else:
                for i in range(len(self.players[self.currentPlayer].hand)):
                    self.discardPile.append(self.players[self.currentPlayer].hand.pop())
                for i in range(len(self.players[self.currentPlayer].bank)):
                    self.discardPile.append(self.players[self.currentPlayer].bank.pop())
                self.players[self.currentPlayer].alive = False
                temp = self.players[fir].mark
                self.players[fir].mark = self.players[self.currentPlayer].mark
                self.players[self.currentPlayer].mark = temp
                for i in range(4):
                    for j in range(5):
                        temp = self.players[i].knowledge[fir][j]
                        self.players[i].knowledge[fir][j] = self.players[i].knowledge[self.currentPlayer][j]
                        self.players[i].knowledge[self.currentPlayer][j] = temp
                    self.players[i].knowledge[self.currentPlayer][self.players[self.currentPlayer].mark]
                self.actions = 0
                self.currentPlayer = (self.currentPlayer+1)%4

    def play(self, brain):
        
        fit = 0
        for i in range(10):
            print(f"Game {i+1}")
            left = 4
            last = 4
            while left > 1:
                if last != left:
                    print(f"Only {left} players left!")
                    last = left
                v = []
                if self.currentPlayer == 0:
                    v = brain.pred(self.view())
                else:
                    for i in range(216):
                        v.append(random.random())
                if self.players[self.currentPlayer].alive or self.currentPlayer in self.skips:
                    self.action(v)
                    if self.currentPlayer in self.skips:
                        self.skips.remove(self.currentPlayer)
                for i in self.bounties:
                    i[1] -= 1
                self.actions += 1
                if self.actions > 2:
                    self.actions = 0
                    self.currentPlayer = (self.currentPlayer+1)%4
                left = 0
                for i in self.players:
                    if i.alive:
                        left += 1
            if self.players[0].alive:
                fit += 1
                print("Neural Net Won!")
            else:
                print("Neural Net Lost :(")
            self.restart()
        brain.wins = fit
        print(f"[win|loss = {fit}|{10-fit}]")
            

class nn:
    def __init__(self, parent = None):

        input_layer = 804
        hidden_layer = 250
        hidden_amount = 3
        output_layer = 216

        self.weights = [[]]
        if parent != None:
            for i in range(input_layer):
                self.weights[0].append([])
                for j in range(hidden_layer):
                    self.weights[0][i].append(parent.weights[0][i][j] * (1+random.random()*.1-.05))
            for i in range(hidden_amount):
                self.weights.append([])
                for j in range(hidden_layer):
                    self.weights[i+1].append([])
                    for k in range(hidden_layer):
                        self.weights[i+1][j].append(parent.weights[i+1][j][k] * (1+random.random()*.1-.05))
            self.weights.append([])
            for i in range(hidden_layer):
                self.weights[-1].append([])
                for j in range(output_layer):
                    self.weights[-1][i].append(parent.weights[-1][i][j] * (1+random.random()*.1-.05))
        else:
            for i in range(input_layer):
                self.weights[0].append([])
                for j in range(hidden_layer):
                    self.weights[0][i].append(2*random.random()-1)
            for i in range(hidden_amount):
                self.weights.append([])
                for j in range(hidden_layer):
                    self.weights[i+1].append([])
                    for k in range(hidden_layer):
                        self.weights[i+1][j].append(2*random.random()-1)
            self.weights.append([])
            for i in range(hidden_layer):
                self.weights[-1].append([])
                for j in range(output_layer):
                    self.weights[-1][i].append(2*random.random()-1)
        self.wins = 0

    def pred(self, inp):
        activations = [inp]
        for i in range(len(self.weights)):
            activations.append([0]*len(self.weights[i][0]))
            for j in range(len(self.weights[i])):
                for k in range(len(self.weights[i][j])):
                    activations[i+1][k] += activations[i][j]*self.weights[i][j][k]
            for j in range(len(activations[i+1])):
                activations[i + 1][j] = 1 / (1 + math.exp(-activations[i+1][j]))
            maxi = activations[i + 1][0]
            mini = activations[i + 1][0]
            for j in range(len(activations[i+1])):
                maxi = max(activations[i + 1][j],maxi)
                mini = min(activations[i + 1][j],mini)
            for j in range(len(activations[i+1])):
                activations[i + 1][j] = (activations[i + 1][j] - mini)/(maxi-mini) - 0.5
        for i in range(len(activations[-1])):
            activations[-1][i] += .5
        return activations[-1]

test = Game()
nns = []
print("INITIALIZATION")
for i in range(10):
    newnet = nn()
    print(f"NEURAL NET #{i}")
    test.play(newnet)
    nns.append(newnet)

best = 0
epoch = 1
while best < .9:
    best = 0
    for i in range(10):
        best = max(best,nns[i].wins)
    inde = 0
    print(f"best run: {best}/10")
    print(f"EPOCH {epoch}")
    nnns = []
    while len(nnns) < 8:
        if random.random() < (nns[inde].wins/best)**2:
            nnns.append(nn(nns[inde]))
        inde = (inde+1)%10
    for i in range(2):
        nnns.append(nn())
    nns = nns
    for i in range(10):
        print(f"NEURAL NET #{i}")
        test.play(nns[i])
