import React, { useState, useEffect, useRef } from "react";
import { Chessboard } from "react-chessboard";
import { Button } from "@/components/ui/button";

interface EditChessBoardProps {
  fen: string;
  onSave: (fen: string, arrows: Array<[string, string]>) => void;
  onCancel: () => void;
  arrows: Array<[string, string]>;
  setArrows: React.Dispatch<React.SetStateAction<Array<[string, string]>>>;
}

const PIECES = [
  { code: "wK", symbol: "♔" },
  { code: "wQ", symbol: "♕" },
  { code: "wR", symbol: "♖" },
  { code: "wB", symbol: "♗" },
  { code: "wN", symbol: "♘" },
  { code: "wP", symbol: "♙" },
  { code: "bK", symbol: "♚" },
  { code: "bQ", symbol: "♛" },
  { code: "bR", symbol: "♜" },
  { code: "bB", symbol: "♝" },
  { code: "bN", symbol: "♞" },
  { code: "bP", symbol: "♟" },
];

const EMPTY_BOARD = Array(8)
  .fill(null)
  .map(() => Array(8).fill(null));

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function fenToBoard(fen: string) {
  // Only parse the piece placement part
  const rows = fen.split(" ")[0].split("/");
  const board = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    let i = 0;
    for (const c of rows[r]) {
      if (c >= "1" && c <= "8") {
        for (let k = 0; k < parseInt(c); k++) row.push(null);
      } else {
        let color = c === c.toUpperCase() ? "w" : "b";
        let type = c.toUpperCase();
        row.push(color + type);
      }
    }
    board.push(row);
  }
  return board;
}

function boardToFen(board: (string | null)[][]) {
  let fen = "";
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) {
        empty++;
      } else {
        if (empty > 0) {
          fen += empty;
          empty = 0;
        }
        const [color, type] = [piece[0], piece[1]];
        fen += color === "w" ? type.toUpperCase() : type.toLowerCase();
      }
    }
    if (empty > 0) fen += empty;
    if (r < 7) fen += "/";
  }
  // Always append default fields
  fen += " w - - 0 1";
  return fen;
}

export default function EditChessBoard({ fen, onSave, onCancel, arrows, setArrows }: EditChessBoardProps) {
  const [board, setBoard] = useState<(string | null)[][]>(() => fen ? fenToBoard(fen) : EMPTY_BOARD.map(row => [...row]));
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [draggedPiece, setDraggedPiece] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<string | null>(null);
  const arrowStartRef = useRef<string | null>(null);

  // Update board if fen prop changes
  useEffect(() => {
    setBoard(fen ? fenToBoard(fen) : EMPTY_BOARD.map(row => [...row]));
  }, [fen]);

  // Keyboard shortcuts: Enter = Save, Escape = Cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, onCancel]);

  // Save to localStorage on board change
  // useEffect(() => {
  //   localStorage.setItem("editboard_fen", boardToFen(board));
  // }, [board]);

  // Debug logs
  console.log('[EditChessBoard] Render', { fen, arrows });

  function handleSquareClick(square: string) {
    const file = square.charCodeAt(0) - "a".charCodeAt(0);
    const rank = 8 - parseInt(square[1]);
    setBoard(prev => {
      const newBoard = prev.map(row => [...row]);
      if (selectedPiece === "remove") {
        newBoard[rank][file] = null;
      } else if (selectedPiece) {
        newBoard[rank][file] = selectedPiece;
      } else if (prev[rank][file]) {
        // If no piece selected, clicking a piece selects it for drag
        setSelectedPiece(prev[rank][file]);
      }
      return newBoard;
    });
  }

  function handlePieceDrop(sourceSquare: string, targetSquare: string, piece: string) {
    const sFile = sourceSquare.charCodeAt(0) - "a".charCodeAt(0);
    const sRank = 8 - parseInt(sourceSquare[1]);
    const tFile = targetSquare.charCodeAt(0) - "a".charCodeAt(0);
    const tRank = 8 - parseInt(targetSquare[1]);
    setBoard(prev => {
      const newBoard = prev.map(row => [...row]);
      newBoard[tRank][tFile] = newBoard[sRank][sFile];
      newBoard[sRank][sFile] = null;
      return newBoard;
    });
    return true;
  }

  function handleClearBoard() {
    setBoard(EMPTY_BOARD.map(row => [...row]));
  }

  function handleStartPosition() {
    setBoard(fenToBoard(START_FEN));
  }

  function handleSave() {
    const fenStr = boardToFen(board);
    onSave(fenStr, arrows);
  }

  // Arrow drawing handlers
  function handleArrow(square: string) {
    // Right click or shift+click
    const event = window.event as MouseEvent | undefined;
    if (event && (event.button === 2 || event.shiftKey)) {
      if (arrowStartRef.current && arrowStartRef.current !== square) {
        const arrow: [string, string] = [arrowStartRef.current, square];
        setArrows(prev => {
          const exists = prev.some(([from, to]) => from === arrow[0] && to === arrow[1]);
          const updated = exists ? prev.filter(([from, to]) => !(from === arrow[0] && to === arrow[1])) : [...prev, arrow];
          console.log('[EditChessBoard] setArrows', updated);
          return updated;
        });
        arrowStartRef.current = null;
      } else {
        arrowStartRef.current = square;
      }
      if (event) event.preventDefault();
    }
  }
  function handleContextMenu(e: React.MouseEvent) {
    // Prevent default context menu on board
    e.preventDefault();
  }

  return (
    <div className="flex flex-col items-center py-8 min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      <h2 className="text-2xl font-bold text-white mb-4">Edit Chess Board</h2>
      <div className="flex flex-col md:flex-row gap-8">
        <div onContextMenu={handleContextMenu}>
          <Chessboard
            position={boardToFen(board)}
            onSquareClick={(square) => {
              handleSquareClick(square);
              const event = window.event as MouseEvent | undefined;
              if (event && event.shiftKey) handleArrow(square);
            }}
            onSquareRightClick={handleArrow}
            onPieceDrop={handlePieceDrop}
            arePiecesDraggable={true}
            boardWidth={400}
            customArrows={arrows}
          />
        </div>
        <div className="flex flex-col gap-4">
          <div className="bg-slate-700 rounded-lg p-4 flex flex-col items-center">
            <div className="mb-2 text-white font-semibold">Piece Palette</div>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {PIECES.map(p => (
                <button
                  key={p.code}
                  className={`text-2xl p-2 rounded-lg border-2 focus:outline-none transition-all duration-150 ${
                    selectedPiece === p.code ? "bg-blue-500 border-blue-300" : "bg-slate-800 border-slate-600 hover:bg-slate-600"
                  }`}
                  onClick={() => setSelectedPiece(p.code)}
                >
                  {p.symbol}
                </button>
              ))}
              <button
                className={`text-lg p-2 rounded-lg border-2 focus:outline-none transition-all duration-150 ${
                  selectedPiece === "remove" ? "bg-red-500 border-red-300" : "bg-slate-800 border-slate-600 hover:bg-slate-600"
                }`}
                onClick={() => setSelectedPiece("remove")}
              >
                Remove
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" onClick={handleStartPosition} className="bg-green-700 hover:bg-green-800 text-white">Start Position</Button>
              <Button size="sm" onClick={handleClearBoard} className="bg-yellow-700 hover:bg-yellow-800 text-white">Clear Board</Button>
              <Button size="sm" onClick={handleSave} className="bg-blue-700 hover:bg-blue-800 text-white">Save</Button>
            </div>
            <div className="mt-4 text-xs text-slate-300 text-center">
              Click a piece, then click a square to place it. Drag pieces to move. Click Remove, then a square to erase.<br/>
              <span className="block mt-2">Press <b>Enter</b> to save, <b>Esc</b> to cancel.<br/>Right-click and drag or Shift+drag to draw arrows.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 