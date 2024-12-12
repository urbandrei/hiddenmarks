from pprint import pprint
import mongita

from mongita import MongitaClientDisk
from bson.objectid import ObjectId

client = MongitaClientDisk()

hiddenmarks = client.hiddenmarks

def retrieve_data():
    game = hiddenmarks.game
    thegame = list(game.find())
    return thegame[-1]

def update_data(data):
    game = hiddenmarks.game
    game.insert_one(data)