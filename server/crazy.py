from unittest import result
import chess
import chess.engine
import chess.pgn
from io import StringIO
import re

STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"

# Hardcoded PGN for the game
HARDCODED_PGN1 = "1. e4 e5 2. Nf3 Nc6 3. Nc3 Nf6 4. Be2 g6 5. O-O Bg7 6. Re1 Qe7 7. Nb5 O-O 8. h3 Re8 9. Nc3 Ng4"

HARDCODED_PGN2 = "1. e4 e5 2. Bc4 Bc5 3. Qh5 Nc6 4. Nc3 Qf6 5. Kf1 Qxf2"

HARDCODED_PGN3 = "1. e4 e5 2. Bc4 Bd6 3. Qh5 Nc6 4. Nc3 Qf6 5. Nd1 Qxf2"

# Parse the PGN and play all moves
pgn = StringIO(HARDCODED_PGN3)
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
mate_in_one = []
mate_in_two = []
mate_in_three = []
mate_allowed = {"white": [], "black": []}
mate_missed = {"white": [], "black": []}
forks_missed = {"white": [], "black": []}
forks_allowed = {"white": [], "black": []}
forks_executed = {"white": [], "black": []}
hanging_allowed = {"white": [], "black": []}
hanging_missed = {"white": [], "black": []}
hanging_executed = {"white": [], "black": []}
blunders=[]


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
    results[i]['fen_before_move_played']=results[i-1]['fen_after_move_played']

def check_for_mate(results,i,isWhite):
    res=results[i]
    if any('#' in move for move in res['next_best_line']):
        if isWhite: mate_allowed["white"].append(res)
        else : mate_allowed["black"].append(res)
    elif any('#' in move for move in res['current_best_line']):
        if isWhite: mate_missed["white"].append(res)
        else : mate_missed["black"].append(res)

def check_for_forks(results,i,isWhite):
    res=results[i]
    best_move = res.get('next_best_move')
    best_line=res.get('next_best_line')
    fen = res.get('fen_after_move_played')
    if not (best_move and best_move.startswith('N')):
        return

    m = re.search(r'([a-h][1-8])$', best_move)
    if not m:
        return
    to_square = chess.parse_square(m.group(1))

    board = chess.Board(fen)
    try:
        move = next((m for m in board.legal_moves if board.san(m) == best_move), None)
        if not move:
            return
        board.push(move)
    except Exception:
        return

    piece = board.piece_at(to_square)
    if not piece or piece.piece_type != chess.KNIGHT:
        return

    attacks = board.attacks(to_square)
    if sum(1 for sq in attacks if (t := board.piece_at(sq)) and t.color != piece.color and t.piece_type != chess.PAWN) >= 2:
        if len(best_line) < 3:
            return
        enginefirst=best_line[0]
        enginesecond=best_line[2]
        if enginefirst.startswith('N') and enginesecond.startswith('N'):
            if isWhite: forks_allowed["white"].append(results[i])
            else: forks_allowed["black"].append(results[i])
        else:
            return

        if i+1>=len(results):
            return

        userfirst=results[i+1].get('move_played')
        if userfirst!=enginefirst:
            if isWhite:forks_missed["black"].append(results[i+1])
            else:forks_missed["white"].append(results[i+1])
        elif i+3>=len(results):
            if isWhite:forks_executed["black"].append(results[i+1])
            else:forks_executed["white"].append(results[i+1])
        elif results[i+3].get('move_played').startswith('N') and results[i+3].get('move_played')[1]=='x':
            if isWhite:forks_executed["black"].append(results[i+1])
            else:forks_executed["white"].append(results[i+1])

def check_for_hanging(results, i, isWhite):
    print("hi")
    res = results[i]
    best_move_san = res.get('next_best_move')
    best_line = res.get('next_best_line')
    fen = res.get('fen_after_move_played')

    if not best_move_san or 'x' not in best_move_san:
        return

    board = chess.Board(fen)
    try:
        move = board.parse_san(best_move_san)
        to_square = move.to_square
    except:
        return

    print("hello")
    defenders = board.attackers(chess.BLACK if not isWhite else chess.WHITE, to_square)

    if defenders:
        print(i,defenders)
        return

    if isWhite: hanging_allowed["white"].append(results[i])
    else: hanging_allowed["black"].append(results[i])

    if i+1<len(results):
        if results[i+1].get("move_played")==best_move_san:
            if isWhite: hanging_executed["black"].append(results[i+1])
            else: hanging_executed['white'].append(results[i+1])
        else:
            if isWhite: hanging_missed["black"].append(results[i+1])
            else: hanging_missed['white'].append(results[i+1])
        



def calculate_blunders(results, threshold=2.0):
    for i in range(1, len(results)):
        if i%2==0: isWhite=False
        else : isWhite=True
        eval_after_move = results[i]['evaluation_after_move_played']
        eval_best_prev = results[i]['current_best_evaluation']
        if eval_after_move is not None and eval_best_prev is not None:
            if abs(eval_after_move - eval_best_prev) > threshold:
                check_for_mate(results,i,isWhite)  
                check_for_forks(results,i,isWhite)
                check_for_hanging(results,i,isWhite)                
                # check_for_fork_missed(results[i])                 
                blunders.append(results[i])
calculate_blunders(results, threshold=2.0)

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
            print(f"  Fen before : {res['fen_after_move_played']}")
        print(f"  Next Best move : {res['next_best_move']}")
        print(f"  Next Best line : {' '.join(res['next_best_line'])}")
        print()
# print_all_moves(results)

def print_all_blunders(blunders):
    for idx,res in enumerate(blunders):
        print(f"  Move number: {res['move_number']}")
        print(f"  Move played: {res['move_played']}")
        print(f"  Fen: {res['fen_after_move_played']}")
        print(f"  Evaluation after move played : {res['evaluation_after_move_played']}")
        if idx > 0:
            print(f"  Current Best move : {res['current_best_move']}")
            print(f"  Current Best line : {' '.join(res['current_best_line'])}")
            print(f"  Current Best Evaluation : {res['current_best_evaluation']}")
            print(f"  Fen before : {res['fen_after_move_played']}")
        print(f"  Next Best move : {res['next_best_move']}")
        print(f"  Next Best line : {' '.join(res['next_best_line'])}")
        print()
# print_all_blunders(blunders)

print("mate allowed")
print(mate_allowed)
print()

print("mate missed")
print(mate_missed)
print()

print("forks allowed")
print(forks_allowed)
print()

print("forks missed")
print(forks_missed)
print()

print("forks executed")
print(forks_executed)
print()

print("hanging allowed")
print(hanging_allowed)
print()

print("hanging missed")
print(hanging_missed)
print()

print("hanging executed")
print(hanging_executed)
print()