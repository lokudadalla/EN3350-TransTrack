import os, sys

print("CWD:", os.getcwd())
print("Contents:", os.listdir())
print("sys.path[0]:", sys.path[0])

import ai_logic
print("ai_logic loaded from:", ai_logic.__file__)
