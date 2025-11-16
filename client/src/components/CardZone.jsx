import React from 'react';
import { useDrop } from 'react-dnd';
import Card from './Card';
import '../styles/CardZone.css';

const CARD_TYPE = 'card';

function CardZone({ cards, zoneName, onDrop, onPlay, onBank, showBacks = false, playerName, isCurrentPlayer }) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: CARD_TYPE,
    drop: (item) => {
      if (onDrop) {
        onDrop(item, zoneName);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  return (
    <div
      ref={drop}
      className={`card-zone ${zoneName} ${isOver ? 'drop-over' : ''} ${isCurrentPlayer ? 'current-player' : ''}`}
    >
      <div className="zone-header">
        <h3>{playerName ? `${playerName}'s ${zoneName}` : zoneName}</h3>
        <span className="card-count">{cards?.length || 0} cards</span>
      </div>
      <div className="zone-content">
        {cards && cards.map((cardId, index) => (
          <Card
            key={`${cardId}-${index}`}
            cardId={cardId}
            index={index}
            location={zoneName}
            onPlay={onPlay}
            onBank={onBank}
            showBack={showBacks}
          />
        ))}
        {(!cards || cards.length === 0) && (
          <div className="empty-zone">No cards</div>
        )}
      </div>
    </div>
  );
}

export default CardZone;
