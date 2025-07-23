import os
import json
import sys
import requests
from io import StringIO

# Chess library imports - using python-chess
try:
    import chess
    import chess.pgn
    import chess.engine
except ImportError:
    print(
        "❌ Error: python-chess library not found. Please install: pip install python-chess"
    )
    sys.exit(1)

# === CONFIG ===
SUPABASE_URL = "https://gkkrualuovkaxncgeqxc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3J1YWx1b3ZrYXhuY2dlcXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5MjM4MSwiZXhwIjoyMDY3MjY4MzgxfQ.F0Ea9w_Lyi3s6oS8FCoMsPvPWjoO3sYij0538HsDIC4"
STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"


# === PIECE COUNTING ===
def piece_counts(board):
    white = {"k": 0, "q": 0, "r": 0, "b": 0, "n": 0, "p": 0}
    black = {"k": 0, "q": 0, "r": 0, "b": 0, "n": 0, "p": 0}
    for _, piece in board.piece_map().items():
        sym = piece.symbol().lower()
        if piece.color == chess.WHITE:
            white[sym] += 1
        else:
            black[sym] += 1
    return white, black


def bishop_square_color(board):
    white_color = None
    black_color = None
    for sq, piece in board.piece_map().items():
        if piece.piece_type == chess.BISHOP and piece.color == chess.WHITE:
            white_color = (sq % 2) ^ (sq // 8 % 2)
        if piece.piece_type == chess.BISHOP and piece.color == chess.BLACK:
            black_color = (sq % 2) ^ (sq // 8 % 2)
    if white_color is None or black_color is None:
        return None
    return white_color == black_color


# === ENDGAME DETECTORS ===
def detect_rrp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["r"] == 2 and w["p"] >= 1
            and all(w[k] == 0 for k in ["q", "b", "n"]) and x["k"] == 1
            and x["r"] == 2 and x["p"] >= 1 and all(x[k] == 0
                                                    for k in ["q", "b", "n"]))


def detect_rnp(b):
    w, x = piece_counts(b)
    return ((w["k"] == 1 and w["r"] == 1 and w["n"] == 1
             and all(w[k] == 0 for k in ["q", "b"]) and w["p"] >= 1
             and x["k"] == 1 and all(x[k] == 0 for k in ["q", "r", "n", "b"]))
            or (x["k"] == 1 and x["r"] == 1 and x["n"] == 1
                and all(x[k] == 0 for k in ["q", "b"]) and x["p"] >= 1
                and w["k"] == 1 and all(w[k] == 0
                                        for k in ["q", "r", "n", "b"])))


def detect_qrp(board):
    piece_map = board.piece_map()
    white = {"k": 0, "q": 0, "r": 0, "p": 0, "b": 0, "n": 0}
    black = {"k": 0, "q": 0, "r": 0, "p": 0, "b": 0, "n": 0}
    for _, piece in piece_map.items():
        symbol = piece.symbol().lower()
        if piece.color == chess.WHITE:
            white[symbol] += 1
        else:
            black[symbol] += 1
    white_ok = (white["k"] == 1 and white["q"] == 1 and white["r"] == 1
                and white["p"] >= 1 and white["b"] == 0 and white["n"] == 0)
    black_ok = (black["k"] == 1 and black["q"] == 1 and black["r"] == 1
                and black["p"] >= 1 and black["b"] == 0 and black["n"] == 0)
    return white_ok and black_ok


def detect_qnp(b):
    w, x = piece_counts(b)
    return ((w["k"] == 1 and w["q"] == 1 and w["n"] == 1
             and all(w[k] == 0 for k in ["r", "b"]) and w["p"] >= 1
             and x["k"] == 1 and all(x[k] == 0 for k in ["q", "n", "r", "b"]))
            or (x["k"] == 1 and x["q"] == 1 and x["n"] == 1
                and all(x[k] == 0 for k in ["r", "b"]) and x["p"] >= 1
                and w["k"] == 1 and all(w[k] == 0
                                        for k in ["q", "n", "r", "b"])))


def detect_rsbp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["r"] == 1 and w["b"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["n", "q"]) and x["k"] == 1
            and x["r"] == 1 and x["b"] == 1 and x["p"] >= 1
            and all(x[k] == 0
                    for k in ["n", "q"]) and bishop_square_color(b) == True)


def detect_robp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["r"] == 1 and w["b"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["n", "q"]) and x["k"] == 1
            and x["r"] == 1 and x["b"] == 1 and x["p"] >= 1
            and all(x[k] == 0
                    for k in ["n", "q"]) and bishop_square_color(b) == False)


def detect_qp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["q"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["r", "b", "n"]) and x["k"] == 1
            and x["q"] == 1 and x["p"] >= 1 and all(x[k] == 0
                                                    for k in ["r", "b", "n"]))


def detect_rp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["r"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["q", "b", "n"]) and x["k"] == 1
            and x["r"] == 1 and x["p"] >= 1 and all(x[k] == 0
                                                    for k in ["q", "b", "n"]))


def detect_np(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["n"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["q", "r", "b"]) and x["k"] == 1
            and x["n"] == 1 and x["p"] >= 1 and all(x[k] == 0
                                                    for k in ["q", "r", "b"]))


def detect_sbp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["b"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["r", "n", "q"]) and x["k"] == 1
            and x["b"] == 1 and x["p"] >= 1 and all(x[k] == 0
                                                    for k in ["r", "n", "q"])
            and bishop_square_color(b) == True)


def detect_obp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["b"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["r", "n", "q"]) and x["k"] == 1
            and x["b"] == 1 and x["p"] >= 1 and all(x[k] == 0
                                                    for k in ["r", "n", "q"])
            and bishop_square_color(b) == False)


def detect_kp(b):
    w, x = piece_counts(b)
    return (w["k"] == 1 and w["p"] >= 1
            and all(w[k] == 0 for k in ["q", "r", "b", "n"]) and x["k"] == 1
            and x["p"] >= 1 and all(x[k] == 0 for k in ["q", "r", "b", "n"]))


def analyze_endgames_for_user(userid, lichess_id):
    """Analyze endgames for a specific user's games"""
    print(f"[Endgame Analysis] 🔍 Analyzing endgames for {lichess_id} ({userid})")

    # Fetch only unanalyzed games (up to 1000)
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }
    url = (
        f"{SUPABASE_URL}/rest/v1/lichess_games"
        f"?select=id,game,result,lichess_id"
        f"&lichess_id=eq.{lichess_id}"
        f"&is_end_analyzed=eq.false"
        f"&order=id.asc"
        f"&limit=1000"
    )
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch games: {response.status_code}")
        return

    rows = response.json()
    print(f"[Endgame Analysis] 📊 Found {len(rows)} games to analyze (is_end_analyzed=false)")

    # Use system Stockfish
    try:
        with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
            analyzed_count = 0

            for row in rows:
                game_id = row["id"]
                pgn_raw = row.get("game")

                if not pgn_raw or not isinstance(pgn_raw, str) or not pgn_raw.strip():
                    print(f"⚠️ Skipping row {game_id} — empty PGN.")
                    continue

                try:
                    game = chess.pgn.read_game(StringIO(pgn_raw))
                    if not game:
                        print(f"⚠️ Invalid PGN in row {game_id}")
                        continue

                    # Determine player color and outcome
                    white_player = game.headers.get("White")
                    black_player = game.headers.get("Black")
                    if lichess_id == white_player:
                        player_color = "white"
                    elif lichess_id == black_player:
                        player_color = "black"
                    else:
                        print(f"⚠️ Skipping {game_id} — lichess_id not in PGN headers.")
                        continue

                    pgn_result = game.headers.get("Result", "*")
                    if pgn_result == "1-0":
                        outcome_final = "won" if player_color == "white" else "lost"
                    elif pgn_result == "0-1":
                        outcome_final = "won" if player_color == "black" else "lost"
                    elif pgn_result == "1/2-1/2":
                        outcome_final = "draw"
                    else:
                        outcome_final = "unknown"

                    board = game.board()
                    moves = list(game.mainline_moves())
                    detections = []

                    # Analyze each move for endgame patterns
                    for i, move in enumerate(moves):
                        board.push(move)
                        # Pattern detection functions assumed imported
                        for label, func in [
                            ("RRP", detect_rrp), ("RNP", detect_rnp),
                            ("QRP", detect_qrp), ("QNP", detect_qnp),
                            ("RSBP", detect_rsbp), ("ROBP", detect_robp),
                            ("QP", detect_qp), ("RP", detect_rp),
                            ("NP", detect_np), ("SBP", detect_sbp),
                            ("OBP", detect_obp), ("KP", detect_kp)
                        ]:
                            if label in [d[0] for d in detections]:
                                continue
                            if func(board):
                                info = engine.analyse(
                                    board, chess.engine.Limit(depth=12)
                                )
                                eval_cp = info["score"].white().score(mate_score=10000) / 100.0
                                if -3 <= eval_cp <= 3:
                                    detections.append((label, i+1, round(eval_cp,2)))
                                    break

                    # Format results
                    formatted = [
                        {"type": lbl, "move_no": mv, "eval": ev,
                         "result": pgn_result, "outcome": outcome_final}
                        for lbl, mv, ev in detections
                    ]

                    # Update with endgame analysis and flag
                    update_data = {
                        "endgame_analysis": formatted,
                        "result": pgn_result,
                        "is_end_analyzed": True
                    }
                    up_url = f"{SUPABASE_URL}/rest/v1/lichess_games?id=eq.{game_id}"
                    upd_resp = requests.patch(up_url, headers=headers, json=update_data)
                    if upd_resp.status_code == 204:
                        analyzed_count += 1
                        print(
                            f"✅ Row {game_id} → {len(formatted)} detections, marked analyzed"
                        )
                    else:
                        print(
                            f"❌ Failed to update row {game_id}: {upd_resp.status_code}"
                        )

                except Exception as e:
                    print(f"❌ Error analyzing game {game_id}: {e}")
                    continue

            print(
                f"[Endgame Analysis] 🎉 Completed: {analyzed_count}/{len(rows)} games processed"
            )

    except Exception as e:
        print(f"❌ Stockfish engine error: {e}")
        return


def main():
    if len(sys.argv) != 3:
        print("Usage: python3 endgame_analyzer.py <userid> <lichess_id>")
        sys.exit(1)

    userid = sys.argv[1]
    lichess_id = sys.argv[2]

    analyze_endgames_for_user(userid, lichess_id)


if __name__ == "__main__":
    main()
