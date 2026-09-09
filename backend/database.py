import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_SECRET_KEY = os.getenv("SUPABASE_SECRET_KEY")

if not SUPABASE_URL:
    raise Exception("Falta SUPABASE_URL en .env")

if not SUPABASE_KEY:
    raise Exception("Falta SUPABASE_KEY en .env")

if not SUPABASE_SECRET_KEY:
    raise Exception("Falta SUPABASE_SECRET_KEY en .env")


# Cliente normal:
# autenticación de usuarios
supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# Cliente administrativo:
# solo se utiliza dentro del backend
supabase_admin: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SECRET_KEY
)