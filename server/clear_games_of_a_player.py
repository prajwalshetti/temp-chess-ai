import requests

# === Supabase CONFIG ===
SUPABASE_URL = "https://gkkrualuovkaxncgeqxc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdra3J1YWx1b3ZrYXhuY2dlcXhjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTY5MjM4MSwiZXhwIjoyMDY3MjY4MzgxfQ.F0Ea9w_Lyi3s6oS8FCoMsPvPWjoO3sYij0538HsDIC4"

def supabase_delete(table, filters):
    """Delete rows from Supabase table using REST API"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    params = {}
    for key, value in filters.items():
        params[key] = f"eq.{value}"
    response = requests.delete(url, headers=headers, params=params)
    return response.status_code == 204

if __name__ == "__main__":
    userid = "cw-usr-2"
    print(f"[Delete] Deleting all games for userid: {userid} from lichess_games table...")
    success = supabase_delete("lichess_games", {"userid": userid})
    if success:
        print(f"[Delete] ✅ Successfully deleted all games for userid: {userid}")
    else:
        print(f"[Delete] ❌ Failed to delete games for userid: {userid}") 