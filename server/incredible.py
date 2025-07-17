import os
import chess
import chess.pgn
import chess.engine
from io import StringIO

# === CONFIG ===
PGN_FILE_PATH = "games.pgn"
STOCKFISH_PATH = r"C:\Users\shett\OneDrive\Desktop\stockfish\stockfish-windows-x86-64-avx2.exe"

# === UTILITY FUNCTIONS ===
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
def detect_rrp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["r"] == 2 and all(w[x] == 0 for x in ["q", "b", "n"]) and w["p"] >= 1 and
            b["k"] == 1 and b["r"] == 2 and all(b[x] == 0 for x in ["q", "b", "n"]) and b["p"] >= 1)

def detect_rnp(board):
    w, b = piece_counts(board)
    return ((w["k"] == 1 and w["r"] == 1 and w["n"] == 1 and all(w[x] == 0 for x in ["q", "b"]) and w["p"] >= 1 and
             all(b[x] == 0 for x in ["q", "r", "n", "b"]) and b["k"] == 1) or
            (b["k"] == 1 and b["r"] == 1 and b["n"] == 1 and all(b[x] == 0 for x in ["q", "b"]) and b["p"] >= 1 and
             all(w[x] == 0 for x in ["q", "r", "n", "b"]) and w["k"] == 1))

def detect_qrp(board):
    w, b = piece_counts(board)
    return ((w["k"] == 1 and w["q"] == 1 and w["r"] == 1 and all(w[x] == 0 for x in ["b", "n"]) and w["p"] >= 1 and
             all(b[x] == 0 for x in ["q", "r", "b", "n"]) and b["k"] == 1) or
            (b["k"] == 1 and b["q"] == 1 and b["r"] == 1 and all(b[x] == 0 for x in ["b", "n"]) and b["p"] >= 1 and
             all(w[x] == 0 for x in ["q", "r", "b", "n"]) and w["k"] == 1))

def detect_qnp(board):
    w, b = piece_counts(board)
    return ((w["k"] == 1 and w["q"] == 1 and w["n"] == 1 and all(w[x] == 0 for x in ["r", "b"]) and w["p"] >= 1 and
             all(b[x] == 0 for x in ["q", "n", "r", "b"]) and b["k"] == 1) or
            (b["k"] == 1 and b["q"] == 1 and b["n"] == 1 and all(b[x] == 0 for x in ["r", "b"]) and b["p"] >= 1 and
             all(w[x] == 0 for x in ["q", "n", "r", "b"]) and w["k"] == 1))

def detect_rsbp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["r"] == 1 and w["b"] == 1 and all(w[x] == 0 for x in ["n", "q"]) and w["p"] >= 1 and
            b["k"] == 1 and b["r"] == 1 and b["b"] == 1 and all(b[x] == 0 for x in ["n", "q"]) and b["p"] >= 1 and
            bishop_square_color(board) == True)

def detect_robp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["r"] == 1 and w["b"] == 1 and all(w[x] == 0 for x in ["n", "q"]) and w["p"] >= 1 and
            b["k"] == 1 and b["r"] == 1 and b["b"] == 1 and all(b[x] == 0 for x in ["n", "q"]) and b["p"] >= 1 and
            bishop_square_color(board) == False)

def detect_qp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["q"] == 1 and all(w[x] == 0 for x in ["r", "b", "n"]) and w["p"] >= 1 and
            b["k"] == 1 and b["q"] == 1 and all(b[x] == 0 for x in ["r", "b", "n"]) and b["p"] >= 1)

def detect_rp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["r"] == 1 and all(w[x] == 0 for x in ["q", "b", "n"]) and w["p"] >= 1 and
            b["k"] == 1 and b["r"] == 1 and all(b[x] == 0 for x in ["q", "b", "n"]) and b["p"] >= 1)

def detect_np(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["n"] == 1 and all(w[x] == 0 for x in ["q", "r", "b"]) and w["p"] >= 1 and
            b["k"] == 1 and b["n"] == 1 and all(b[x] == 0 for x in ["q", "r", "b"]) and b["p"] >= 1)

def detect_sbp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["b"] == 1 and all(w[x] == 0 for x in ["r", "n", "q"]) and w["p"] >= 1 and
            b["k"] == 1 and b["b"] == 1 and all(b[x] == 0 for x in ["r", "n", "q"]) and b["p"] >= 1 and
            bishop_square_color(board) == True)

def detect_obp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and w["b"] == 1 and all(w[x] == 0 for x in ["r", "n", "q"]) and w["p"] >= 1 and
            b["k"] == 1 and b["b"] == 1 and all(b[x] == 0 for x in ["r", "n", "q"]) and b["p"] >= 1 and
            bishop_square_color(board) == False)

def detect_kp(board):
    w, b = piece_counts(board)
    return (w["k"] == 1 and all(w[x] == 0 for x in ["q", "r", "b", "n"]) and w["p"] >= 1 and
            b["k"] == 1 and all(b[x] == 0 for x in ["q", "r", "b", "n"]) and b["p"] >= 1)

# === MAIN ANALYSIS LOOP ===
def main():
    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        with open(PGN_FILE_PATH, "r", encoding="utf-8") as pgn_file:
            game_number = 0
            summary = {}
            while True:
                game = chess.pgn.read_game(pgn_file)
                if game is None:
                    break
                game_number += 1
                result = game.headers.get("Result", "*")
                board = game.board()

                detected = []
                for i, move in enumerate(game.mainline_moves(), start=1):
                    board.push(move)

                    detectors = [
                        ("RRP", detect_rrp), ("RNP", detect_rnp), ("QRP", detect_qrp),
                        ("QNP", detect_qnp), ("RSBP", detect_rsbp), ("ROBP", detect_robp),
                        ("QP", detect_qp), ("RP", detect_rp), ("NP", detect_np),
                        ("SBP", detect_sbp), ("OBP", detect_obp), ("KP", detect_kp),
                    ]

                    for label, func in detectors:
                        if label in [d[0] for d in detected]:
                            continue  # Already detected
                        if func(board):
                            info = engine.analyse(board, chess.engine.Limit(depth=12))
                            eval_cp = info["score"].white().score(mate_score=10000) / 100.0
                            detected.append((label, i, eval_cp))
                            break  # detect one at a time to keep move order

                for (label, move_no, eval_cp) in detected:
                    print(f"Game {game_number}: {label} at move {move_no}, Eval: {eval_cp:+.2f}, Result: {result}")
                    if label not in summary:
                        summary[label] = {"won": 0, "lost": 0}
                    if (result == "1-0" and eval_cp > 0) or (result == "0-1" and eval_cp < 0):
                        summary[label]["won"] += 1
                    else:
                        summary[label]["lost"] += 1

            print("\n=== Summary of Endgames ===")
            for label, stats in summary.items():
                print(f"{label}: Won = {stats['won']}, Lost = {stats['lost']}")

if __name__ == "__main__":
    main()