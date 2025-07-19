#!/usr/bin/env python3
"""
Middlegame Analyzer - Advanced tactical pattern detection for chess games
Runs after endgame_analyzer.py completes during user sign-in process
Analyzes tactical patterns: mates, forks, hanging pieces, double attacks, discovered attacks
"""

import os
import sys
import chess
import chess.engine
import chess.pgn
from io import StringIO
import requests
import json
import re
from datetime import datetime

# === CONFIG ===
SUPABASE_URL = "https://gkkrualuovkaxncgeqxc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3J1YWx1b3ZrYXhuY2dlcXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5MjM4MSwiZXhwIjoyMDY3MjY4MzgxfQ.F0Ea9w_Lyi3s6oS8FCoMsPvPWjoO3sYij0538HsDIC4"
STOCKFISH_PATH = "stockfish"  # Use system stockfish for Replit environment


# === LOGGING SETUP ===
def log_message(message):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[Middlegame Analysis] {message}")


# === SUPABASE HTTP CLIENT ===
def supabase_get(table, params=None):
    """Get data from Supabase using HTTP REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        log_message(
            f"❌ Supabase GET error: {response.status_code} - {response.text}")
        return []


def supabase_update(table, data, match_conditions):
    """Update data in Supabase using HTTP REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    # Build query string for match conditions
    params = "&".join([f"{k}=eq.{v}" for k, v in match_conditions.items()])
    url = f"{url}?{params}"

    response = requests.patch(url, headers=headers, json=data)
    if response.status_code in [200, 204]:
        return True
    else:
        log_message(
            f"❌ Supabase UPDATE error: {response.status_code} - {response.text}"
        )
        return False


# === TACTICAL DETECTION FUNCTIONS ===
def check_for_mate(results, i, is_white, mate_allowed, mate_missed):
    """Detect mate-in-one opportunities and missed mates"""
    res = results[i]
    next_best_line = res.get('next_best_line', [])
    current_best_line = res.get('current_best_line', [])

    # If engine suggests a forced mate
    if any('#' in move for move in next_best_line):
        if is_white:
            mate_allowed["white"].append(res)
        else:
            mate_allowed["black"].append(res)
    # If previous best line had a mate, and user missed it
    elif any('#' in move for move in current_best_line):
        if is_white:
            mate_missed["white"].append(res)
        else:
            mate_missed["black"].append(res)


def check_for_forks(results, i, is_white, forks_allowed, forks_missed,
                    forks_executed):
    """Detect knight fork opportunities and execution"""
    res = results[i]
    best_move = res.get('next_best_move')
    best_line = res.get('next_best_line', [])
    fen = res.get('fen_after_move_played')

    if not (best_move and best_move.startswith('N')):
        return

    # Extract destination square
    m = re.search(r'([a-h][1-8])$', best_move)
    if not m:
        return

    to_square = chess.parse_square(m.group(1))
    board = chess.Board(fen)

    try:
        move = next(
            (m for m in board.legal_moves if board.san(m) == best_move), None)
        if not move:
            return
        board.push(move)
    except Exception:
        return

    piece = board.piece_at(to_square)
    if not piece or piece.piece_type != chess.KNIGHT:
        return

    # Check if knight attacks multiple valuable pieces
    attacks = board.attacks(to_square)
    valuable_targets = sum(
        1 for sq in attacks if (t := board.piece_at(sq))
        and t.color != piece.color and t.piece_type != chess.PAWN)

    if valuable_targets >= 2:
        if len(best_line) < 3:
            return

        engine_first = best_line[0]
        engine_second = best_line[2] if len(best_line) > 2 else ""

        if engine_first.startswith('N') and engine_second.startswith('N'):
            if is_white:
                forks_allowed["white"].append(results[i])
            else:
                forks_allowed["black"].append(results[i])
        else:
            return

        # Check if user executed the fork
        if i + 1 >= len(results):
            return

        user_first = results[i + 1].get('move_played')
        if user_first != engine_first:
            if is_white:
                forks_missed["black"].append(results[i + 1])
            else:
                forks_missed["white"].append(results[i + 1])
        elif i + 3 >= len(results):
            if is_white:
                forks_executed["black"].append(results[i + 1])
            else:
                forks_executed["white"].append(results[i + 1])
        elif (results[i + 3].get('move_played', '').startswith('N')
              and 'x' in results[i + 3].get('move_played', '')):
            if is_white:
                forks_executed["black"].append(results[i + 1])
            else:
                forks_executed["white"].append(results[i + 1])


def check_for_hanging(results, i, is_white, hanging_allowed, hanging_missed,
                      hanging_executed):
    """Detect hanging piece opportunities"""
    res = results[i]
    best_move_san = res.get('next_best_move')
    fen = res.get('fen_after_move_played')

    if not best_move_san or 'x' not in best_move_san:
        return

    board = chess.Board(fen)
    try:
        move = board.parse_san(best_move_san)
        to_square = move.to_square
    except:
        return

    # Check if target square is undefended
    defenders = board.attackers(chess.BLACK if not is_white else chess.WHITE,
                                to_square)
    if defenders:
        return

    if is_white:
        hanging_allowed["white"].append(results[i])
    else:
        hanging_allowed["black"].append(results[i])

    # Check execution
    if i + 1 < len(results):
        if results[i + 1].get("move_played") == best_move_san:
            if is_white:
                hanging_executed["black"].append(results[i + 1])
            else:
                hanging_executed['white'].append(results[i + 1])
        else:
            if is_white:
                hanging_missed["black"].append(results[i + 1])
            else:
                hanging_missed['white'].append(results[i + 1])


def check_for_double(results, i, is_white, double_allowed, double_missed,
                     double_executed):
    """Detect double attack opportunities"""
    res = results[i]
    best_move = res.get('next_best_move')
    best_line = res.get('next_best_line', [])
    fen = res.get('fen_after_move_played')

    if not best_move or best_move[0] == 'N':
        return

    if len(best_line) < 3 or 'x' not in best_line[2]:
        return

    try:
        board = chess.Board(fen)
        move = board.parse_san(best_move)
        to_square = move.to_square
        board.push(move)
    except Exception:
        return

    # Check for multiple valuable targets
    attacks = board.attacks(to_square)
    enemy_color = not is_white
    valuable_targets = set()

    for sq in attacks:
        target = board.piece_at(sq)
        if target and target.color == enemy_color and target.piece_type != chess.PAWN:
            valuable_targets.add(sq)

    if len(valuable_targets) < 2:
        return

    if is_white:
        double_allowed["white"].append(results[i])
    else:
        double_allowed["black"].append(results[i])

    # Check execution
    if i + 1 >= len(results):
        return

    user_move = results[i + 1].get("move_played")
    engine_move = best_line[0] if best_line else None

    if user_move == engine_move:
        if is_white:
            double_executed["black"].append(results[i + 1])
        else:
            double_executed["white"].append(results[i + 1])
    else:
        if is_white:
            double_missed["black"].append(results[i + 1])
        else:
            double_missed["white"].append(results[i + 1])


def check_for_discovered(results, i, is_white, discovered_allowed,
                         discovered_missed, discovered_executed):
    """Detect discovered attack opportunities"""
    res = results[i]
    best_move_san = res.get("next_best_move")
    best_line = res.get("next_best_line", [])
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
    color = chess.WHITE if is_white else chess.BLACK
    enemy_color = not color
    king_sq = board.king(enemy_color)

    if king_sq is None:
        return

    attackers = board.attackers(color, king_sq)
    if len(attackers) >= 2 or (move.to_square not in attackers):
        if is_white:
            discovered_allowed["white"].append(results[i])
        else:
            discovered_allowed["black"].append(results[i])

        # Check execution
        if i + 1 < len(results):
            user_move = results[i + 1].get("move_played")
            engine_move = best_line[0] if best_line else None

            if user_move == engine_move:
                if is_white:
                    discovered_executed["black"].append(results[i + 1])
                else:
                    discovered_executed["white"].append(results[i + 1])
            else:
                if is_white:
                    discovered_missed["black"].append(results[i + 1])
                else:
                    discovered_missed["white"].append(results[i + 1])


def calculate_blunders(results, threshold=2.0):
    """Calculate blunders based on evaluation drops"""
    blunders = []
    mate_allowed = {"white": [], "black": []}
    mate_missed = {"white": [], "black": []}

    for i in range(1, len(results)):
        eval_after = results[i]['evaluation_after_move_played']
        eval_before = results[i]['current_best_evaluation']

        if eval_after is not None and eval_before is not None:
            if abs(eval_before) > 10:
                continue
            if abs(eval_after - eval_before) > threshold:
                is_white = (i % 2 == 1)
                check_for_mate(results, i, is_white, mate_allowed, mate_missed)
                blunders.append(results[i])

    return blunders, mate_allowed, mate_missed


# === MAIN ANALYSIS FUNCTION ===
def run_middlegame_analysis(userid, lichess_id):
    """Main function to analyze middlegame tactical patterns"""
    log_message(
        f"🔍 Starting middlegame analysis for {lichess_id} (userid: {userid})")

    # Fetch games from Supabase
    params = {"lichess_id": f"eq.{lichess_id}"}
    rows = supabase_get("lichess_games", params)

    if not rows:
        log_message(f"⚠️ No games found for lichess_id: {lichess_id}")
        return

    log_message(f"📊 Found {len(rows)} games to analyze")

    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            games_analyzed = 0

            for row in rows:
                game_id = row["id"]
                pgn_raw = row.get("game")
                row_lichess_id = row.get("lichess_id")

                if not pgn_raw or not isinstance(pgn_raw,
                                                 str) or not pgn_raw.strip():
                    log_message(f"⚠️ Skipping row {game_id} — empty PGN.")
                    continue

                try:
                    game = chess.pgn.read_game(StringIO(pgn_raw))
                    if not game:
                        log_message(
                            f"⚠️ Skipping row {game_id} — invalid PGN.")
                        continue

                    # Determine player color
                    white_player = game.headers.get("White")
                    black_player = game.headers.get("Black")

                    if row_lichess_id == white_player:
                        player_color = "white"
                    elif row_lichess_id == black_player:
                        player_color = "black"
                    else:
                        log_message(
                            f"⚠️ Skipping {game_id} — lichess_id not found in PGN."
                        )
                        continue

                    # Build position sequence
                    board = game.board()
                    positions = [board.copy()]
                    played_moves = [None]

                    for move in game.mainline_moves():
                        san = board.san(move)
                        board.push(move)
                        positions.append(board.copy())
                        played_moves.append(san)

                    # Analyze each position with Stockfish
                    results = []
                    for idx, pos in enumerate(positions):
                        try:
                            info = engine.analyse(pos,
                                                  chess.engine.Limit(depth=15))
                            best_line = info.get("pv", [])
                            best_move = best_line[0] if best_line else None
                            score = info.get("score")
                            evaluation = score.white().score(
                                mate_score=10000) / 100.0 if score else None
                            san_best_move = pos.san(
                                best_move) if best_move else None

                            # Convert best line to SAN notation
                            san_best_line = []
                            temp_board = pos.copy()
                            for move in best_line:
                                san_best_line.append(temp_board.san(move))
                                temp_board.push(move)

                            results.append({
                                "move_number":
                                idx,
                                "fen_after_move_played":
                                pos.fen(),
                                "move_played":
                                played_moves[idx],
                                "next_best_move":
                                san_best_move,
                                "next_best_line":
                                san_best_line,
                                "evaluation_after_move_played":
                                evaluation,
                            })
                        except Exception as e:
                            log_message(
                                f"⚠️ Analysis error at move {idx}: {str(e)}")
                            continue

                    # Add historical context to results
                    for i in range(1, len(results)):
                        results[i]['current_best_move'] = results[
                            i - 1]['next_best_move']
                        results[i]['current_best_line'] = results[
                            i - 1]['next_best_line']
                        results[i]['current_best_evaluation'] = results[
                            i - 1]['evaluation_after_move_played']
                        results[i]['fen_before_move_played'] = results[
                            i - 1]['fen_after_move_played']

                    # Initialize tactical pattern tracking
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
                    discovered_missed = {"white": [], "black": []}
                    discovered_executed = {"white": [], "black": []}

                    # Run tactical pattern detection
                    for i in range(1, len(results)):
                        is_white = (i % 2 == 1)
                        eval_after = results[i]['evaluation_after_move_played']
                        eval_before = results[i]['current_best_evaluation']

                        if eval_after is None or eval_before is None:
                            continue
                        if abs(eval_before) > 10:
                            continue
                        if abs(eval_after - eval_before) <= 2.0:
                            continue

                        check_for_mate(results, i, is_white, mate_allowed,
                                       mate_missed)
                        check_for_forks(results, i, is_white, forks_allowed,
                                        forks_missed, forks_executed)
                        check_for_hanging(results, i, is_white,
                                          hanging_allowed, hanging_missed,
                                          hanging_executed)
                        check_for_double(results, i, is_white, double_allowed,
                                         double_missed, double_executed)
                        check_for_discovered(results, i, is_white,
                                             discovered_allowed,
                                             discovered_missed,
                                             discovered_executed)

                    # Calculate blunders
                    blunders, mate_blunders_allowed, mate_blunders_missed = calculate_blunders(
                        results)

                    blunder_total = (len(mate_allowed[player_color]) +
                                     len(mate_missed[player_color]) +
                                     len(forks_allowed[player_color]) +
                                     len(forks_missed[player_color]) +
                                     len(hanging_allowed[player_color]) +
                                     len(hanging_missed[player_color]) +
                                     len(double_allowed[player_color]) +
                                     len(double_missed[player_color]) +
                                     len(discovered_allowed[player_color]) +
                                     len(discovered_missed[player_color]))
                    middlegame_analysis = {
                        "analyzed_at":
                        datetime.now().isoformat(),
                        "player_color":
                        player_color,
                        "total_moves":
                        len(results) - 1,
                        "blunders": {
                            "total": blunder_total,
                            "threshold": 2.0
                        },
                        "mate_allowed":
                        [r["move_number"] for r in mate_allowed[player_color]],
                        "mate_missed":
                        [r["move_number"] for r in mate_missed[player_color]],
                        "forks_allowed": [
                            r["move_number"]
                            for r in forks_allowed[player_color]
                        ],
                        "forks_missed":
                        [r["move_number"] for r in forks_missed[player_color]],
                        "forks_executed": [
                            r["move_number"]
                            for r in forks_executed[player_color]
                        ],
                        "hanging_allowed": [
                            r["move_number"]
                            for r in hanging_allowed[player_color]
                        ],
                        "hanging_missed": [
                            r["move_number"]
                            for r in hanging_missed[player_color]
                        ],
                        "hanging_executed": [
                            r["move_number"]
                            for r in hanging_executed[player_color]
                        ],
                        "double_allowed": [
                            r["move_number"]
                            for r in double_allowed[player_color]
                        ],
                        "double_missed": [
                            r["move_number"]
                            for r in double_missed[player_color]
                        ],
                        "double_executed": [
                            r["move_number"]
                            for r in double_executed[player_color]
                        ],
                        "discovered_allowed": [
                            r["move_number"]
                            for r in discovered_allowed[player_color]
                        ],
                        "discovered_missed": [
                            r["move_number"]
                            for r in discovered_missed[player_color]
                        ],
                        "discovered_executed": [
                            r["move_number"]
                            for r in discovered_executed[player_color]
                        ],
                    }
                    # Update game with middlegame analysis
                    update_data = {"middlegame_analysis": middlegame_analysis}
                    match_conditions = {"id": game_id}

                    if supabase_update("lichess_games", update_data,
                                       match_conditions):
                        games_analyzed += 1
                    else:
                        log_message(f"⚠️ Failed to update game {game_id}")

                except Exception as e:
                    log_message(
                        f"⚠️ Error processing game {game_id}: {str(e)}")
                    continue

            log_message(
                f"🎉 COMPLETED: {games_analyzed} games analyzed for middlegame patterns"
            )

    except Exception as e:
        log_message(f"❌ Stockfish engine error: {str(e)}")
        return


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 middlegame_analyzer.py <userid> <lichess_id>")
        sys.exit(1)

    userid = sys.argv[1]
    lichess_id = sys.argv[2]

    run_middlegame_analysis(userid, lichess_id)
