import os
import chess
import chess.engine
import chess.pgn
from io import StringIO
from supabase import create_client, Client
import re

# === CONFIG ===
SUPABASE_URL = "https://gkkrualuovkaxncgeqxc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3J1YWx1b3ZrYXhuY2dlcXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5MjM4MSwiZXhwIjoyMDY3MjY4MzgxfQ.F0Ea9w_Lyi3s6oS8FCoMsPvPWjoO3sYij0538HsDIC4"
STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# === TACTIC: Mate-In-One Check ===
def check_for_mate(results, i, is_white, mate_allowed, mate_missed):
    res = results[i]
    # If engine suggests a forced mate
    if any('#' in move for move in res.get('next_best_line', [])):
        (mate_allowed["white"] if is_white else mate_allowed["black"]).append(res)
    # If previous best line had a mate, and user missed it
    elif any('#' in move for move in res.get('current_best_line', [])):
        (mate_missed["white"] if is_white else mate_missed["black"]).append(res)

# === BLUNDER + MATE DETECTION ===
def calculate_blunders(results, threshold=2.0):
    blunders = []
    mate_allowed = {"white": [], "black": []}
    mate_missed = {"white": [], "black": []}

    for i in range(1, len(results)):
        eval_after = results[i]['evaluation_after_move_played']
        eval_before = results[i]['current_best_evaluation']
        if eval_after is not None and eval_before is not None:
            if abs(eval_after - eval_before) > threshold:
                is_white = (i % 2 == 1)
                check_for_mate(results, i, is_white, mate_allowed, mate_missed)
                blunders.append(results[i])
    return blunders, mate_allowed, mate_missed

# === TACTICAL DETECTION FUNCTIONS (from crazy.py) ===
def check_for_mate(results, i, isWhite, mate_allowed, mate_missed):
    res = results[i]
    if any('#' in move for move in res['next_best_line']):
        if isWhite: mate_allowed["white"].append(res)
        else: mate_allowed["black"].append(res)
    elif any('#' in move for move in res['current_best_line']):
        if isWhite: mate_missed["white"].append(res)
        else: mate_missed["black"].append(res)

def check_for_forks(results, i, isWhite, forks_allowed, forks_missed, forks_executed):
    res = results[i]
    best_move = res.get('next_best_move')
    best_line = res.get('next_best_line')
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
        enginefirst = best_line[0]
        enginesecond = best_line[2]
        if enginefirst.startswith('N') and enginesecond.startswith('N'):
            if isWhite: forks_allowed["white"].append(results[i])
            else: forks_allowed["black"].append(results[i])
        else:
            return
        if i+1 >= len(results):
            return
        userfirst = results[i+1].get('move_played')
        if userfirst != enginefirst:
            if isWhite: forks_missed["black"].append(results[i+1])
            else: forks_missed["white"].append(results[i+1])
        elif i+3 >= len(results):
            if isWhite: forks_executed["black"].append(results[i+1])
            else: forks_executed["white"].append(results[i+1])
        elif results[i+3].get('move_played').startswith('N') and results[i+3].get('move_played')[1] == 'x':
            if isWhite: forks_executed["black"].append(results[i+1])
            else: forks_executed["white"].append(results[i+1])

def check_for_hanging(results, i, isWhite, hanging_allowed, hanging_missed, hanging_executed):
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
    if i+1 < len(results):
        if results[i+1].get("move_played") == best_move_san:
            if isWhite: hanging_executed["black"].append(results[i+1])
            else: hanging_executed['white'].append(results[i+1])
        else:
            if isWhite: hanging_missed["black"].append(results[i+1])
            else: hanging_missed['white'].append(results[i+1])

def check_for_double(results, i, isWhite, double_allowed, double_missed, double_executed):
    res = results[i]
    best_move = res.get('next_best_move')
    best_line = res.get('next_best_line')
    fen = res.get('fen_after_move_played')
    if not best_move:
        return
    if best_move[0] == 'N':
        return
    if len(best_line) < 3 or 'x' not in best_line[2]:
        return
    try:
        board = chess.Board(fen)
        move = board.parse_san(best_move)
        if not move:
            return
        to_square = move.to_square
        board.push(move)
    except Exception:
        return
    attacks = board.attacks(to_square)
    enemy_color = True if isWhite else False
    valuable_targets = set()
    for sq in attacks:
        target = board.piece_at(sq)
        if target and target.color == enemy_color and target.piece_type != chess.PAWN:
            valuable_targets.add(sq)
    if len(valuable_targets) < 2:
        return
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

def check_for_discovered(results, i, isWhite, discovered_allowed, discovered_missed, discovered_executed):
    res = results[i]
    best_move_san = res.get("next_best_move")
    best_line = res.get("next_best_line")
    fen_before = res.get("fen_before_move_played")
    if not best_move_san or '+' not in best_move_san:
        return
    board = chess.Board(fen_before)
    try:
        move = board.parse_san(best_move_san)
    except:
        return
    moved_piece = board.piece_at(move.from_square)
    if not moved_piece or moved_piece.piece_type == chess.PAWN:
        return
    board.push(move)
    color = chess.WHITE if isWhite else chess.BLACK
    enemy_color = not color
    king_sq = board.king(enemy_color)
    if king_sq is None:
        return
    attackers = board.attackers(color, king_sq)
    if len(attackers) >= 2 or (move.to_square not in attackers):
        if isWhite:
            discovered_allowed["white"].append(results[i])
        else:
            discovered_allowed["black"].append(results[i])
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

# === MAIN FUNCTION ===
def run_analysis_on_supabase_games(userid,lichess_id):
    # Only fetch games for the given lichess_id
    rows = supabase.table("lichess_games").select("id, game, lichess_id").eq("lichess_id", lichess_id).execute().data

    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        for row in rows:
            game_id = row["id"]
            pgn_raw = row.get("game")
            lichess_id = row.get("lichess_id")

            if not pgn_raw or not isinstance(pgn_raw, str) or not pgn_raw.strip():
                print(f"⚠️ Skipping row {game_id} — empty PGN.")
                continue

            game = chess.pgn.read_game(StringIO(pgn_raw))
            if not game:
                print(f"⚠️ Skipping row {game_id} — invalid PGN.")
                continue

            # Determine player color
            white_player = game.headers.get("White")
            black_player = game.headers.get("Black")
            if lichess_id == white_player:
                player_color = "white"
            elif lichess_id == black_player:
                player_color = "black"
            else:
                print(f"⚠️ Skipping {game_id} — lichess_id not found in PGN.")
                continue

            board = game.board()
            positions = [board.copy()]
            played_moves = [None]

            for move in game.mainline_moves():
                san = board.san(move)
                board.push(move)
                positions.append(board.copy())
                played_moves.append(san)

            # Build per-move analysis
            results = []
            for idx, pos in enumerate(positions):
                info = engine.analyse(pos, chess.engine.Limit(depth=15))
                best_line = info.get("pv", [])
                best_move = best_line[0] if best_line else None
                score = info.get("score")
                evaluation = score.white().score(mate_score=10000) / 100.0 if score else None
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

            for i in range(1, len(results)):
                results[i]['current_best_move'] = results[i - 1]['next_best_move']
                results[i]['current_best_line'] = results[i - 1]['next_best_line']
                results[i]['current_best_evaluation'] = results[i - 1]['evaluation_after_move_played']
                results[i]['fen_before_move_played'] = results[i - 1]['fen_after_move_played']

            # === Initialize tactic result structures ===
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
            discovered_allowed = {"white": [], "black": []}
            discovered_executed = {"white": [], "black": []}
            discovered_missed = {"white": [], "black": []}
            blunders = []

            # === Call all tactical detection functions for each move ===
            threshold = 2.0
            for i in range(1, len(results)):
                eval_after = results[i]['evaluation_after_move_played']
                eval_before = results[i]['current_best_evaluation']
                if eval_after is not None and eval_before is not None:
                    if abs(eval_after - eval_before) > threshold:
                        isWhite = (i % 2 == 1)
                        check_for_mate(results, i, isWhite, mate_allowed, mate_missed)
                        check_for_forks(results, i, isWhite, forks_allowed, forks_missed, forks_executed)
                        check_for_hanging(results, i, isWhite, hanging_allowed, hanging_missed, hanging_executed)
                        check_for_double(results, i, isWhite, double_allowed, double_missed, double_executed)
                        check_for_discovered(results, i, isWhite, discovered_allowed, discovered_missed, discovered_executed)

            # === Format results for upload: flat list for user's color ===
            formatted = {
                "mate_allowed": [r["move_number"] for r in mate_allowed[player_color]],
                "mate_missed": [r["move_number"] for r in mate_missed[player_color]],
                "forks_allowed": [r["move_number"] for r in forks_allowed[player_color]],
                "forks_missed": [r["move_number"] for r in forks_missed[player_color]],
                "forks_executed": [r["move_number"] for r in forks_executed[player_color]],
                "hanging_allowed": [r["move_number"] for r in hanging_allowed[player_color]],
                "hanging_missed": [r["move_number"] for r in hanging_missed[player_color]],
                "hanging_executed": [r["move_number"] for r in hanging_executed[player_color]],
                "double_allowed": [r["move_number"] for r in double_allowed[player_color]],
                "double_missed": [r["move_number"] for r in double_missed[player_color]],
                "double_executed": [r["move_number"] for r in double_executed[player_color]],
                "discovered_allowed": [r["move_number"] for r in discovered_allowed[player_color]],
                "discovered_missed": [r["move_number"] for r in discovered_missed[player_color]],
                "discovered_executed": [r["move_number"] for r in discovered_executed[player_color]],
            }

            supabase.table("lichess_games").update({
                "middlegame_analysis": formatted
            }).eq("id", game_id).execute()

            print(f"✅ Game {game_id} analyzed and uploaded.")

# === ENTRY POINT ===
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 middlegame_analyzer.py <userid> <lichess_id>")
        sys.exit(1)

    userid = sys.argv[1]
    lichess_id = sys.argv[2]

    run_analysis_on_supabase_games(userid, lichess_id)