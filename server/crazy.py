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

HARDCODED_PGN4 = """1. e4 e5 
2. Nf3 Nc6 
3. Bc4 Bc5 
4. O-O Nf6 
5. Bb3 O-O 
6. Ne1 h6 
7. Kh1 Kh8 
8. f4 exf4 
9. a3 Ne5 
10. d4 d5 
11. dxc5
"""

HARDCODED_PGN5="""1. e4 e5
2. Nf3 Nf6
3. Nxe5 Nxe4
4. Qe2 Nf6
5. Nc6+
"""

# Parse the PGN and play all moves
pgn = StringIO(HARDCODED_PGN5)
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
double_allowed = {"white": [], "black": []}
double_missed = {"white": [], "black": []}
double_executed = {"white": [], "black": []}
blunders=[]
discovered_allowed = {"white": [], "black": []}
discovered_executed = {"white": [], "black": []}
discovered_missed = {"white": [], "black": []}


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

    defenders = board.attackers(chess.BLACK if not isWhite else chess.WHITE, to_square)

    if defenders:
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
        
def check_for_double(results, i, isWhite):
    res = results[i]
    best_move = res.get('next_best_move')
    best_line = res.get('next_best_line')
    fen = res.get('fen_after_move_played')

    if best_move[0]=='N':return
    
    #checking if the 3rd best move is capture or not
    if len(best_line)<3 or 'x' not in best_line[2]:
        return

    #making the best move
    try:
        board = chess.Board(fen)
        move = board.parse_san(best_move)
        if not move:
            return
        to_square = move.to_square
        board.push(move)
    except Exception:
        return

    #checking if the piece attacks >=2 valuable pieces
    attacks = board.attacks(to_square)
    if isWhite:enemy_color=True
    else : enemy_color=False

    valuable_targets = set()
    for sq in attacks:
        target = board.piece_at(sq)
        if target and target.color == enemy_color and target.piece_type != chess.PAWN:
            valuable_targets.add(sq)

    if len(valuable_targets) < 2:
        return
    
    #third move is capturing one of the valuable pieces
    captured_target_found = False
    if best_line and len(best_line) >= 3:
        try:
            third_move_san = best_line[2]
            temp_board = chess.Board(fen)
            for m in temp_board.legal_moves:
                if temp_board.san(m) == third_move_san:
                    third_move = m
                    if third_move.to_square in valuable_targets and third_move_san[1] == 'x':
                        captured_target_found = True
                        break
        except:
            pass

    if isWhite: double_allowed["white"].append(results[i])
    else: double_allowed["black"].append(results[i])

    if i + 1 >= len(results):
        return

    user_move = results[i + 1].get("move_played")
    engine_move = best_line[0] if best_line else None

    if user_move == engine_move:
        if isWhite:
            double_executed["black"].append(results[i + 1])
        else:
            double_executed["white"].append(results[i + 1])
    else:
        if isWhite:
            double_missed["black"].append(results[i + 1])
        else:
            double_missed["white"].append(results[i + 1])


def check_for_discovered(results, i, isWhite):
    res = results[i]
    best_move_san = res.get("next_best_move")
    best_line = res.get("next_best_line")
    fen_before = res.get("fen_before_move_played")

    if not best_move_san or '+' not in best_move_san:
        return  # No check in this move

    board = chess.Board(fen_before)
    
    try:
        move = board.parse_san(best_move_san)
    except:
        return

    moved_piece = board.piece_at(move.from_square)
    if not moved_piece or moved_piece.piece_type == chess.PAWN:
        return  # Skip pawns — they can’t cause discovered checks

    # Simulate the move
    board.push(move)

    color = chess.WHITE if isWhite else chess.BLACK
    enemy_color = not color
    king_sq = board.king(enemy_color)

    if king_sq is None:
        return

    attackers = board.attackers(color, king_sq)

    if len(attackers) >= 2 or (move.to_square not in attackers):
        # Discovered check (including double check)
        if isWhite:
            discovered_allowed["white"].append(results[i])
        else:
            discovered_allowed["black"].append(results[i])

        # Now check if user played the correct move
        if i + 1 < len(results):
            user_move = results[i + 1].get("move_played")
            engine_move = best_line[0] if best_line else None
            if user_move == engine_move:
                if isWhite:
                    discovered_executed["black"].append(results[i + 1])
                else:
                    discovered_executed["white"].append(results[i + 1])
            else:
                if isWhite:
                    discovered_missed["black"].append(results[i + 1])
                else:
                    discovered_missed["white"].append(results[i + 1])

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
                check_for_double(results, i, isWhite)
                check_for_discovered(results, i, isWhite)
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

print("double allowed")
print(double_allowed)
print()

print("double missed")
print(double_missed)
print()

print("double executed")
print(double_executed)
print()

print("discovered allowed")
print(discovered_allowed)
print()

print("discovered missed")
print(discovered_missed)
print()

print("discovered executed")
print(discovered_executed)
print()