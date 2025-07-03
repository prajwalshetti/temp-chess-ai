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
    if (moveIndex < -1 || moveIndex >= moveHistory.length) return;
    
    // Reset to starting position
    const startFen = chess.history().length > 0 ? 
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" : 
      chess.fen();
    
    chess.load(startFen);
    
    // Play moves up to the target index
    for (let i = 0; i <= moveIndex; i++) {
      chess.move(moveHistory[i]);
    }
    
    setFen(chess.fen());
    setCurrentMoveIndex(moveIndex);
  }, [chess, moveHistory]);

  const loadFromPgn = useCallback((pgn: string) => {
    try {
      chess.loadPgn(pgn);
      setFen(chess.fen());
      setMoveHistory(chess.history());
      setCurrentMoveIndex(chess.history().length - 1);
      return true;
    } catch (e) {
      console.warn("Invalid PGN:", pgn);
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
