import random
import math
import matplotlib.pyplot as plt

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

        if len(self.players[self.currentPlayer].hand)>0:
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
            ad[self.currentPlayer+1] = 0
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

        print(chosen)

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
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank tradeoff
        elif chosen == 2:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 4 and self.players[self.currentPlayer].hand[i] < 8:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank greed
        elif chosen == 3:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 8 and self.players[self.currentPlayer].hand[i] < 10:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank blindspot
        elif chosen == 4:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 10 and self.players[self.currentPlayer].hand[i] < 12:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank revenge
        elif chosen == 5:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 12 and self.players[self.currentPlayer].hand[i] < 14:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank insomnia
        elif chosen == 6:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 14 and self.players[self.currentPlayer].hand[i] < 16:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank tied up
        elif chosen == 7:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 16 and self.players[self.currentPlayer].hand[i] < 18:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank alter ego
        elif chosen == 8:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 18 and self.players[self.currentPlayer].hand[i] < 20:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank bodyswap
        elif chosen == 9:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 20 and self.players[self.currentPlayer].hand[i] < 22:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank snub
        elif chosen == 10:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 22 and self.players[self.currentPlayer].hand[i] < 26:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank arson
        elif chosen == 11:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 26 and self.players[self.currentPlayer].hand[i] < 28:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank upheaval
        elif chosen == 12:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 28 and self.players[self.currentPlayer].hand[i] < 30:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank counterfeit
        elif chosen == 13:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 30 and self.players[self.currentPlayer].hand[i] < 33:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank heavyhand
        elif chosen == 14:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 33 and self.players[self.currentPlayer].hand[i] < 36:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank red handed
        elif chosen == 15:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 36 and self.players[self.currentPlayer].hand[i] < 38:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank gold digger
        elif chosen == 16:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 38 and self.players[self.currentPlayer].hand[i] < 40:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank gold digger
        elif chosen == 17:
            discard = -1
            for i in range(len(self.players[self.currentPlayer].hand)):
                if self.players[self.currentPlayer].hand[i] >= 40 and self.players[self.currentPlayer].hand[i] < 42:
                    discard = i
            self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(i))
        #bank bloodshot or bounties
        elif chosen <= 23:
            self.players[self.currentPlayer].hand.remove(chosen+25)
            self.players[self.currentPlayer].bank.append(chosen+25)
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

    def randAction(self):
        money = 0
        for i in self.players[self.currentPlayer].hand:
            if i < 22:
                money += 1
            elif i < 38:
                money += 2
            else:
                money += 3
        if money > 9:
            rhtar = []
            bstar = []
            bftar = []
            gdtar = []
            hhtar = []
            cftar = []
            for i in range(len(self.players)):
                if i != self.currentPlayer and self.players[i].alive:
                    if len(self.players[i].hand) > 4 and len([i for i in [41,40] if i in self.players[self.currentPlayer].hand]) > 0:
                        bftar.append(i)
                    if len(self.players[i].hand) > 5 and len([i for i in [35,34,33] if i in self.players[self.currentPlayer].hand]) > 0:
                        hhtar.append(i)
                    if len(self.players[i].bank) > 4 and len([i for i in [39,38] if i in self.players[self.currentPlayer].hand]) > 0:
                        gdtar.append(i)
                    if len(self.players[i].bank) > 5 and len([i for i in [32,31,30] if i in self.players[self.currentPlayer].hand]) > 0:
                        cftar.append(i)
                    rednum = 0
                    for j in self.players[i].hand:
                        if j >= 38:
                            rednum += 1
                    if rednum != 0  and len([i for i in [42] if i in self.players[self.currentPlayer].hand]) > 0:
                        bstar.append(i)
                    if rednum > 1  and len([i for i in [37,36] if i in self.players[self.currentPlayer].hand]) > 0:
                        rhtar.append(i)
            ran = random.randint(0,len(rhtar)+len(bstar)+len(bftar)+len(gdtar)+len(hhtar)+len(cftar)+len(self.players[self.currentPlayer].hand))
            if ran < len(rhtar):
                ind = rhtar[ran]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 37 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(37)
                elif 36 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(36)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif ran < len(rhtar)+len(bstar):
                ind = bstar[ran-len(rhtar)]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 42 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(42)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif ran < len(rhtar)+len(bstar)+len(bftar):
                ind = bftar[ran-(len(rhtar)+len(bstar))]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 41 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(41)
                elif 40 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(40)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif ran < len(rhtar)+len(bstar)+len(bftar)+len(gdtar):
                ind = gdtar[ran-(len(rhtar)+len(bstar)+len(bftar))]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 39 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(39)
                elif 38 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(38)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif ran < len(rhtar)+len(bstar)+len(bftar)+len(gdtar)+len(hhtar):
                ind = hhtar[ran-(len(rhtar)+len(bstar)+len(bftar)+len(gdtar))]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 35 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(35)
                elif 34 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(34)
                elif 33 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(33)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif ran < len(rhtar)+len(bstar)+len(bftar)+len(gdtar)+len(hhtar)+len(cftar):
                ind = cftar[ran-(len(rhtar)+len(bstar)+len(bftar)+len(gdtar)+len(hhtar))]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 32 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(32)
                elif 31 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(31)
                elif 30 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(30)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif ran != len(rhtar)+len(bstar)+len(bftar)+len(gdtar)+len(hhtar)+len(cftar)+len(self.players[self.currentPlayer].hand):
                self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(ran-(len(rhtar)+len(bstar)+len(bftar)+len(gdtar)+len(hhtar)+len(cftar))))
            else:
                self.players[self.currentPlayer].hand.append(self.drawPile.pop())
        else:
            ran = random.randint(0,len(self.players[self.currentPlayer].hand))
            if ran != len(self.players[self.currentPlayer].hand):
                self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(ran))
            else:
                self.players[self.currentPlayer].hand.append(self.drawPile.pop())
        if len(self.drawPile) == 0:
            self.players[self.currentPlayer].alive = False
            for i in range(len(self.players[self.currentPlayer].hand)):
                self.discardPile.append(self.players[self.currentPlayer].hand.pop())
            for i in range(len(self.players[self.currentPlayer].hand)):
                self.discardPile.append(self.players[self.currentPlayer].hand.pop())
            for i in range(len(self.discardPile)):
                self.drawPile.append(self.discardPile.pop(random.randint(0,len(self.discardPile)-1)))
            self.actions = -1
            self.currentPlayer = (self.currentPlayer + 1)%4
        self.actions += 1
        if self.actions > 2:
            self.actions = 0
            self.currentPlayer = (self.currentPlayer + 1)%4
        numplaye = 0
        for i in range(4):
            if self.players[i].alive:
                numplaye += 1
        while self.players[self.currentPlayer].alive == False and numplaye > 1:
            self.currentPlayer = (self.currentPlayer + 1)%4

    def smartAction(self):
        money = 0
        for i in self.players[self.currentPlayer].hand:
            if i < 22:
                money += 1
            elif i < 38:
                money += 2
            else:
                money += 3
        if money > 9:
            rhtar = []
            bstar = []
            bftar = []
            gdtar = []
            hhtar = []
            cftar = []
            
            for i in range(4):
                if i != self.currentPlayer and self.players[i].alive:
                    if len(self.players[i].hand) > 4 and len([i for i in [41,40] if i in self.players[self.currentPlayer].hand]) > 0:
                        bftar.append(i)
                    if len(self.players[i].hand) > 5 and len([i for i in [35,34,33] if i in self.players[self.currentPlayer].hand]) > 0:
                        hhtar.append(i)
                    if len(self.players[i].bank) > 4 and len([i for i in [39,38] if i in self.players[self.currentPlayer].hand]) > 0:
                        gdtar.append(i)
                    if len(self.players[i].bank) > 5 and len([i for i in [32,31,30] if i in self.players[self.currentPlayer].hand]) > 0:
                        cftar.append(i)
                    rednum = 0
                    for j in self.players[i].hand:
                        if j >= 38:
                            rednum += 1
                    if rednum != 0  and len([i for i in [42] if i in self.players[self.currentPlayer].hand]) > 0:
                        bstar.append(i)
                    if rednum > 1  and len([i for i in [37,36] if i in self.players[self.currentPlayer].hand]) > 0:
                        rhtar.append(i)
            if len(rhtar) > 0:
                ind = rhtar[0]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 37 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(37)
                elif 36 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(36)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif len(bstar) > 0:
                ind = bstar[0]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 42 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(42)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif len(bftar) > 0:
                ind = bftar[0]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 41 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(41)
                elif 40 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(40)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif len(gdtar) > 0:
                ind = gdtar[0]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 39 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(39)
                elif 38 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(38)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif len(hhtar) > 0:
                ind = hhtar[0]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 35 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(35)
                elif 34 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(34)
                elif 33 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(33)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif len(cftar) > 0:
                ind = cftar[0]
                self.players[ind].alive = False
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                for i in range(len(self.players[ind].hand)):
                    self.discardPile.append(self.players[ind].hand.pop())
                if 32 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(32)
                elif 31 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(31)
                elif 30 in self.players[self.currentPlayer].hand:
                    self.players[self.currentPlayer].hand.remove(30)
                debt = 10
                for i in range(len(self.players[self.currentPlayer].bank)):
                    if debt > 0:
                        if self.players[self.currentPlayer].bank[i] < 22:
                            debt -= 1
                        elif self.players[self.currentPlayer].bank[i] < 38:
                            debt -= 2
                        else:
                            debt -= 3
            elif len(self.drawPile) == 1:
                possibles = []
                for i in range(len(self.players[self.currentPlayer].hand)):
                    if i < 30 or i > 43:
                        possibles.append(i)
                possibles.sort()
                if len(possibles) > 0:
                    self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(possibles[-1]))
                elif len(self.players[self.currentPlayer].hand) > 0:
                    self.players[self.currentPlayer].hand.pop()
                else:
                    self.players[self.currentPlayer].hand.append(self.drawPile.pop())
            else:
                self.players[self.currentPlayer].hand.append(self.drawPile.pop())

        else:
            if self.drawPile[-1] > 22:
                self.players[self.currentPlayer].hand.append(self.drawPile.pop())
            else:
                possibles = []
                for i in range(len(self.players[self.currentPlayer].hand)):
                    if i < 30 or i > 43:
                        possibles.append(i)
                possibles.sort()
                if len(possibles) > 0:
                    self.players[self.currentPlayer].bank.append(self.players[self.currentPlayer].hand.pop(possibles[-1]))
                else:
                    self.players[self.currentPlayer].hand.append(self.drawPile.pop())

        if len(self.drawPile) == 0:
            self.players[self.currentPlayer].alive = False
            for i in range(len(self.players[self.currentPlayer].hand)):
                self.discardPile.append(self.players[self.currentPlayer].hand.pop())
            for i in range(len(self.players[self.currentPlayer].hand)):
                self.discardPile.append(self.players[self.currentPlayer].hand.pop())
            for i in range(len(self.discardPile)):
                self.drawPile.append(self.discardPile.pop(random.randint(0,len(self.discardPile)-1)))
            self.actions = -1
            self.currentPlayer = (self.currentPlayer + 1)%4
        self.actions += 1
        if self.actions > 2:
            self.actions = 0
            self.currentPlayer = (self.currentPlayer + 1)%4
        numplaye = 0
        for i in range(4):
            if self.players[i].alive:
                numplaye += 1
        while self.players[self.currentPlayer].alive == False and numplaye > 1:
            self.currentPlayer = (self.currentPlayer + 1)%4

    def recurseAction(self, depth):
        money = 0
        reds = False
        for i in self.players[self.currentPlayer].hand:
            if i < 22:
                money += 1
            elif i < 38:
                money += 2
            else:
                reds = True
                money += 3
        if depth == 0:
            heuristic = 0
            if not self.players[0].alive:
                heuristic -= 10000
            if len(self.players[0].hand) > 4:
                heuristic -= 100
            if len(self.players[0].bank) > 4:
                heuristic -= 100
            if reds:
                heuristic -= 100
            for i in range(4):
                if not self.players[i].alive:
                    heuristic += 100
            if money > 9:
                heuristic += 50
            return [heuristic,self]
        else:
            tempheur = -100000
            if money > 9:
                rhtar = []
                bstar = []
                bftar = []
                gdtar = []
                hhtar = []
                cftar = []
                
                for i in range(4):
                    if i != self.currentPlayer and self.players[i].alive:
                        if len(self.players[i].hand) > 4 and len([i for i in [41,40] if i in self.players[self.currentPlayer].hand]) > 0:
                            bftar.append(i)
                        if len(self.players[i].hand) > 5 and len([i for i in [35,34,33] if i in self.players[self.currentPlayer].hand]) > 0:
                            hhtar.append(i)
                        if len(self.players[i].bank) > 4 and len([i for i in [39,38] if i in self.players[self.currentPlayer].hand]) > 0:
                            gdtar.append(i)
                        if len(self.players[i].bank) > 5 and len([i for i in [32,31,30] if i in self.players[self.currentPlayer].hand]) > 0:
                            cftar.append(i)
                        rednum = 0
                        for j in self.players[i].hand:
                            if j >= 38:
                                rednum += 1
                        if rednum != 0  and len([i for i in [42] if i in self.players[self.currentPlayer].hand]) > 0:
                            bstar.append(i)
                        if rednum > 1  and len([i for i in [37,36] if i in self.players[self.currentPlayer].hand]) > 0:
                            rhtar.append(i)
                
                if len(rhtar) + len(bstar) + len(bftar) + len(gdtar) + len(hhtar) + len(cftar) > 0:
                    temp = out_data(in_data(self))
                    if len(rhtar) > 0:
                        ind = rhtar[0]
                        temp.players[ind].alive = False
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        if 37 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(37)
                        elif 36 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(36)
                        debt = 10
                        for i in range(len(temp.players[temp.currentPlayer].bank)):
                            if debt > 0:
                                if temp.players[temp.currentPlayer].bank[i] < 22:
                                    debt -= 1
                                elif temp.players[temp.currentPlayer].bank[i] < 38:
                                    debt -= 2
                                else:
                                    debt -= 3
                    elif len(bstar) > 0:
                        ind = bstar[0]
                        temp.players[ind].alive = False
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        if 42 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(42)
                        debt = 10
                        for i in range(len(temp.players[temp.currentPlayer].bank)):
                            if debt > 0:
                                if temp.players[temp.currentPlayer].bank[i] < 22:
                                    debt -= 1
                                elif temp.players[temp.currentPlayer].bank[i] < 38:
                                    debt -= 2
                                else:
                                    debt -= 3
                    elif len(bftar) > 0:
                        ind = bftar[0]
                        temp.players[ind].alive = False
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        if 41 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(41)
                        elif 40 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(40)
                        debt = 10
                        for i in range(len(temp.players[temp.currentPlayer].bank)):
                            if debt > 0:
                                if temp.players[temp.currentPlayer].bank[i] < 22:
                                    debt -= 1
                                elif temp.players[temp.currentPlayer].bank[i] < 38:
                                    debt -= 2
                                else:
                                    debt -= 3
                    elif len(gdtar) > 0:
                        ind = gdtar[0]
                        temp.players[ind].alive = False
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        if 39 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(39)
                        elif 38 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(38)
                        debt = 10
                        for i in range(len(temp.players[temp.currentPlayer].bank)):
                            if debt > 0:
                                if temp.players[temp.currentPlayer].bank[i] < 22:
                                    debt -= 1
                                elif temp.players[temp.currentPlayer].bank[i] < 38:
                                    debt -= 2
                                else:
                                    debt -= 3
                    elif len(hhtar) > 0:
                        ind = hhtar[0]
                        temp.players[ind].alive = False
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        if 35 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(35)
                        elif 34 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(34)
                        elif 33 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(33)
                        debt = 10
                        for i in range(len(temp.players[temp.currentPlayer].bank)):
                            if debt > 0:
                                if temp.players[temp.currentPlayer].bank[i] < 22:
                                    debt -= 1
                                elif temp.players[temp.currentPlayer].bank[i] < 38:
                                    debt -= 2
                                else:
                                    debt -= 3
                    elif len(cftar) > 0:
                        ind = cftar[0]
                        temp.players[ind].alive = False
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        for i in range(len(temp.players[ind].hand)):
                            temp.discardPile.append(temp.players[ind].hand.pop())
                        if 32 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(32)
                        elif 31 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(31)
                        elif 30 in temp.players[temp.currentPlayer].hand:
                            temp.players[temp.currentPlayer].hand.remove(30)
                        debt = 10
                        for i in range(len(temp.players[temp.currentPlayer].bank)):
                            if debt > 0:
                                if temp.players[temp.currentPlayer].bank[i] < 22:
                                    debt -= 1
                                elif temp.players[temp.currentPlayer].bank[i] < 38:
                                    debt -= 2
                                else:
                                    debt -= 3
                    temp.actions += 1
                    if temp.actions > 2:
                        temp.actions = 0
                        temp.currentPlayer = (temp.currentPlayer + 1)%4
                    numplaye = 0
                    for i in range(4):
                        if temp.players[i].alive:
                            numplaye += 1
                    while temp.players[temp.currentPlayer].alive == False and numplaye > 1:
                        temp.currentPlayer = (temp.currentPlayer + 1)%4
                    tempheur = temp.recurseAction(depth-1)[0]
                    
                
                
            newtemp = out_data(in_data(self))
            newtemp.players[newtemp.currentPlayer].hand.append(newtemp.drawPile.pop())
            if len(newtemp.drawPile) == 0:
                newtemp.players[newtemp.currentPlayer].alive = False
                for i in range(len(newtemp.players[newtemp.currentPlayer].hand)):
                    newtemp.discardPile.append(newtemp.players[newtemp.currentPlayer].hand.pop())
                for i in range(len(newtemp.players[newtemp.currentPlayer].hand)):
                    newtemp.discardPile.append(newtemp.players[newtemp.currentPlayer].hand.pop())
                for i in range(len(newtemp.discardPile)):
                    newtemp.drawPile.append(newtemp.discardPile.pop(random.randint(0,len(newtemp.discardPile)-1)))
                newtemp.actions = -1
                newtemp.currentPlayer = (newtemp.currentPlayer + 1)%4
            newtemp.actions += 1
            if newtemp.actions > 2:
                newtemp.actions = 0
                newtemp.currentPlayer = (newtemp.currentPlayer + 1)%4
            numplaye = 0
            for i in range(4):
                if newtemp.players[i].alive:
                    numplaye += 1
            while newtemp.players[newtemp.currentPlayer].alive == False and numplaye > 1:
                newtemp.currentPlayer = (newtemp.currentPlayer + 1)%4
            newtempheur = newtemp.recurseAction(depth-1)[0]
            if newtempheur > tempheur:
                temp = out_data(in_data(newtemp))
                tempheur = newtempheur

            for i in range(len(self.players[self.currentPlayer].hand)):
                newtemp = out_data(in_data(self))
                # print(in_data(newtemp))
                # print(i)
                newtemp.players[newtemp.currentPlayer].bank.append(newtemp.players[newtemp.currentPlayer].hand.pop(i))
                newtemp.actions += 1
                if newtemp.actions > 2:
                    newtemp.actions = 0
                    newtemp.currentPlayer = (newtemp.currentPlayer + 1)%4
                numplaye = 0
                for i in range(4):
                    if newtemp.players[i].alive:
                        numplaye += 1
                while newtemp.players[newtemp.currentPlayer].alive == False and numplaye > 1:
                    newtemp.currentPlayer = (newtemp.currentPlayer + 1)%4
                newtempheur = newtemp.recurseAction(depth-1)[0]
                if newtempheur > tempheur:
                    temp = out_data(in_data(newtemp))
                    tempheur = newtempheur
            temp
            return [tempheur,temp]

                

    def play(self, brain):
        
        fit = 0
        for i in range(10):
            left = 4
            while left > 1:
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
            self.restart()
        brain.wins = fit

game = Game()

def out_data(obj):
    temp = Game()
    temp.actions = obj["actions"]
    temp.drawPile = obj["drawPile"]
    temp.discardPile = obj["discardPile"]
    temp.unusedMarks = obj["unusedMarks"]
    temp.extraMark = obj["extraMark"]
    temp.bounties = obj["bounties"]
    temp.skips = obj["skips"]
    temp.currentPlayer = obj["currentPlayer"]
    temp.actions = obj["actions"]
    for i in range(len(temp.players)):
        temp.players[i].hand = obj["players"][i]["hand"]
        temp.players[i].bank = obj["players"][i]["bank"]
        temp.players[i].knowledge = obj["players"][i]["knowledge"]
        temp.players[i].mark = obj["players"][i]["mark"]
        temp.players[i].alive = obj["players"][i]["alive"]
    return temp

def in_data(temp):
    res = {
        "actions": temp.actions,
        "drawPile": temp.drawPile.copy(),
        "discardPile": temp.discardPile.copy(),
        "unusedMarks": temp.unusedMarks.copy(),
        "extraMark": temp.extraMark,
        "bounties": temp.bounties.copy(),
        "skips": temp.skips.copy(),
        "currentPlayer": temp.currentPlayer,
        "actions": temp.actions,
        "players": []
    }
    for i in temp.players:
        res["players"].append({
            "hand": i.hand.copy(),
            "bank": i.bank.copy(),
            "knowledge": i.knowledge,
            "mark": i.mark,
            "alive": i.alive
        })
    return res

wins = 0
games = 100
for p in range(games):
    print(f"Game #{p}")
    numplayers = 4
    while numplayers > 1:
        if game.currentPlayer == 0:
            #game.randAction()
            #game.smartAction()
            game = out_data(in_data(game.recurseAction(1)[1]))
        else:
            game.randAction()
        numplayersl = []
        for i in range(4):
            if game.players[i].alive:
                numplayersl.append(i)
        numplayers = len(numplayersl)
    if numplayersl[0] == 0:
        wins += 1
    game.restart()

print("wins", wins/games) 



def findBest(g, depth):
    money = 0
    for i in g["players"][g["currentPlayer"]]["bank"]:
        if i < 22:
            money += 1
        elif i < 38:
            money += 2
        else:
            money += 3
    #draw
    drawg = g.copy()
    drawg["players"][drawg["currentPlayer"]]["hand"].append(drawg["drawPile"].pop())
    # if len(drawg["drawPile"]) == 0:
    #     for i in 





def end_action():
    game.actions += 1
    if game.actions > 2:
        game.currentPlayer = (game.currentPlayer+1)%4
        while game.currentPlayer in game.skips:
            for i in game.bounties:
                i = max(0,i-1)
            game.skips.remove(game.currentPlayer)
            game.currentPlayer = (game.currentPlayer+1)%4
        for i in game.bounties:
            i = max(0,i-1)
        game.actions = 0

# from flask import Flask, render_template, request, redirect, url_for
# import database

# database.update_data(in_data())

# app = Flask(__name__)

# @app.route("/")
# def get_game():
#     g = database.retrieve_data()
#     g.pop("_id")
#     out_data(g)
#     print(game.possible())
#     return g

# @app.route("/draw")
# def draw():
#     g = database.retrieve_data()
#     out_data(g)
#     v = [1]
#     v.extend([0]*216)
#     game.action(v)
#     end_action()
#     g = in_data()
#     database.update_data(g)
#     return redirect(url_for('get_game'))

# @app.route("/bank/<id>")
# def bank(id):
#     g = database.retrieve_data()
#     out_data(g)
#     v = [0,1]
#     v.extend([0]*int(id))
#     v.extend([1])
#     v.extend([0]*(214-int(id)))
#     good = True
#     check = game.possible()
#     for i in range(len(check)):
#         if check[i]*v[i] != v[i]:
#             good = False
#             print("bad move")
#     if good:
#         game.action(v)
#         end_action()
#         g = in_data()
#         database.update_data(g)
#     return redirect(url_for('get_game'))

# if __name__ == "__main__":
#     app.run(debug=True)
