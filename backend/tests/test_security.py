import os, sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.core.security import hash_password, verify_password

def test_hash_and_verify_password():
    password = "secret"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed)
    assert not verify_password("wrong", hashed)
    assert not verify_password(password, None)
