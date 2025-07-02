import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export function ChessBoard({ 
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
  onMove,
  className,
  size = 400,
  interactive = true
}) {
  const [game, setGame] = useState(() => {
    const chess = new Chess();
    try {
      chess.load(fen);
    } catch (e) {
      // If invalid FEN, use starting position
    }
    return chess;
  });

  const [gamePosition, setGamePosition] = useState(game.fen());

  useEffect(() => {
    try {
      const newGame = new Chess();
      newGame.load(fen);
      setGame(newGame);
      setGamePosition(newGame.fen());
    } catch (e) {
      console.warn("Invalid FEN provided:", fen);
    }
  }, [fen]);

  function makeAMove(move) {
    const gameCopy = new Chess();
    gameCopy.load(game.fen());
    
    try {
      const result = gameCopy.move(move);
      if (result) {
        setGame(gameCopy);
        setGamePosition(gameCopy.fen());
        if (onMove) {
          onMove(result.san);
        }
        return true;
      }
    } catch (e) {
      console.warn("Invalid move:", move);
    }
    return false;
  }

  function onDrop(sourceSquare, targetSquare) {
    if (!interactive) return false;
    
    const move = makeAMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q" // Always promote to queen for simplicity
    });

    return move;
  }

  return (
    <div className={className} style={{ width: size, height: size }}>
      <Chessboard
        position={gamePosition}
        onPieceDrop={onDrop}
        boardOrientation="white"
        arePiecesDraggable={interactive}
        customBoardStyle={{
          borderRadius: "4px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}
        customDarkSquareStyle={{ backgroundColor: "#769656" }}
        customLightSquareStyle={{ backgroundColor: "#eeeed2" }}
      />
    </div>
  );
}