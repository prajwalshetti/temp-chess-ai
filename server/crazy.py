import chess
import chess.engine
import chess.pgn
from io import StringIO

STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"

# Hardcoded PGN for the game
HARDCODED_PGN = """
[Event "?"]
[Site "?"]
[Date "????.??.??"]
[Round "?"]
[White "?"]
[Black "?"]
[Result "*"]

1. e4 e5
2. Nf3 Nc6
3. Nc3 Nf6
4. Be2 g6
5. O-O Bg7
6. Re1 Qe7
7. Nb5 O-O
8. h3 Re8
9. Nxc7 Rd8
10. Nxa8 Ng4
11.hxg4
"""

# Parse the PGN and play all moves
pgn = StringIO(HARDCODED_PGN)
game = chess.pgn.read_game(pgn)
if game is None:
    print("Failed to parse PGN.")
    exit(1)

board = game.board()
positions = [board.copy()]
played_moves = [None]  # For the initial position, no move played
for move in game.mainline_moves():
    san = board.san(move)
    board.push(move)
    positions.append(board.copy())
    played_moves.append(san)

results = []

with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
    for idx, pos in enumerate(positions):
        info = engine.analyse(pos, chess.engine.Limit(depth=15))
        best_line = info.get("pv", [])
        best_move = best_line[0] if best_line else None
        score = info.get("score")
        evaluation = score.white().score(mate_score=10000) / 100.0 if score else None

        # Convert moves to SAN
        san_best_move = pos.san(best_move) if best_move else None
        san_best_line = []
        temp_board = pos.copy()
        for move in best_line:
            san_best_line.append(temp_board.san(move))
            temp_board.push(move)

        results.append({
            "move_number": idx,
            "fen_after_move_played": pos.fen(),
            "move_played": played_moves[idx],
            "next_best_move": san_best_move,
            "next_best_line": san_best_line,
            "evaluation_after_move_played": evaluation,
        })

for i in range(1,len(results)):
    results[i]['current_best_move'] = results[i-1]['next_best_move']
    results[i]['current_best_line'] = results[i-1]['next_best_line']
    results[i]['current_best_evaluation'] = results[i-1]['evaluation_after_move_played']


def print_blunders(results, threshold=2.0):
    for i in range(1, len(results)):
        eval_after_move = results[i]['evaluation_after_move_played']
        eval_best_prev = results[i]['current_best_evaluation']
        if eval_after_move is not None and eval_best_prev is not None:
            if abs(eval_after_move - eval_best_prev) > threshold:
                res=results[i]
                idx=i
                print(f"  Move number: {res['move_number']}")
                print(f"  Move played: {res['move_played']}")
                print(f"  Fen: {res['fen_after_move_played']}")
                print(f"  Evaluation after move played : {res['evaluation_after_move_played']}")
                if idx > 0:
                    print(f"  Current Best move : {res['current_best_move']}")
                    print(f"  Current Best line : {' '.join(res['current_best_line'])}")
                    print(f"  Current Best Evaluation : {res['current_best_evaluation']}")
                print(f"  Next Best move : {res['next_best_move']}")
                print(f"  Next Best line : {' '.join(res['next_best_line'])}")
                print()
print_blunders(results, threshold=2.0)

def print_all_moves(results):
    for idx,res in enumerate(results):
        print(f"  Move number: {res['move_number']}")
        print(f"  Move played: {res['move_played']}")
        print(f"  Fen: {res['fen_after_move_played']}")
        print(f"  Evaluation after move played : {res['evaluation_after_move_played']}")
        if idx > 0:
            print(f"  Current Best move : {res['current_best_move']}")
            print(f"  Current Best line : {' '.join(res['current_best_line'])}")
            print(f"  Current Best Evaluation : {res['current_best_evaluation']}")
        print(f"  Next Best move : {res['next_best_move']}")
        print(f"  Next Best line : {' '.join(res['next_best_line'])}")
        print()
# print_all_moves(results)