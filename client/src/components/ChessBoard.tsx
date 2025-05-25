import { useState } from "react";
import { Chess, Square } from "chess.js";
import { cn } from "@/lib/utils";

interface ChessBoardProps {
  fen?: string;
  onMove?: (move: string) => void;
  className?: string;
  size?: number;
  interactive?: boolean;
}

export function ChessBoard({ 
  fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", 
  onMove,
  className,
  size = 400,
  interactive = true
}: ChessBoardProps) {
  const [chess] = useState(() => {
    const game = new Chess();
    try {
      game.load(fen);
    } catch (e) {
      // If invalid FEN, use starting position
    }
    return game;
  });
  
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);

  const board = chess.board();
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

  const getPieceSymbol = (piece: any) => {
    if (!piece) return '';
    
    const symbols: { [key: string]: string } = {
      'wp': '♙', 'wr': '♖', 'wn': '♘', 'wb': '♗', 'wq': '♕', 'wk': '♔',
      'bp': '♟', 'br': '♜', 'bn': '♞', 'bb': '♝', 'bq': '♛', 'bk': '♚'
    };
    
    return symbols[piece.color + piece.type] || '';
  };

  const getSquareName = (file: number, rank: number): Square => {
    return `${files[file]}${ranks[rank]}` as Square;
  };

  const isLightSquare = (file: number, rank: number) => {
    return (file + rank) % 2 === 0;
  };

  const handleSquareClick = (file: number, rank: number) => {
    if (!interactive) return;
    
    const square = getSquareName(file, rank);
    
    if (selectedSquare) {
      // Try to make a move
      try {
        const move = chess.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' // Always promote to queen for simplicity
        });
        
        if (move) {
          onMove?.(move.san);
          setSelectedSquare(null);
          setPossibleMoves([]);
          return;
        }
      } catch (e) {
        // Invalid move
      }
      
      // If move failed, try selecting new piece
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        const moves = chess.moves({ square, verbose: true });
        setPossibleMoves(moves.map(move => move.to as Square));
      } else {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    } else {
      // Select piece
      const piece = chess.get(square);
      if (piece && piece.color === chess.turn()) {
        setSelectedSquare(square);
        const moves = chess.moves({ square, verbose: true });
        setPossibleMoves(moves.map(move => move.to as Square));
      }
    }
  };

  const isSelected = (file: number, rank: number) => {
    return selectedSquare === getSquareName(file, rank);
  };

  const isPossibleMove = (file: number, rank: number) => {
    return possibleMoves.includes(getSquareName(file, rank));
  };

  return (
    <div 
      className={cn("inline-block p-4 chess-cream rounded-lg shadow-lg", className)}
      style={{ width: size + 32, height: size + 32 }}
    >
      <div 
        className="grid grid-cols-8 gap-0 rounded-lg overflow-hidden"
        style={{ width: size, height: size }}
      >
        {ranks.map((rank, rankIndex) =>
          files.map((file, fileIndex) => {
            const piece = board[rankIndex][fileIndex];
            const isLight = isLightSquare(fileIndex, rankIndex);
            const selected = isSelected(fileIndex, rankIndex);
            const canMoveTo = isPossibleMove(fileIndex, rankIndex);
            
            return (
              <div
                key={`${file}${rank}`}
                className={cn(
                  "aspect-square flex items-center justify-center text-3xl cursor-pointer transition-colors relative",
                  isLight ? "chess-light" : "chess-dark",
                  selected && "ring-4 ring-yellow-400",
                  canMoveTo && "ring-2 ring-green-400",
                  interactive && (isLight ? "hover:bg-yellow-200" : "hover:bg-yellow-600")
                )}
                onClick={() => handleSquareClick(fileIndex, rankIndex)}
                style={{ fontSize: `${size / 12}px` }}
              >
                {piece && (
                  <span className={piece.color === 'w' ? 'text-gray-800' : 'text-black'}>
                    {getPieceSymbol(piece)}
                  </span>
                )}
                {canMoveTo && !piece && (
                  <div className="w-3 h-3 bg-green-500 rounded-full opacity-60" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
