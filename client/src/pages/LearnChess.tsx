import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import EditChessBoard from '../components/EditChessBoard';

function LearnChess() {
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [arrows, setArrows] = useState<Array<[string, string]>>([]);
  const [showEditor, setShowEditor] = useState(false);

  // Debug logs
  console.log('[LearnChess] Render', { fen, arrows, showEditor });

  // Force re-render when arrows change
  useEffect(() => {
    console.log('[LearnChess] Arrows changed:', arrows);
  }, [arrows]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-8">
      <h1 className="text-2xl font-bold mb-4">Learn Chess</h1>
      <div className="mb-4">
        <Chessboard 
          position={fen} 
          boardWidth={400} 
          customArrows={arrows}
          key={`${fen}-${arrows.length}-${JSON.stringify(arrows)}`}
        />
      </div>
      <button
        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition mb-8"
        onClick={() => {
          console.log('[LearnChess] Opening editor', { fen, arrows });
          setShowEditor(true);
        }}
      >
        Setup Board
      </button>

      {/* Modal for editing the board */}
      {showEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex flex-col">
          <div className="flex flex-col h-full w-full bg-white">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-semibold">Edit Chess Board</h2>
              <button
                className="text-gray-500 hover:text-gray-800 text-3xl font-bold"
                onClick={() => {
                  console.log('[LearnChess] Closing editor (cancel)', { fen, arrows });
                  setShowEditor(false);
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <EditChessBoard
                fen={fen}
                onSave={(newFen: string, newArrows: Array<[string, string]>) => {
                  console.log('[LearnChess] Saving from editor', { newFen, newArrows });
                  setFen(newFen);
                  setArrows(newArrows);
                  setShowEditor(false);
                }}
                onCancel={() => setShowEditor(false)}
                arrows={arrows}
                setArrows={setArrows}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LearnChess;