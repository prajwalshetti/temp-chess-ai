import requests
import json
import time
import sys
from datetime import datetime

# === Supabase CONFIG ===
SUPABASE_URL = "https://gkkrualuovkaxncgeqxc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3J1YWx1b3ZrYXhuY2dlcXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5MjM4MSwiZXhwIjoyMDY3MjY4MzgxfQ.F0Ea9w_Lyi3s6oS8FCoMsPvPWjoO3sYij0538HsDIC4"
lichess_token = ""

# === Supabase HTTP client functions ===
def supabase_select(table, select_fields="*", filters=None, order_by=None, limit=None):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    params = {"select": select_fields}
    if filters:
        for key, value in filters.items():
            params[key] = f"eq.{value}"
    if order_by:
        params["order"] = order_by
    if limit:
        params["limit"] = limit
    resp = requests.get(url, headers=headers, params=params)
    resp.raise_for_status()
    return resp.json()


def supabase_insert(table, data):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    resp = requests.post(url, headers=headers, json=data)
    resp.raise_for_status()
    return True


def supabase_update(table, data, filters):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    params = {}
    for k, v in filters.items():
        params[k] = f"eq.{v}"
    resp = requests.patch(url, headers=headers, params=params, json=data)
    resp.raise_for_status()
    return True


# === Lichess CONFIG ===
USE_TOKEN = True
LICHESS_TOKEN = lichess_token
HEADERS = {"Accept": "application/x-ndjson"}
if USE_TOKEN:
    HEADERS["Authorization"] = f"Bearer {LICHESS_TOKEN}"


def update_user_lichess_games(userid, lichess_id):
    print(f"[Lichess Update] 🔍 Processing: {lichess_id} ({userid})")

    # 1. Fetch last 50 games from Lichess
    url = f"https://lichess.org/api/games/user/{lichess_id}?max=50&moves=true&pgnInJson=true&opening=true&clocks=true&sort=dateDesc"
    res = requests.get(url, headers=HEADERS, stream=True)
    res.raise_for_status()
    games = []
    for line in res.iter_lines():
        if not line:
            continue
        try:
            game = json.loads(line)
            games.append(game)
        except json.JSONDecodeError:
            continue

    if not games:
        print("[Lichess Update] ⚠️ No games returned, exiting.")
        return

    # 2. Get old_last_game_id
    rows = supabase_select("last_fetched_game", "gameid", filters={"userid": userid}, limit=1)
    old_last_game_id = rows[0]["gameid"] if rows else "notfound"

    # 3. Store new_last_game_id
    new_last_game_id = games[0]["id"]

    # 4. Traverse and append
    appended = 0
    for game in games:
        gameid = game["id"]
        if gameid == old_last_game_id:
            print(f"[Lichess Update] 🔄 Reached previous bookmark {old_last_game_id}, stopping.")
            break
        # append new game
        payload = {
            "userid": userid,
            "lichess_id": lichess_id,
            "gameid": gameid,
            "game": game.get("pgn", ""),
            "result": game.get("winner", "draw"),
            "game_url": f"https://lichess.org/{gameid}",
            "created_at": datetime.utcnow().isoformat(),
            "istest": False,
            "is_end_analyzed": False,
            "is_middle_analyzed": False
        }
        supabase_insert("lichess_games", payload)
        appended += 1
        print(f"[Lichess Update] ✅ Appended new game {gameid}")

    print(f"[Lichess Update] 📊 Total new games appended: {appended}")

    # 5. Upsert bookmark
    bookmark_data = {"userid": userid, "gameid": new_last_game_id}
    if old_last_game_id == "notfound":
        supabase_insert("last_fetched_game", bookmark_data)
        print(f"[Lichess Update] 📌 Created new bookmark: {new_last_game_id}")
    else:
        supabase_update("last_fetched_game", {"gameid": new_last_game_id}, {"userid": userid})
        print(f"[Lichess Update] 📌 Updated bookmark to: {new_last_game_id}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python lichess_updater.py <userid> <lichess_id>")
        sys.exit(1)
    update_user_lichess_games(sys.argv[1], sys.argv[2])
