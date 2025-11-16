import React from 'react';
import { useDrag } from 'react-dnd';
import { getCardColor, getCardName, getCardDescription } from '../utils/cardInfo';
import '../styles/Card.css';

const CARD_TYPE = 'card';

function Card({ cardId, index, location, onPlay, onBank, showBack = false }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: CARD_TYPE,
    item: { cardId, index, location },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    canDrag: !showBack && (location === 'hand')
  }));

  const color = getCardColor(cardId);
  const name = getCardName(cardId);
  const description = getCardDescription(name);

  const handleClick = () => {
    if (location === 'hand' && !showBack) {
      // Show action menu
      const action = window.confirm(`${name}\n\n${description}\n\nPlay this card?`);
      if (action && onPlay) {
        onPlay(cardId, index);
      }
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    if (location === 'hand' && !showBack && onBank) {
      const confirm = window.confirm(`Bank this ${name} card?`);
      if (confirm) {
        onBank(cardId, index);
      }
    }
  };

  return (
    <div
      ref={drag}
      className={`card ${color} ${showBack ? 'card-back' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: location === 'hand' && !showBack ? 'pointer' : 'default'
      }}
    >
      {!showBack ? (
        <>
          <div className="card-header">
            <span className="card-name">{name}</span>
          </div>
          <div className="card-body">
            <div className={`card-color-indicator ${color}`}></div>
          </div>
          <div className="card-footer">
            <span className="card-value">Value: {color === 'white' ? 1 : color === 'blue' ? 2 : 3}</span>
          </div>
        </>
      ) : (
        <div className="card-back-design">
          <div className="card-back-pattern"></div>
        </div>
      )}
    </div>
  );
}

export default Card;
