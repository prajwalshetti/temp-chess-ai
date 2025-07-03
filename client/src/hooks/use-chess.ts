import { useState, useCallback } from "react";
import { Chess, Square } from "chess.js";

export function useChess(initialFen?: string) {
  const [chess] = useState(() => {
    const game = new Chess();
    if (initialFen) {
      try {
        game.load(initialFen);
      } catch (e) {
        console.warn("Invalid FEN provided, using starting position");
      }
    }
    return game;
  });

  const [fen, setFen] = useState(chess.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);

  const makeMove = useCallback((move: string | { from: Square; to: Square; promotion?: string }) => {
    try {
      const result = chess.move(move);
      if (result) {
        setFen(chess.fen());
        setMoveHistory(chess.history());
        setCurrentMoveIndex(chess.history().length - 1);
        return result;
      }
    } catch (e) {
      console.warn("Invalid move:", move);
    }
    return null;
  }, [chess]);

  const undoMove = useCallback(() => {
    const move = chess.undo();
    if (move) {
      setFen(chess.fen());
      setMoveHistory(chess.history());
      setCurrentMoveIndex(chess.history().length - 1);
    }
    return move;
  }, [chess]);

  const reset = useCallback(() => {
    chess.reset();
    setFen(chess.fen());
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
  }, [chess]);

  const loadPosition = useCallback((newFen: string) => {
    try {
      chess.load(newFen);
      setFen(chess.fen());
      setMoveHistory(chess.history());
      setCurrentMoveIndex(chess.history().length - 1);
      return true;
    } catch (e) {
      console.warn("Invalid FEN:", newFen);
      return false;
    }
  }, [chess]);

  const goToMove = useCallback((moveIndex: number) => {
    console.log(`Navigate to move ${moveIndex}, history length: ${moveHistory.length}`);
    
    if (moveIndex < -1 || moveIndex >= moveHistory.length) {
      console.log("Invalid move index");
      return;
    }
    
    // Always reset to starting position first
    chess.reset();
    
    // If moveIndex is -1, stay at starting position
    if (moveIndex >= 0) {
      // Play moves up to the target index
      for (let i = 0; i <= moveIndex; i++) {
        try {
          const move = chess.move(moveHistory[i]);
          console.log(`Played move ${i}: ${moveHistory[i]} -> ${move?.san || 'invalid'}`);
        } catch (e) {
          console.error(`Failed to play move ${i}: ${moveHistory[i]}`, e);
          break;
        }
      }
    }
    
    const newFen = chess.fen();
    console.log(`New position FEN: ${newFen}`);
    setFen(newFen);
    setCurrentMoveIndex(moveIndex);
  }, [chess, moveHistory]);

  const loadFromPgn = useCallback((pgn: string) => {
    try {
      console.log("Loading PGN:", pgn.substring(0, 100) + "...");
      chess.loadPgn(pgn);
      const history = chess.history();
      console.log("Move history loaded:", history);
      setMoveHistory(history);
      setCurrentMoveIndex(-1); // Start at beginning
      
      // Reset to starting position for navigation
      chess.reset();
      const startFen = chess.fen();
      console.log("Reset to starting FEN:", startFen);
      setFen(startFen);
      return true;
    } catch (e) {
      console.warn("Invalid PGN:", pgn, e);
      return false;
    }
  }, [chess]);

  const isGameOver = chess.isGameOver();
  const isCheck = chess.inCheck();
  const isCheckmate = chess.isCheckmate();
  const isStalemate = chess.isStalemate();
  const turn = chess.turn();

  return {
    chess,
    fen,
    moveHistory,
    currentMoveIndex,
    makeMove,
    undoMove,
    reset,
    loadPosition,
    loadFromPgn,
    goToMove,
    isGameOver,
    isCheck,
    isCheckmate,
    isStalemate,
    turn,
  };
}
